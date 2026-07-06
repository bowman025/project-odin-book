import {
  PaginationQuerySchema,
  RequestIdParamSchema,
  UsernameParamSchema,
} from '@project-odin-book/validation';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import {
  acceptFollowRequest,
  type FollowActionPayload,
  fetchPendingRequests,
  fetchUserFollowers,
  fetchUserFollowing,
  type ProfileConnectionsResult,
  rejectFollowRequest,
  revokeFollowApproval,
  toggleFollowRequest,
} from '../services/followService.js';

const messageMap: Record<FollowActionPayload['status'], string> = {
  PENDING: 'Follow request sent',
  ACCEPTED: 'Followed successfully',
  REJECTED: 'Follow request rejected',
  NONE: 'Unfollowed successfully',
};

export const getConnections = async (
  req: Request,
  res: Response,
  next: NextFunction,
  fetchFn: (args: {
    targetUsername: string;
    skip: number;
    take: number;
  }) => Promise<ProfileConnectionsResult>,
) => {
  const paramResult = UsernameParamSchema.safeParse(req.params);

  if (!paramResult.success) {
    return next(paramResult.error);
  }

  const queryResult = PaginationQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return next(queryResult.error);
  }

  try {
    const { username } = paramResult.data;
    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;

    const { items, hasMore } = await fetchFn({
      targetUsername: username,
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

export const getFollowers = (req: Request, res: Response, next: NextFunction) =>
  getConnections(req, res, next, fetchUserFollowers);

export const getFollowing = (req: Request, res: Response, next: NextFunction) =>
  getConnections(req, res, next, fetchUserFollowing);

export const getPendingRequests = async (
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

    const { items, hasMore } = await fetchPendingRequests({
      receiverId: currentUserId,
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
    const result = await toggleFollowRequest({
      receiverUsername: username,
      senderId: currentUserId,
    });
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
    const result = await acceptFollowRequest({
      requestId,
      receiverId: currentUserId,
    });
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
    const result = await rejectFollowRequest({
      requestId,
      receiverId: currentUserId,
    });
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

export const revokeFollow = async (
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
    const result = await revokeFollowApproval({
      requestId,
      receiverId: currentUserId,
    });
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
