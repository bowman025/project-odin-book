import { db, type FollowStatus, type User } from '@project-odin-book/db';
import { AppError } from '../errors/AppError.js';

export type PendingRequestSender = Pick<
  User,
  'id' | 'username' | 'profilePicture'
>;

export type PendingRequestPayload = {
  id: string;
  createdAt: Date;
  sender: PendingRequestSender;
};

export type PendingRequestsResult = {
  items: PendingRequestPayload[];
  hasMore: boolean;
};

export type ProfileConnectionPayload = Pick<
  User,
  'id' | 'username' | 'profilePicture' | 'bio'
>;

export type ProfileConnectionsResult = {
  items: ProfileConnectionPayload[];
  hasMore: boolean;
};

export type FollowActionPayload = {
  status: FollowStatus | 'NONE';
};

const pendingRequestSelect = {
  id: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      username: true,
      profilePicture: true,
    },
  },
} as const;

const connectionProfileSelect = {
  id: true,
  username: true,
  profilePicture: true,
  bio: true,
} as const;

export const fetchUserFollowers = async (options: {
  targetUsername: string;
  skip: number;
  take: number;
}): Promise<ProfileConnectionsResult> => {
  const { targetUsername, skip, take } = options;

  const connections = await db.follow.findMany({
    where: {
      receiver: { username: targetUsername },
      status: 'ACCEPTED',
    },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: {
      sender: {
        select: connectionProfileSelect,
      },
    },
  });

  const hasMore = connections.length > take;
  const pageConnections = hasMore ? connections.slice(0, take) : connections;

  return {
    items: pageConnections.map((row) => row.sender),
    hasMore,
  };
};

export const fetchUserFollowing = async (options: {
  targetUsername: string;
  skip: number;
  take: number;
}): Promise<ProfileConnectionsResult> => {
  const { targetUsername, skip, take } = options;

  const connections = await db.follow.findMany({
    where: {
      sender: { username: targetUsername },
      status: 'ACCEPTED',
    },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: {
      receiver: {
        select: connectionProfileSelect,
      },
    },
  });

  const hasMore = connections.length > take;
  const pageConnections = hasMore ? connections.slice(0, take) : connections;

  return {
    items: pageConnections.map((row) => row.receiver),
    hasMore,
  };
};

export const fetchPendingRequests = async (options: {
  receiverId: string;
  skip: number;
  take: number;
}): Promise<PendingRequestsResult> => {
  const { receiverId, skip, take } = options;

  const requests = await db.follow.findMany({
    where: {
      receiverId,
      status: 'PENDING',
    },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: pendingRequestSelect,
  });

  const hasMore = requests.length > take;
  const pageRequests = hasMore ? requests.slice(0, take) : requests;

  return {
    items: pageRequests,
    hasMore,
  };
};

export const toggleFollowRequest = async (options: {
  receiverUsername: string;
  senderId: string;
}): Promise<FollowActionPayload> => {
  const { receiverUsername, senderId } = options;

  return db.$transaction(async (tx) => {
    const receiver = await tx.user.findUnique({
      where: { username: receiverUsername },
      select: { id: true },
    });

    if (!receiver) {
      throw new AppError('User not found', 404);
    }

    if (receiver.id === senderId) {
      throw new AppError('You cannot follow yourself', 400);
    }

    const existing = await tx.follow.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId: receiver.id,
        },
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      const created = await tx.follow.create({
        data: {
          senderId,
          receiverId: receiver.id,
          status: 'PENDING',
        },
      });

      return { status: created.status };
    }

    if (existing.status === 'REJECTED') {
      const updated = await tx.follow.update({
        where: { id: existing.id },
        data: { status: 'PENDING' },
      });

      return { status: updated.status };
    }

    if (existing.status === 'ACCEPTED' || existing.status === 'PENDING') {
      await tx.follow.delete({
        where: { id: existing.id },
      });
      return { status: 'NONE' };
    }

    throw new AppError(`Unexpected follow status: ${existing.status}`, 500);
  });
};

const respondToFollowRequest = async (
  requestId: string,
  receiverId: string,
  status: 'ACCEPTED' | 'REJECTED',
): Promise<FollowActionPayload> => {
  const result = await db.follow.updateMany({
    where: { id: requestId, receiverId, status: 'PENDING' },
    data: { status },
  });

  if (result.count === 0) {
    throw new AppError('Follow request not found or invalid', 404);
  }

  return { status };
};

export const acceptFollowRequest = (options: {
  requestId: string;
  receiverId: string;
}): Promise<FollowActionPayload> => {
  const { requestId, receiverId } = options;

  return respondToFollowRequest(requestId, receiverId, 'ACCEPTED');
};

export const rejectFollowRequest = (options: {
  requestId: string;
  receiverId: string;
}): Promise<FollowActionPayload> => {
  const { requestId, receiverId } = options;

  return respondToFollowRequest(requestId, receiverId, 'REJECTED');
};

export const revokeFollowApproval = async (options: {
  requestId: string;
  receiverId: string;
}): Promise<FollowActionPayload> => {
  const { requestId, receiverId } = options;
  const result = await db.follow.updateMany({
    where: { id: requestId, receiverId, status: 'ACCEPTED' },
    data: { status: 'REJECTED' },
  });

  if (result.count === 0) {
    throw new AppError('Follow relationship not found or invalid', 404);
  }

  return { status: 'REJECTED' };
};
