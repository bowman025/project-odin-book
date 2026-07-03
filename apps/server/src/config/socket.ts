import type { Server as HTTPServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from './env.js';

let io: Server | null = null;

export const initSocket = (server: HTTPServer): Server => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  io.on('connection', (socket) => {
    console.log(`Real-time client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Real-time client disconnected: ${socket.id}`);
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
