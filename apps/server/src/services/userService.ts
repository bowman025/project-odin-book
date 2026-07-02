import { db, type FollowStatus, type User } from '@project-odin-book/db';
import type { UpdateProfileInput } from '@project-odin-book/validation';

type CreateUserInput = Pick<User, 'username' | 'email' | 'passwordHash'>;

export type AuthUser = Pick<User, 'id' | 'username' | 'email'>;
export type AuthLookupUser = Pick<
  User,
  'id' | 'username' | 'email' | 'passwordHash'
>;

export type PublicUser = Pick<User, 'id' | 'username' | 'email' | 'createdAt'>;
export type UserProfile = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  createdAt: Date;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
};
type UserWithCounts = {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  createdAt: Date;
  _count: {
    posts: number;
    sentFollows: number;
    receivedFollows: number;
  };
};

export type DirectoryUserPayload = Pick<
  User,
  'id' | 'username' | 'profilePicture' | 'bio'
> & {
  relationshipStatus: FollowStatus | 'NONE';
};

export type UsersDirectoryResult = {
  items: DirectoryUserPayload[];
  hasMore: boolean;
};

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
} as const;

const authUserSelect = {
  id: true,
  username: true,
  email: true,
} as const;

const authLookupSelect = {
  ...authUserSelect,
  passwordHash: true,
} as const;

const userProfileSelect = {
  id: true,
  username: true,
  profilePicture: true,
  bio: true,
  createdAt: true,
  _count: {
    select: {
      posts: true,
      sentFollows: { where: { status: 'ACCEPTED' } },
      receivedFollows: { where: { status: 'ACCEPTED' } },
    },
  },
} as const;

const mapToUserProfile = (user: UserWithCounts): UserProfile => {
  return {
    id: user.id,
    username: user.username,
    profilePicture: user.profilePicture,
    bio: user.bio,
    createdAt: user.createdAt,
    stats: {
      posts: user._count.posts,
      followers: user._count.receivedFollows,
      following: user._count.sentFollows,
    },
  };
};

export const createUser = async (
  data: CreateUserInput,
): Promise<PublicUser> => {
  return db.user.create({
    data,
    select: publicUserSelect,
  });
};

export const fetchUserIdentityById = async (
  id: string,
): Promise<AuthUser | null> => {
  return db.user.findUnique({
    where: { id },
    select: authUserSelect,
  });
};

export const fetchUserSessionById = async (
  id: string,
): Promise<(AuthUser & { refreshToken: string | null }) | null> => {
  return db.user.findUnique({
    where: { id },
    select: {
      ...authUserSelect,
      refreshToken: true,
    },
  });
};

export const fetchUserForAuth = async (
  identifier: string,
): Promise<AuthLookupUser | null> => {
  return db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: authLookupSelect,
  });
};

export const fetchUserProfileByUsername = async (
  username: string,
): Promise<UserProfile | null> => {
  const user = await db.user.findUnique({
    where: { username },
    select: userProfileSelect,
  });

  return user ? mapToUserProfile(user) : null;
};

export const updateUserProfile = async (
  id: string,
  data: UpdateProfileInput,
): Promise<UserProfile> => {
  const user = await db.user.update({
    where: { id },
    data,
    select: userProfileSelect,
  });

  return mapToUserProfile(user);
};

export const fetchUserDirectory = async (options: {
  currentUserId: string;
  skip: number;
  take: number;
}): Promise<UsersDirectoryResult> => {
  const { currentUserId, skip, take } = options;

  const users = await db.user.findMany({
    where: { id: { not: currentUserId } },
    skip,
    take: take + 1,
    orderBy: { username: 'asc' },
    select: {
      id: true,
      username: true,
      profilePicture: true,
      bio: true,
      receivedFollows: {
        where: {
          senderId: currentUserId,
        },
        take: 1,
        select: {
          status: true,
        },
      },
    },
  });

  const hasMore = users.length > take;
  const pageUsers = hasMore ? users.slice(0, take) : users;

  const items: DirectoryUserPayload[] = pageUsers.map((user) => {
    const relationshipStatus = user.receivedFollows[0]?.status ?? 'NONE';

    return {
      id: user.id,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio,
      relationshipStatus,
    };
  });

  return {
    items,
    hasMore,
  };
};
