import { db } from '@project-odin-book/db';
import { AppError } from '../../shared/errors/AppError.js';
import {
  mapToPostPayload,
  postSelect,
  type TimelineResult,
} from '../posts/postService.js';

type ToggleLikeResult = {
  liked: boolean;
  likeCount: number;
};

export const fetchUserLikes = async (options: {
  targetUsername: string;
  skip: number;
  take: number;
}): Promise<TimelineResult> => {
  const { targetUsername, skip, take } = options;

  const user = await db.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });

  if (!user) {
    throw new AppError('The requested citizen record was not found', 404);
  }

  const likes = await db.like.findMany({
    where: {
      user: { username: targetUsername },
    },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: {
      post: {
        select: postSelect(user.id),
      },
    },
  });

  const hasMore = likes.length > take;
  const pages = hasMore ? likes.slice(0, take) : likes;

  return {
    items: pages.map((item) => mapToPostPayload(item.post)),
    hasMore,
  };
};

export const togglePostLike = async (options: {
  postId: string;
  userId: string;
}): Promise<ToggleLikeResult> => {
  const { postId, userId } = options;

  return db.$transaction(async (tx) => {
    const existingLike = await tx.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    let liked: boolean;

    if (existingLike) {
      await tx.like.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
      liked = false;
    } else {
      await tx.like.create({
        data: {
          userId,
          postId,
        },
      });
      liked = true;
    }

    const postWithCount = await tx.post.findUnique({
      where: { id: postId },
      select: {
        _count: {
          select: { likes: true },
        },
      },
    });

    return {
      liked,
      likeCount: postWithCount?._count.likes ?? 0,
    };
  });
};
