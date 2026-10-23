// Demo data for local development and the public demo.
// Idempotent: deletes the demo company's data child-first and recreates it.
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/password.js';
import addresses from './seed-data/addresses.json' with { type: 'json' };
import { randomBytes } from 'node:crypto';
import type { Order } from '../src/generated/prisma/client.js';
import {
  email,
  DEMO_COMPANY_ID,
  DEMO_COMPANY_NAME,
  ROUTES_PER_DAY,
  ORDERS_PER_ROUTE,
  HISTORY_DAYS,
  FAIL_RATE,
  FAIL_REASONS,
  TRAVEL_MIN,
  TEAMS,
  RECIPIENTS,
  DROPOFF_COMMENTS,
  VEHICLES,
  PICKUP_CONTACTS,
  DEMO_PASSWORD,
} from './seed-data/demo.js';

// Set one global timezone for demo company
const DEMO_TIMEZONE = 'Europe/Kyiv';
process.env.TZ = DEMO_TIMEZONE;

const generateTrackingToken = () => randomBytes(16).toString('base64url');

// Picks list items in a loop; fails loudly on an empty list instead of returning undefined
const cycle = <T>(list: readonly T[], i: number): T => {
  if (list.length === 0) throw new Error('Seed list is empty');
  return list[i % list.length] as T;
};
const pick = <T>(list: readonly T[]): T => cycle(list, getRandomInt(0, list.length - 1));

const PICKUPS = PICKUP_CONTACTS.map((contact, k) => ({ ...contact, ...cycle(addresses, k) }));
const DROPOFFS = addresses.slice(PICKUP_CONTACTS.length);

// Dates relative to now, so the demo always looks fresh
const at = (dayOffset: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// Calendar date for @db.Date columns: midnight UTC of the local day
const dateOnly = (dayOffset: number) => {
  const d = at(dayOffset, 0);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

const addMinutes = (d: Date, min: number) => new Date(d.getTime() + min * 60000);

const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// pickup selected one for route, but route can have few orders
const buildOrder = (pickup: (typeof PICKUPS)[number], day: number) => {
  const dropoff = pick(DROPOFFS);
  const isScheduled = Math.random() < 1 / 4;
  return {
    weight: getRandomInt(1, 9) * 100,
    length: getRandomInt(3, 6) * 10,
    width: getRandomInt(2, 4) * 10,
    height: getRandomInt(1, 3) * 10,
    pickupName: pickup.name,
    pickupPhone: pickup.phone,
    pickupComment: pickup.comment,
    pickupAddress: pickup.address,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    dropoffName: pick(RECIPIENTS),
    dropoffPhone: `+447700900${getRandomInt(100, 999)}`,
    dropoffComment: pick(DROPOFF_COMMENTS),
    dropoffAddress: dropoff.address,
    dropoffLat: dropoff.lat,
    dropoffLng: dropoff.lng,
    ...(isScheduled && {
      type: 'SCHEDULED' as const,
      pickupWindowStart: at(day, 9),
      pickupWindowEnd: at(day, 11),
      dropoffWindowStart: at(day, 10),
      dropoffWindowEnd: at(day, 13),
    }),
    isSample: true,
  };
};

const buildStops = (
  companyId: string,
  orders: Order[],
  start: Date,
  handling: { pickup: number; dropoff: number },
) => {
  let t = start;
  let sequence = 0;
  const visit = (travelMin: number, handlingMin: number) => {
    const arrivedAt = addMinutes(t, travelMin);
    const completedAt = addMinutes(arrivedAt, handlingMin);
    t = completedAt;
    sequence += 1;
    return { arrivedAt, completedAt, sequence };
  };

  const pickups = orders.map((o) => ({
    companyId,
    orderId: o.id,
    type: 'PICKUP' as const,
    lat: o.pickupLat,
    lng: o.pickupLng,
    status: 'COMPLETED' as const,
    ...visit(0, handling.pickup), // pickups: same place, no travel
  }));
  const dropoffs = orders.map((o) => {
    const failed = o.status === 'FAILED';
    return {
      companyId,
      orderId: o.id,
      type: 'DROPOFF' as const,
      lat: o.dropoffLat,
      lng: o.dropoffLng,
      status: failed ? ('FAILED' as const) : ('COMPLETED' as const),
      failReason: failed ? pick(FAIL_REASONS) : null,
      ...visit(TRAVEL_MIN, handling.dropoff), // dropoffs: drive, then hand over
    };
  });
  return { stops: [...pickups, ...dropoffs], end: t };
};

// Upcoming unassigned orders (will be updated)
const ORDER_COUNT = 18;
const ORDERS = Array.from({ length: ORDER_COUNT }, (_, i) =>
  buildOrder(cycle(PICKUPS, i), 1 + (i % 2)),
);

async function main() {
  // one shared password for all demo users, hashed once
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.$transaction(
    async (tx) => {
      const companyId = DEMO_COMPANY_ID;
      // delete previous
      const where = { companyId };
      await tx.stop.deleteMany({ where });
      await tx.route.deleteMany({ where });
      await tx.order.deleteMany({ where });
      await tx.vehicle.deleteMany({ where });
      await tx.user.deleteMany({ where });
      await tx.company.deleteMany({ where: { id: companyId } });
      // create new
      const company = await tx.company.create({
        data: { id: companyId, name: DEMO_COMPANY_NAME, timezone: DEMO_TIMEZONE },
      });

      await tx.user.create({
        data: {
          companyId,
          role: 'ADMIN',
          name: 'Наталія Шевчук',
          email: email('admin'),
          passwordHash: demoPasswordHash,
          isSample: true,
        },
      });

      const couriers: { id: string }[] = [];
      for (const team of TEAMS) {
        const dispatcher = await tx.user.create({
          data: {
            companyId,
            role: 'DISPATCHER',
            ...team.dispatcher,
            passwordHash: demoPasswordHash,
            isSample: true,
          },
        });
        const created = await tx.user.createManyAndReturn({
          data: team.couriers.map((c) => ({
            companyId,
            role: 'COURIER' as const,
            courierStatus: 'AVAILABLE' as const,
            dispatcherId: dispatcher.id,
            passwordHash: demoPasswordHash,
            ...c,
            isSample: true,
          })),
        });
        couriers.push(...created);
      }

      const vehicles = await tx.vehicle.createManyAndReturn({
        data: VEHICLES.map((v) => ({ companyId, ...v, isSample: true })),
      });

      await tx.order.createMany({
        data: ORDERS.map((o) => ({ companyId, ...o, trackingToken: generateTrackingToken() })),
      });

      // add courier-vehicle pairs
      const crews = couriers.map((courier, i) => ({
        courierId: courier.id,
        vehicleId: cycle(vehicles, i).id,
      }));

      // create statistic data for past week
      for (let day = 1; day <= HISTORY_DAYS; day += 1) {
        for (let r = 0; r < ROUTES_PER_DAY; r += 1) {
          const crew = cycle(crews, day + r); // not random (courier must not get two routes on the same day)
          const pickup = pick(PICKUPS); // one pickup point per route

          const orders = await tx.order.createManyAndReturn({
            data: Array.from({ length: ORDERS_PER_ROUTE }, () => ({
              companyId,
              ...buildOrder(pickup, -day),
              status: Math.random() < FAIL_RATE ? ('FAILED' as const) : ('DELIVERED' as const),
              trackingToken: generateTrackingToken(),
              createdAt: at(-day - 1, 12),
            })),
          });

          const start = at(-day, 10);
          const { stops, end } = buildStops(companyId, orders, start, {
            pickup: company.pickupHandlingMin,
            dropoff: company.dropoffHandlingMin,
          });

          await tx.route.create({
            data: {
              companyId,
              ...crew,
              shiftDate: dateOnly(-day),
              createdAt: at(-day - 1, 18),
              status: 'COMPLETED',
              isSample: true,
              duration: Math.round((end.getTime() - start.getTime()) / 60000), // min
              distance: ORDERS_PER_ROUTE * getRandomInt(2, 5) * 1000, // metres, rough
              stops: { create: stops },
            },
          });
        }
      }
    },
    { timeout: 30000 },
  );

  console.log('Demo company seeded');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
