import {
  ConversationIdParamSchema,
  MessageIdParamSchema,
  PaginationQuerySchema,
  SendMessageSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  fetchInbox,
  fetchMessageHistory,
  fetchOrCreateConversation,
  insertMessage,
  modifyMessage,
  removeMessage,
} from '../services/messageService.js';

export const getInbox = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryResult = PaginationQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    const { items, hasMore } = await fetchInbox({
      currentUserId,
      skip,
      take: limit,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        items,
        pagination: { page, limit, hasMore },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getMessageHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = ConversationIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const queryResult = PaginationQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { conversationId } = paramResult.data;
    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;

    const { items, hasMore } = await fetchMessageHistory({
      conversationId,
      requesterId: currentUserId,
      skip,
      take: limit,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        items,
        pagination: { page, limit, hasMore },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const startConversation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = UsernameParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { username } = paramResult.data;
    const conversation = await fetchOrCreateConversation({
      requesterId: currentUserId,
      targetUsername: username,
    });

    return res.status(200).json({
      status: 'success',
      data: { conversation },
    });
  } catch (error) {
    return next(error);
  }
};

export const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = ConversationIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const bodyResult = SendMessageSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { conversationId } = paramResult.data;
    const newMessage = await insertMessage({
      conversationId,
      senderId: currentUserId,
      input: bodyResult.data,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: { message: newMessage },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = MessageIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const bodyResult = SendMessageSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { messageId } = paramResult.data;
    const updatedMessage = await modifyMessage({
      messageId,
      requesterId: currentUserId,
      input: bodyResult.data,
    });

    if (!updatedMessage) {
      return next(new AppError('Message not found or access denied', 404));
    }

    return res.status(200).json({
      status: 'success',
      message: 'Message updated successfully',
      data: { message: updatedMessage },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = MessageIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { messageId } = paramResult.data;
    const wasDeleted = await removeMessage({
      messageId,
      requesterId: currentUserId,
    });

    if (!wasDeleted) {
      return next(new AppError('Message not found or access denied', 404));
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};
