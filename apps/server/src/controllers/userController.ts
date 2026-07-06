import {
  PaginationQuerySchema,
  UpdateProfileSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  fetchUserDirectory,
  fetchUserProfileByUsername,
  updateUserProfile,
} from '../services/userService.js';

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = UsernameParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const { username } = paramResult.data;
    const profile = await fetchUserProfileByUsername(username);

    if (!profile) {
      return next(new AppError(`User '@${username}' not found`, 404));
    }

    return res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const bodyResult = UpdateProfileSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  if (Object.keys(bodyResult.data).length === 0) {
    return next(new AppError('No fields to update', 400));
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const updatedProfile = await updateUserProfile({
      id: currentUserId,
      data: bodyResult.data,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { profile: updatedProfile },
    });
  } catch (error) {
    return next(error);
  }
};

export const getUserDirectory = async (
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

    const { items, hasMore } = await fetchUserDirectory({
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
