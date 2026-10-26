import { type CookieOptions, type Response, Router } from 'express';
import { randomUUID } from 'node:crypto';
import { validateBody } from '../middleware/validate.js';
import {
  type LoginInput,
  loginSchema,
  type SetPasswordInput,
  setPasswordSchema,
} from '@flock/shared';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { AppError } from '../lib/app-error.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../lib/tokens.js';
import { isDev } from '../lib/env.js';
import type { User } from '../generated/prisma/client.js';
import { getAuth, requireAuth } from '../middleware/require-auth.js';
import { loginLimiter, refreshLimiter } from '../middleware/rate-limit.js';

export const authRouter = Router();

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: !isDev,
  sameSite: 'strict',
  path: '/api/v1/auth',
};

const setRefreshCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(REFRESH_TOKEN_COOKIE, token, { ...refreshCookieOptions, expires: expiresAt });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions);
};

// Must stay a `function` declaration with an explicit `never`:
// only then does TS narrow types after the call (an untyped arrow breaks it)
function rejectRefresh(res: Response): never {
  clearRefreshCookie(res);
  throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token');
}

const revokeFamily = (tokenFamilyId: string) =>
  prisma.refreshToken.updateMany({
    where: { tokenFamilyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

const revokeAllForUser = (userId: string) =>
  prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'companyId'>;
const toAuthUser = (user: AuthUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  companyId: user.companyId,
});

const sendAuthResponse = async (res: Response, user: AuthUser) => {
  const accessToken = await signAccessToken(user);

  res.json({ accessToken, user: toAuthUser(user) });
};

authRouter.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as LoginInput;
  const currentUser = await prisma.user.findUnique({
    where: { email },
    omit: { passwordHash: false },
  });
  // check if such user exists, passwords match and account still active
  const validPass = await verifyPassword(password, currentUser?.passwordHash);
  if (!currentUser || currentUser.deletedAt || !validPass) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  const tokenFamilyId = randomUUID();
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: currentUser.id,
      tokenFamilyId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    },
  });

  setRefreshCookie(res, refreshToken.token, refreshToken.expiresAt);
  await sendAuthResponse(res, currentUser);
});

authRouter.post('/refresh', refreshLimiter, async (req, res) => {
  const oldRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
  if (!oldRefreshToken || typeof oldRefreshToken !== 'string') {
    rejectRefresh(res);
  }
  const tokenHash = hashToken(oldRefreshToken);
  const authRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!authRecord) rejectRefresh(res);
  if (authRecord.revokedAt) {
    await revokeFamily(authRecord.tokenFamilyId);
    rejectRefresh(res);
  }
  if (authRecord.expiresAt < new Date()) {
    rejectRefresh(res);
  }
  if (authRecord.user.deletedAt) {
    await revokeAllForUser(authRecord.userId);
    rejectRefresh(res);
  }

  const newRefreshToken = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.updateMany({
      where: { id: authRecord.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return null; // someone already used this token → reuse

    const nextRefreshToken = generateRefreshToken();
    await tx.refreshToken.create({
      data: {
        userId: authRecord.userId,
        tokenFamilyId: authRecord.tokenFamilyId,
        tokenHash: nextRefreshToken.tokenHash,
        expiresAt: nextRefreshToken.expiresAt,
      },
    });

    return nextRefreshToken;
  });

  if (!newRefreshToken) {
    await revokeFamily(authRecord.tokenFamilyId);
    rejectRefresh(res);
  }

  setRefreshCookie(res, newRefreshToken.token, newRefreshToken.expiresAt);
  await sendAuthResponse(res, authRecord.user);
});

authRouter.post('/logout', refreshLimiter, async (req, res) => {
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
  if (refreshToken && typeof refreshToken === 'string') {
    const tokenHash = hashToken(refreshToken);
    const authRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { tokenFamilyId: true },
    });

    if (authRecord) {
      await revokeFamily(authRecord.tokenFamilyId);
    }
  }
  clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = getAuth(req).sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || user.deletedAt) throw new AppError('UNAUTHORIZED', 'Invalid access token');

  res.json({ user: toAuthUser(user) });
});

authRouter.post('/setup-password', validateBody(setPasswordSchema), async (req, res) => {
  const now = new Date();
  const { token, password } = req.body as SetPasswordInput;
  const tokenHash = hashToken(token);
  const record = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { deletedAt: true } } },
  });
  if (!record || record.expiresAt < now || record.usedAt || record.user.deletedAt)
    throw new AppError('BAD_REQUEST', 'Invalid or expired link');

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.passwordSetupToken.updateMany({
      where: { tokenHash, usedAt: null },
      data: { usedAt: now },
    });
    if (count === 0) throw new AppError('BAD_REQUEST', 'Invalid or expired link');

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    // cleanup
    await tx.passwordSetupToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
  });

  res.status(204).end();
});
