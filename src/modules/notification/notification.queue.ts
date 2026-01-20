import Queue from 'bull';
import { env } from '../../config/env';

export interface NotificationJobData {
  title: string;
  message: string;
  data?: Record<string, string>;
  recipientUserIds: string[];
  initiatedBy: string;
}

const redisConfig = {
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword || undefined,
};

// Create queue - Bull will handle Redis connection errors gracefully
export const notificationQueue = new Queue<NotificationJobData>('notification-queue', {
  redis: {
    ...redisConfig,
    // Reduce connection retry attempts to minimize error spam
    retryStrategy: (times: number) => {
      // Only retry a few times, then give up
      if (times > 3) {
        return null; // Stop retrying
      }
      return Math.min(times * 100, 1000); // Quick retries
    },
    maxRetriesPerRequest: 1, // Fail fast if Redis is down
    enableReadyCheck: false, // Don't wait for ready check
    lazyConnect: true, // Don't connect immediately
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
  settings: {
    retryProcessDelay: 5000,
    maxStalledCount: 0,
  },
});

// Handle queue errors gracefully - only log once to reduce noise
let redisErrorLogged = false;
notificationQueue.on('error', (error) => {
  if (!redisErrorLogged) {
    console.warn('⚠️  Redis connection failed. Notifications will not be queued until Redis is available.');
    console.warn('   To fix: Install and start Redis on localhost:6379');
    console.warn('   The server will continue running, but notifications will not be sent.');
    redisErrorLogged = true;
  }
  // Suppress repeated error logs
});

notificationQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

notificationQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

export default notificationQueue;

