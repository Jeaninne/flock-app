// Demo data for local development and the public demo.
// Idempotent: deletes the demo company's data child-first and recreates it.
import { prisma } from '../src/lib/prisma.js';

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_COMPANY_NAME = 'Flock Demo';
const EMAIL_DOMAIN = 'flock-demo.example'; // .example is reserved (can never be a real mailbox)

const email = (local: string) => `${local}@${EMAIL_DOMAIN}`;

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

async function main() {
  await prisma.$transaction(async (tx) => {
    const companyId = DEMO_COMPANY_ID;
    // delete previous
    const where = { companyId: DEMO_COMPANY_ID };
    await tx.stop.deleteMany({ where });
    await tx.route.deleteMany({ where });
    await tx.order.deleteMany({ where });
    await tx.vehicle.deleteMany({ where });
    await tx.user.deleteMany({ where });
    await tx.company.deleteMany({ where: { id: DEMO_COMPANY_ID } });
    // create new
    await tx.company.create({ data: { id: DEMO_COMPANY_ID, name: DEMO_COMPANY_NAME } });

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
  });

  console.log('Demo company seeded');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
