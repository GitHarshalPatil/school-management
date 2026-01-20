import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  getClassesForSchool,
  getAllStandards,
} from './student.service';
import {
  verifyImportFile,
  verifyImportRows,
  bulkImportStudents,
} from './student.import.service';
import { generateSampleExcel, parseExcelFile } from '../../utils/excel.helper';
import fs from 'fs';
import { sendSuccess } from '../../utils/response';
import { ValidationError, NotFoundError } from '../../utils/errors';
import {
  createStudentSchema,
  getStudentsQuerySchema,
  updateStudentSchema,
  deleteStudentSchema,
  verifyRowsSchema,
  importStudentsSchema,
} from './student.schema';

const prisma = new PrismaClient();

/**
 * Helper to get school ID from authenticated user
 */
async function getSchoolIdFromUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  if (!user || !user.schoolId) {
    throw new NotFoundError('User or school not found');
  }

  return user.schoolId;
}

/**
 * Create student controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function createStudentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = createStudentSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    
    // Log for debugging
    console.log('Creating student with:', {
      className: body.className,
      division: body.division,
      rollNumber: body.rollNumber,
    });
    
    const result = await createStudent(schoolId, body);

    sendSuccess(res, result, 'Student created successfully', 201);
  } catch (error) {
    // Log error details for debugging
    console.error('Error in createStudentController:', error);
    next(error);
  }
}

/**
 * Get students controller (paginated)
 * Only accessible by SCHOOL_ADMIN
 */
export async function getStudentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = getStudentsQuerySchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const query = validationResult.data.query;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const result = await getStudents(schoolId, query);

    sendSuccess(res, result, 'Students retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update student controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function updateStudentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = updateStudentSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { studentId } = validationResult.data.params;
    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const result = await updateStudent(studentId, schoolId, body);

    sendSuccess(res, result, 'Student updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete student controller (soft delete)
 * Only accessible by SCHOOL_ADMIN
 */
export async function deleteStudentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = deleteStudentSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { studentId } = validationResult.data.params;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    await deleteStudent(studentId, schoolId);

    sendSuccess(res, null, 'Student deleted successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Download sample Excel file
 * Only accessible by SCHOOL_ADMIN
 */
export async function downloadSampleExcelController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buffer = await generateSampleExcel();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="student_import_sample.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Parse Excel file (no validation, just read data)
 * Only accessible by SCHOOL_ADMIN
 */
export async function parseImportFileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Parse Excel file
    const excelRows = await parseExcelFile(fileBuffer);

    // Format rows for frontend (with pending status)
    const allRows = excelRows.map((row) => ({
      rowNumber: row.rowNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      rollNumber: row.rollNumber,
      gender: row.gender,
      dateOfBirth: row.dateOfBirth, // Keep as string from Excel
      className: row.className,
      division: row.division,
      parentName: row.parentName,
      parentMobile: row.parentMobile,
      parentEmail: row.parentEmail,
      status: 'pending' as const,
    }));

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    sendSuccess(
      res,
      { allRows },
      'File parsed successfully',
      200
    );
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

/**
 * Verify bulk import file (no DB insert)
 * Only accessible by SCHOOL_ADMIN
 */
export async function verifyImportFileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new ValidationError('Excel file is required');
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);

    // Read file buffer
    const fileBuffer = fs.readFileSync(req.file.path);

    // Verify and validate file
    const result = await verifyImportFile(schoolId, fileBuffer);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    sendSuccess(res, result, 'File verified successfully', 200);
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

/**
 * Verify edited rows (from frontend)
 * Only accessible by SCHOOL_ADMIN
 */
export async function verifyRowsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = verifyRowsSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const { rows } = validationResult.data.body;

    // Verify and validate rows
    const result = await verifyImportRows(schoolId, rows);

    sendSuccess(res, result, 'Rows verified successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Import students (final step)
 * Only accessible by SCHOOL_ADMIN
 */
export async function importStudentsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = importStudentsSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { verifiedRows } = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const result = await bulkImportStudents(schoolId, verifiedRows);

    sendSuccess(res, result, 'Students imported successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get classes for dropdown
 * Only accessible by SCHOOL_ADMIN
 */
export async function getClassesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const classes = await getClassesForSchool(schoolId);

    sendSuccess(res, classes, 'Classes retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all standards for dropdown
 * Only accessible by SCHOOL_ADMIN
 */
export async function getStandardsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const standards = await getAllStandards();
    sendSuccess(res, standards, 'Standards retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}
