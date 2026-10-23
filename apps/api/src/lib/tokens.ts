import { SignJWT, jwtVerify } from 'jose';
import { env } from './env.js';
import type { User } from '../generated/prisma/client.js';
import { createHash, randomBytes } from 'node:crypto';

export type AccessTokenPayload = {
  sub: string;
  role: User['role'];
  companyId: string;
};

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const signAccessToken = (user: Pick<User, 'id' | 'role' | 'companyId'>) =>
  new SignJWT({ role: user.role, companyId: user.companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);

export const verifyAccessToken = async (token: string) => {
  const { payload } = await jwtVerify<AccessTokenPayload>(token, secret, { algorithms: ['HS256'] });
  return payload;
};

export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const generateRefreshToken = () => {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
};
