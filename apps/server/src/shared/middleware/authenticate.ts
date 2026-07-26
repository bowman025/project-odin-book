import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

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

import jwt from 'jsonwebtoken';

export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      id: string;
      username: string;
      email: string;
    };

    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      profilePicture: null,
    };

    return next();
  } catch {
    req.user = undefined;
    return next();
  }
};
