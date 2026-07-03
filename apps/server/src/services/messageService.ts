import { db } from '@project-odin-book/db';
import { AppError } from '../errors/AppError.js';

export type ChatParticipant = {
  id: string;
  username: string;
  profilePicture: string | null;
};

export type ConversationPayload = {
  id: string;
  updatedAt: Date;
  participants: ChatParticipant[];
};

const participantSelect = {
  id: true,
  username: true,
  profilePicture: true,
} as const;

export const generateConversationHash = (id1: string, id2: string): string => {
  return [id1, id2].sort().join('_');
};

export const fetchOrCreateConversation = async (
  requesterId: string,
  targetUsername: string,
): Promise<ConversationPayload> => {
  const targetUser = await db.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });

  if (!targetUser) {
    throw new AppError('User not found', 404);
  }

  if (targetUser.id === requesterId) {
    throw new AppError('You cannot start a conversation with yourself', 400);
  }

  const conversationHash = generateConversationHash(requesterId, targetUser.id);

  const conversation = await db.conversation.upsert({
    where: { hash: conversationHash },
    update: {},
    create: {
      hash: conversationHash,
      participants: {
        create: [{ userId: requesterId }, { userId: targetUser.id }],
      },
    },
    select: {
      id: true,
      updatedAt: true,
      participants: {
        select: {
          user: { select: participantSelect },
        },
      },
    },
  });

  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    participants: conversation.participants.map((p) => p.user),
  };
};
