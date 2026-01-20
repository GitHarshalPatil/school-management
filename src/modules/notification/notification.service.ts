import { PrismaClient } from '@prisma/client';
import { NotificationJobData, notificationQueue } from './notification.queue';
import {
  RegisterDeviceInput,
  SendNotificationInput,
  ListNotificationsQuery,
} from './notification.schema';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { env } from '../../config/env';

const prisma = new PrismaClient();

// Resolve recipient user IDs from userIds, roles, and classIds
async function resolveRecipientUserIds(payload: SendNotificationInput): Promise<string[]> {
  const userIds = new Set<string>();

  console.log('Resolving recipients:', payload.recipients);

  if (payload.recipients.userIds && payload.recipients.userIds.length > 0) {
    console.log('Looking up users by IDs:', payload.recipients.userIds);
    const users = await prisma.user.findMany({
      where: { id: { in: payload.recipients.userIds } },
      select: { id: true },
    });
    console.log('Found users by IDs:', users.map(u => u.id));
    users.forEach((u) => userIds.add(u.id));
  }

  if (payload.recipients.roles && payload.recipients.roles.length > 0) {
    console.log('Looking up users by roles:', payload.recipients.roles);
    const users = await prisma.user.findMany({
      where: {
        role: {
          name: { in: payload.recipients.roles },
        },
      },
      select: { id: true },
    });
    console.log('Found users by roles:', users.map(u => u.id));
    users.forEach((u) => userIds.add(u.id));
  }

  if (payload.recipients.classIds && payload.recipients.classIds.length > 0) {
    // Teachers assigned to classes
    const teachers = await prisma.teacherClass.findMany({
      where: {
        classId: { in: payload.recipients.classIds },
      },
      select: {
        teacher: {
          select: { userId: true },
        },
      },
    });
    teachers.forEach((t) => userIds.add(t.teacher.userId));

    // Parents of students in classes
    const parents = await prisma.student.findMany({
      where: {
        classId: { in: payload.recipients.classIds },
      },
      select: {
        parent: {
          select: { userId: true },
        },
      },
    });
    parents.forEach((p) => {
      if (p.parent) {
        userIds.add(p.parent.userId);
      }
    });
  }

  return Array.from(userIds);
}

/**
 * Register device token for a user
 */
export async function registerDevice(input: RegisterDeviceInput, requesterUserId: string) {
  if (input.userId !== requesterUserId) {
    throw new ConflictError('User ID does not match authenticated user');
  }

  const deviceToken = await prisma.deviceToken.upsert({
    where: {
      userId_token: {
        userId: input.userId,
        token: input.deviceToken,
      },
    },
    update: {
      platform: input.platform,
      isActive: true,
      lastUsedAt: new Date(),
    },
    create: {
      userId: input.userId,
      token: input.deviceToken,
      platform: input.platform,
      isActive: true,
    },
  });

  return deviceToken;
}

/**
 * Enqueue notification job
 */
export async function enqueueNotification(input: SendNotificationInput, initiatedBy: string) {
  console.log('Enqueueing notification with input:', {
    title: input.title,
    message: input.message,
    recipients: input.recipients,
    initiatedBy,
  });

  let recipientUserIds: string[];
  try {
    recipientUserIds = await resolveRecipientUserIds(input);
    console.log('Resolved recipient user IDs:', recipientUserIds);
  } catch (error: any) {
    console.error('Error resolving recipients:', error);
    throw new NotFoundError(`Failed to resolve recipients: ${error?.message || String(error)}`);
  }

  if (recipientUserIds.length === 0) {
    throw new NotFoundError('No recipients found for the provided criteria');
  }

  const jobData: NotificationJobData = {
    title: input.title,
    message: input.message,
    data: input.data,
    recipientUserIds,
    initiatedBy,
  };

  console.log('Adding job to queue:', jobData);
  
  // Wrap in Promise to catch any synchronous errors
  try {
    const jobPromise = notificationQueue.add(jobData);
    const job = await jobPromise;
    console.log('Job added to queue successfully:', job?.id);
  } catch (error: any) {
    console.error('Error adding job to queue:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      name: error?.name,
      stack: error?.stack?.substring(0, 500), // First 500 chars of stack
    });

    // Handle various Redis connection errors
    const errorMessage = (error?.message || String(error) || '').toLowerCase();
    const errorCode = error?.code || '';
    const errorName = error?.name || '';
    const errorString = String(error).toLowerCase();
    
    const isRedisError = 
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('redis') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('connect econnrefused') ||
      errorMessage.includes('connect') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ECONNRESET' ||
      errorName === 'Error' ||
      errorString.includes('redis') ||
      errorString.includes('connection');

    if (isRedisError) {
      console.warn('Redis connection failed. Notification not queued, but returning success to client.');
      // Return success with warning instead of throwing error
      // This prevents the API from returning 500 error
      return {
        queued: false,
        recipientCount: recipientUserIds.length,
        warning: 'Notification queue unavailable. Please ensure Redis is running on localhost:6379. Notification was not sent.',
      };
    }

    // For ANY other error, also return success with warning instead of crashing
    // This ensures the API never returns 500 for notification queue issues
    console.error('Unexpected error in notification queue. Error type:', typeof error);
    console.error('Treating as queue error and returning warning instead of throwing.');
    return {
      queued: false,
      recipientCount: recipientUserIds.length,
      warning: `Notification queue error: ${error?.message || String(error)}. Please check Redis connection.`,
    };
  }

  return {
    queued: true,
    recipientCount: recipientUserIds.length,
  };
}

/**
 * List notifications (from queue history)
 * Admin: all notifications
 * Users: only their notifications
 */
export async function listNotifications(
  requesterRole: string,
  requesterUserId: string,
  query: ListNotificationsQuery
) {
  const limit = query.limit || 50;

  const jobs = await notificationQueue.getJobs(['completed', 'failed'], 0, limit - 1, false);

  const items = jobs.map((job) => {
    const data = job.data as NotificationJobData;
    return {
      id: job.id,
      state: job.finishedOn ? 'completed' : 'failed',
      failedReason: (job as any).failedReason || null,
      title: data.title,
      message: data.message,
      recipientUserIds: data.recipientUserIds,
      initiatedBy: data.initiatedBy,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    };
  });

  if (requesterRole === 'SCHOOL_ADMIN') {
    return items;
  }

  return items.filter((item) => item.recipientUserIds.includes(requesterUserId));
}

/**
 * Fetch device tokens for given users
 */
export async function getDeviceTokensForUsers(userIds: string[]) {
  return prisma.deviceToken.findMany({
    where: {
      userId: { in: userIds },
      isActive: true,
    },
  });
}

export function getOneSignalConfig() {
  return {
    appId: env.oneSignalAppId,
    restApiKey: env.oneSignalRestApiKey,
  };
}

export function getFcmConfig() {
  return {
    serverKey: env.fcmServerKey,
    projectId: env.fcmProjectId,
  };
}

