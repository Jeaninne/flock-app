import { z } from 'zod';

export const timeRangeSchema = z
  .object({
    start: z.iso
      .datetime({ offset: true, error: 'validation.date.invalid' })
      .transform((s) => new Date(s)),
    end: z.iso
      .datetime({ offset: true, error: 'validation.date.invalid' })
      .transform((s) => new Date(s)),
  })
  .refine(({ start, end }) => start.getTime() < end.getTime(), {
    error: 'validation.date.invalidRange',
  });

export const stringRequired = (max: number) =>
  z
    .string({ error: 'validation.string.required' })
    .trim()
    .min(1, { error: 'validation.string.required' })
    .max(max, { error: 'validation.string.max' });

export const stringOptional = (max: number) =>
  z
    .string({ error: 'validation.string.invalid' })
    .trim()
    .max(max, { error: 'validation.string.max' })
    .transform((v) => v || undefined)
    .optional();

export const numberRequired = (min: number, max: number) =>
  z
    .int({ error: 'validation.number.invalid' })
    .min(min, { error: 'validation.number.min' })
    .max(max, { error: 'validation.number.max' });
