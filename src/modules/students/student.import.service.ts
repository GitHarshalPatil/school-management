import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors';
import { parseExcelFile, formatExcelDate, type ExcelStudentRow } from '../../utils/excel.helper';

const prisma = new PrismaClient();

export interface ValidatedStudentRow {
  firstName: string;
  lastName: string;
  rollNumber: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: Date;
  classId: string;
  parentName: string;
  parentMobile: string;
  parentEmail: string;
}

export interface ValidationErrorRow {
  rowNumber: number;
  errors: string[];
}

export interface StudentRowWithStatus {
  rowNumber: number;
  firstName: string;
  lastName: string;
  rollNumber: string;
  gender: string;
  dateOfBirth: string;
  className: string;
  division: string;
  parentName: string;
  parentMobile: string;
  parentEmail: string;
  status: 'pending' | 'valid' | 'invalid' | 'duplicate';
  errors?: string[];
  validatedData?: ValidatedStudentRow;
}

export interface VerifyImportResult {
  validRows: ValidatedStudentRow[];
  invalidRows: ValidationErrorRow[];
  allRows: StudentRowWithStatus[];
}

/**
 * Get or create parent user and profile (same as in student.service.ts)
 */
async function getOrCreateParent(
  schoolId: string,
  parentName: string,
  parentMobile: string,
  parentEmail: string
): Promise<string> {
  const nameParts = parentName.trim().split(/\s+/);
  const firstName = nameParts[0] || parentName;
  const lastName = nameParts.slice(1).join(' ') || parentName;

  let parentUser = await prisma.user.findUnique({
    where: { email: parentEmail },
    include: { parentProfile: true },
  });

  if (parentUser) {
    if (parentUser.schoolId !== schoolId) {
      throw new ConflictError(
        'Parent email already exists in another school'
      );
    }
    if (parentUser.parentProfile) {
      return parentUser.parentProfile.id;
    }
  }

  const parentRole = await prisma.role.findUnique({
    where: { name: 'PARENT' },
  });

  if (!parentRole) {
    throw new NotFoundError('PARENT role not found. Please run database seed first.');
  }

  const passwordHash = await hashPassword(parentMobile);

  parentUser = await prisma.user.create({
    data: {
      schoolId,
      roleId: parentRole.id,
      email: parentEmail,
      passwordHash,
      phone: parentMobile,
      isActive: true,
      parentProfile: {
        create: {
          firstName,
          lastName,
          relation: 'Guardian',
        },
      },
    },
    include: { parentProfile: true },
  });

  if (!parentUser.parentProfile) {
    throw new ValidationError('Failed to create parent profile');
  }

  return parentUser.parentProfile.id;
}

/**
 * Verify Excel file and validate all rows
 * This does NOT insert data into database
 */
export async function verifyImportFile(
  schoolId: string,
  fileBuffer: Buffer
): Promise<VerifyImportResult> {
  // Parse Excel file
  const excelRows = await parseExcelFile(fileBuffer);

  if (excelRows.length === 0) {
    throw new ValidationError('Excel file is empty or contains no data rows');
  }

  // Get current academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
  });

  if (!academicYear) {
    throw new ValidationError('No current academic year found. Please set up academic year first.');
  }

  // Get all classes for this school with their details
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      academicYearId: academicYear.id,
    },
    include: {
      standard: true,
      board: true,
    },
  });

  return validateRows(schoolId, excelRows, classes, academicYear.id);
}

/**
 * Verify edited rows data (from frontend)
 */
export async function verifyImportRows(
  schoolId: string,
  rows: Array<{
    rowNumber: number;
    firstName: string;
    lastName: string;
    rollNumber: string;
    gender: string;
    dateOfBirth: string;
    className: string;
    division: string;
    parentName: string;
    parentMobile: string;
    parentEmail: string;
  }>
): Promise<VerifyImportResult> {
  // Get current academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
  });

  if (!academicYear) {
    throw new ValidationError('No current academic year found. Please set up academic year first.');
  }

  // Get all classes for this school with their details
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      academicYearId: academicYear.id,
    },
    include: {
      standard: true,
      board: true,
    },
  });

  // Convert to ExcelStudentRow format
  const excelRows: ExcelStudentRow[] = rows.map((r) => ({
    rowNumber: r.rowNumber,
    firstName: r.firstName,
    lastName: r.lastName,
    rollNumber: r.rollNumber,
    gender: r.gender,
    dateOfBirth: r.dateOfBirth,
    className: r.className,
    division: r.division,
    parentName: r.parentName,
    parentMobile: r.parentMobile,
    parentEmail: r.parentEmail,
  }));

  return validateRows(schoolId, excelRows, classes, academicYear.id);
}

/**
 * Validate rows data (used for both file and edited rows)
 */
async function validateRows(
  schoolId: string,
  rows: ExcelStudentRow[],
  classes: Array<{ id: string; standard: { name: string }; section: string; board: { name: string } }>,
  academicYearId: string
): Promise<VerifyImportResult> {
  // Helper function to normalize class name (same as in student.service.ts)
  const normalizeClassName = (className: string): string => {
    const trimmed = className.trim();

    // Handle Junior KG / Senior KG
    const lowerTrimmed = trimmed.toLowerCase();
    if (lowerTrimmed === 'junior kg' || lowerTrimmed === 'junior' || lowerTrimmed === 'jkg') {
      return 'LKG';
    }
    if (lowerTrimmed === 'senior kg' || lowerTrimmed === 'senior' || lowerTrimmed === 'skg') {
      return 'UKG';
    }

    // Handle numbers: "1" -> "1st", "2" -> "2nd", etc.
    const numMatch = trimmed.match(/^(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num === 1) return '1st';
      if (num === 2) return '2nd';
      if (num === 3) return '3rd';
      if (num >= 4 && num <= 10) return `${num}th`;
      return `${num}th`;
    }

    // If it already has suffix (like "1st", "2nd", "10th"), check if it matches database format
    const suffixMatch = trimmed.match(/^(\d+)(st|nd|rd|th)$/i);
    if (suffixMatch) {
      const num = parseInt(suffixMatch[1], 10);
      if (num === 1) return '1st';
      if (num === 2) return '2nd';
      if (num === 3) return '3rd';
      if (num >= 4 && num <= 10) return `${num}th`;
      return `${num}th`;
    }

    // If it's already in database format (Nursery, LKG, UKG, 1st, 2nd, etc.), return as is
    return trimmed;
  };

  // Create a map: standardName + section -> classId
  const classMap = new Map<string, string>();
  classes.forEach((cls) => {
    // Use the standard name as-is (already normalized in database: LKG, UKG, 1st, 2nd, etc.)
    const key = `${cls.standard.name.toLowerCase().trim()}_${cls.section.toUpperCase().trim()}`;
    classMap.set(key, cls.id);
  });

  const validRows: ValidatedStudentRow[] = [];
  const invalidRows: ValidationErrorRow[] = [];
  const allRows: StudentRowWithStatus[] = [];
  const rollNumberMap = new Map<string, Set<number>>(); // classId -> Set of row numbers with roll numbers

  // Validate each row
  for (const row of rows) {
    const errors: string[] = [];

    // Validate First Name
    if (!row.firstName || row.firstName.trim() === '') {
      errors.push('First Name is required');
    } else if (row.firstName.length > 100) {
      errors.push('First Name is too long (max 100 characters)');
    }

    // Validate Last Name
    if (!row.lastName || row.lastName.trim() === '') {
      errors.push('Last Name is required');
    } else if (row.lastName.length > 100) {
      errors.push('Last Name is too long (max 100 characters)');
    }

    // Validate Roll Number
    if (!row.rollNumber || row.rollNumber.trim() === '') {
      errors.push('Roll Number is required');
    } else if (row.rollNumber.length > 50) {
      errors.push('Roll Number is too long (max 50 characters)');
    }

    // Validate Gender
    const genderUpper = row.gender.toUpperCase();
    if (!row.gender || row.gender.trim() === '') {
      errors.push('Gender is required');
    } else if (!['MALE', 'FEMALE', 'OTHER'].includes(genderUpper)) {
      errors.push('Gender must be MALE, FEMALE, or OTHER');
    }

    // Validate DOB
    let dateOfBirth: Date | null = null;
    const dobStr = String(row.dateOfBirth || '').trim();
    if (!dobStr) {
      errors.push('Date of Birth is required');
    } else {
      // First try to format the date
      let formattedDate = formatExcelDate(row.dateOfBirth);

      // If formatExcelDate didn't work, try parsing as-is
      if (!formattedDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        // Try to parse various date formats
        const parsedDate = new Date(dobStr);
        if (!isNaN(parsedDate.getTime())) {
          formattedDate = parsedDate.toISOString().split('T')[0];
        }
      }

      if (!formattedDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        errors.push('Date of Birth must be in YYYY-MM-DD format (e.g., 2010-05-15)');
      } else {
        const parsedDate = new Date(formattedDate);
        if (isNaN(parsedDate.getTime())) {
          errors.push('Invalid Date of Birth');
        } else {
          dateOfBirth = parsedDate;
        }
      }
    }

    // Validate Division
    if (!row.division || row.division.trim() === '') {
      errors.push('Division is required');
    } else if (row.division.trim().length > 10) {
      errors.push('Division must be a single letter or short code (max 10 characters)');
    }

    // Validate Class and map to classId
    let classId: string | null = null;
    if (!row.className || row.className.trim() === '') {
      errors.push('Class is required');
    } else if (!row.division || row.division.trim() === '') {
      // Division already validated above, but don't try to find class if division is missing
    } else {
      const normalizedClassName = normalizeClassName(row.className);
      const division = row.division.trim().toUpperCase();
      const classKey = `${normalizedClassName.toLowerCase().trim()}_${division}`;
      classId = classMap.get(classKey) || null;
      if (!classId) {
        errors.push(`Class "${row.className}" with Division "${row.division}" not found. Please create this class first.`);
      }
    }

    // Validate Parent Name
    if (!row.parentName || row.parentName.trim() === '') {
      errors.push('Parent Name is required');
    } else if (row.parentName.length > 100) {
      errors.push('Parent Name is too long (max 100 characters)');
    }

    // Validate Parent Mobile
    if (!row.parentMobile || row.parentMobile.trim() === '') {
      errors.push('Parent Mobile is required');
    } else if (!/^\d{10}$/.test(row.parentMobile.trim())) {
      errors.push('Parent Mobile must be exactly 10 digits');
    }

    // Validate Parent Email
    if (!row.parentEmail || row.parentEmail.trim() === '') {
      errors.push('Parent Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.parentEmail.trim())) {
        errors.push('Invalid Parent Email format');
      }
    }

    // Check for duplicate roll number in same class (within this import)
    let isDuplicate = false;
    if (classId && row.rollNumber && row.rollNumber.trim() !== '') {
      if (!rollNumberMap.has(classId)) {
        rollNumberMap.set(classId, new Set());
      }
      const rollNumbersInClass = rollNumberMap.get(classId)!;

      // Check if this roll number already exists in this row's data (same class and division)
      const normalizedClassName = normalizeClassName(row.className);
      const division = row.division.trim().toUpperCase();
      const existingRow = rows.find(
        (r: ExcelStudentRow) =>
          normalizeClassName(r.className) === normalizedClassName &&
          r.division.trim().toUpperCase() === division &&
          r.rollNumber.trim() === row.rollNumber.trim() &&
          r.rowNumber !== row.rowNumber
      );
      if (existingRow) {
        isDuplicate = true;
        errors.push(`Duplicate Roll Number "${row.rollNumber}" found in row ${existingRow.rowNumber}`);
      } else {
        rollNumbersInClass.add(row.rowNumber);
      }
    }

    // Create row with status
    let status: 'pending' | 'valid' | 'invalid' | 'duplicate' = 'pending';
    if (isDuplicate) {
      status = 'duplicate';
    } else if (errors.length > 0) {
      status = 'invalid';
    } else if (errors.length === 0 && classId && dateOfBirth) {
      status = 'valid';
    } else {
      status = 'invalid';
    }

    // Ensure dateOfBirth is in YYYY-MM-DD format for display
    let formattedDateOfBirth = String(row.dateOfBirth || '').trim();
    if (formattedDateOfBirth) {
      // First try formatExcelDate
      let formatted = formatExcelDate(row.dateOfBirth);
      if (formatted && /^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
        formattedDateOfBirth = formatted;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDateOfBirth)) {
        // Try to parse and format
        const parsedDate = new Date(formattedDateOfBirth);
        if (!isNaN(parsedDate.getTime())) {
          formattedDateOfBirth = parsedDate.toISOString().split('T')[0];
        }
      }
    }

    // Ensure parentMobile is a string
    let parentMobileStr = String(row.parentMobile || '').trim();
    // Handle Excel cell objects
    if (parentMobileStr === '[object Object]' || parentMobileStr === '') {
      // Try to get value from cell if it's an object
      if (typeof row.parentMobile === 'object' && row.parentMobile !== null) {
        parentMobileStr = String((row.parentMobile as any).text || (row.parentMobile as any).value || '').trim();
      }
    }

    const rowWithStatus: StudentRowWithStatus = {
      rowNumber: row.rowNumber,
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      rollNumber: row.rollNumber.trim(),
      gender: row.gender.trim(),
      dateOfBirth: formattedDateOfBirth,
      className: row.className.trim(),
      division: row.division.trim(),
      parentName: row.parentName.trim(),
      parentMobile: parentMobileStr,
      parentEmail: row.parentEmail.trim(),
      status,
      errors: errors.length > 0 ? errors : undefined,
    };

    // If no errors and not duplicate, add to valid rows
    if (status === 'valid' && classId && dateOfBirth) {
      const validatedData: ValidatedStudentRow = {
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        rollNumber: row.rollNumber.trim(),
        gender: genderUpper as 'MALE' | 'FEMALE' | 'OTHER',
        dateOfBirth,
        classId,
        parentName: row.parentName.trim(),
        parentMobile: row.parentMobile.trim(),
        parentEmail: row.parentEmail.trim().toLowerCase(),
      };
      validRows.push(validatedData);
      rowWithStatus.validatedData = validatedData;
    } else {
      invalidRows.push({
        rowNumber: row.rowNumber,
        errors,
      });
    }

    allRows.push(rowWithStatus);
  }

  // Additional check: Check for duplicate roll numbers in database (per class)
  if (validRows.length > 0) {
    const classIds = [...new Set(validRows.map((r) => r.classId))];
    const rollNumbersByClass = new Map<string, string[]>();

    validRows.forEach((row) => {
      if (!rollNumbersByClass.has(row.classId)) {
        rollNumbersByClass.set(row.classId, []);
      }
      rollNumbersByClass.get(row.classId)!.push(row.rollNumber);
    });

    // Check database for existing roll numbers
    for (const [classId, rollNumbers] of rollNumbersByClass.entries()) {
      const existingStudents = await prisma.student.findMany({
        where: {
          schoolId,
          classId,
          admissionNumber: { in: rollNumbers },
          isActive: true,
        },
        select: { admissionNumber: true },
      });

      const existingRollNumbers = new Set(
        existingStudents.map((s) => s.admissionNumber)
      );

      // Mark rows with duplicate roll numbers as duplicate
      const rowsToRemove: ValidatedStudentRow[] = [];
      validRows.forEach((row) => {
        if (
          row.classId === classId &&
          existingRollNumbers.has(row.rollNumber)
        ) {
          rowsToRemove.push(row);
          const excelRow = rows.find(
            (r: ExcelStudentRow) => {
              const normalizedClassName = normalizeClassName(r.className);
              const division = r.division.trim().toUpperCase();
              const classRecord = classes.find(c => c.id === classId);
              if (!classRecord) return false;
              return r.rollNumber.trim() === row.rollNumber.trim() &&
                normalizeClassName(classRecord.standard.name) === normalizedClassName &&
                classRecord.section.toUpperCase() === division;
            }
          );
          const rowNumber = excelRow?.rowNumber || 0;

          // Update status in allRows
          const rowIndex = allRows.findIndex(r => r.rowNumber === rowNumber);
          if (rowIndex !== -1) {
            allRows[rowIndex].status = 'duplicate';
            allRows[rowIndex].errors = [`Roll Number "${row.rollNumber}" already exists in this class`];
            allRows[rowIndex].validatedData = undefined;
          }

          invalidRows.push({
            rowNumber,
            errors: [`Roll Number "${row.rollNumber}" already exists in this class`],
          });
        }
      });

      // Remove invalid rows
      rowsToRemove.forEach((rowToRemove) => {
        const index = validRows.findIndex(
          (r) => r.rollNumber === rowToRemove.rollNumber && r.classId === rowToRemove.classId
        );
        if (index !== -1) {
          validRows.splice(index, 1);
        }
      });
    }
  }

  // Sort allRows by rowNumber
  allRows.sort((a, b) => a.rowNumber - b.rowNumber);

  return {
    validRows,
    invalidRows,
    allRows,
  };
}

/**
 * Bulk import verified students
 * Uses database transaction for atomicity
 */
export async function bulkImportStudents(
  schoolId: string,
  verifiedRows: ValidatedStudentRow[]
): Promise<{ success: number; failed: number }> {
  if (verifiedRows.length === 0) {
    throw new ValidationError('No valid students to import');
  }

  let successCount = 0;
  let failedCount = 0;

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Get class details for all classes in the import
    const classIds = [...new Set(verifiedRows.map((r) => r.classId))];
    const classes = await tx.class.findMany({
      where: {
        id: { in: classIds },
        schoolId,
      },
    });

    const classMap = new Map(classes.map((c) => [c.id, c]));

    // Process each student
    for (const row of verifiedRows) {
      try {
        const classRecord = classMap.get(row.classId);
        if (!classRecord) {
          failedCount++;
          continue;
        }

        // Get or create parent (needs to be outside transaction for user creation)
        // Note: This is a limitation - parent creation happens outside transaction
        const parentId = await getOrCreateParent(
          schoolId,
          row.parentName,
          row.parentMobile,
          row.parentEmail
        );

        // Create student
        await tx.student.create({
          data: {
            schoolId,
            academicYearId: classRecord.academicYearId,
            classId: row.classId,
            parentId,
            standardId: classRecord.standardId,
            admissionNumber: row.rollNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            dateOfBirth: row.dateOfBirth,
            gender: row.gender,
            admissionDate: new Date(),
            isActive: true,
          },
        });

        successCount++;
      } catch (error) {
        failedCount++;
        // Log error but continue with other students
        console.error(`Failed to import student ${row.rollNumber}:`, error);
      }
    }
  });

  return {
    success: successCount,
    failed: failedCount,
  };
}