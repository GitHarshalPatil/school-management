import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { sendError } from '../utils/response';

/**
 * Authorization middleware - checks if user has required role(s)
 * @param allowedRoles - Array of role names that are allowed
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not authenticated');
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        sendError(res, error, error.statusCode);
      } else {
        sendError(res, new ForbiddenError('Authorization failed'), 403);
      }
    }
  };
}

