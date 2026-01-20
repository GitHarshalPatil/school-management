import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables
 */
function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Validate on module load
validateEnv();

export const env = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || '',

  // Firebase
  fcmServerKey: process.env.FCM_SERVER_KEY || '',
  fcmProjectId: process.env.FCM_PROJECT_ID || '',

  // OneSignal
  oneSignalAppId: process.env.ONESIGNAL_APP_ID || '',
  oneSignalRestApiKey: process.env.ONESIGNAL_REST_API_KEY || '',
};

