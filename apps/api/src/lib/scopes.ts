import type { Prisma } from '../generated/prisma/client.js';
import type { UserRole } from '../generated/prisma/enums.js';
import type { AccessTokenPayload } from './tokens.js';

export const visibleUsersWhere = (auth: AccessTokenPayload): Prisma.UserWhereInput => {
  switch (auth.role) {
    case 'ADMIN':
      return {
        companyId: auth.companyId,
        deletedAt: null,
      };
    case 'DISPATCHER':
      return {
        companyId: auth.companyId,
        dispatcherId: auth.sub,
        role: 'COURIER',
        deletedAt: null,
      };
    case 'COURIER':
      return {
        companyId: auth.companyId,
        id: auth.sub,
        deletedAt: null,
      };
  }
};

export const lockActiveUser = async (
  tx: Prisma.TransactionClient,
  companyId: string,
  id: string,
  role: UserRole,
) => {
  const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM users
      WHERE id = ${id}::uuid
          AND company_id = ${companyId}::uuid
          AND role = ${role}::user_role
          AND deleted_at IS NULL
      FOR SHARE
  `;
  return rows[0] ?? null;
};
