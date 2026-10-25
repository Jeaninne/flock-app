// currently just a copy of Prisma enum
export const ROLES = ['ADMIN', 'DISPATCHER', 'COURIER'] as const;
export type UserRole = (typeof ROLES)[number];
