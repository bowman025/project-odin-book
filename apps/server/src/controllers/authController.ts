import crypto from 'node:crypto';
import { db, type User } from '@project-odin-book/db';
import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../auth/jwt.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

type PassportInfo = {
  message?: string;
};

type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export const login = (req: Request, res: Response, next: NextFunction) => {
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
          throw new AppError(info?.message || 'Invalid credentials', 401);
        }

        const tokenPayload = {
          id: user.id,
          username: user.username,
          email: user.email,
        };
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        const hashedRefreshToken = crypto
          .createHash('sha256')
          .update(refreshToken)
          .digest('hex');

        const isProduction = env.NODE_ENV === 'production';

        await db.user.update({
          where: { id: user.id },
          data: { refreshToken: hashedRefreshToken },
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const userResponse: AuthUser = {
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

    const hashedTokenFromCookie = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');

    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, refreshToken: true },
    });

    if (!user) {
      res.clearCookie('refreshToken');
      throw new AppError(
        'Session invalid or expired. Please log in again.',
        401,
      );
    }

    const isValid =
      user?.refreshToken &&
      user.refreshToken.length === hashedTokenFromCookie.length &&
      crypto.timingSafeEqual(
        Buffer.from(user.refreshToken),
        Buffer.from(hashedTokenFromCookie),
      );

    if (!isValid) {
      res.clearCookie('refreshToken');
      throw new AppError(
        'Session invalid or expired. Please log in again.',
        401,
      );
    }

    const newAccessToken = signAccessToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    return res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(error);
  }
};
