import jwt from 'jsonwebtoken';
import { env } from './env';
import type { Role } from '../types/index';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: Role;
}

export const signAccessToken = (payload: JwtPayload): string => {
  console.log('[SIGN] secret length:', env.JWT_SECRET.length, 'first/last 4:', env.JWT_SECRET.slice(0,4), env.JWT_SECRET.slice(-4));
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const signRefreshToken = (payload: JwtPayload): string => {
  console.log('[SIGN] refresh secret length:', env.JWT_REFRESH_SECRET.length, 'first/last 4:', env.JWT_REFRESH_SECRET.slice(0,4), env.JWT_REFRESH_SECRET.slice(-4));
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  console.log('[VERIFY] secret length:', env.JWT_SECRET.length, 'first/last 4:', env.JWT_SECRET.slice(0,4), env.JWT_SECRET.slice(-4));
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  console.log('[VERIFY] refresh secret length:', env.JWT_REFRESH_SECRET.length, 'first/last 4:', env.JWT_REFRESH_SECRET.slice(0,4), env.JWT_REFRESH_SECRET.slice(-4));
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};
