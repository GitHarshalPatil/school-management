import { z } from 'zod';

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long'),
  }),
});

/**
 * Refresh token request validation schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];

