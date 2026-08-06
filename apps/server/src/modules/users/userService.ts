import {
  db,
  type FollowStatus,
  type Prisma,
  type User,
} from '@project-odin-book/db';
import {
  type ChangePasswordInput,
  type DeleteAccountInput,
  getEmailPrefix,
  type UpdateProfileInput,
} from '@project-odin-book/validation';
import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/AppError.js';
import { deleteCloudinaryImageByUrl } from '../uploads/cloudinaryService.js';

type CreateUserInput = Pick<User, 'username' | 'email' | 'passwordHash'>;

export type SessionUser = Pick<User, 'id' | 'username' | 'profilePicture'>;
export type AuthUser = Pick<User, 'id' | 'username' | 'email'>;
export type SessionAuthUser = Pick<
  User,
  'id' | 'username' | 'email' | 'profilePicture'
>;

export type SessionAuthLookupUser = Pick<
  User,
  'id' | 'username' | 'email' | 'profilePicture' | 'passwordHash'
>;
export type AuthLookupUser = Pick<
  User,
  'id' | 'username' | 'email' | 'passwordHash'
>;
export type CreatedUser = Pick<
  User,
  'id' | 'username' | 'email' | 'profilePicture' | 'createdAt'
>;

export type UserAuthDetails = {
  hasPassword: boolean;
};

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

export type FetchDirectoryOptions = {
  currentUserId: string;
  skip: number;
  take: number;
  q?: string;
  sortBy?: 'alphabetical' | 'newest' | 'followers';
  letter?: string;
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

const createdUserSelect = {
  id: true,
  username: true,
  email: true,
  profilePicture: true,
  createdAt: true,
} as const;

const sessionUserSelect = {
  id: true,
  username: true,
  profilePicture: true,
} as const;

const sessionAuthUserSelect = {
  id: true,
  username: true,
  email: true,
  profilePicture: true,
};

const sessionAuthLookupSelect = {
  ...sessionAuthUserSelect,
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
): Promise<CreatedUser> => {
  return db.user.create({
    data,
    select: createdUserSelect,
  });
};

export const createOrUpdateGuestUser = async (): Promise<AuthUser> => {
  return await db.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      username: 'guest',
      email: 'user@example.com',
      passwordHash: 'GUEST_ACCOUNT_BYPASS_NO_HASH_REQUIRED',
      bio: 'Welcome! I am a guest exploring this social network.',
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });
};

export const fetchUserIdentityById = async (
  id: string,
): Promise<SessionUser | null> => {
  return db.user.findUnique({
    where: { id },
    select: sessionUserSelect,
  });
};

export const fetchUserSessionById = async (
  id: string,
): Promise<(SessionAuthUser & { refreshToken: string | null }) | null> => {
  return db.user.findUnique({
    where: { id },
    select: {
      ...sessionAuthUserSelect,
      refreshToken: true,
    },
  });
};

export const fetchUserForAuth = async (
  identifier: string,
): Promise<SessionAuthLookupUser | null> => {
  return db.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
    select: sessionAuthLookupSelect,
  });
};

export const fetchUserAuthDetails = async (
  id: string,
): Promise<UserAuthDetails> => {
  const user = await db.user.findUnique({
    where: { id },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new AppError(
      'User account context not found in the realm registries',
      404,
    );
  }

  return {
    hasPassword: user.passwordHash !== null && user.passwordHash !== undefined,
  };
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

export const updateUserProfile = async (options: {
  id: string;
  data: UpdateProfileInput;
}): Promise<UserProfile> => {
  const { id, data } = options;
  const { profilePicture } = data;

  const existing = await db.user.findUnique({
    where: { id },
    select: { profilePicture: true },
  });

  const user = await db.user.update({
    where: { id },
    data,
    select: userProfileSelect,
  });

  if (
    profilePicture !== undefined &&
    existing?.profilePicture &&
    existing.profilePicture !== profilePicture
  ) {
    void deleteCloudinaryImageByUrl(existing.profilePicture);
  }

  return mapToUserProfile(user);
};

export const fetchUserDirectory = async (
  options: FetchDirectoryOptions,
): Promise<UsersDirectoryResult> => {
  const { currentUserId, skip, take, q, sortBy, letter } = options;

  const whereClause: Prisma.UserWhereInput = {
    id: { not: currentUserId },
  };

  if (q) {
    whereClause.username = {
      contains: q,
      mode: 'insensitive',
    };
  }

  if (letter) {
    if (letter === '#') {
      whereClause.AND = [
        {
          NOT: [
            {
              OR: 'abcdefghijklmnopqrstuvwxyz'.split('').map((char) => ({
                username: { startsWith: char, mode: 'insensitive' },
              })),
            },
          ],
        },
      ];
    } else {
      whereClause.username = {
        startsWith: letter,
        mode: 'insensitive',
      };
    }
  }

  let orderByClause: Prisma.UserOrderByWithRelationInput = { username: 'asc' };

  if (sortBy === 'newest') {
    orderByClause = { createdAt: 'desc' };
  } else if (sortBy === 'followers') {
    orderByClause = {
      receivedFollows: {
        _count: 'desc',
      },
    };
  }

  const users = await db.user.findMany({
    where: whereClause,
    skip,
    take: take + 1,
    orderBy: orderByClause,
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
    const relationshipStatus = user.receivedFollows?.[0]?.status ?? 'NONE';

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

export const updateUserPassword = async (options: {
  userId: string;
  input: ChangePasswordInput;
}): Promise<void> => {
  const { userId, input } = options;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 400);
  }

  if (!user.passwordHash) {
    throw new AppError(
      'Accounts authenticated via social platforms cannot change local passwords directly',
      400,
    );
  }

  const isMatch = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isMatch) {
    throw new AppError('The current password you entered is incorrect', 400);
  }

  const newPasswordLower = input.newPassword.toLowerCase();
  const usernameLower = user.username.toLowerCase();
  const emailPrefix = getEmailPrefix(user.email);

  if (newPasswordLower.includes(usernameLower)) {
    throw new AppError('Password cannot contain your username', 400);
  }

  if (
    emailPrefix &&
    emailPrefix.length >= 4 &&
    newPasswordLower.includes(emailPrefix)
  ) {
    throw new AppError(
      'Password cannot contain identifying components of your email',
      400,
    );
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      refreshToken: null,
    },
  });
};

export const destroyUserAccount = async (options: {
  userId: string;
  input: DeleteAccountInput;
}): Promise<void> => {
  const { userId, input } = options;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 400);
  }

  if (user.passwordHash) {
    const isMatch = await bcrypt.compare(
      input.password ?? '',
      user.passwordHash,
    );

    if (!isMatch) {
      throw new AppError('Invalid credentials', 400);
    }
  } else {
    if (input.confirmation !== 'DELETE') {
      throw new AppError('Invalid credentials', 400);
    }
  }

  await db.$transaction(async (tx) => {
    await tx.user.delete({
      where: { id: userId },
    });

    await tx.conversation.deleteMany({
      where: {
        participants: { none: {} },
      },
    });
  });
};
