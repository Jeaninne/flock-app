// TODO: update after implementation
// currently just a copy of Prisma enum TODO: add typecheck in API
export const VEHICLE_TYPES = ['BICYCLE', 'SCOOTER', 'CAR', 'VAN'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// limits for orders
type Dimensions = { lengthCm: number; widthCm: number; heightCm: number };
type VehicleLimits = { maxLoadGrams: number; cargo: Dimensions };

export const MAX_SIDE = 300;
export const MAX_WEIGHT = 1000000;
export const VEHICLE_LIMITS = {
  BICYCLE: { maxLoadGrams: 10000, cargo: { lengthCm: 50, widthCm: 40, heightCm: 40 } },
  SCOOTER: { maxLoadGrams: 20000, cargo: { lengthCm: 60, widthCm: 45, heightCm: 45 } },
  CAR: { maxLoadGrams: 50000, cargo: { lengthCm: 120, widthCm: 80, heightCm: 60 } },
  VAN: { maxLoadGrams: MAX_WEIGHT, cargo: { lengthCm: MAX_SIDE, widthCm: 170, heightCm: 170 } },
} as const satisfies Record<VehicleType, VehicleLimits>;

const sortedSides = (d: Dimensions) => [d.lengthCm, d.widthCm, d.heightCm].sort((a, b) => b - a);

// imitate order "rotation" for fit check
const fitsBySize = (type: VehicleType, order: Dimensions) => {
  const { cargo } = VEHICLE_LIMITS[type];
  const orderSizes = sortedSides(order);
  const limitSizes = sortedSides(cargo);
  return orderSizes.every((side, i) => side <= (limitSizes[i] ?? 0));
};

const fitsByWeight = (type: VehicleType, order: { weightGrams: number }) => {
  const { maxLoadGrams } = VEHICLE_LIMITS[type];
  return order.weightGrams <= maxLoadGrams;
};

export const canCarry = (type: VehicleType, order: Dimensions & { weightGrams: number }) => {
  return fitsBySize(type, order) && fitsByWeight(type, order);
};
