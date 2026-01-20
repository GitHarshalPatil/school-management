import { Request, Response, NextFunction } from 'express';
import { login, refreshAccessToken } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { loginSchema, refreshTokenSchema } from './auth.schema';

/**
 * Login controller
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Log received request body (for debugging)
    console.log('[Login Request] Received payload:', {
      email: req.body?.email ? `${req.body.email.substring(0, 3)}***` : 'missing',
      password: req.body?.password ? '***' : 'missing',
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });

    // Validate request body
    const validationResult = loginSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { email, password } = validationResult.data.body;

    // Authenticate user
    const result = await login(email, password);

    sendSuccess(res, result, 'Login successful', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh token controller
 */
export async function refreshTokenController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = refreshTokenSchema.safeParse(req);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      throw new ValidationError(errors);
    }

    const { refreshToken } = validationResult.data.body;

    // Refresh tokens
    const result = await refreshAccessToken(refreshToken);

    sendSuccess(res, result, 'Token refreshed successfully', 200);
  } catch (error) {
    next(error);
  }
}

