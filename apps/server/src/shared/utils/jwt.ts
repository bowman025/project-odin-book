import {
  type AccessTokenPayload,
  accessTokenPayloadSchema,
  type BaseTokenPayload,
  type RefreshTokenPayload,
  refreshTokenPayloadSchema,
} from '@project-odin-book/validation';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

export const signAccessToken = (payload: BaseTokenPayload): string => {
  const validated = accessTokenPayloadSchema.parse({
    ...payload,
    type: 'access',
  });

  return jwt.sign(validated, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
};

export const signRefreshToken = (payload: BaseTokenPayload): string => {
  const validated = refreshTokenPayloadSchema.parse({
    ...payload,
    type: 'refresh',
  });

  return jwt.sign(validated, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    return accessTokenPayloadSchema.parse(decoded) as AccessTokenPayload;
  } catch (error) {
    throw new AppError('Invalid or expired access token', 401, true, {
      cause: error,
    });
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    return refreshTokenPayloadSchema.parse(decoded) as RefreshTokenPayload;
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, true, {
      cause: error,
    });
  }
};
