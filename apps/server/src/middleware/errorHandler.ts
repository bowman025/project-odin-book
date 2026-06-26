import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { toAppError } from '../errors/toAppError.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const appError = toAppError(err);

  if (appError.cause) {
    console.error('[Cause]:', appError.cause);
  }

  if (!appError.isOperational) {
    console.error('[Unhandled Error]:', err);
  }

  return res.status(appError.statusCode).json({
    status: 'error',
    message: appError.message,
    ...(appError.details !== undefined && { errors: appError.details }),
    ...(env.NODE_ENV !== 'production' && appError.stack
      ? { stack: appError.stack }
      : {}),
  });
};
