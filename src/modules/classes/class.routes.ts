import { Router } from 'express';
import {
  createClassController,
  getClassesController,
  getStandardsAndBoardsController,
} from './class.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { errorHandler } from '../../middlewares/errorHandler';

const router = Router();

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  createClassController
);

/**
 * @route   GET /api/classes
 * @desc    Get all classes for the school
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  getClassesController
);

/**
 * @route   GET /api/classes/standards-boards
 * @desc    Get available standards and boards for dropdowns
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/standards-boards',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  getStandardsAndBoardsController
);

// Apply error handler
router.use(errorHandler);

export default router;
