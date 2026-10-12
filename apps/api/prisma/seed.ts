// Demo data for local development and the public demo.
// Idempotent: deletes the demo company's data child-first and recreates it.
import { prisma } from '../src/lib/prisma.js';
import addresses from './seed-data/addresses.json' with { type: 'json' };
import { randomBytes } from 'node:crypto';

// Set one global timezone for demo company
const DEMO_TIMEZONE = 'Europe/Kyiv';
process.env.TZ = DEMO_TIMEZONE;
const DEMO_COMPANY_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_COMPANY_NAME = 'Flock Demo';
const EMAIL_DOMAIN = 'flock-demo.example'; // .example is reserved (can never be a real mailbox)

const email = (local: string) => `${local}@${EMAIL_DOMAIN}`;
const generateTrackingToken = () => randomBytes(16).toString('base64url');

// Picks list items in a loop; fails loudly on an empty list instead of returning undefined
const cycle = <T>(list: readonly T[], i: number): T => {
  if (list.length === 0) throw new Error('Seed list is empty');
  return list[i % list.length] as T;
};

const TEAMS = [
  {
    dispatcher: { name: 'Ірина Мельник', email: email('iryna') },
    couriers: [
      { name: 'Андрій Бондар', email: email('andrii') },
      { name: 'Марта Коваль', email: email('marta') },
      { name: 'Денис Ткач', email: email('denys') },
    ],
  },
  {
    dispatcher: { name: 'Олег Савчук', email: email('oleh') },
    couriers: [
      { name: 'Софія Лисенко', email: email('sofiia') },
      { name: 'Тарас Гончар', email: email('taras') },
      { name: 'Вікторія Руденко', email: email('viktoriia') },
      { name: 'Максим Олійник', email: email('maksym') },
    ],
  },
];

const VEHICLES = [
  { type: 'BICYCLE', color: 'GREEN' },
  { type: 'BICYCLE', color: 'BLACK' },
  { type: 'SCOOTER', color: 'WHITE' },
  { type: 'SCOOTER', color: 'RED', legalNumber: 'DEMO003' },
  { type: 'CAR', color: 'GREY', vin: 'DEMVN000000000001', legalNumber: 'DEMO001' },
  { type: 'CAR', color: 'BLUE', vin: 'DEMVN000000000002', legalNumber: 'DEMO002' },
  { type: 'VAN', color: 'WHITE', vin: 'DEMVN000000000003', legalNumber: 'DEMO004' },
] as const;

// The first addresses become pickup points (one per contact), the rest are customers
const PICKUP_CONTACTS = [
  { name: 'Компанія «Happy Face»', phone: '+447700900222', comment: 'Запитайте на вході' },
  { name: 'Кав’ярня «Кава»', phone: '+447700900223', comment: null },
  { name: 'Квіткова крамниця «Квіти»', phone: '+447700900224', comment: 'Вхід з двору' },
  { name: 'Книгарня «Книгарня»', phone: '+447700900225', comment: null },
];
const PICKUPS = PICKUP_CONTACTS.map((contact, k) => ({ ...contact, ...cycle(addresses, k) }));
const DROPOFFS = addresses.slice(PICKUP_CONTACTS.length);

const PACKAGES = [
  { weight: 1200, length: 40, width: 30, height: 20 },
  { weight: 300, length: 25, width: 15, height: 15 },
  { weight: 9000, length: 60, width: 40, height: 40 },
  { weight: 2500, length: 35, width: 35, height: 30 },
];
const RECIPIENTS = [
  'Ганна Швець',
  'Дмитро Карнаух',
  'Надія Петренко',
  'Володимир Степаненко',
  'Олесь В.',
  'Степан Волошка',
  'Сергій Л.',
];
const DROPOFF_COMMENTS = [
  'залиште в охорони',
  null,
  'код домофону 25',
  null,
  'зателефонуйте - за замовленням вийдуть',
];

// Dates relative to now, so the demo always looks fresh
const at = (dayOffset: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const ORDER_COUNT = 18;
const ORDERS = Array.from({ length: ORDER_COUNT }, (_, i) => {
  const pickup = cycle(PICKUPS, i);
  const dropoff = cycle(DROPOFFS, i);
  const isScheduled = i % 3 === 0;
  const day = 1 + (i % 2); // tomorrow or + 2 days (will be changed)
  return {
    ...cycle(PACKAGES, i),
    pickupName: pickup.name,
    pickupPhone: pickup.phone,
    pickupComment: pickup.comment,
    pickupAddress: pickup.address,
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    dropoffName: cycle(RECIPIENTS, i),
    dropoffPhone: `+447700900${String(100 + i).padStart(3, '0')}`,
    dropoffComment: cycle(DROPOFF_COMMENTS, i),
    dropoffAddress: dropoff.address,
    dropoffLat: dropoff.lat,
    dropoffLng: dropoff.lng,
    ...(isScheduled && {
      type: 'SCHEDULED' as const,
      pickupWindowStart: at(day, 10),
      pickupWindowEnd: at(day, 12),
      dropoffWindowStart: at(day, 12),
      dropoffWindowEnd: at(day, 15),
    }),
  };
});

async function main() {
  await prisma.$transaction(async (tx) => {
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
    await tx.company.create({
      data: { id: companyId, name: DEMO_COMPANY_NAME, timezone: DEMO_TIMEZONE },
    });

    await tx.user.create({
      data: { companyId, role: 'ADMIN', name: 'Наталія Шевчук', email: email('admin') },
    });

    for (const team of TEAMS) {
      const dispatcher = await tx.user.create({
        data: { companyId, role: 'DISPATCHER', ...team.dispatcher },
      });
      await tx.user.createMany({
        data: team.couriers.map((c) => ({
          companyId,
          role: 'COURIER' as const,
          courierStatus: 'AVAILABLE' as const,
          dispatcherId: dispatcher.id,
          ...c,
        })),
      });
    }

    await tx.vehicle.createMany({
      data: VEHICLES.map((v) => ({ companyId, ...v })),
    });

    await tx.order.createMany({
      data: ORDERS.map((o) => ({ companyId, ...o, trackingToken: generateTrackingToken() })),
    });
  });

  console.log('Demo company seeded');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
