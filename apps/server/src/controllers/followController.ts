import {
  RequestIdParamSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  acceptFollowRequest,
  type FollowActionPayload,
  rejectFollowRequest,
  toggleFollowRequest,
} from '../services/followService.js';

const messageMap: Record<FollowActionPayload['status'], string> = {
  PENDING: 'Follow request sent',
  ACCEPTED: 'Followed successfully',
  REJECTED: 'Follow request rejected',
  NONE: 'Unfollowed successfully',
};

export const toggleFollow = async (
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
    const result = await toggleFollowRequest(username, currentUserId);
    const message = messageMap[result.status];

    return res.status(200).json({
      status: 'success',
      message,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const acceptFollow = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = RequestIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { requestId } = paramResult.data;
    const result = await acceptFollowRequest(requestId, currentUserId);
    const message = messageMap[result.status];

    return res.status(200).json({
      status: 'success',
      message,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const rejectFollow = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const paramResult = RequestIdParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { requestId } = paramResult.data;
    const result = await rejectFollowRequest(requestId, currentUserId);
    const message = messageMap[result.status];

    return res.status(200).json({
      status: 'success',
      message,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
