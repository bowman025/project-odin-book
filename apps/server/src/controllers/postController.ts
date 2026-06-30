import {
  CreatePostSchema,
  PaginationQuerySchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { fetchTimeline, insertPost } from '../services/postService.js';

export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = CreatePostSchema.safeParse(req.body);

  if (!result.success) {
    return next(result.error);
  }

  try {
    const authorId = req.user?.id;

    if (!authorId) {
      return next(new AppError('Authentication context required', 401));
    }

    const newPost = await insertPost({
      authorId,
      ...result.data,
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

export const getTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = PaginationQuerySchema.safeParse(req.query);

  if (!result.success) {
    return next(result.error);
  }

  try {
    const { page, limit } = result.data;
    const skip = (page - 1) * limit;
    const { posts, hasMore } = await fetchTimeline({ skip, take: limit });

    return res.status(200).json({
      status: 'success',
      data: {
        feed: posts,
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
