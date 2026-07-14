import {
  CommentIdParamSchema,
  CreateCommentSchema,
  PaginationQuerySchema,
  PostIdParamSchema,
  UpdateCommentSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import {
  fetchComments,
  insertComment,
  modifyComment,
  removeComment,
} from './commentService.js';
import { AppError } from '../../shared/errors/AppError.js';

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = PostIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const bodyResult = CreateCommentSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  try {
    const authorId = req.user?.id;

    if (!authorId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { postId } = paramResult.data;
    const newComment = await insertComment({
      postId,
      authorId,
      ...bodyResult.data,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Comment created successfully',
      data: { comment: newComment },
    });
  } catch (error) {
    return next(error);
  }
};

export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = PostIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const queryResult = PaginationQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const { postId } = paramResult.data;
    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    const { items, hasMore } = await fetchComments({
      postId,
      skip,
      take: limit,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        items,
        pagination: {
          page,
          limit,
          hasMore,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = CommentIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const bodyResult = UpdateCommentSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  if (Object.keys(bodyResult.data).length === 0) {
    return next(new AppError('No fields to update', 400));
  }

  try {
    const { commentId } = paramResult.data;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return next(new AppError('Authentication context required', 401));
    }

    const updatedComment = await modifyComment({
      id: commentId,
      requesterId,
      data: bodyResult.data,
    });

    if (!updatedComment) {
      return next(new AppError('Comment not found', 404));
    }

    return res.status(200).json({
      status: 'success',
      message: 'Comment updated successfully',
      data: { comment: updatedComment },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = CommentIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const { commentId } = paramResult.data;
    const requesterId = req.user?.id;

    if (!requesterId) {
      return next(new AppError('Authentication context required', 401));
    }

    const wasDeleted = await removeComment({ id: commentId, requesterId });

    if (!wasDeleted) {
      return next(new AppError('Comment not found', 404));
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};
