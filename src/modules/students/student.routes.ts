import { Router } from 'express';
import {
  createStudentController,
  getStudentsController,
  updateStudentController,
  deleteStudentController,
  downloadSampleExcelController,
  parseImportFileController,
  verifyImportFileController,
  verifyRowsController,
  importStudentsController,
  getClassesController,
  getStandardsController,
} from './student.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { errorHandler } from '../../middlewares/errorHandler';
import { uploadExcelSingle } from '../../utils/multer';

const router = Router();

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  createStudentController
);

/**
 * @route   GET /api/students
 * @desc    Get students with pagination
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  getStudentsController
);

/**
 * @route   GET /api/students/classes
 * @desc    Get all classes for dropdown
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/classes',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  getClassesController
);

/**
 * @route   GET /api/students/standards
 * @desc    Get all standards for dropdown
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/standards',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  getStandardsController
);

/**
 * @route   PUT /api/students/:studentId
 * @desc    Update student information
 * @access  SCHOOL_ADMIN only
 */
router.put(
  '/:studentId',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  updateStudentController
);

/**
 * @route   DELETE /api/students/:studentId
 * @desc    Delete student (soft delete)
 * @access  SCHOOL_ADMIN only
 */
router.delete(
  '/:studentId',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  deleteStudentController
);

/**
 * @route   GET /api/students/import/sample
 * @desc    Download sample Excel file
 * @access  SCHOOL_ADMIN only
 */
router.get(
  '/import/sample',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  downloadSampleExcelController
);

/**
 * @route   POST /api/students/import/parse
 * @desc    Parse Excel file (read data only, no validation)
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/import/parse',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  uploadExcelSingle('file'),
  parseImportFileController
);

/**
 * @route   POST /api/students/import/parse
 * @desc    Parse Excel file (read data only, no validation)
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/import/parse',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  uploadExcelSingle('file'),
  parseImportFileController
);

/**
 * @route   POST /api/students/import/verify
 * @desc    Verify bulk import file (no DB insert)
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/import/verify',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  uploadExcelSingle('file'),
  verifyImportFileController
);

/**
 * @route   POST /api/students/import/verify-rows
 * @desc    Verify edited rows data (no file upload)
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/import/verify-rows',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  verifyRowsController
);

/**
 * @route   POST /api/students/import
 * @desc    Import verified students (final step)
 * @access  SCHOOL_ADMIN only
 */
router.post(
  '/import',
  authenticate,
  authorize('SCHOOL_ADMIN'),
  importStudentsController
);

// Apply error handler
router.use(errorHandler);

export default router;
