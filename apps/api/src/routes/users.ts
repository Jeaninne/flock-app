import { Router } from 'express';
import { inviteUserSchema, type InviteUserInput } from '@flock/shared';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { lockActiveUser, visibleUsersWhere } from '../lib/scopes.js';
import { getAuth } from '../middleware/require-auth.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';
import { AppError } from '../lib/app-error.js';
import { generateSetupToken } from '../lib/tokens.js';
import { env } from '../lib/env.js';

export const usersRouter = Router();

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  dispatcherId: true,
  courierStatus: true,
} satisfies Prisma.UserSelect;

usersRouter.get('/', requireRole('ADMIN', 'DISPATCHER'), async (req, res) => {
  const auth = getAuth(req);
  const users = await prisma.user.findMany({
    where: visibleUsersWhere(auth),
    select: userListSelect,
    orderBy: { name: 'asc' },
  });
  res.json({ users });
});

usersRouter.post(
  '/invite',
  requireRole('ADMIN'),
  validateBody(inviteUserSchema),
  async (req, res) => {
    const auth = getAuth(req);
    const userToCreate: InviteUserInput = req.body;

    const data = await prisma.$transaction(async (tx) => {
      // Lock admin row until this transaction ends
      const admin = await lockActiveUser(tx, auth.companyId, auth.sub, auth.role);
      if (!admin) throw new AppError('FORBIDDEN', 'Account is not active');

      if (userToCreate.dispatcherId) {
        // Duplicates the zod check (defense in depth)
        if (userToCreate.role !== 'COURIER') {
          throw new AppError('BAD_REQUEST', 'dispatcherId must be empty for this role');
        }
        const dispatcher = await lockActiveUser(
          tx,
          auth.companyId,
          userToCreate.dispatcherId,
          'DISPATCHER',
        );
        if (!dispatcher)
          throw new AppError('BAD_REQUEST', 'dispatcherId must reference an active dispatcher');
      }

      let user;
      try {
        user = await tx.user.create({
          data: {
            companyId: auth.companyId,
            name: userToCreate.name,
            role: userToCreate.role,
            email: userToCreate.email,
            dispatcherId: userToCreate.dispatcherId,
            courierStatus: userToCreate.role === 'COURIER' ? 'AVAILABLE' : undefined,
          },
          select: userListSelect,
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new AppError('CONFLICT', 'Email is already in use');
        }
        throw err;
      }

      const setupToken = generateSetupToken();
      await tx.passwordSetupToken.create({
        data: {
          userId: user.id,
          tokenHash: setupToken.tokenHash,
          expiresAt: setupToken.expiresAt,
        },
      });

      const setupLink = new URL('/setup-password', env.WEB_URL);
      setupLink.searchParams.set('token', setupToken.token);
      return { user, setupLink: setupLink.toString() };
    });

    res.status(201).json(data);
  },
);
