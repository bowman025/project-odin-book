import {
  UpdateProfileSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  getUserProfileByUsername,
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
    const profile = await getUserProfileByUsername(username);

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

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const updatedProfile = await updateUserProfile(
      currentUserId,
      bodyResult.data,
    );

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { profile: updatedProfile },
    });
  } catch (error) {
    return next(error);
  }
};
