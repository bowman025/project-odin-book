import type { Message, PrismaClient } from '@project-odin-book/db';
import { db, Prisma } from '@project-odin-book/db';
import type { SendMessageInput } from '@project-odin-book/validation';
import { AppError } from '../../shared/errors/AppError.js';

type DBClient = PrismaClient | Prisma.TransactionClient;

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

export type InboxConversationPayload = {
  id: string;
  updatedAt: Date;
  participants: ChatParticipant[];
  lastMessage: MessagePayload | null;
};

export type InboxConversationResult = {
  items: InboxConversationPayload[];
  hasMore: boolean;
};

export type MessagePayload = Pick<
  Message,
  | 'id'
  | 'content'
  | 'senderId'
  | 'conversationId'
  | 'createdAt'
  | 'updatedAt'
  | 'edited'
>;

export type MessageHistoryResult = {
  items: MessagePayload[];
  hasMore: boolean;
};

export type FetchEligiblePartnersOptions = {
  currentUserId: string;
  q: string;
};

const participantSelect = {
  id: true,
  username: true,
  profilePicture: true,
} as const;

const messageSelect = {
  id: true,
  content: true,
  senderId: true,
  conversationId: true,
  createdAt: true,
  updatedAt: true,
  edited: true,
} as const;

const GHOST_PARTICIPANT: ChatParticipant = {
  id: 'deleted_user',
  username: 'Deleted User',
  profilePicture: null,
};

export const generateConversationHash = (id1: string, id2: string): string => {
  return [id1, id2].sort().join('_');
};

export const isParticipantInConversation = async (options: {
  db: DBClient;
  conversationId: string;
  userId: string;
}): Promise<boolean> => {
  const { db, conversationId, userId } = options;
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  return !!conversation?.participants.length;
};

export const fetchOrCreateConversation = async (options: {
  requesterId: string;
  targetUsername: string;
}): Promise<ConversationPayload> => {
  const { requesterId, targetUsername } = options;

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

const canMessage = async (options: {
  db: DBClient;
  userAId: string;
  userBId: string;
}): Promise<boolean> => {
  const { db, userAId, userBId } = options;

  const targetStillExists = await db.user.findUnique({
    where: { id: userBId },
    select: { id: true },
  });

  if (!targetStillExists) return false;

  const connection = await db.follow.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
    },
    select: { id: true },
  });

  return !!connection;
};

export const insertMessage = async (options: {
  conversationId: string;
  senderId: string;
  input: SendMessageInput;
}): Promise<MessagePayload> => {
  const { conversationId, senderId, input } = options;

  return db.$transaction(async (tx) => {
    const participants = await tx.participant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    if (participants.length === 0) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    const isParticipant = participants.some((p) => p.userId === senderId);

    if (!isParticipant) {
      throw new AppError('Conversation not found or access denied', 404);
    }

    const otherParticipantId = participants.find((p) => p.userId !== senderId);

    if (!otherParticipantId) {
      throw new AppError(
        'The other participant has left this conversation',
        400,
      );
    }

    const stillConnected = await canMessage({
      db: tx,
      userAId: senderId,
      userBId: otherParticipantId.userId,
    });

    if (!stillConnected) {
      throw new AppError('You can no longer message this user', 403);
    }

    const message = await tx.message.create({
      data: {
        conversationId,
        senderId,
        content: input.content,
      },
      select: messageSelect,
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
      },
    });

    return message;
  });
};

export const modifyMessage = async (options: {
  messageId: string;
  requesterId: string;
  input: SendMessageInput;
}): Promise<MessagePayload | null> => {
  const { messageId, requesterId, input } = options;

  const existingMessage = await db.message.findUnique({
    where: { id: messageId },
    select: { senderId: true },
  });

  if (!existingMessage || existingMessage.senderId !== requesterId) {
    return null;
  }

  return db.message.update({
    where: { id: messageId },
    data: {
      content: input.content,
      edited: true,
    },
    select: messageSelect,
  });
};

export const removeMessage = async (options: {
  messageId: string;
  requesterId: string;
}): Promise<{ conversationId: string } | null> => {
  const { messageId, requesterId } = options;

  try {
    const deletedMessage = await db.message.delete({
      where: {
        id: messageId,
        senderId: requesterId,
      },
      select: {
        conversationId: true,
      },
    });

    return { conversationId: deletedMessage.conversationId };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
};

export const fetchConversations = async (options: {
  currentUserId: string;
  skip: number;
  take: number;
}): Promise<InboxConversationResult> => {
  const { currentUserId, skip, take } = options;

  const conversations = await db.conversation.findMany({
    where: {
      participants: {
        some: { userId: currentUserId },
      },
    },
    orderBy: { updatedAt: 'desc' },
    skip,
    take: take + 1,
    select: {
      id: true,
      updatedAt: true,
      participants: {
        select: {
          user: { select: participantSelect },
        },
      },
      messages: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: messageSelect,
      },
    },
  });

  const hasMore = conversations.length > take;
  const pageConversations = hasMore
    ? conversations.slice(0, take)
    : conversations;

  return {
    items: pageConversations.map((chat) => {
      const remainingParticipants = chat.participants
        .filter((p) => p.user.id !== currentUserId)
        .map((p) => p.user);

      return {
        id: chat.id,
        updatedAt: chat.updatedAt,
        participants:
          remainingParticipants.length > 0
            ? remainingParticipants
            : [GHOST_PARTICIPANT],
        lastMessage: chat.messages.at(0) ?? null,
      };
    }),
    hasMore,
  };
};

export const fetchMessageHistory = async (options: {
  conversationId: string;
  requesterId: string;
  skip: number;
  take: number;
}): Promise<MessageHistoryResult> => {
  const { conversationId, requesterId, skip, take } = options;

  const isParticipant = await isParticipantInConversation({
    db,
    conversationId,
    userId: requesterId,
  });

  if (!isParticipant) {
    throw new AppError('Conversation not found or access denied', 404);
  }

  const messages = await db.message.findMany({
    where: { conversationId },
    skip,
    take: take + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: messageSelect,
  });

  const hasMore = messages.length > take;
  const pageMessages = hasMore ? messages.slice(0, take) : messages;

  return {
    items: [...pageMessages].reverse(),
    hasMore,
  };
};

export const fetchEligiblePartners = async (
  options: FetchEligiblePartnersOptions,
): Promise<ChatParticipant[]> => {
  const { currentUserId, q } = options;
  const users = await db.user.findMany({
    where: {
      id: { not: currentUserId },
      username: {
        contains: q,
        mode: 'insensitive',
      },
      OR: [
        {
          receivedFollows: {
            some: {
              senderId: currentUserId,
              status: 'ACCEPTED',
            },
          },
        },
        {
          sentFollows: {
            some: {
              receiverId: currentUserId,
              status: 'ACCEPTED',
            },
          },
        },
      ],
    },
    take: 10,
    select: participantSelect,
  });

  return users;
};
