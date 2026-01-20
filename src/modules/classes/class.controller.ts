import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClass, getClasses, getStandardsAndBoards } from './class.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { createClassSchema, getClassesSchema } from './class.schema';

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
 * Create class controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function createClassController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = createClassSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const result = await createClass(schoolId, body);

    sendSuccess(res, result, 'Class created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get classes controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function getClassesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validationResult = getClassesSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const query = validationResult.data.query;

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const classes = await getClasses(schoolId, query?.academicYearId);

    sendSuccess(res, classes, 'Classes retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get standards and boards controller
 * Only accessible by SCHOOL_ADMIN
 */
export async function getStandardsAndBoardsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolId = await getSchoolIdFromUser(req.user.userId);
    const result = await getStandardsAndBoards(schoolId);

    sendSuccess(res, result, 'Standards and boards retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}
