import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import {
  ConflictError,
  ValidationError,
  NotFoundError,
} from '../../utils/errors';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  GetStudentsQuery,
} from './student.schema';

const prisma = new PrismaClient();

export interface StudentWithDetails {
  id: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
  gender: string;
  dateOfBirth: Date;
  isActive: boolean;
  class: {
    id: string;
    name: string;
    section: string;
    standard: {
      name: string;
    };
    board: {
      name: string;
    };
  };
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    user: {
      email: string;
      phone: string | null;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get or create parent user and profile
 */
async function getOrCreateParent(
  schoolId: string,
  parentName: string,
  parentMobile: string,
  parentEmail: string
): Promise<string> {
  // Split parent name into first and last name
  const nameParts = parentName.trim().split(/\s+/);
  const firstName = nameParts[0] || parentName;
  const lastName = nameParts.slice(1).join(' ') || parentName;

  // Check if parent user already exists by email
  let parentUser = await prisma.user.findUnique({
    where: { email: parentEmail },
    include: { parentProfile: true },
  });

  if (parentUser) {
    // Parent exists, verify it belongs to the same school
    if (parentUser.schoolId !== schoolId) {
      throw new ConflictError(
        'Parent email already exists in another school'
      );
    }
    // Return existing parent profile ID
    if (parentUser.parentProfile) {
      return parentUser.parentProfile.id;
    }
  }

  // Get PARENT role
  const parentRole = await prisma.role.findUnique({
    where: { name: 'PARENT' },
  });

  if (!parentRole) {
    throw new NotFoundError('PARENT role not found. Please run database seed first.');
  }

  // Create parent user and profile
  const passwordHash = await hashPassword(parentMobile); // Use mobile as default password

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
          relation: 'Guardian', // Default relation
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
 * Get current academic year for a school
 */
async function getCurrentAcademicYear(schoolId: string): Promise<string> {
  const academicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
  });

  if (!academicYear) {
    throw new NotFoundError(
      'No current academic year found. Please set up academic year first.'
    );
  }

  return academicYear.id;
}

/**
 * Helper function to normalize class name
 * Handles: "1" -> "1st", "2" -> "2nd", "Junior KG" -> "LKG", "Senior KG" -> "UKG"
 */
function normalizeClassName(className: string): string {
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
    // For numbers > 10, still add th suffix
    return `${num}th`;
  }
  
  // If it already has suffix (like "1st", "2nd", "10th"), check if it matches database format
  // Database has: Nursery, LKG, UKG, 1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th, 10th
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
}

/**
 * Find classId from className and division
 */
async function findClassIdByClassNameAndDivision(
  schoolId: string,
  className: string,
  division: string
): Promise<string> {
  try {
    const academicYearId = await getCurrentAcademicYear(schoolId);
    const normalizedClassName = normalizeClassName(className);
    const normalizedDivision = division.trim().toUpperCase();

    // Log for debugging
    console.log('Finding class:', {
      inputClassName: className,
      normalizedClassName,
      division: normalizedDivision,
    });

    // Find standard by name (MySQL doesn't support mode: 'insensitive', so we use exact match)
    // normalizedClassName should match DB format: "1st", "2nd", "LKG", "UKG", etc.
    const standard = await prisma.standard.findFirst({
      where: {
        name: normalizedClassName, // Exact match since normalizedClassName already matches DB format
      },
    });

    if (!standard) {
      // Get all available standards for better error message
      const allStandards = await prisma.standard.findMany({
        select: { name: true },
        orderBy: { order: 'asc' },
      });
      const availableNames = allStandards.map(s => s.name).join(', ');
      
      throw new NotFoundError(
        `Class "${className}" (normalized to "${normalizedClassName}") not found. Available standards: ${availableNames}. Please create this class first.`
      );
    }

    // Find class by standardId, section, academicYearId, and schoolId
    const classRecord = await prisma.class.findFirst({
      where: {
        schoolId,
        academicYearId,
        standardId: standard.id,
        section: normalizedDivision,
      },
    });

    if (!classRecord) {
      throw new NotFoundError(
        `Class "${className}" (${normalizedClassName}) with Division "${division}" not found. Please create this class first in the Classes management page.`
      );
    }

    return classRecord.id;
  } catch (error) {
    // Re-throw AppError as-is, wrap others
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Error in findClassIdByClassNameAndDivision:', error);
    throw new NotFoundError(
      `Failed to find class "${className}" with division "${division}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a new student
 */
export async function createStudent(
  schoolId: string,
  input: CreateStudentInput
): Promise<StudentWithDetails> {
  // Find classId from className and division
  const classId = await findClassIdByClassNameAndDivision(
    schoolId,
    input.className,
    input.division
  );

  // Validate class exists and belongs to school
  const classRecord = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId,
    },
    include: {
      standard: true,
      board: true,
      academicYear: true,
    },
  });

  if (!classRecord) {
    throw new NotFoundError('Class not found or does not belong to this school');
  }

  // Check if roll number already exists in this class
  const existingStudent = await prisma.student.findFirst({
    where: {
      admissionNumber: input.rollNumber,
      classId: classId,
      schoolId,
      isActive: true,
    },
  });

  if (existingStudent) {
    throw new ConflictError(
      `Roll number ${input.rollNumber} already exists in this class`
    );
  }

  // Get or create parent
  const parentId = await getOrCreateParent(
    schoolId,
    input.parentName,
    input.parentMobile,
    input.parentEmail
  );

  // Create student
  const student = await prisma.student.create({
    data: {
      schoolId,
      academicYearId: classRecord.academicYearId,
      classId: classId,
      parentId,
      standardId: classRecord.standardId,
      admissionNumber: input.rollNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      admissionDate: new Date(),
      isActive: true,
    },
    include: {
      class: {
        include: {
          standard: true,
          board: true,
        },
      },
      parent: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    rollNumber: student.admissionNumber,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    isActive: student.isActive,
    class: {
      id: student.class.id,
      name: student.class.name,
      section: student.class.section,
      standard: {
        name: student.class.standard.name,
      },
      board: {
        name: student.class.board.name,
      },
    },
    parent: {
      id: student.parent.id,
      firstName: student.parent.firstName,
      lastName: student.parent.lastName,
      user: {
        email: student.parent.user.email,
        phone: student.parent.user.phone,
      },
    },
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

/**
 * Get students with pagination
 */
export async function getStudents(
  schoolId: string,
  query: GetStudentsQuery
): Promise<{
  students: StudentWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { classId, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = {
    schoolId,
    isActive: true,
  };

  if (classId) {
    where.classId = classId;
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        class: {
          include: {
            standard: true,
            board: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  const formattedStudents: StudentWithDetails[] = students.map((student) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    rollNumber: student.admissionNumber,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    isActive: student.isActive,
    class: {
      id: student.class.id,
      name: student.class.name,
      section: student.class.section,
      standard: {
        name: student.class.standard.name,
      },
      board: {
        name: student.class.board.name,
      },
    },
    parent: {
      id: student.parent.id,
      firstName: student.parent.firstName,
      lastName: student.parent.lastName,
      user: {
        email: student.parent.user.email,
        phone: student.parent.user.phone,
      },
    },
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  }));

  return {
    students: formattedStudents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update student
 */
export async function updateStudent(
  studentId: string,
  schoolId: string,
  input: UpdateStudentInput
): Promise<StudentWithDetails> {
  // Verify student exists and belongs to school
  const existingStudent = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId,
    },
    include: {
      class: true,
    },
  });

  if (!existingStudent) {
    throw new NotFoundError('Student not found or does not belong to this school');
  }

  // If class is being updated, find new classId from className and division
  let newClassId: string | null = null;
  if (input.className && input.division) {
    newClassId = await findClassIdByClassNameAndDivision(
      schoolId,
      input.className,
      input.division
    );
    if (newClassId !== existingStudent.classId) {
      const newClass = await prisma.class.findFirst({
        where: {
          id: newClassId,
          schoolId,
        },
      });

      if (!newClass) {
        throw new NotFoundError('New class not found or does not belong to this school');
      }
    }
  }

  // If roll number is being updated, check for duplicates
  if (input.rollNumber && input.rollNumber !== existingStudent.admissionNumber) {
    const classIdToCheck = newClassId || existingStudent.classId;
    const duplicate = await prisma.student.findFirst({
      where: {
        admissionNumber: input.rollNumber,
        classId: classIdToCheck,
        schoolId,
        isActive: true,
        id: { not: studentId },
      },
    });

    if (duplicate) {
      throw new ConflictError(
        `Roll number ${input.rollNumber} already exists in this class`
      );
    }
  }

  // Update parent if parent info is provided
  let parentId = existingStudent.parentId;
  if (input.parentName || input.parentMobile || input.parentEmail) {
    const currentParent = await prisma.parentProfile.findUnique({
      where: { id: existingStudent.parentId },
      include: { user: true },
    });

    if (currentParent) {
      const parentName = input.parentName || `${currentParent.firstName} ${currentParent.lastName}`;
      const parentMobile = input.parentMobile || currentParent.user.phone || '';
      const parentEmail = input.parentEmail || currentParent.user.email;

      parentId = await getOrCreateParent(
        schoolId,
        parentName,
        parentMobile,
        parentEmail
      );
    }
  }

  // Prepare update data
  const updateData: any = {};

  if (input.firstName) updateData.firstName = input.firstName;
  if (input.lastName) updateData.lastName = input.lastName;
  if (input.rollNumber) updateData.admissionNumber = input.rollNumber;
  if (input.gender) updateData.gender = input.gender;
  if (input.dateOfBirth) updateData.dateOfBirth = input.dateOfBirth;
  if (newClassId) {
    updateData.classId = newClassId;
    // Get new class to update academicYearId and standardId
    const newClass = await prisma.class.findUnique({
      where: { id: input.classId },
    });
    if (newClass) {
      updateData.academicYearId = newClass.academicYearId;
      updateData.standardId = newClass.standardId;
    }
  }
  if (parentId !== existingStudent.parentId) {
    updateData.parentId = parentId;
  }

  // Update student
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: updateData,
    include: {
      class: {
        include: {
          standard: true,
          board: true,
        },
      },
      parent: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  return {
    id: updatedStudent.id,
    firstName: updatedStudent.firstName,
    lastName: updatedStudent.lastName,
    rollNumber: updatedStudent.admissionNumber,
    gender: updatedStudent.gender,
    dateOfBirth: updatedStudent.dateOfBirth,
    isActive: updatedStudent.isActive,
    class: {
      id: updatedStudent.class.id,
      name: updatedStudent.class.name,
      section: updatedStudent.class.section,
      standard: {
        name: updatedStudent.class.standard.name,
      },
      board: {
        name: updatedStudent.class.board.name,
      },
    },
    parent: {
      id: updatedStudent.parent.id,
      firstName: updatedStudent.parent.firstName,
      lastName: updatedStudent.parent.lastName,
      user: {
        email: updatedStudent.parent.user.email,
        phone: updatedStudent.parent.user.phone,
      },
    },
    createdAt: updatedStudent.createdAt,
    updatedAt: updatedStudent.updatedAt,
  };
}

/**
 * Soft delete student (set isActive = false)
 */
export async function deleteStudent(
  studentId: string,
  schoolId: string
): Promise<void> {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      schoolId,
    },
  });

  if (!student) {
    throw new NotFoundError('Student not found or does not belong to this school');
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { isActive: false },
  });
}

/**
 * Get all classes for a school (for dropdown)
 */
/**
 * Get all standards from database for dropdown
 * Returns standards with display names (maps LKG->Junior KG, UKG->Senior KG)
 */
export async function getAllStandards(): Promise<
  Array<{ id: string; name: string; displayName: string; order: number }>
> {
  const standards = await prisma.standard.findMany({
    orderBy: {
      order: 'asc',
    },
  });

  return standards.map((std) => {
    let displayName = std.name;
    // Map database names to user-friendly display names
    if (std.name === 'LKG') displayName = 'Junior KG';
    else if (std.name === 'UKG') displayName = 'Senior KG';
    // For 1st-10th, show as numbers in dropdown: "1", "2", etc.
    else if (std.name.match(/^\d+(st|nd|rd|th)$/)) {
      const numMatch = std.name.match(/^(\d+)/);
      if (numMatch) {
        displayName = numMatch[1];
      }
    }

    return {
      id: std.id,
      name: std.name, // Database name (LKG, UKG, 1st, 2nd, etc.)
      displayName, // Display name (Junior KG, Senior KG, 1, 2, etc.)
      order: std.order,
    };
  });
}

export async function getClassesForSchool(schoolId: string): Promise<
  Array<{
    id: string;
    name: string;
    section: string;
    standard: { name: string };
    board: { name: string };
  }>
> {
  const classes = await prisma.class.findMany({
    where: {
      schoolId,
    },
    include: {
      standard: true,
      board: true,
    },
    orderBy: [
      { standard: { order: 'asc' } },
      { section: 'asc' },
    ],
  });

  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    section: cls.section,
    standard: { name: cls.standard.name },
    board: { name: cls.board.name },
  }));
}
