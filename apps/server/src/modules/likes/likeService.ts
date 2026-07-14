import { db } from '@project-odin-book/db';

type ToggleLikeResult = {
  liked: boolean;
  likeCount: number;
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
