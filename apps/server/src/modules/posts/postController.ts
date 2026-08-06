import {
  CreatePostSchema,
  PaginationQuerySchema,
  PostIdParamSchema,
  TimelineQuerySchema,
  UpdatePostSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError.js';
import { fetchUserProfileByUsername } from '../users/userService.js';
import {
  fetchGeneralTimeline,
  fetchPersonalTimeline,
  fetchPost,
  fetchUserPosts,
  insertPost,
  modifyPost,
  removePost,
} from './postService.js';

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
    const currentUserId = req.user?.id ?? '';
    const post = await fetchPost({ currentUserId, id: postId });

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

    const updatedPost = await modifyPost({
      id: postId,
      requesterId: authorId,
      data: bodyResult.data,
    });

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

    const wasDeleted = await removePost({
      id: postId,
      requesterId: currentUserId,
    });

    if (!wasDeleted) {
      return next(new AppError('Post not found', 404));
    }

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};

export const getUserPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = UsernameParamSchema.safeParse(req.params);
  if (!paramResult.success) return next(paramResult.error);

  const queryResult = PaginationQuerySchema.safeParse(req.query);
  if (!queryResult.success) return next(queryResult.error);

  try {
    const { username } = paramResult.data;

    const author = await fetchUserProfileByUsername(username);
    if (!author) {
      return next(new AppError(`User '@${username}' not found`, 404));
    }

    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id;
    const { items, hasMore } = await fetchUserPosts({
      authorId: author.id,
      currentUserId,
      skip,
      take: limit,
    });

    return res.status(200).json({
      status: 'success',
      data: { items, pagination: { page, limit, hasMore } },
    });
  } catch (error) {
    return next(error);
  }
};

export const getGeneralTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryResult = TimelineQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const { page, limit, sort } = queryResult.data;
    const skip = (page - 1) * limit;
    const currentUserId = req.user?.id;
    const searchParam = req.query.search ? String(req.query.search) : undefined;
    const { items, hasMore } = await fetchGeneralTimeline({
      currentUserId,
      skip,
      take: limit,
      search: searchParam,
      sort,
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

export const getPersonalTimeline = async (
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
    const { items, hasMore } = await fetchPersonalTimeline({
      currentUserId,
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
