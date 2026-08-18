import crypto from 'node:crypto';
import {
  db,
  type FollowStatus,
  type Prisma,
  type User,
} from '@project-odin-book/db';
import {
  type ChangePasswordInput,
  type DeleteAccountInput,
  type GitHubProfileApiResponse,
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
  const expirationThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);

  try {
    await db.user.deleteMany({
      where: {
        username: { startsWith: 'guest_' },
        createdAt: { lt: expirationThreshold },
      },
    });
  } catch (cleanupError) {
    console.warn('[Lazy Garbage Collection skipped]:', cleanupError);
  }

  const uniqueToken = crypto.randomBytes(3).toString('hex');
  const guestUsername = `guest_${uniqueToken}`;
  const guestEmail = `${guestUsername}@odinum.local`;

  return await db.$transaction(
    async (tx) => {
      const newGuest = await tx.user.create({
        data: {
          username: guestUsername,
          email: guestEmail,
          passwordHash: null,
          bio: 'This is a transient guest profile.',
        },
        select: {
          id: true,
          username: true,
          email: true,
        },
      });

      const baselineUsers = await tx.user.findMany({
        where: {
          NOT: { id: newGuest.id },
          email: { endsWith: '@odinum.seeded' },
        },
        take: 30,
        select: { id: true },
      });

      if (baselineUsers.length > 0) {
        const profilesForGuestToFollow = baselineUsers.slice(0, 20);
        const profilesToFollowTheGuest = baselineUsers.slice(20);

        const followPayloads: Array<{
          senderId: string;
          receiverId: string;
          status: 'ACCEPTED';
        }> = [];

        for (const peer of profilesForGuestToFollow) {
          followPayloads.push({
            senderId: newGuest.id,
            receiverId: peer.id,
            status: 'ACCEPTED',
          });
        }

        for (const peer of profilesToFollowTheGuest) {
          followPayloads.push({
            senderId: peer.id,
            receiverId: newGuest.id,
            status: 'ACCEPTED',
          });
        }

        await tx.follow.createMany({
          data: followPayloads,
        });
      }

      return newGuest;
    },
    {
      timeout: 15000,
    },
  );
};

export const upsertOauthUser = async (
  profile: GitHubProfileApiResponse,
): Promise<SessionAuthUser> => {
  const {
    id: githubId,
    login: githubUsername,
    email,
    avatar_url,
    bio,
  } = profile;

  const existingBySocialId = await db.user.findUnique({
    where: { githubId },
    select: sessionAuthUserSelect,
  });

  if (existingBySocialId) {
    return existingBySocialId;
  }

  if (email) {
    const existingByEmail = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingByEmail) {
      return db.user.update({
        where: { id: existingByEmail.id },
        data: { githubId },
        select: sessionAuthUserSelect,
      });
    }
  }

  const usernameTaken = await db.user.findUnique({
    where: { username: githubUsername },
    select: { id: true },
  });

  const resolvedUsername = usernameTaken
    ? `${githubUsername}_${githubId}`
    : githubUsername;

  const resolvedEmail = email || `${resolvedUsername}_github_stub@odinum.local`;

  return await db.user.create({
    data: {
      username: resolvedUsername,
      email: resolvedEmail,
      githubId,
      profilePicture: avatar_url ?? null,
      bio: bio || `GitHub explorer joining Odinum.`,
      passwordHash: null,
    },
    select: sessionAuthUserSelect,
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
  const user = await db.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive',
      },
    },
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
