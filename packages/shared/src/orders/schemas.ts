import { z } from 'zod';
import {
  numberRequired,
  stringOptional,
  stringRequired,
  timeRangeSchema,
} from '../common/fields.js';
import { canCarry, MAX_SIDE, MAX_WEIGHT } from '../vehicles/constants.js';
import { ORDER_TYPES } from './constants.js';

const addressSchema = z.object({
  address: stringRequired(500),
  lat: z
    .number({ error: 'validation.number.required' })
    .min(-90, { error: 'validation.lat.format' })
    .max(90, { error: 'validation.lat.format' }),
  lng: z
    .number({ error: 'validation.number.required' })
    .min(-180, { error: 'validation.lng.format' })
    .max(180, { error: 'validation.lng.format' }),
});

export const stopPointSchema = z.object({
  location: addressSchema,
  contactName: stringRequired(100),
  contactPhone: z.e164({ error: 'validation.phone.invalid' }),
  comment: stringOptional(500),
  timeWindow: timeRangeSchema.optional(),
});

export const createOrderSchema = z
  .object({
    weightGrams: numberRequired(1, MAX_WEIGHT),
    lengthCm: numberRequired(1, MAX_SIDE),
    widthCm: numberRequired(1, MAX_SIDE),
    heightCm: numberRequired(1, MAX_SIDE),
    pickup: stopPointSchema,
    dropoff: stopPointSchema,
    type: z.enum(ORDER_TYPES, { error: 'validation.orderType.invalid' }),
  })
  .refine((data) => canCarry('VAN', data), {
    error: 'validation.size.invalid',
  })
  .refine(
    (data) =>
      (data.type === 'SCHEDULED' && !!data.pickup.timeWindow && !!data.dropoff.timeWindow) ||
      (data.type === 'ASAP' && !data.pickup.timeWindow && !data.dropoff.timeWindow),
    {
      error: 'validation.orderType.brokenTimeWindow',
      path: ['type'],
    },
  )
  .refine(
    (data) =>
      !data.pickup.timeWindow ||
      !data.dropoff.timeWindow ||
      data.pickup.timeWindow.start.getTime() <= data.dropoff.timeWindow.start.getTime(),
    {
      error: 'validation.orderType.dropoffBeforePickup',
      path: ['dropoff', 'timeWindow', 'start'],
    },
  );

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderData = z.output<typeof createOrderSchema>;
export type StopPoint = z.infer<typeof stopPointSchema>;
