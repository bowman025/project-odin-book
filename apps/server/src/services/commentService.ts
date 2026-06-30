import { type Comment, db, type User } from '@project-odin-book/db';
import type { CreateCommentInput } from '@project-odin-book/validation';

export type CommentAuthor = Pick<User, 'id' | 'username' | 'profilePicture'>;

export type CommentPayload = Pick<
  Comment,
  'id' | 'postId' | 'content' | 'createdAt'
> & {
  author: CommentAuthor;
};

export type CommentResult = {
  comments: CommentPayload[];
  hasMore: boolean;
};

type FetchCommentOptions = {
  postId: string;
  skip: number;
  take: number;
};

type CreateCommentData = CreateCommentInput & {
  postId: string;
  authorId: string;
};

const commentAuthorSelect = {
  id: true,
  username: true,
  profilePicture: true,
} as const;

const commentSelect = {
  id: true,
  postId: true,
  content: true,
  createdAt: true,
  author: {
    select: commentAuthorSelect,
  },
} as const;

export const insertComment = async (
  data: CreateCommentData,
): Promise<CommentPayload> => {
  const { postId, authorId, content } = data;
  return db.comment.create({
    data: {
      postId,
      authorId,
      content,
    },
    select: commentSelect,
  });
};

export const fetchComments = async (
  options: FetchCommentOptions,
): Promise<CommentResult> => {
  const { postId, skip, take } = options;

  const comments = await db.comment.findMany({
    where: { postId },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: commentSelect,
  });

  const hasMore = comments.length > take;
  const pageComments = hasMore ? comments.slice(0, take) : comments;

  return {
    comments: pageComments as CommentPayload[],
    hasMore,
  };
};
