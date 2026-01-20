import { Router } from 'express';
import {
  createTeacherController,
  listTeachersController,
  assignTeacherToClassController,
  getParentController,
  updateTeacherStatusController,
  updateTeacherController,
  deleteTeacherController,
} from './user.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { errorHandler } from '../../middlewares/errorHandler';

const router = Router();

/**
 * @route   POST /api/user/teacher
 * @desc    Create a new teacher (with optional class assignments)
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/teacher',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  createTeacherController
);

/**
 * @route   GET /api/user/teachers
 * @desc    List all teachers in the school
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/teachers',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  listTeachersController
);

/**
 * @route   POST /api/user/teacher/assign
 * @desc    Assign teacher to one or more classes
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/teacher/assign',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  assignTeacherToClassController
);

/**
 * @route   GET /api/user/parent/:id
 * @desc    Get parent profile by ID
 * @access  Parent themselves or SCHOOL_ADMIN
 */
router.get(
  '/parent/:id',
  authenticate,
  getParentController
);

/**
 * @route   PUT /api/user/teachers/status
 * @desc    Update teacher status (active/inactive)
 * @access  SCHOOL_ADMIN only
 */
router.put(
  '/teachers/status',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  updateTeacherStatusController
);

/**
 * @route   PUT /api/user/teacher/:id
 * @desc    Update teacher information
 * @access  SCHOOL_ADMIN only
 */
router.put(
  '/teacher/:id',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  updateTeacherController
);

/**
 * @route   DELETE /api/user/teacher/:id
 * @desc    Delete teacher
 * @access  SCHOOL_ADMIN only
 */
router.delete(
  '/teacher/:id',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  deleteTeacherController
);

// Apply error handler
router.use(errorHandler);

export default router;

