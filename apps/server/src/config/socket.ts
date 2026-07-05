import type { Server as HTTPServer } from 'node:http';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt.js';
import { AppError } from '../errors/AppError.js';
import { registerConversationHandlers } from '../handlers/conversationHandler.js';
import { env } from './env.js';

let io: Server | null = null;

export const initSocket = (server: HTTPServer): Server => {
  io = new Server(server, {
    transports: ['websocket'],
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token;

      if (!rawToken) {
        return next(new AppError('Authentication token required', 401));
      }

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.split(' ').at(1)
        : rawToken;

      if (!token) {
        return next(new AppError('Authentication token required', 401));
      }

      const decoded = verifyAccessToken(token);

      socket.data.userId = decoded.id;
      socket.data.username = decoded.username;

      return next();
    } catch (error) {
      return next(
        new AppError('Invalid or expired authentication token', 401, true, {
          cause: error instanceof Error ? error : undefined,
        }),
      );
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `Socket connected: ${socket.data.username} (${socket.data.userId}) [${socket.id}]`,
    );

    registerConversationHandlers(socket);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error(
      'Socket.io has not been initialized. Call initSocket(server) first.',
    );
  }

  return io;
};
