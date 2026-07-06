import { db } from '@project-odin-book/db';
import {
  ConversationIdParamSchema,
  TypingStatusSchema,
} from '@project-odin-book/validation';
import type { Socket } from 'socket.io';
import { isParticipantInConversation } from '../services/conversationService.js';

export const registerConversationHandlers = (socket: Socket) => {
  socket.on('join_conversation', async (rawData: unknown) => {
    const result = ConversationIdParamSchema.safeParse(rawData);

    if (!result.success) {
      return socket.emit('conversation_error', {
        message: 'Invalid conversation identifier format',
      });
    }
    const { conversationId } = result.data;
    const currentUserId = socket.data.userId;

    try {
      const isParticipant = await isParticipantInConversation(
        db,
        conversationId,
        currentUserId,
      );

      if (!isParticipant) {
        console.warn(
          `Blocked room access: ${socket.data.username} targeted room ${conversationId}`,
        );
        return socket.emit('conversation_error', {
          message: 'Access denied: Conversation not found or invalid',
        });
      }

      await socket.join(conversationId);
      console.log(
        `Entry: ${socket.data.username} joined room ${conversationId}`,
      );
    } catch (error) {
      console.error('Join conversation error:', error);
      socket.emit('conversation_error', {
        message: 'An error occurred while entering the conversation channel',
      });
    }
  });

  socket.on('leave_conversation', async (rawData: unknown) => {
    const result = ConversationIdParamSchema.safeParse(rawData);

    if (!result.success) {
      return socket.emit('conversation_error', {
        message: 'Invalid conversation identifier format',
      });
    }

    const { conversationId } = result.data;
    await socket.leave(conversationId);
    console.log(`Exit: ${socket.data.username} left room ${conversationId}`);
  });

  socket.on('typing_status', async (rawData: unknown) => {
    const result = TypingStatusSchema.safeParse(rawData);

    if (!result.success) return;

    const { conversationId, isTyping } = result.data;

    if (!socket.rooms.has(conversationId)) return;

    socket.to(conversationId).emit('user_typing', {
      conversationId,
      userId: socket.data.userId,
      username: socket.data.username,
      isTyping,
    });
  });
};
