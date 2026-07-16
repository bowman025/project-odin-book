import type { Server as HTTPServer } from 'node:http';
import type { AccessTokenPayload } from '@project-odin-book/validation';
import type { Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/AppError.js';
import { verifyAccessToken } from '../../utils/jwt.js';
import { getIO, initSocket, socketAuthMiddleware } from '../socket.js';

vi.mock('../../utils/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../modules/conversations/conversationHandler.js', () => ({
  registerConversationHandlers: vi.fn(),
}));

describe('Shared Real-Time Socket.io Infrastructure Module', () => {
  const mockServer = {} as HTTPServer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Socket Registry Lifecycle Validation', () => {
    it('should throw an unhandled explicit error if getIO() is invoked before initialization', () => {
      expect(() => getIO()).toThrow(
        'Socket.io has not been initialized. Call initSocket(server) first.',
      );
    });

    it('should initialize a single socket server instance and assign the reference globally', () => {
      const ioInstance = initSocket(mockServer);
      expect(ioInstance).toBeDefined();
      expect(getIO()).toBe(ioInstance);
    });
  });

  describe('Authentication Handshake Gateway Firewall', () => {
    const createMockSocket = (authPayload: Record<string, string>) => {
      return {
        handshake: {
          auth: authPayload,
        },
        data: {},
      } as unknown as Socket;
    };

    it('should intercept and reject the connection handshake with a 401 AppError if the token parameter is missing', () => {
      const mockSocket = createMockSocket({});
      const mockNext = vi.fn();

      socketAuthMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));

      const lastCallArgs = vi.mocked(mockNext).mock.lastCall;
      const errorArg = lastCallArgs ? lastCallArgs[0] : null;

      if (errorArg instanceof AppError) {
        expect(errorArg.statusCode).toBe(401);
        expect(errorArg.message).toBe('Authentication token required');
      } else {
        expect.fail(
          'Expected next() to be invoked with an instance of AppError',
        );
      }
    });

    it('should split the Bearer prefix string, decrypt parameters, and assign user tokens to socket metadata', () => {
      const mockDecodedToken: AccessTokenPayload = {
        id: '123456qwertyasdfghzxcvbn',
        username: 'odin_warrior',
        email: 'odin_warrior@odin.com',
        type: 'access',
      };

      vi.mocked(verifyAccessToken).mockReturnValue(mockDecodedToken);

      const mockSocket = createMockSocket({
        token: 'Bearer valid_jwt_string_hash',
      });
      const mockNext = vi.fn();

      socketAuthMiddleware(mockSocket, mockNext);

      expect(verifyAccessToken).toHaveBeenCalledWith('valid_jwt_string_hash');
      expect(mockSocket.data.userId).toBe('123456qwertyasdfghzxcvbn');
      expect(mockSocket.data.username).toBe('odin_warrior');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should catch token expiration errors and pass a 401 error message to next()', () => {
      vi.mocked(verifyAccessToken).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const mockSocket = createMockSocket({ token: 'expired_token_hash' });
      const mockNext = vi.fn();

      socketAuthMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));

      const lastCallArgs = vi.mocked(mockNext).mock.lastCall;
      const errorArg = lastCallArgs ? lastCallArgs[0] : null;

      if (errorArg instanceof AppError) {
        expect(errorArg.statusCode).toBe(401);
        expect(errorArg.message).toBe(
          'Invalid or expired authentication token',
        );
      } else {
        expect.fail(
          'Expected next() to be invoked with an instance of AppError',
        );
      }
    });
  });
});
