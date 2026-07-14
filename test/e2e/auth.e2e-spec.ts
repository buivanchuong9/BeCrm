import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { createTestApp } from './utils/create-test-app';

const TEST_EMAIL = 'e2e.auth.test@example.test';
const TEST_PASSWORD = 'a-very-strong-e2e-password';

function extractCookie(res: request.Response, name: string): string {
  const raw = res.headers['set-cookie'];
  const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((c: string) => c.startsWith(`${name}=`));
  if (!match) throw new Error(`Cookie ${name} not set`);
  return match.split(';')[0];
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: import('http').Server;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer();

    const pepper = process.env.PASSWORD_PEPPER ?? '';
    const passwordHash = await argon2.hash(`${TEST_PASSWORD}${pepper}`, { type: argon2.argon2id });

    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        displayName: 'E2E Auth Test',
        status: 'active',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
  });

  it('rejects unauthenticated access to /me', async () => {
    const res = await request(httpServer).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_SESSION_EXPIRED');
  });

  it('rejects session creation with wrong password using a generic error', async () => {
    const res = await request(httpServer)
      .post('/api/v1/auth/sessions')
      .send({ email: TEST_EMAIL, password: 'not-the-right-password', rememberMe: false });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects session creation for an unknown email with the same generic error', async () => {
    const res = await request(httpServer).post('/api/v1/auth/sessions').send({
      email: 'nobody-such-user@example.test',
      password: 'whatever12345',
      rememberMe: false,
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('creates a session, reads /me, rotates via session-refreshes, detects reuse, and ends the session', async () => {
    const loginRes = await request(httpServer)
      .post('/api/v1/auth/sessions')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, rememberMe: false });
    expect(loginRes.status).toBe(201);
    expect(loginRes.body.data.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.data.accessTokenExpiresAt).toEqual(expect.any(String));
    expect(loginRes.body.data.user.email).toBe(TEST_EMAIL);
    expect(loginRes.body.data.user.name).toBe('E2E Auth Test');
    expect(loginRes.body.data.user.status).toBe('active');
    expect(loginRes.body.data.user.activeOrganizationId).toBeNull();
    const firstRefreshCookie = extractCookie(loginRes, 'refresh_token');

    const meRes = await request(httpServer)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(TEST_EMAIL);
    expect(meRes.body.data.version).toBe(1);

    const refreshRes = await request(httpServer)
      .post('/api/v1/auth/session-refreshes')
      .set('Cookie', firstRefreshCookie);
    expect(refreshRes.status).toBe(200);
    const rotatedCookie = extractCookie(refreshRes, 'refresh_token');
    expect(rotatedCookie).not.toBe(firstRefreshCookie);

    // Reusing the now-rotated (revoked) refresh token must revoke the whole
    // family and return the stable reuse-detection error code.
    const reuseRes = await request(httpServer)
      .post('/api/v1/auth/session-refreshes')
      .set('Cookie', firstRefreshCookie);
    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('AUTH_REFRESH_REUSED');

    // The reuse detection above must have revoked the entire family, so even
    // the latest (rotated) token is now unusable.
    const afterReuseRes = await request(httpServer)
      .post('/api/v1/auth/session-refreshes')
      .set('Cookie', rotatedCookie);
    expect(afterReuseRes.status).toBe(401);

    const endSessionRes = await request(httpServer)
      .delete('/api/v1/auth/sessions/current')
      .set('Cookie', rotatedCookie);
    expect(endSessionRes.status).toBe(204);
  });

  it('DELETE /auth/sessions revokes all devices and rejects a wrong re-confirmation password', async () => {
    const loginRes = await request(httpServer)
      .post('/api/v1/auth/sessions')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, rememberMe: false });
    const cookie = extractCookie(loginRes, 'refresh_token');

    const wrongPasswordRes = await request(httpServer)
      .delete('/api/v1/auth/sessions')
      .set('Cookie', cookie)
      .send({ password: 'definitely-wrong' });
    expect(wrongPasswordRes.status).toBe(401);

    const revokeAllRes = await request(httpServer)
      .delete('/api/v1/auth/sessions')
      .set('Cookie', cookie)
      .send({ password: TEST_PASSWORD });
    expect(revokeAllRes.status).toBe(204);

    const afterRevokeRes = await request(httpServer)
      .post('/api/v1/auth/session-refreshes')
      .set('Cookie', cookie);
    expect(afterRevokeRes.status).toBe(401);
  });

  it('rejects a validation-invalid session-creation body', async () => {
    const res = await request(httpServer)
      .post('/api/v1/auth/sessions')
      .send({ email: 'not-an-email', password: '', rememberMe: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
