import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';
import { AppError } from '../errors/AppError.js';

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication token missing or malformed', 401);
    }

    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
