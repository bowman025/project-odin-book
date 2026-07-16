import type { Server as HTTPServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { registerConversationHandlers } from '../../modules/conversations/conversationHandler.js';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { env } from './env.js';

let io: Server | null = null;

const connectedUserRegistry = new Map<string, Set<string>>();

export const isUserOnline = (userId: string): boolean =>
  connectedUserRegistry.has(userId);

export const getOnlineUserIds = (): string[] =>
  Array.from(connectedUserRegistry.keys());

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const rawToken = socket.handshake.auth?.token;

    if (!rawToken) {
      return next(new AppError('Authentication token required', 401));
    }

    const token =
      typeof rawToken === 'string' && rawToken.startsWith('Bearer ')
        ? rawToken.split(' ').at(1)
        : rawToken;

    if (typeof token !== 'string' || !token) {
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
};

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

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const { userId, username } = socket.data;
    console.log(`Socket connected: ${username} (${userId}) [${socket.id}]`);

    if (!connectedUserRegistry.has(userId)) {
      connectedUserRegistry.set(userId, new Set());
    }

    const userSockets = connectedUserRegistry.get(userId) ?? new Set<string>();
    userSockets.add(socket.id);
    connectedUserRegistry.set(userId, userSockets);

    registerConversationHandlers(socket);

    socket.on('disconnecting', () => {
      const userSockets = connectedUserRegistry.get(userId);
      if (!userSockets) return;

      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        connectedUserRegistry.delete(userId);

        for (const room of socket.rooms) {
          if (room === socket.id) continue;
          socket.to(room).emit('user_offline', { userId });
        }
      }
    });

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
