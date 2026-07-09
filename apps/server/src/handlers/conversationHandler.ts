import { db } from '@project-odin-book/db';
import {
  ConversationIdParamSchema,
  JoinConversationsSchema,
  TypingStatusSchema,
} from '@project-odin-book/validation';
import type { Socket } from 'socket.io';
import { isParticipantInConversation } from '../services/conversationService.js';

export const registerConversationHandlers = (socket: Socket) => {
  const currentUserId = socket.data.userId;

  socket.on('join_conversations', async (rawData: unknown) => {
    const result = JoinConversationsSchema.safeParse(rawData);
    if (!result.success) return;

    const { conversationIds } = result.data;

    const allowedConversations = await db.conversation.findMany({
      where: {
        id: { in: conversationIds },
        participants: {
          some: { userId: currentUserId },
        },
      },
      select: { id: true },
    });

    const allowedIds = allowedConversations.map((c) => c.id);

    await Promise.all(allowedIds.map((id) => socket.join(id)));

    const presenceItems = await Promise.all(
      allowedIds.map(async (conversationId) => {
        const socketsInRoom = await socket.nsp
          .in(conversationId)
          .fetchSockets();
        const onlineUserIds = [
          ...new Set(
            socketsInRoom
              .map((s) => s.data.userId as string)
              .filter((id) => id !== currentUserId),
          ),
        ];

        socket
          .to(conversationId)
          .emit('user_online', { userId: currentUserId });

        return { conversationId, onlineUserIds };
      }),
    );

    socket.emit('batch_room_presence', presenceItems);
  });

  socket.on('join_conversation', async (rawData: unknown) => {
    const result = ConversationIdParamSchema.safeParse(rawData);

    if (!result.success) {
      return socket.emit('conversation_error', {
        message: 'Invalid conversation identifier format',
      });
    }
    const { conversationId } = result.data;

    try {
      const isParticipant = await isParticipantInConversation({
        db,
        conversationId,
        userId: currentUserId,
      });

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

      await broadcastRoomPresence({ socket, conversationId, currentUserId });
    } catch (error) {
      console.error('Join conversation error:', error);
      socket.emit('conversation_error', {
        message: 'An error occurred while entering the conversation channel',
      });
    }
  });

  socket.on('leave_conversation', async (rawData: unknown) => {
    const result = ConversationIdParamSchema.safeParse(rawData);
    if (!result.success) return;

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
      userId: currentUserId,
      username: socket.data.username,
      isTyping,
    });
  });
};

const broadcastRoomPresence = async (options: {
  socket: Socket;
  conversationId: string;
  currentUserId: string;
}): Promise<void> => {
  const { socket, conversationId, currentUserId } = options;

  const socketsInRoom = await socket.nsp.in(conversationId).fetchSockets();

  const onlineUserIds = [
    ...new Set(
      socketsInRoom
        .map((s) => s.data.userId as string)
        .filter((id) => id !== currentUserId),
    ),
  ];

  socket.emit('room_presence', { conversationId, onlineUserIds });
};
