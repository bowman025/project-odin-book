import crypto from 'node:crypto';
import type { User } from '@project-odin-book/db';
import {
  type BaseTokenPayload,
  ChangePasswordSchema,
  DeleteAccountSchema,
  LoginSchema,
  RegisterSchema,
} from '@project-odin-book/validation';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { isProduction } from '../../shared/config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../shared/utils/jwt.js';
import {
  createUser,
  destroyUserAccount,
  fetchUserSessionById,
  updateUserPassword,
} from '../users/userService.js';
import { updateRefreshToken } from './tokenService.js';

type PassportInfo = {
  message?: string;
};

type BaseUserIdentity = Pick<User, 'id' | 'username' | 'email'>;

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const { maxAge, ...clearCookieOptions } = refreshCookieOptions;

const buildTokenPayload = (user: BaseUserIdentity): BaseTokenPayload => ({
  id: user.id,
  username: user.username,
  email: user.email,
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = RegisterSchema.safeParse(req.body);

  if (!result.success) {
    return next(result.error);
  }

  try {
    const { username, email, password } = result.data;

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      username,
      email,
      passwordHash,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully',
      user: newUser,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = (req: Request, res: Response, next: NextFunction) => {
  const result = LoginSchema.safeParse(req.body);

  if (!result.success) {
    return next(result.error);
  }

  req.body = result.data;

  return passport.authenticate(
    'local',
    { session: false },
    async (
      err: unknown,
      user: User | false | undefined,
      info?: PassportInfo,
    ) => {
      try {
        if (err) return next(err);

        if (!user) {
          return next(
            new AppError(info?.message || 'Invalid credentials', 401),
          );
        }

        const tokenPayload = buildTokenPayload(user);
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);
        const hashedRefreshToken = hashToken(refreshToken);

        await updateRefreshToken({
          id: user.id,
          hashedToken: hashedRefreshToken,
        });

        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        const userResponse: BaseUserIdentity = {
          id: user.id,
          username: user.username,
          email: user.email,
        };

        return res.status(200).json({
          status: 'success',
          message: 'Logged in successfully',
          accessToken,
          user: userResponse,
        });
      } catch (error) {
        return next(error);
      }
    },
  )(req, res, next);
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    if (!rawRefreshToken) {
      throw new AppError('Refresh token missing. Please log in again', 401);
    }

    const decoded = verifyRefreshToken(rawRefreshToken);
    const hashedTokenFromCookie = hashToken(rawRefreshToken);
    const user = await fetchUserSessionById(decoded.id);

    if (!user) {
      res.clearCookie('refreshToken', clearCookieOptions);
      throw new AppError(
        'Session invalid or expired. Please log in again.',
        401,
      );
    }

    let isValid = false;

    if (user.refreshToken) {
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(user.refreshToken),
          Buffer.from(hashedTokenFromCookie),
        );
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      res.clearCookie('refreshToken', clearCookieOptions);
      throw new AppError(
        'Session invalid or expired. Please log in again.',
        401,
      );
    }

    const tokenPayload = buildTokenPayload(user);
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    const newHashedRefreshToken = hashToken(newRefreshToken);

    await updateRefreshToken({
      id: user.id,
      hashedToken: newHashedRefreshToken,
    });

    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    return res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    if (rawRefreshToken) {
      try {
        const decoded = verifyRefreshToken(rawRefreshToken);
        const hashedTokenFromCookie = hashToken(rawRefreshToken);
        const user = await fetchUserSessionById(decoded.id);

        let isValid = false;

        if (user?.refreshToken) {
          try {
            isValid = crypto.timingSafeEqual(
              Buffer.from(user.refreshToken),
              Buffer.from(hashedTokenFromCookie),
            );
          } catch {
            isValid = false;
          }
        }

        if (isValid && user) {
          await updateRefreshToken({ id: user.id, hashedToken: null });
        }
      } catch (error) {
        console.warn('[Logout cleanup skipped]:', error);
      }
    }

    res.clearCookie('refreshToken', clearCookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const bodyResult = ChangePasswordSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    const { currentPassword, newPassword } = bodyResult.data;

    await updateUserPassword({
      userId: currentUserId,
      input: {
        currentPassword,
        newPassword,
      },
    });

    res.clearCookie('refreshToken', clearCookieOptions);

    return res.status(200).json({
      status: 'success',
      message: 'Your password has been changed successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const bodyResult = DeleteAccountSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return next(bodyResult.error);
  }

  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return next(new AppError('Authentication context required', 401));
    }

    await destroyUserAccount({ userId: currentUserId, input: bodyResult.data });

    res.clearCookie('refreshToken', clearCookieOptions);

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};
