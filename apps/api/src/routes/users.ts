import { Router } from 'express';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { visibleUsersWhere } from '../lib/scopes.js';
import { getAuth } from '../middleware/require-auth.js';
import { requireRole } from '../middleware/require-role.js';

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
