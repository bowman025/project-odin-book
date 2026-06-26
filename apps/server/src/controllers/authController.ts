import { db, type User } from '@project-odin-book/db';
import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

interface PassportInfo {
  message?: string;
}

export const login = (_req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    { session: false },
    async (
      err: unknown,
      user: User | false | undefined,
      info: PassportInfo,
    ) => {
      try {
        if (err) return next(err);

        if (!user) {
          throw new AppError(info?.message || 'Invalid credentials', 401);
        }

        const tokenPayload = { id: user.id, username: user.username };
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        await db.user.update({
          where: { id: user.id },
          data: { refreshToken },
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          status: 'success',
          message: 'Successfully signed in',
          accessToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        });
      } catch (error) {
        return next(error);
      }
    },
  );
};
