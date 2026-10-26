import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { generateSetupToken } from '../src/lib/tokens.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@flock/shared';

const app = createApp();

let companyId: string;
const password = 'Password123!';
const shortPassword = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
const longPassword = 'a'.repeat(PASSWORD_MAX_LENGTH + 1);

async function createUserWithToken(email: string, expiresAt?: Date) {
  const user = await prisma.user.create({
    data: { companyId, name: 'Dispatcher', role: 'DISPATCHER', email },
  });
  const setupToken = generateSetupToken();
  await prisma.passwordSetupToken.create({
    data: {
      userId: user.id,
      tokenHash: setupToken.tokenHash,
      expiresAt: expiresAt ?? setupToken.expiresAt,
    },
  });
  return { email, token: setupToken.token };
}

beforeAll(async () => {
  const company = await prisma.company.create({ data: { name: 'Test Company' } });
  companyId = company.id;
});

afterAll(async () => {
  await prisma.company.delete({ where: { id: companyId } });
  await prisma.$disconnect();
});

describe('POST /api/v1/auth/setup-password', () => {
  it('sets password and allows login with it', async () => {
    const { token, email } = await createUserWithToken('dispatcher@test.example');

    const setup = await request(app).post('/api/v1/auth/setup-password').send({ token, password });
    expect(setup.status).toBe(204);

    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(login.status).toBe(200);
  });
  it('returns 400 if token has been used already', async () => {
    const anotherPassword = '!321drowssaP';
    const { token, email } = await createUserWithToken('dispatcher2@test.example');
    // first request should succeed
    const setup1 = await request(app).post('/api/v1/auth/setup-password').send({ token, password });
    expect(setup1.status).toBe(204);

    const setup2 = await request(app)
      .post('/api/v1/auth/setup-password')
      .send({ token, password: anotherPassword });
    expect(setup2.status).toBe(400);
    expect(setup2.body.error.code).toBe('BAD_REQUEST');
    // check that password has not been changed
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: anotherPassword });
    expect(login.status).toBe(401);
  });
  it('returns 400 if token is expired', async () => {
    const { token } = await createUserWithToken(
      'dispatcher3@test.example',
      new Date(Date.now() - 1000),
    );
    const res = await request(app).post('/api/v1/auth/setup-password').send({ token, password });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
  it('returns 400 if password is too short', async () => {
    const { token } = await createUserWithToken('dispatcher4@test.example');

    const res = await request(app)
      .post('/api/v1/auth/setup-password')
      .send({ token, password: shortPassword });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('returns 400 if password is too long', async () => {
    const { token } = await createUserWithToken('dispatcher5@test.example');
    const res = await request(app)
      .post('/api/v1/auth/setup-password')
      .send({ token, password: longPassword });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
