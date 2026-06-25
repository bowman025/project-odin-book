import { Prisma } from '@project-odin-book/db';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';

export const toAppError = (err: unknown): AppError => {
  if (err instanceof AppError) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = err.meta?.target as string[] | undefined;

      return new AppError(
        fields
          ? `Duplicate value for: ${fields.join(', ')}`
          : 'Duplicate value',
        409,
        true,
        { cause: err },
      );
    }

    if (err.code === 'P2025') {
      return new AppError('Resource not found', 404, true, { cause: err });
    }
  }

  if (err instanceof ZodError) {
    const formatted = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return new AppError('Validation failed', 400, true, {
      cause: err,
      details: formatted,
    });
  }

  return new AppError('Internal server error', 500, false, {
    cause: err instanceof Error ? err : undefined,
  });
};
