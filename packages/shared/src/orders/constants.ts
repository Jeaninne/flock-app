// currently just a copy of Prisma enum TODO: add typecheck in API
export const ORDER_TYPES = ['ASAP', 'SCHEDULED'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];
