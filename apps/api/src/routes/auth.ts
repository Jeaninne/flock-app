import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { validateBody } from '../middleware/validate.js';
import { type LoginInput, loginSchema } from '@flock/shared';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { AppError } from '../lib/app-error.js';
import { generateRefreshToken, signAccessToken } from '../lib/tokens.js';
import { isDev } from '../lib/env.js';

export const authRouter = Router();

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
  const accessToken = await signAccessToken(currentUser);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: currentUser.id,
      tokenFamilyId,
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
    },
  });

  res.cookie('refresh_token', refreshToken.token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: 'strict',
    path: '/api/v1/auth',
    expires: refreshToken.expiresAt,
  });

  res.json({
    accessToken,
    user: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      companyId: currentUser.companyId,
    },
  });
});
