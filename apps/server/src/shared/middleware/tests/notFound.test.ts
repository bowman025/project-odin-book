import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/AppError.js';
import { notFound } from '../notFound.js';

describe('Shared Not Found Handler Middleware Module', () => {
  const mockRes = {} as Response;

  it('should format a missing route into a structured 404 AppError and pass it to next()', () => {
    const mockReq = {
      method: 'POST',
      originalUrl: '/auth/invalid-endpoint-path',
    } as Request;
    const mockNext = vi.fn() as NextFunction;

    notFound(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(vi.mocked(mockNext).mock.lastCall?.[0]).toMatchObject({
      statusCode: 404,
      isOperational: true,
      message: 'Route not found: POST /auth/invalid-endpoint-path',
    });
  });
});
