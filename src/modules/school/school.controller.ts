import { Request, Response, NextFunction } from 'express';
import { setupSchool, getCurrentSchoolInfo, updateSchoolInfo } from './school.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { schoolSetupSchema } from './school.schema';

/**
 * School setup controller - one-time initialization
 */
export async function setupSchoolController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = schoolSetupSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const body = validationResult.data.body;

    // Get logo file path if uploaded
    const logoPath = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Prepare service input
    // Note: adminName is validated but not stored (User model doesn't have name field)
    const input = {
      schoolName: body.schoolName,
      address: body.address,
      contactNumber: body.contactNumber,
      schoolEmail: body.schoolEmail,
      logoPath,
      adminEmail: body.adminEmail,
      adminPassword: body.adminPassword,
      standardsWithBoards: body.standardsWithBoards,
      academicYearName: body.academicYearName,
      academicYearStartDate: body.academicYearStartDate,
      academicYearEndDate: body.academicYearEndDate,
    };

    // Setup school
    const result = await setupSchool(input);

    sendSuccess(
      res,
      {
        message: 'School setup completed successfully',
        school: result.school,
        admin: {
          email: result.admin.email,
        },
        academicYear: result.academicYear,
        standardsBoards: result.standardsBoards,
      },
      'School has been initialized successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get current school information controller
 * Returns school info for authenticated user
 */
export async function getCurrentSchoolInfoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const schoolInfo = await getCurrentSchoolInfo(req.user.userId);

    sendSuccess(res, schoolInfo, 'School information retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update school information controller
 */
export async function updateSchoolInfoController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const body = req.body;
    const logoPath = req.file ? `/uploads/${req.file.filename}` : undefined;    const input = {
      ...(body.name && { name: body.name }),
      ...(body.email && { email: body.email }),
      ...(body.phone && { phone: body.phone }),
      ...(body.address && { address: body.address }),
      ...(logoPath && { logoPath }),
    };    const updatedSchool = await updateSchoolInfo(req.user.userId, input);    sendSuccess(res, updatedSchool, 'School information updated successfully', 200);
  } catch (error) {
    next(error);
  }
}
