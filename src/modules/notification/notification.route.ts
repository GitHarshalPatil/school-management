import { Router } from 'express';
import {
  registerDeviceController,
  sendNotificationController,
  listNotificationsController,
} from './notification.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { errorHandler } from '../../middlewares/errorHandler';

const router = Router();

/**
 * @route   POST /api/notification/device
 * @desc    Register device token for push notifications
 * @access  Authenticated users
 */
router.post('/device', authenticate, registerDeviceController);

/**
 * @route   POST /api/notification/send
 * @desc    Queue a push notification
 * @access  SCHOOL_ADMIN only
 */
router.post('/send', authenticate, authorize('SCHOOL_ADMIN'), sendNotificationController);

/**
 * @route   GET /api/notification/list
 * @desc    List notifications (admin: all, users: own)
 * @access  Authenticated users
 */
router.get('/list', authenticate, listNotificationsController);

router.use(errorHandler);

export default router;

