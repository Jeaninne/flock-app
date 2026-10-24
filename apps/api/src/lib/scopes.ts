import type { Prisma } from '../generated/prisma/client.js';
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
