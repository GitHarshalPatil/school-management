import { Request, Response, NextFunction } from 'express';
import {
  registerDeviceSchema,
  sendNotificationSchema,
  listNotificationsSchema,
} from './notification.schema';
import { registerDevice, enqueueNotification, listNotifications } from './notification.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';

export async function registerDeviceController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validation = registerDeviceSchema.safeParse(req);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const body = validation.data.body;

    const result = await registerDevice(body, req.user.userId);

    sendSuccess(res, result, 'Device registered successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function sendNotificationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log('Received notification request:', {
      body: req.body,
      user: req.user ? { userId: req.user.userId, role: req.user.role } : null,
    });

    const validation = sendNotificationSchema.safeParse(req);
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors);
      const errors = validation.error.errors.map((e) => {
        return `${e.path.join('.')}: ${e.message}`;
      }).join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const body = validation.data.body;
    console.log('Validated body:', body);

    const result = await enqueueNotification(body, req.user.userId);
    console.log('Notification queued successfully:', result);

    sendSuccess(res, result, 'Notification queued', 202);
  } catch (error) {
    console.error('Error in sendNotificationController:', error);
    next(error);
  }
}

export async function listNotificationsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validation = listNotificationsSchema.safeParse(req);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const result = await listNotifications(
      req.user.role,
      req.user.userId,
      validation.data.query || {}
    );

    sendSuccess(res, result, 'Notifications retrieved', 200);
  } catch (error) {
    next(error);
  }
}

