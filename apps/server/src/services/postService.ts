import { db, type User } from '@project-odin-book/db';
import type {
  CreatePostInput,
  UpdatePostInput,
} from '@project-odin-book/validation';

type PostAuthor = Pick<User, 'id' | 'username' | 'profilePicture'>;

type PostStats = {
  likes: number;
  comments: number;
};

export type PostPayload = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: PostAuthor;
  stats: PostStats;
};

type TimelineResult = {
  posts: PostPayload[];
  hasMore: boolean;
};

type PostRecord = Omit<PostPayload, 'stats'> & {
  _count: PostStats;
};

const authorSelect = {
  id: true,
  username: true,
  profilePicture: true,
} as const;

const postSelect = {
  id: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  author: {
    select: authorSelect,
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
} as const;

const mapToPostPayload = (post: PostRecord): PostPayload => ({
  id: post.id,
  content: post.content,
  imageUrl: post.imageUrl,
  createdAt: post.createdAt,
  author: post.author,
  stats: {
    likes: post._count.likes,
    comments: post._count.comments,
  },
});

const normalizeTags = (tags?: string[]) => {
  if (!tags || tags.length === 0) return undefined;

  const unique = [
    ...new Set(tags.map((t) => t.toLowerCase().trim()).filter(Boolean)),
  ];

  if (unique.length === 0) return undefined;

  return {
    connectOrCreate: unique.map((name) => ({
      where: { name },
      create: { name },
    })),
  };
};

export const insertPost = async (
  data: CreatePostInput & { authorId: string },
): Promise<PostPayload> => {
  const { authorId, content, imageUrl, tags } = data;

  const post = await db.post.create({
    data: {
      authorId,
      content,
      imageUrl: imageUrl ?? null,
      tags: normalizeTags(tags),
    },
    select: postSelect,
  });

  return mapToPostPayload(post);
};

export const fetchPost = async (id: string): Promise<PostPayload | null> => {
  const post = await db.post.findUnique({
    where: { id },
    select: postSelect,
  });

  return post ? mapToPostPayload(post) : null;
};

export const modifyPost = async (
  id: string,
  authorId: string,
  data: UpdatePostInput,
): Promise<PostPayload | null> => {
  const existing = await db.post.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!existing || existing.authorId !== authorId) return null;

  const { content, imageUrl, tags } = data;
  const isVisualUpdate = content !== undefined || imageUrl !== undefined;
  const result = await db.post.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(tags !== undefined && {
        tags: {
          set: [],
          ...normalizeTags(tags),
        },
      }),
      ...(isVisualUpdate && { edited: true }),
    },
    select: postSelect,
  });

  return mapToPostPayload(result);
};

export const removePost = async (
  id: string,
  requesterId: string,
): Promise<boolean> => {
  const result = await db.post.deleteMany({
    where: {
      id,
      authorId: requesterId,
    },
  });

  return result.count > 0;
};

export const fetchTimeline = async (options: {
  skip: number;
  take: number;
}): Promise<TimelineResult> => {
  const posts = await db.post.findMany({
    skip: options.skip,
    take: options.take + 1,
    orderBy: { createdAt: 'desc' },
    select: postSelect,
  });

  const hasMore = posts.length > options.take;
  const pagePosts = hasMore ? posts.slice(0, options.take) : posts;

  return {
    posts: pagePosts.map(mapToPostPayload),
    hasMore,
  };
};
