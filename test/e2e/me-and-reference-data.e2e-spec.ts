import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { createTestApp } from './utils/create-test-app';

const PATIENT_EMAIL = 'e2e.me.test@example.test';
const ADMIN_EMAIL = 'e2e.admin.test@example.test';
const PASSWORD = 'a-very-strong-e2e-password';

describe('Me, preferences and reference data (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: import('http').Server;
  let patientToken: string;
  let adminToken: string;
  let organizationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer();

    const pepper = process.env.PASSWORD_PEPPER ?? '';
    const passwordHash = await argon2.hash(`${PASSWORD}${pepper}`, { type: argon2.argon2id });

    await prisma.user.deleteMany({ where: { email: { in: [PATIENT_EMAIL, ADMIN_EMAIL] } } });

    const organization = await prisma.organization.upsert({
      where: { code: 'e2e-ref-org' },
      update: {},
      create: { code: 'e2e-ref-org', name: 'E2E Reference Org' },
    });
    organizationId = organization.id;
    const clinic = await prisma.clinicLocation.upsert({
      where: { organizationId_code: { organizationId, code: 'E2E-CLINIC' } },
      update: {},
      create: { organizationId, code: 'E2E-CLINIC', name: 'E2E Clinic' },
    });
    await prisma.department.upsert({
      where: { organizationId_code: { organizationId, code: 'E2E-DEPT' } },
      update: {},
      create: {
        organizationId,
        clinicLocationId: clinic.id,
        code: 'E2E-DEPT',
        name: 'E2E Department',
      },
    });

    const patient = await prisma.user.create({
      data: {
        email: PATIENT_EMAIL,
        displayName: 'E2E Me Test',
        status: 'active',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.userMembership.create({
      data: { userId: patient.id, organizationId, role: 'patient', status: 'active' },
    });

    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        displayName: 'E2E Admin Test',
        status: 'active',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.userMembership.create({
      data: { userId: admin.id, organizationId, role: 'system_administrator', status: 'active' },
    });

    const patientLogin = await request(httpServer)
      .post('/api/v1/auth/sessions')
      .send({ email: PATIENT_EMAIL, password: PASSWORD, rememberMe: false });
    patientToken = patientLogin.body.data.accessToken;

    const adminLogin = await request(httpServer)
      .post('/api/v1/auth/sessions')
      .send({ email: ADMIN_EMAIL, password: PASSWORD, rememberMe: false });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [PATIENT_EMAIL, ADMIN_EMAIL] } } });
    await prisma.department.deleteMany({ where: { organizationId } });
    await prisma.clinicLocation.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await app.close();
  });

  it('PATCH /me updates the display name and enforces optimistic version', async () => {
    const me = await request(httpServer)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(me.body.data.version).toBe(1);

    const staleRes = await request(httpServer)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Updated Name', version: 999 });
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe('OPTIMISTIC_LOCK_FAILED');

    const okRes = await request(httpServer)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Updated Name', version: 1 });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.name).toBe('Updated Name');
    expect(okRes.body.data.version).toBe(2);
  });

  it('GET/PUT /me/preferences round-trips a full preference document', async () => {
    const initial = await request(httpServer)
      .get('/api/v1/me/preferences')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(initial.status).toBe(200);
    expect(initial.body.data.locale).toBe('vi-VN');

    const putRes = await request(httpServer)
      .put('/api/v1/me/preferences')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        locale: 'en-US',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'MM/DD/YYYY',
        theme: 'dark',
        notificationChannels: { inApp: true, email: false, sms: false, push: true },
        deviceSettings: { biometricLogin: true, mobileNotifications: true },
        version: 1,
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.locale).toBe('en-US');
    expect(putRes.body.data.theme).toBe('dark');
    // The first PUT creates the row starting at version 1 (the client's version
    // matched the virtual default returned by GET, which was never persisted).
    expect(putRes.body.data.version).toBe(1);

    const secondPutRes = await request(httpServer)
      .put('/api/v1/me/preferences')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        locale: 'en-US',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light',
        notificationChannels: { inApp: true, email: false, sms: false, push: true },
        deviceSettings: { biometricLogin: true, mobileNotifications: true },
        version: 1,
      });
    expect(secondPutRes.status).toBe(200);
    expect(secondPutRes.body.data.theme).toBe('light');
    expect(secondPutRes.body.data.version).toBe(2);
  });

  it('reference data endpoints return the seeded organization/clinic/department', async () => {
    const orgs = await request(httpServer)
      .get('/api/v1/organizations')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(orgs.status).toBe(200);
    expect(Array.isArray(orgs.body.data)).toBe(true);
    expect(orgs.body.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: expect.any(Number) }),
    );

    const clinics = await request(httpServer)
      .get(`/api/v1/clinic-locations?organizationId=${organizationId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(clinics.status).toBe(200);
    expect(clinics.body.data).toHaveLength(1);
    expect(clinics.body.data[0].code).toBe('E2E-CLINIC');

    const departments = await request(httpServer)
      .get(`/api/v1/departments?clinicLocationId=${clinics.body.data[0].id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(departments.status).toBe(200);
    expect(departments.body.data).toHaveLength(1);
    expect(departments.body.data[0].code).toBe('E2E-DEPT');
  });

  it('GET /users is forbidden for a patient and allowed for an admin', async () => {
    const deniedRes = await request(httpServer)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.error.code).toBe('AUTH_FORBIDDEN');

    // Search by email substring, not display name: an earlier test in this file
    // renames the patient's display name via PATCH /me, so only the email is
    // guaranteed stable across the whole suite run.
    const allowedRes = await request(httpServer)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: 'e2e.me.test' });
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.data.some((u: { email: string }) => u.email === PATIENT_EMAIL)).toBe(
      true,
    );
  });
});
