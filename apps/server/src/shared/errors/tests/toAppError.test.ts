import { Prisma } from '@project-odin-book/db';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { AppError } from '../AppError.js';
import { toAppError } from '../toAppError.js';

describe('Shared Error Normalization Factory Module', () => {
  it('should return the original object if the error is a valid instance of AppError', () => {
    const originalError = new AppError('Explicit bad request', 400);
    const result = toAppError(originalError);

    expect(result).toBe(originalError);
  });

  describe('Prisma Client Request Interceptions', () => {
    it('should map a P2002 error to a 409 status showing target fields', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation on email index',
        {
          code: 'P2002',
          clientVersion: '7.x',
          meta: { target: ['email', 'username'] },
        },
      );
      const result = toAppError(prismaError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.statusCode).toBe(409);
      expect(result.isOperational).toBe(true);
      expect(result.message).toBe('Duplicate value for: email, username');
      expect(result.cause).toBe(prismaError);
    });

    it('should map a P2003 error to a 404 status polishing raw DB naming strings', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failure',
        {
          code: 'P2003',
          clientVersion: '7.x',
          meta: { field_name: 'Post_authorId_fkey' },
        },
      );
      const result = toAppError(prismaError);

      expect(result.statusCode).toBe(404);
      expect(result.message).toBe('AuthorId not found');
    });

    it('should fall back to standard resource not found text template if P2003 metadata field name is absent', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key missing parameters',
        {
          code: 'P2003',
          clientVersion: '7.x',
          meta: {},
        },
      );
      const result = toAppError(prismaError);

      expect(result.message).toBe('Related resource not found');
    });
  });

  describe('Zod Validation Failure Mappings', () => {
    it('should translate multi-level nested ZodError issues into a structured 400 array map', () => {
      type ZodErrorConstructorIssues = ConstructorParameters<
        typeof ZodError
      >[0];

      const simulatedIssues: ZodErrorConstructorIssues = [
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['body', 'user', 'email'],
          message: 'Please enter a valid email address',
        },
      ];
      const zodError = new ZodError(simulatedIssues);
      const result = toAppError(zodError);

      expect(result.statusCode).toBe(400);
      expect(result.message).toBe('Validation failed');
      expect(result.isOperational).toBe(true);
      expect(result.details).toEqual([
        {
          field: 'body.user.email',
          message: 'Please enter a valid email address',
        },
      ]);
    });
  });
});
