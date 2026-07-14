import { PostIdParamSchema } from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { togglePostLike } from './likeService.js';
import { AppError } from '../../shared/errors/AppError.js';

export const toggleLike = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = PostIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { postId } = paramResult.data;

    const result = await togglePostLike({ postId, userId: currentUserId });

    return res.status(200).json({
      status: 'success',
      message: result.liked ? 'Post liked' : 'Post unliked',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
