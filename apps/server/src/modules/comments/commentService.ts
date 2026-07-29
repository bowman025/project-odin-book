import { type Comment, db, type User } from '@project-odin-book/db';
import type {
  CreateCommentInput,
  UpdateCommentInput,
} from '@project-odin-book/validation';

export type CommentAuthor = Pick<User, 'id' | 'username' | 'profilePicture'>;

export type CommentPayload = Pick<
  Comment,
  'id' | 'postId' | 'content' | 'createdAt' | 'edited'
> & {
  author: CommentAuthor;
};

type CreateCommentData = CreateCommentInput & {
  postId: string;
  authorId: string;
};

type FetchCommentOptions = {
  postId: string;
  skip: number;
  take: number;
};

export type CommentResult = {
  items: CommentPayload[];
  hasMore: boolean;
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
  edited: true,
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

export const modifyComment = async (options: {
  id: string;
  requesterId: string;
  data: UpdateCommentInput;
}): Promise<CommentPayload | null> => {
  const { id, requesterId, data } = options;
  const existing = await db.comment.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!existing || existing.authorId !== requesterId) return null;

  const { content } = data;

  return db.comment.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
    },
    select: commentSelect,
  });
};

export const removeComment = async (options: {
  id: string;
  requesterId: string;
}): Promise<boolean> => {
  const { id, requesterId } = options;
  const result = await db.comment.deleteMany({
    where: {
      id,
      authorId: requesterId,
    },
  });

  return result.count > 0;
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
    items: pageComments,
    hasMore,
  };
};
