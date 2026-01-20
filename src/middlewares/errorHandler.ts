import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err, err.statusCode);
    return;
  }

  // Log unexpected errors with full details
  console.error('Unexpected error:', err);
  if (err instanceof Error) {
    console.error('Error stack:', err.stack);
    console.error('Error message:', err.message);
  }

  // Send generic error response
  sendError(res, err instanceof Error ? err.message : 'Internal server error', 500);
}

