import { db, type User } from '@project-odin-book/db';

type CreateUserInput = Pick<User, 'username' | 'email' | 'passwordHash'>;
type UpdateProfileInput = Partial<Pick<User, 'bio' | 'profilePicture'>>;

type AuthUser = Pick<User, 'id' | 'username' | 'email'>;
type AuthLookupUser = AuthUser & {
  passwordHash: string | null;
};

type PublicUser = Pick<User, 'id' | 'username' | 'email' | 'createdAt'>;
type UserProfile = {
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
  id: true,
  username: true,
  email: true,
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
      sentFollows: true,
      receivedFollows: true,
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

export const getUserIdentityById = async (
  id: string,
): Promise<AuthUser | null> => {
  return db.user.findUnique({
    where: { id },
    select: authUserSelect,
  });
};

export const getUserSessionById = async (
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

export const findUserForAuth = async (
  identifier: string,
): Promise<AuthLookupUser | null> => {
  return db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: authLookupSelect,
  });
};

export const getUserProfileByUsername = async (
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
