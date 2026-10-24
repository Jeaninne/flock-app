import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/tokens.js';

const app = createApp();

const companyIds: string[] = [];
const ids = {} as Record<
  'adminA' | 'dispatcherA' | 'dispatcherA2' | 'courierA' | 'courierA2' | 'courierC',
  string
>;
let adminToken: string;
let dispatcherToken: string;
let courierToken: string;

beforeAll(async () => {
  const companyA = await prisma.company.create({ data: { name: 'Test Company A' } });
  const companyB = await prisma.company.create({ data: { name: 'Test Company B' } });
  companyIds.push(companyA.id, companyB.id);

  const adminA = await prisma.user.create({
    data: { companyId: companyA.id, name: 'Admin A', role: 'ADMIN', email: 'admin_a@test.example' },
  });
  await prisma.user.create({
    data: { companyId: companyB.id, name: 'Admin B', role: 'ADMIN', email: 'admin_b@test.example' },
  });

  const dispatcherA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Dispatcher A',
      role: 'DISPATCHER',
      email: 'disp_a@test.example',
    },
  });
  const dispatcherA2 = await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Dispatcher A2',
      role: 'DISPATCHER',
      email: 'disp_a2@test.example',
    },
  });
  await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Deleted',
      role: 'DISPATCHER',
      email: 'disp_c@test.example',
      deletedAt: new Date(),
    },
  });

  const courierA = await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Courier A',
      role: 'COURIER',
      email: 'courier_a@test.example',
      courierStatus: 'AVAILABLE',
      dispatcherId: dispatcherA.id,
    },
  });
  const courierA2 = await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Courier A2',
      role: 'COURIER',
      email: 'courier_a2@test.example',
      courierStatus: 'AVAILABLE',
      dispatcherId: dispatcherA2.id,
    },
  });
  await prisma.user.create({
    data: {
      companyId: companyB.id,
      name: 'Courier B',
      role: 'COURIER',
      email: 'courier_b@test.example',
      courierStatus: 'AVAILABLE',
    },
  });
  const courierC = await prisma.user.create({
    data: {
      companyId: companyA.id,
      name: 'Courier w/o assignment',
      role: 'COURIER',
      email: 'courier_c@test.example',
      courierStatus: 'AVAILABLE',
    },
  });

  adminToken = await signAccessToken(adminA);
  dispatcherToken = await signAccessToken(dispatcherA);
  courierToken = await signAccessToken(courierA);
  ids.adminA = adminA.id;
  ids.dispatcherA = dispatcherA.id;
  ids.dispatcherA2 = dispatcherA2.id;
  ids.courierA = courierA.id;
  ids.courierA2 = courierA2.id;
  ids.courierC = courierC.id;
});

afterAll(async () => {
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  await prisma.$disconnect();
});

describe('GET /api/v1/users', () => {
  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
  it('returns 403 for courier', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${courierToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
  it('returns related couriers for dispatcher', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { id: string }) => u.id)).toEqual([ids.courierA]);
  });
  it('returns all company users for admin', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { id: string }) => u.id)).toEqual([
      ids.adminA,
      ids.courierA,
      ids.courierA2,
      ids.courierC,
      ids.dispatcherA,
      ids.dispatcherA2,
    ]);
  });
});
