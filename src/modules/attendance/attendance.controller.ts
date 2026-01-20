import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  markAttendance,
  viewAttendance,
  editAttendance,
} from './attendance.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, NotFoundError } from '../../utils/errors';
import {
  markAttendanceSchema,
  viewAttendanceParamsSchema,
  editAttendanceSchema,
} from './attendance.schema';

const prisma = new PrismaClient();

/**
 * Helper to get school ID from authenticated user
 */
async function getSchoolIdFromUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user.schoolId;
}

/**
 * Mark attendance controller
 * Teacher only - must be assigned to the class
 */
export async function markAttendanceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = markAttendanceSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    if (req.user.role !== 'TEACHER') {
      throw new ValidationError('Only teachers can mark attendance');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await markAttendance(schoolId, req.user.userId, body);

    sendSuccess(res, result, 'Attendance marked successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * View attendance controller
 * Teacher: own classes only
 * Admin: all classes
 * Parent: own child only
 */
export async function viewAttendanceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params and query
    const validationResult = viewAttendanceParamsSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { classId } = validationResult.data.params;
    const query = validationResult.data.query;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await viewAttendance(
      schoolId,
      classId,
      query,
      req.user.userId,
      req.user.role
    );

    sendSuccess(res, result, 'Attendance retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Edit attendance controller
 * Admin only
 */
export async function editAttendanceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params and body
    const validationResult = editAttendanceSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { date, classId } = validationResult.data.params;
    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    if (req.user.role !== 'SCHOOL_ADMIN') {
      throw new ValidationError('Only school admin can edit attendance');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await editAttendance(schoolId, classId, date, body);

    sendSuccess(res, result, 'Attendance updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

