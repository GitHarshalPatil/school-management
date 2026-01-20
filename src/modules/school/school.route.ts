import { Router } from 'express';
import { setupSchoolController, getCurrentSchoolInfoController, updateSchoolInfoController } from './school.controller';
import { errorHandler } from '../../middlewares/errorHandler';
import { uploadSingle } from '../../utils/multer';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

/**
 * @route   POST /api/school/setup
 * @desc    One-time school setup - creates school, admin user, academic year, and standard-board assignments
 * @access  Public (one-time setup, no auth required)
 * @note    This endpoint can only be called once. After setup, it will reject requests.
 */
router.post('/setup', uploadSingle('logo'), setupSchoolController);

/**
 * @route   GET /api/school/info
 * @desc    Get current school information for authenticated user
 * @access  Private (requires authentication)
 */
router.get('/info', authenticate, getCurrentSchoolInfoController);

/**
 * @route   PUT /api/school/info
 * @desc    Update school information for authenticated user
 * @access  Private (requires authentication)
 */
router.put('/info', authenticate, uploadSingle('logo'), updateSchoolInfoController);

// Apply error handler
router.use(errorHandler);

export default router;

