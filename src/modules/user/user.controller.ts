import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createTeacher,
  listTeachers,
  assignTeacherToClass,
  getParentById,
  updateTeacherStatus,
  updateTeacher,
  deleteTeacher,
} from './user.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, NotFoundError } from '../../utils/errors';
import {
  createTeacherSchema,
  assignTeacherToClassSchema,
  getParentParamsSchema,
  updateTeacherStatusSchema,
  updateTeacherSchema,
  deleteTeacherSchema,
} from './user.schema';

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
 * Create teacher controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function createTeacherController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = createTeacherSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await createTeacher(schoolId, body);

    sendSuccess(res, result, 'Teacher created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * List teachers controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function listTeachersController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const teachers = await listTeachers(schoolId);

    sendSuccess(res, teachers, 'Teachers retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Assign teacher to class controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function assignTeacherToClassController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = assignTeacherToClassSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await assignTeacherToClass(schoolId, body);

    sendSuccess(res, result, 'Teacher assigned to classes successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get parent by ID controller
 * Accessible by parent themselves or SCHOOL_ADMIN
 */
export async function getParentController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate params
    const validationResult = getParentParamsSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { id } = validationResult.data.params;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const parent = await getParentById(
      id,
      req.user.userId,
      req.user.role,
      schoolId
    );

    sendSuccess(res, parent, 'Parent retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update teacher status controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function updateTeacherStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = updateTeacherStatusSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await updateTeacherStatus(schoolId, body);

    sendSuccess(res, result, `Teachers ${body.isActive ? 'activated' : 'deactivated'} successfully`, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update teacher controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function updateTeacherController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request
    const validationResult = updateTeacherSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { id } = validationResult.data.params;
    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    const result = await updateTeacher(id, schoolId, body);

    sendSuccess(res, result, 'Teacher updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete teacher controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function deleteTeacherController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request
    const validationResult = deleteTeacherSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }    const { id } = validationResult.data.params;    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Get school ID from authenticated user
    const schoolId = await getSchoolIdFromUser(req.user.userId);

    await deleteTeacher(id, schoolId);    sendSuccess(res, null, 'Teacher deleted successfully', 200);
  } catch (error) {
    next(error);
  }
}
