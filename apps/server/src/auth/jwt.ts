import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface UserTokenPayload {
  id: string;
  username: string;
  type: 'access' | 'refresh';
}

const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

export const signAccessToken = (payload: UserTokenPayload): string => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

export const signRefreshToken = (payload: UserTokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

export const verifyAccessToken = (token: string): UserTokenPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET) as UserTokenPayload;
};

export const verifyRefreshToken = (token: string): UserTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as UserTokenPayload;
};
