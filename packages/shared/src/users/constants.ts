// currently just a copy of Prisma enum
export const USER_ROLES = ['ADMIN', 'DISPATCHER', 'COURIER'] as const;
export type UserRole = (typeof USER_ROLES)[number];
