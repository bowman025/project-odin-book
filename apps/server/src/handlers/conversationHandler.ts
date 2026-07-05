import { db } from '@project-odin-book/db';
import { ConversationIdParamSchema } from '@project-odin-book/validation';
import type { Socket } from 'socket.io';
import { isParticipantInConversation } from '../services/conversationService.js';

export const registerConversationHandlers = (socket: Socket) => {
  socket.on('join_conversation', async (rawData) => {
    const result = ConversationIdParamSchema.safeParse(rawData);

    if (!result.success) {
      return socket.emit('error', {
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
        return socket.emit('error', {
          message: 'Access denied: Conversation not found or invalid',
        });
      }

      await socket.join(conversationId);
      console.log(
        `Entry: ${socket.data.username} joined room ${conversationId}`,
      );
    } catch (error) {
      console.error('Join conversation error:', error);
      socket.emit('error', {
        message: 'An error occurred while entering the conversation channel',
      });
    }
  });

  socket.on('leave_conversation', async (rawData) => {
    const result = ConversationIdParamSchema.safeParse(rawData);

    if (!result.success) {
      return socket.emit('error', {
        message: 'Invalid conversation identifier format',
      });
    }

    const { conversationId } = result.data;
    await socket.leave(conversationId);
    console.log(`Exit: ${socket.data.username} left room ${conversationId}`);
  });
};
