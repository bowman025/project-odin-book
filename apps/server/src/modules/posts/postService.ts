import { db, type User } from '@project-odin-book/db';
import type {
  CreatePostInput,
  UpdatePostInput,
} from '@project-odin-book/validation';
import { deleteCloudinaryImageByUrl } from '../uploads/cloudinaryService.js';

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
  updatedAt: Date;
  tags: string[];
  author: PostAuthor;
  stats: PostStats;
  isLiked: boolean;
};

export type TimelineResult = {
  items: PostPayload[];
  hasMore: boolean;
};

type PostRecord = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; createdAt: Date; name: string }[];
  author: PostAuthor;
  _count: PostStats;
  likes?: Array<{ userId: string }>;
};

const authorSelect = {
  id: true,
  username: true,
  profilePicture: true,
} as const;

export const postSelect = (currentUserId?: string) =>
  ({
    id: true,
    content: true,
    imageUrl: true,
    createdAt: true,
    updatedAt: true,
    tags: true,
    author: {
      select: authorSelect,
    },
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
    ...(currentUserId && {
      likes: {
        where: { userId: currentUserId },
        select: { userId: true },
      },
    }),
  }) as const;

export const mapToPostPayload = (post: PostRecord): PostPayload => ({
  id: post.id,
  content: post.content,
  imageUrl: post.imageUrl,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  tags: Array.isArray(post.tags) ? post.tags.map((t) => t.name) : [],
  author: post.author,
  stats: {
    likes: post._count.likes,
    comments: post._count.comments,
  },
  isLiked: Array.isArray(post.likes) && post.likes.length > 0,
});

export const normalizeTags = (tags: string[] | string) => {
  let cleanTagsArray: string[] = [];

  if (Array.isArray(tags)) {
    cleanTagsArray = tags.map((t) =>
      t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
    );
  } else if (typeof tags === 'string') {
    const matches = tags.matchAll(/#(\w+)/g);
    const tagsSet = new Set<string>();
    for (const match of matches) {
      if (match[1]) {
        const cleanName = match[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (cleanName) tagsSet.add(cleanName);
      }
    }
    cleanTagsArray = Array.from(tagsSet);
  }

  return {
    connectOrCreate: cleanTagsArray.map((tagName) => ({
      where: { name: tagName },
      create: { name: tagName },
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
      tags: normalizeTags(tags ?? []),
    },
    select: postSelect(),
  });

  return mapToPostPayload(post);
};

export const fetchPost = async (options: {
  currentUserId: string;
  id: string;
}): Promise<PostPayload | null> => {
  const { currentUserId, id } = options;
  const post = await db.post.findUnique({
    where: { id },
    select: postSelect(currentUserId),
  });

  return post ? mapToPostPayload(post) : null;
};

export const modifyPost = async (options: {
  id: string;
  requesterId: string;
  data: UpdatePostInput;
}): Promise<PostPayload | null> => {
  const { id, requesterId, data } = options;
  const { content, imageUrl, tags } = data;
  const isVisualUpdate = content !== undefined || imageUrl !== undefined;

  const existing = await db.post.findUnique({
    where: { id },
    select: { authorId: true, imageUrl: true },
  });

  if (!existing || existing.authorId !== requesterId) {
    return null;
  }

  const updated = await db.post.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(tags !== undefined && { tags: { set: [], ...normalizeTags(tags) } }),
      ...(isVisualUpdate && { edited: true }),
    },
    select: postSelect(requesterId),
  });

  if (
    imageUrl !== undefined &&
    existing.imageUrl &&
    existing.imageUrl !== imageUrl
  ) {
    void deleteCloudinaryImageByUrl(existing.imageUrl);
  }

  return mapToPostPayload(updated);
};

export const removePost = async (options: {
  id: string;
  requesterId: string;
}): Promise<boolean> => {
  const { id, requesterId } = options;

  const existing = await db.post.findUnique({
    where: { id },
    select: { authorId: true, imageUrl: true },
  });

  if (!existing || existing.authorId !== requesterId) {
    return false;
  }

  await db.post.delete({ where: { id } });

  if (existing.imageUrl) {
    void deleteCloudinaryImageByUrl(existing.imageUrl);
  }

  return true;
};

export const fetchUserPosts = async (options: {
  authorId: string;
  currentUserId?: string;
  skip: number;
  take: number;
}): Promise<{ items: PostPayload[]; hasMore: boolean }> => {
  const { authorId, currentUserId, skip, take } = options;

  const posts = await db.post.findMany({
    where: { authorId },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: postSelect(currentUserId),
  });

  const hasMore = posts.length > take;
  const pagePosts = hasMore ? posts.slice(0, take) : posts;

  return {
    items: pagePosts.map(mapToPostPayload),
    hasMore,
  };
};

export const fetchGeneralTimeline = async (options: {
  currentUserId?: string;
  skip: number;
  take: number;
  search?: string;
}): Promise<TimelineResult> => {
  const { currentUserId, skip, take, search } = options;

  const whereClause = search?.trim()
    ? {
        tags: {
          some: {
            name: search.trim().toLowerCase(),
          },
        },
      }
    : {};

  const posts = await db.post.findMany({
    where: whereClause,
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: postSelect(currentUserId),
  });

  const hasMore = posts.length > take;
  const pagePosts = hasMore ? posts.slice(0, take) : posts;

  return {
    items: pagePosts.map(mapToPostPayload),
    hasMore,
  };
};

export const fetchPersonalTimeline = async (options: {
  currentUserId: string;
  skip: number;
  take: number;
}): Promise<TimelineResult> => {
  const { currentUserId, skip, take } = options;

  const posts = await db.post.findMany({
    where: {
      OR: [
        { authorId: currentUserId },
        {
          author: {
            receivedFollows: {
              some: {
                senderId: currentUserId,
                status: 'ACCEPTED',
              },
            },
          },
        },
      ],
    },
    skip,
    take: take + 1,
    orderBy: { createdAt: 'desc' },
    select: postSelect(currentUserId),
  });

  const hasMore = posts.length > take;
  const pagePosts = hasMore ? posts.slice(0, take) : posts;

  return {
    items: pagePosts.map(mapToPostPayload),
    hasMore,
  };
};
