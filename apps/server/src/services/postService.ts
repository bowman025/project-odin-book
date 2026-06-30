import { db, type User } from '@project-odin-book/db';

type CreatePostInput = {
  authorId: string;
  content: string;
  imageUrl?: string | null;
  tags?: string[];
};

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

type TimelineFeedResult = {
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
  data: CreatePostInput,
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

export const fetchTimeline = async (options: {
  skip: number;
  take: number;
}): Promise<TimelineFeedResult> => {
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
