import type {
  OrderType as POrderType,
  UserRole as PUserRole,
  VehicleType as PVehicleType,
} from '../generated/prisma/enums.js';
import type { OrderType, UserRole, VehicleType } from '@flock/shared';

// Compile-time check: fails typecheck if Prisma enums and shared constants drift apart
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// don't delete this
// no need to import anywhere - it's used for typecheck
export const userRoleInSync: Equal<PUserRole, UserRole> = true;
export const orderTypeInSync: Equal<POrderType, OrderType> = true;
export const vehicleTypeInSync: Equal<PVehicleType, VehicleType> = true;
