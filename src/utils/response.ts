import { Response } from 'express';
import { AppError } from './errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  error: string | Error | AppError,
  statusCode?: number
): void {
  let message: string;
  let code: number;

  if (error instanceof AppError) {
    message = error.message;
    code = error.statusCode;
  } else if (error instanceof Error) {
    message = error.message;
    code = statusCode || 500;
  } else {
    message = error;
    code = statusCode || 500;
  }

  const response: ApiResponse = {
    success: false,
    error: message,
  };

  res.status(code).json(response);
}

