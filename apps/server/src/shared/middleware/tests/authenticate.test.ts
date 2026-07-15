import type { AccessTokenPayload } from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/AppError.js';
import { verifyAccessToken } from '../../utils/jwt.js';
import { authenticate } from '../authenticate.js';

vi.mock('../../utils/jwt.ts', () => ({
  verifyAccessToken: vi.fn(),
}));

describe('Shared Authentication Gateway Middleware Module', () => {
  const mockRes = {} as Response;
  let mockReq: Request;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    } as Request;
    mockNext = vi.fn() as NextFunction;
    vi.clearAllMocks();
  });

  it('should route a 401 AppError to next() if the Authorization header is absent', () => {
    authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(vi.mocked(mockNext).mock.lastCall?.[0]).toMatchObject({
      statusCode: 401,
      message: 'Authentication token missing or malformed',
    });
  });

  it('should route a 401 AppError to next() if header exists but lacks Bearer prefix', () => {
    mockReq.headers.authorization = 'MalformedToken xyz123';

    authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    expect(vi.mocked(mockNext).mock.lastCall?.[0]).toMatchObject({
      statusCode: 401,
      message: 'Authentication token missing or malformed',
    });
  });

  it('should parse a pristine token, populate req.user, and trigger next() with 0 parameters', () => {
    const mockDecodedTokenPayload: AccessTokenPayload = {
      id: '123456qwertyuasdfghzxcvbn',
      username: 'test_user',
      email: 'test_user@odin.com',
      type: 'access',
    };

    vi.mocked(verifyAccessToken).mockReturnValue(mockDecodedTokenPayload);
    mockReq.headers.authorization = 'Bearer genuine_jwt_string_payload';

    authenticate(mockReq, mockRes, mockNext);

    expect(mockReq.user).toEqual({
      id: mockDecodedTokenPayload.id,
      username: mockDecodedTokenPayload.username,
      email: mockDecodedTokenPayload.email,
    });
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should forward any verification exception to next(error) if error is thrown', () => {
    const decryptionError = new AppError(
      'Invalid or expired access token',
      401,
    );
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw decryptionError;
    });

    mockReq.headers.authorization = 'Bearer expired_or_tampered_jwt_string';

    authenticate(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(decryptionError);
  });
});
