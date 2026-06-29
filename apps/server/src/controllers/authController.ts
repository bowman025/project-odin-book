import crypto from 'node:crypto';
import type { User } from '@project-odin-book/db';
import {
  type BaseTokenPayload,
  LoginSchema,
  RegisterSchema,
} from '@project-odin-book/validation';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../auth/jwt.js';
import { isProduction } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { updateRefreshToken } from '../services/tokenService.js';
import { createUser, getUserSessionById } from '../services/userService.js';

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

        await updateRefreshToken(user.id, hashedRefreshToken);

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
    const user = await getUserSessionById(decoded.id);

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

    await updateRefreshToken(user.id, newHashedRefreshToken);

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
        const user = await getUserSessionById(decoded.id);

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
          await updateRefreshToken(user.id, null);
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
