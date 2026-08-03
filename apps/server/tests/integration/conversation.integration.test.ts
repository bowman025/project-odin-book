import crypto from 'node:crypto';
import { db } from '@project-odin-book/db';
import bcrypt from 'bcryptjs';
import type { Socket } from 'socket.io';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/app.js';
import { registerConversationHandlers } from '../../src/modules/conversations/conversationHandler.js';

describe('Conversations & Real-Time Messaging Module Suites', () => {
  const defaultPassword = 'SecureChatTester123!';
  let userA: { id: string; username: string; email: string };
  let userB: { id: string; username: string; email: string };
  let tokenA: string;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const uidA = crypto.randomUUID().slice(0, 8);
    const uidB = crypto.randomUUID().slice(0, 8);

    userA = await db.user.create({
      data: {
        username: `user_a_${uidA}`,
        email: `user_a_${uidA}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    userB = await db.user.create({
      data: {
        username: `user_b_${uidB}`,
        email: `user_b_${uidB}@odinum.com`,
        passwordHash,
      },
      select: { id: true, username: true, email: true },
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: userA.email, password: defaultPassword });

    tokenA = loginResponse.body.accessToken || '';
  });

  describe('HTTP RESTful Messaging Controller Endpoints', () => {
    it('should initialize a new conversation chat thread context', async () => {
      const response = await request(app)
        .post(`/api/conversations/${userB.username}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          conversation: expect.objectContaining({
            id: expect.any(String),
          }),
        },
      });
    });

    it('should append a new message string into a conversation thread', async () => {
      await db.follow.create({
        data: {
          senderId: userA.id,
          receiverId: userB.id,
          status: 'ACCEPTED',
        },
      });

      const uniqueConversationHash = [userA.id, userB.id].sort().join('_');
      const conversation = await db.conversation.create({
        data: {
          hash: uniqueConversationHash,
          participants: {
            create: [{ userId: userA.id }, { userId: userB.id }],
          },
        },
      });
      const response = await request(app)
        .post(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Hello, this is an automated live integration chat trace!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Message sent successfully',
        data: {
          message: expect.objectContaining({
            id: expect.any(String),
            conversationId: conversation.id,
            senderId: userA.id,
            content: 'Hello, this is an automated live integration chat trace!',
          }),
        },
      });
    });
  });

  describe('Socket.io Real-Time Event Handlers', () => {
    const createMockSocket = (userId: string, username: string) => {
      const eventRegistry = new Map<string, (...args: unknown[]) => void>();
      const mockSocket = {
        data: { userId, username },
        rooms: new Set<string>(),
        on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
          eventRegistry.set(event, callback);
          return mockSocket;
        }),
        emit: vi.fn(),
        to: vi.fn().mockReturnValue({ emit: vi.fn() }),
        join: vi.fn(async (room: string) => {
          mockSocket.rooms.add(room);
        }),
        leave: vi.fn(async (room: string) => {
          mockSocket.rooms.delete(room);
        }),
        __triggerEvent: async (event: string, payload: unknown) => {
          const handler = eventRegistry.get(event);
          if (handler) handler(payload);
        },
      };

      return mockSocket as unknown as Socket & {
        __triggerEvent: (event: string, payload: unknown) => Promise<void>;
      };
    };

    it('should mount event hooks and broadcast peer real-time indicators on typing_status changes', async () => {
      const mockSocket = createMockSocket(userA.id, userA.username);
      const targetRoomCuid = 'clh123abc456def789ghi012';

      mockSocket.rooms.add(targetRoomCuid);

      registerConversationHandlers(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(
        'typing_status',
        expect.any(Function),
      );

      await mockSocket.__triggerEvent('typing_status', {
        conversationId: targetRoomCuid,
        isTyping: true,
      });

      expect(mockSocket.to).toHaveBeenCalledWith(targetRoomCuid);
    });

    it('should disconnect a websocket client session from a chat channel', async () => {
      const mockSocket = createMockSocket(userA.id, userA.username);
      const targetRoomCuid = 'clh999abc456def789ghi999';
      mockSocket.rooms.add(targetRoomCuid);

      registerConversationHandlers(mockSocket);

      await mockSocket.__triggerEvent('leave_conversation', {
        conversationId: targetRoomCuid,
      });

      expect(mockSocket.leave).toHaveBeenCalledWith(targetRoomCuid);
      expect(mockSocket.rooms.has(targetRoomCuid)).toBe(false);
    });
  });
});
