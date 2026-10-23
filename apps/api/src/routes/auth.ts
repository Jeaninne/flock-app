import { type CookieOptions, type Response, Router } from 'express';
import { randomUUID } from 'node:crypto';
import { validateBody } from '../middleware/validate.js';
import { type LoginInput, loginSchema } from '@flock/shared';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { AppError } from '../lib/app-error.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../lib/tokens.js';
import { isDev } from '../lib/env.js';
import type { User } from '../generated/prisma/client.js';
import { requireAuth } from '../middleware/require-auth.js';

export const authRouter = Router();

const REFRESH_TOKEN = 'refresh_token';
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: !isDev,
  sameSite: 'strict',
  path: '/api/v1/auth',
};

const setRefreshCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(REFRESH_TOKEN, token, { ...refreshCookieOptions, expires: expiresAt });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN, refreshCookieOptions);
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

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
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

authRouter.post('/refresh', async (req, res) => {
  const oldRefreshToken = req.cookies[REFRESH_TOKEN];
  if (!oldRefreshToken || typeof oldRefreshToken !== 'string') {
    rejectRefresh(res);
  }
  const tokenHash = hashRefreshToken(oldRefreshToken);
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

  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.updateMany({
      where: { id: authRecord.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return null; // someone already used this token → reuse

    const newRefreshToken = generateRefreshToken();
    await tx.refreshToken.create({
      data: {
        userId: authRecord.userId,
        tokenFamilyId: authRecord.tokenFamilyId,
        tokenHash: newRefreshToken.tokenHash,
        expiresAt: newRefreshToken.expiresAt,
      },
    });

    return newRefreshToken;
  });

  if (!result) {
    await revokeFamily(authRecord.tokenFamilyId);
    rejectRefresh(res);
  }

  setRefreshCookie(res, result.token, result.expiresAt);
  await sendAuthResponse(res, authRecord.user);
});

authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies[REFRESH_TOKEN];
  if (refreshToken && typeof refreshToken === 'string') {
    const tokenHash = hashRefreshToken(refreshToken);
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
  const userId = req.auth?.sub;
  if (!userId) throw new AppError('UNAUTHORIZED', 'Invalid access token');
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || user.deletedAt) throw new AppError('UNAUTHORIZED', 'Invalid access token');

  res.json({ user: toAuthUser(user) });
});
