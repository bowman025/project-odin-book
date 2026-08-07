import {
  ConversationIdParamSchema,
  MessageIdParamSchema,
  PaginationQuerySchema,
  SearchConnectionsSchema,
  SendMessageSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { getIO } from '../../shared/config/socket.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  fetchConversations,
  fetchEligiblePartners,
  fetchMessageHistory,
  fetchOrCreateConversation,
  insertMessage,
  modifyMessage,
  removeMessage,
} from './conversationService.js';

export const getEligibleMessagingPartners = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryResult = SearchConnectionsSchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { q } = queryResult.data;

    const items = await fetchEligiblePartners({
      currentUserId,
      q,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        items,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getConversations = async (
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
    const { items, hasMore } = await fetchConversations({
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

    getIO().to(conversationId).emit('message_created', newMessage);

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

    getIO()
      .to(updatedMessage.conversationId)
      .emit('message_updated', updatedMessage);

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
    const deleted = await removeMessage({
      messageId,
      requesterId: currentUserId,
    });

    if (!deleted) {
      return next(new AppError('Message not found or access denied', 404));
    }

    getIO().to(deleted.conversationId).emit('message_deleted', {
      messageId,
      conversationId: deleted.conversationId,
    });

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};
