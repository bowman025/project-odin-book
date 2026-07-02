import { db, type FollowStatus } from '@project-odin-book/db';
import { AppError } from '../errors/AppError.js';

export type FollowActionPayload = {
  status: FollowStatus | 'NONE';
};

export const toggleFollowRequest = async (
  receiverUsername: string,
  senderId: string,
): Promise<FollowActionPayload> => {
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

export const acceptFollowRequest = (requestId: string, receiverId: string) =>
  respondToFollowRequest(requestId, receiverId, 'ACCEPTED');

export const rejectFollowRequest = (requestId: string, receiverId: string) =>
  respondToFollowRequest(requestId, receiverId, 'REJECTED');
