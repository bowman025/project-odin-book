import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/AppError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.js';

describe('JWT Shared Cryptographic Utilities Module', () => {
  const mockPayload = {
    id: 'a17ygqdv1xkmshx2y6jhd05s',
    username: 'test_user',
    email: 'test_user@odin.com',
  };

  describe('Access Token Pipeline', () => {
    it('should successfully sign a valid access token string', () => {
      const token = signAccessToken(mockPayload);

      expect(token).toBeTypeOf('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should cleanly decode and verify a pristine access token payload match', () => {
      const token = signAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.type).toBe('access');
    });

    it('should throw custom AppError 401 if the signature is tampered with', () => {
      const token = signAccessToken(mockPayload);
      const tamperedToken = `${token} + malicious_suffix_patch`;

      expect(() => verifyAccessToken(tamperedToken)).toThrow(AppError);

      try {
        verifyAccessToken(tamperedToken);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(401);
        expect((error as AppError).message).toBe(
          'Invalid or expired access token',
        );
      }
    });

    it('should throw custom AppError 401 if the signature has expired', () => {
      vi.useFakeTimers();

      const token = signAccessToken(mockPayload);

      vi.advanceTimersByTime(16 * 60 * 1000);

      expect(() => verifyAccessToken(token)).toThrow(AppError);

      try {
        verifyAccessToken(token);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(401);
        expect((error as AppError).message).toBe(
          'Invalid or expired access token',
        );
      }

      vi.useRealTimers();
    });
  });

  describe('Refresh Token Pipeline', () => {
    it('should successfully sign a long-lived refresh token string', () => {
      const token = signRefreshToken(mockPayload);

      expect(token).toBeTypeOf('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should cleanly verify and pull identity attributes out of a pristine refresh token payload', () => {
      const token = signRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.username).toBe(mockPayload.username);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw custom AppError 401 if the refresh token has expired', () => {
      vi.useFakeTimers();

      const token = signRefreshToken(mockPayload);

      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      expect(() => verifyRefreshToken(token)).toThrow(AppError);

      try {
        verifyRefreshToken(token);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(401);
        expect((error as AppError).message).toBe(
          'Invalid or expired refresh token',
        );
      }

      vi.useRealTimers();
    });
  });
});
