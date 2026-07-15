import type { NextFunction, Request, Response } from 'express';
import type { Options } from 'express-rate-limit';
import { describe, expect, it, vi } from 'vitest';
import { createHandler, keyGenerator } from '../rateLimiter.js';

describe('Shared API Rate Limiter Infrastructure Module', () => {
  const mockRes = {} as Response;
  const mockNext = (() => {}) as NextFunction;

  describe('Key Generator Engine', () => {
    it('should prioritize using the authenticated user ID as the rate limit bucket token', () => {
      const mockReq = {
        user: {
          id: '123456qwertyasdfghzxcvbn',
          username: 'test_user',
          email: 'test_user@odin.com',
        },
        ip: '192.168.1.1',
      } as unknown as Request;
      const rateLimitKey = keyGenerator(mockReq, mockRes);
      expect(rateLimitKey).toBe('123456qwertyasdfghzxcvbn');
    });

    it('should fall back to using the IP address if req.user context is absent', () => {
      const mockReq = {
        ip: '203.0.113.50',
      } as unknown as Request;

      const rateLimitKey = keyGenerator(mockReq, mockRes);
      expect(rateLimitKey).toBe('203.0.113.50');
    });

    it('should fall back to an anonymous literal string if req.user and req.ip are undefined', () => {
      const mockReq = {} as Request;

      const rateLimitKey = keyGenerator(mockReq, mockRes);
      expect(rateLimitKey).toBe('anonymous');
    });
  });

  describe('Rate Limit Custom Response Handler', () => {
    it('should format a rate limit block into relevant status structure', () => {
      const mockReq = {} as Request;
      const spyRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockLimiterOptions: Partial<Options> &
        Pick<Options, 'windowMs' | 'statusCode'> = {
        windowMs: 15 * 60 * 1000,
        statusCode: 429,
        max: 500,
        message: 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
      };

      createHandler(mockReq, spyRes, mockNext, mockLimiterOptions as Options);

      expect(spyRes.status).toHaveBeenCalledWith(429);
      expect(spyRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Too many requests, try again in 15 minutes',
      });
    });
  });
});
