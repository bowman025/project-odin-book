import {
  CommentIdParamSchema,
  CreateCommentSchema,
  PaginationQuerySchema,
  PostIdParamSchema,
  type UpdateCommentInput,
  UpdateCommentSchema,
} from '@project-odin-book/validation';
import { Filter } from 'bad-words';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import {
  fetchComments,
  insertComment,
  modifyComment,
  removeComment,
} from './commentService.js';

const contentFilter = new Filter();

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
    const cleanContent = contentFilter.clean(bodyResult.data.content);

    const newComment = await insertComment({
      postId,
      authorId,
      content: cleanContent,
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

    const commentPayload: UpdateCommentInput = { ...bodyResult.data };

    if (commentPayload.content) {
      commentPayload.content = contentFilter.clean(commentPayload.content);
    }

    const updatedComment = await modifyComment({
      id: commentId,
      requesterId,
      data: commentPayload,
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
