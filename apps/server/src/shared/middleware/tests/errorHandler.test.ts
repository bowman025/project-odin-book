import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/AppError.js';
import { errorHandler } from '../errorHandler.js';

describe('Shared Centralized Error Handler Middleware Module', () => {
  const createMockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockReq = {} as Request;
  const mockNext = (() => {}) as NextFunction;

  it('should format AppError payloads and extract correct status code and metadata', () => {
    const res = createMockResponse();
    const targetError = new AppError('Authentication token required', 401);

    errorHandler(targetError, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Authentication token required',
      }),
    );
  });

  it('should map rich validation detail arrays to error payload attribute key', () => {
    const res = createMockResponse();
    const mockDetails = [
      {
        field: 'password',
        message: 'Password must be at least 8 characters long',
      },
    ];
    const targetError = new AppError(
      'Invalid parameter payload shape passed',
      400,
      true,
      {
        details: mockDetails,
      },
    );

    errorHandler(targetError, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Invalid parameter payload shape passed',
        errors: mockDetails,
      }),
    );
  });

  it('should mask unhandled non-operational sys errors while ensuring traces compile', () => {
    const res = createMockResponse();
    const rootCauseError = new Error(
      'Low-level OpenSSL cipher allocation failure',
    );
    const systemErrorPayload = new AppError(
      'An unexpected internal error occurred',
      500,
      false,
      { cause: rootCauseError },
    );
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    errorHandler(systemErrorPayload, mockReq, res, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[Cause]:', rootCauseError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Unhandled Error]:',
      systemErrorPayload,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: expect.any(String),
        stack: expect.any(String),
      }),
    );

    consoleErrorSpy.mockRestore();
  });
});
