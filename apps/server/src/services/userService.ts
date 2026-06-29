import { db, type User } from '@project-odin-book/db';
import type { BaseTokenPayload } from '@project-odin-book/validation';

type CreateUserInput = Pick<User, 'username' | 'email' | 'passwordHash'>;
type PublicProfile = Pick<User, 'id' | 'username' | 'email' | 'createdAt'>;
type AuthLookupUser = Pick<User, 'id' | 'username' | 'email' | 'passwordHash'>;

export const createUser = async (
  data: CreateUserInput,
): Promise<PublicProfile> => {
  return db.user.create({
    data,
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  });
};

export const getUserIdentityById = async (
  id: string,
): Promise<BaseTokenPayload | null> => {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });
};

export const getUserSessionById = async (
  id: string,
): Promise<(BaseTokenPayload & { refreshToken: string | null }) | null> => {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
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
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
    },
  });
};
