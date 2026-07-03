import { db, type Message } from '@project-odin-book/db';
import type { SendMessageInput } from '@project-odin-book/validation';
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

export const generateConversationHash = (id1: string, id2: string): string => {
  return [id1, id2].sort().join('_');
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

export const insertMessage = async (options: {
  conversationId: string;
  senderId: string;
  input: SendMessageInput;
}): Promise<MessagePayload> => {
  const { conversationId, senderId, input } = options;

  return db.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: senderId,
          },
        },
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new AppError('Conversation not found or access denied', 404);
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
}): Promise<boolean> => {
  const { messageId, requesterId } = options;

  const result = await db.message.deleteMany({
    where: { id: messageId, senderId: requesterId },
  });

  return result.count > 0;
};

export const fetchInbox = async (options: {
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
    items: pageConversations.map((chat) => ({
      id: chat.id,
      updatedAt: chat.updatedAt,
      participants: chat.participants
        .filter((p) => p.user.id !== currentUserId)
        .map((p) => p.user),
      lastMessage: chat.messages.at(0) ?? null,
    })),
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

  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      participants: {
        some: {
          userId: requesterId,
        },
      },
    },
    select: { id: true },
  });

  if (!conversation) {
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
