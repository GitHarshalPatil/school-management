import { Router } from 'express';
import {
  markAttendanceController,
  viewAttendanceController,
  editAttendanceController,
} from './attendance.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { errorHandler } from '../../middlewares/errorHandler';

const router = Router();

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark attendance for a class
 * @access  TEACHER only (must be assigned to the class)
 */
router.post('/mark', authenticate, authorize('TEACHER'), markAttendanceController);

/**
 * @route   GET /api/attendance/class/:classId
 * @desc    View attendance for a class
 * @access  TEACHER (own classes), SCHOOL_ADMIN (all), PARENT (own child)
 * @query   date (YYYY-MM-DD) or startDate & endDate (YYYY-MM-DD)
 */
router.get('/class/:classId', authenticate, viewAttendanceController);

/**
 * @route   PUT /api/attendance/edit/:date/:classId
 * @desc    Edit attendance for a specific date and class
 * @access  SCHOOL_ADMIN only
 * @params  date (YYYY-MM-DD), classId (UUID)
 */
router.put(
  '/edit/:date/:classId',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  editAttendanceController
);

// Apply error handler
router.use(errorHandler);

export default router;

