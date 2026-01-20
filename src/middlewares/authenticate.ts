import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { sendError } from '../utils/response';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT access token
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      sendError(res, error, error.statusCode);
    } else {
      sendError(res, new UnauthorizedError('Authentication failed'), 401);
    }
  }
}

