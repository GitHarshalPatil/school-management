import { z } from 'zod';

export const registerDeviceSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    deviceToken: z.string().min(1, 'Device token is required'),
    platform: z.enum(['IOS', 'ANDROID', 'WEB'], {
      errorMap: () => ({ message: 'Platform must be IOS, ANDROID, or WEB' }),
    }),
  }),
});

export const sendNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
    recipients: z
      .object({
        userIds: z.array(z.string().uuid('Invalid user ID format')).optional(),
        roles: z.array(z.enum(['SCHOOL_ADMIN', 'TEACHER', 'PARENT'])).optional(),
        classIds: z.array(z.string().uuid('Invalid class ID format')).optional(),
      })
      .refine(
        (val) =>
          (val.userIds && val.userIds.length > 0) ||
          (val.roles && val.roles.length > 0) ||
          (val.classIds && val.classIds.length > 0),
        {
          message: 'At least one of userIds, roles, or classIds is required',
        }
      ),
    data: z.record(z.string()).optional(),
  }),
});

export const listNotificationsSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>['body'];
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>['body'];
export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];

