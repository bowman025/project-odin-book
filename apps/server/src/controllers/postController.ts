import {
  CreatePostSchema,
  PaginationQuerySchema,
  PostIdParamSchema,
  UpdatePostSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  fetchPost,
  fetchTimeline,
  insertPost,
  modifyPost,
  removePost,
} from '../services/postService.js';

export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const bodyResult = CreatePostSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  try {
    const authorId = req.user?.id;

    if (!authorId) {
      return next(new AppError('Authentication context required', 401));
    }

    const newPost = await insertPost({
      authorId,
      ...bodyResult.data,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: { post: newPost },
    });
  } catch (error) {
    return next(error);
  }
};

export const getPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = PostIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const { postId } = paramResult.data;
    const post = await fetchPost(postId);

    if (!post) {
      return next(new AppError('Post not found', 404));
    }

    return res.status(200).json({
      status: 'success',
      data: { post },
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = PostIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const bodyResult = UpdatePostSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  if (Object.keys(bodyResult.data).length === 0) {
    return next(new AppError('No fields to update', 400));
  }

  try {
    const { postId } = paramResult.data;
    const authorId = req.user?.id;

    if (!authorId) {
      return next(new AppError('Authentication context required', 401));
    }

    const updatedPost = await modifyPost(postId, authorId, bodyResult.data);

    if (!updatedPost) {
      return next(new AppError('Post not found', 404));
    }

    return res.status(200).json({
      status: 'success',
      message: 'Post updated successfully',
      data: { post: updatedPost },
    });
  } catch (error) {
    return next(error);
  }
};

export const deletePost = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = PostIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const { postId } = paramResult.data;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const wasDeleted = await removePost(postId, currentUserId);

    if (!wasDeleted) {
      return next(new AppError('Post not found', 404));
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};

export const getTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryResult = PaginationQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    const { items, hasMore } = await fetchTimeline({ skip, take: limit });

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
