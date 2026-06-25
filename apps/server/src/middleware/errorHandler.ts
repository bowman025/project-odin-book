import { Prisma } from '@project-odin-book/db';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const errorObject = err as Record<string, unknown>;

  if (errorObject instanceof AppError) {
    if (errorObject.cause) console.error('[Error Cause]:', errorObject.cause);
    return res.status(errorObject.statusCode).json({
      status: 'error',
      message: errorObject.message,
    });
  }

  if (errorObject instanceof Prisma.PrismaClientKnownRequestError) {
    if (errorObject.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'A record with that value already exists',
      });
    }
    if (errorObject.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'The requested resource could not be found',
      });
    }
  }

  if (errorObject instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errorObject.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (errorObject?.isOperational === false) {
    console.error('[CRITICAL UNHANDLED CRASH]:', err);
  } else {
    console.error('[Server Error]:', err);
  }

  const stackTrace =
    typeof errorObject?.stack === 'string' ? errorObject.stack : undefined;

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' &&
      stackTrace && { stack: stackTrace }),
  });
};
