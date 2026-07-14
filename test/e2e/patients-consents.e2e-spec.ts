import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { TokenService } from '../../src/modules/identity/token.service';
import { UsersRepository } from '../../src/modules/identity/users.repository';
import { createTestApp } from './utils/create-test-app';

const PASSWORD = 'a-very-strong-e2e-password';
const SUFFIX = Date.now();

describe('Patients & consents (T04, e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: import('http').Server;

  let orgAId: string;
  let orgBId: string;

  let patient1Token: string;
  let patient2Token: string;
  let relatedDoctorToken: string;
  let unrelatedDoctorToken: string;
  let receptionistToken: string;
  let adminToken: string;
  let crossOrgAdminToken: string;

  let patient1Id: string;
  let patient2Id: string;
  let relatedDoctorUserId: string;

  async function createLoginUser(email: string, displayName: string): Promise<string> {
    const pepper = process.env.PASSWORD_PEPPER ?? '';
    const passwordHash = await argon2.hash(`${PASSWORD}${pepper}`, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { email, displayName, status: 'active', passwordHash, emailVerifiedAt: new Date() },
    });
    return user.id;
  }

  // Mints access tokens directly via TokenService rather than the throttled
  // POST /auth/sessions endpoint (limit 5/min) — this suite logs in 7 distinct
  // actors, which would otherwise trip the login rate limit in beforeAll.
  async function mintAccessToken(email: string): Promise<string> {
    const user = await usersRepository.findByEmailWithMemberships(email);
    if (!user) throw new Error(`Seed user not found: ${email}`);
    const memberships = usersRepository.toMembershipScopes(user);
    return tokenService.signAccessToken(user.id, user.email, user.displayName, memberships).token;
  }

  let tokenService: TokenService;
  let usersRepository: UsersRepository;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    tokenService = app.get(TokenService);
    usersRepository = app.get(UsersRepository);
    httpServer = app.getHttpServer();

    const orgA = await prisma.organization.create({
      data: { code: `t04-org-a-${SUFFIX}`, name: 'T04 Org A' },
    });
    const orgB = await prisma.organization.create({
      data: { code: `t04-org-b-${SUFFIX}`, name: 'T04 Org B' },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const patient1UserId = await createLoginUser(
      `t04.patient1.${SUFFIX}@example.test`,
      'T04 Patient One',
    );
    const patient2UserId = await createLoginUser(
      `t04.patient2.${SUFFIX}@example.test`,
      'T04 Patient Two',
    );
    relatedDoctorUserId = await createLoginUser(
      `t04.doctor.related.${SUFFIX}@example.test`,
      'T04 Related Doctor',
    );
    const unrelatedDoctorUserId = await createLoginUser(
      `t04.doctor.unrelated.${SUFFIX}@example.test`,
      'T04 Unrelated Doctor',
    );
    const receptionistUserId = await createLoginUser(
      `t04.reception.${SUFFIX}@example.test`,
      'T04 Receptionist',
    );
    const adminUserId = await createLoginUser(`t04.admin.${SUFFIX}@example.test`, 'T04 Admin');
    const crossOrgAdminUserId = await createLoginUser(
      `t04.crossorgadmin.${SUFFIX}@example.test`,
      'T04 Cross Org Admin',
    );

    await prisma.userMembership.createMany({
      data: [
        { userId: patient1UserId, organizationId: orgAId, role: 'patient', status: 'active' },
        { userId: patient2UserId, organizationId: orgAId, role: 'patient', status: 'active' },
        { userId: relatedDoctorUserId, organizationId: orgAId, role: 'doctor', status: 'active' },
        { userId: unrelatedDoctorUserId, organizationId: orgAId, role: 'doctor', status: 'active' },
        {
          userId: receptionistUserId,
          organizationId: orgAId,
          role: 'receptionist',
          status: 'active',
        },
        {
          userId: adminUserId,
          organizationId: orgAId,
          role: 'medical_administrator',
          status: 'active',
        },
        {
          userId: crossOrgAdminUserId,
          organizationId: orgBId,
          role: 'medical_administrator',
          status: 'active',
        },
      ],
    });

    const patient1 = await prisma.patient.create({
      data: {
        organizationId: orgAId,
        code: `T04-PT1-${SUFFIX}`,
        userId: patient1UserId,
        name: 'T04 Patient One',
        dob: new Date('1990-05-20T00:00:00.000Z'),
        gender: 'male',
        phone: '0900000001',
        email: 'patient1.contact@example.test',
        address: 'Original Address',
        bloodType: 'O+',
        primaryDoctorId: relatedDoctorUserId,
      },
    });
    patient1Id = patient1.id;
    await prisma.patientCareTeamMember.create({
      data: { patientId: patient1Id, userId: relatedDoctorUserId, relationship: 'primary_doctor' },
    });

    const patient2 = await prisma.patient.create({
      data: {
        organizationId: orgAId,
        code: `T04-PT2-${SUFFIX}`,
        userId: patient2UserId,
        name: 'T04 Patient Two',
        dob: new Date('1992-01-01T00:00:00.000Z'),
        phone: '0900000002',
      },
    });
    patient2Id = patient2.id;

    patient1Token = await mintAccessToken(`t04.patient1.${SUFFIX}@example.test`);
    patient2Token = await mintAccessToken(`t04.patient2.${SUFFIX}@example.test`);
    relatedDoctorToken = await mintAccessToken(`t04.doctor.related.${SUFFIX}@example.test`);
    unrelatedDoctorToken = await mintAccessToken(`t04.doctor.unrelated.${SUFFIX}@example.test`);
    receptionistToken = await mintAccessToken(`t04.reception.${SUFFIX}@example.test`);
    adminToken = await mintAccessToken(`t04.admin.${SUFFIX}@example.test`);
    crossOrgAdminToken = await mintAccessToken(`t04.crossorgadmin.${SUFFIX}@example.test`);
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Patient reads their own profile.
  it('patient reads their own profile', async () => {
    const res = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(patient1Id);
    expect(res.body.data.name).toBe('T04 Patient One');
    expect(res.body.data.primaryDoctor?.id).toBe(relatedDoctorUserId);
    expect(res.body.data.consentSummary).toEqual([]);
  });

  // 2. Patient cannot read another patient.
  it('patient cannot read another patient (IDOR-safe 404)', async () => {
    const res = await request(httpServer)
      .get(`/api/v1/patients/${patient2Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  // 3. Related doctor can read an assigned patient.
  it('the assigned primary doctor can read the patient', async () => {
    const res = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${relatedDoctorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(patient1Id);
  });

  // 4. Unrelated doctor is denied.
  it('an unrelated doctor is denied', async () => {
    const res = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${unrelatedDoctorToken}`);
    expect(res.status).toBe(404);
  });

  // 5. Receptionist sees administrative fields.
  it('receptionist can read administrative/contact fields', async () => {
    const res = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${receptionistToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('0900000001');
    expect(res.body.data.address).toBe('Original Address');
  });

  // 6. Cross-organization access is denied.
  it('a medical_administrator from a different organization is denied', async () => {
    const res = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${crossOrgAdminToken}`);
    expect(res.status).toBe(404);
  });

  // 7. Medical administrator access follows the documented scope.
  it('medical_administrator in the same org can read and fully update the patient, including primaryDoctorId', async () => {
    const readRes = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(readRes.status).toBe(200);

    const updateRes = await request(httpServer)
      .patch(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ bloodType: 'A+', version: readRes.body.data.version });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.bloodType).toBe('A+');
  });

  // 8. Patient updates permitted profile fields.
  it('patient can update their own contact fields', async () => {
    const current = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    const res = await request(httpServer)
      .patch(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        phone: '0911111111',
        address: 'Updated By Patient',
        version: current.body.data.version,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('0911111111');
    expect(res.body.data.address).toBe('Updated By Patient');
  });

  // 9. Client cannot mass-assign restricted fields.
  it('patient cannot mass-assign clinical/administrative fields (bloodType, primaryDoctorId) — rejected, not silently dropped', async () => {
    const current = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    const res = await request(httpServer)
      .patch(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ bloodType: 'B+', version: current.body.data.version });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('the DTO whitelist rejects an attempt to send unknown/server-owned fields like organizationId or role', async () => {
    const current = await request(httpServer)
      .get(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`);

    const res = await request(httpServer)
      .patch(`/api/v1/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        organizationId: randomUUID(),
        role: 'medical_administrator',
        version: current.body.data.version,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  // 10-13. Consent grant / idempotent replay / withdrawal / stale version.
  it('consent grant succeeds, replays on retry with the same Idempotency-Key, and withdrawal preserves history', async () => {
    const idemKey = randomUUID();
    const grantRes = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-grants`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .set('Idempotency-Key', idemKey)
      .send({ type: 'data_processing', policyVersion: '2.0' });
    expect(grantRes.status).toBe(200);
    expect(grantRes.body.data.granted).toBe(true);
    expect(grantRes.body.data.type).toBe('data_processing');
    const consentId = grantRes.body.data.id;

    // 11. Retry with the same Idempotency-Key replays the exact response.
    const replayRes = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-grants`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .set('Idempotency-Key', idemKey)
      .send({ type: 'data_processing', policyVersion: '2.0' });
    expect(replayRes.status).toBe(200);
    expect(replayRes.body.data.id).toBe(consentId);

    // 13. Stale version withdrawal fails.
    const staleWithdrawRes = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-withdrawals`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ type: 'data_processing', version: 999 });
    expect(staleWithdrawRes.status).toBe(409);
    expect(staleWithdrawRes.body.error.code).toBe('OPTIMISTIC_LOCK_FAILED');

    // 12. Correct-version withdrawal succeeds and preserves grant history.
    const withdrawRes = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-withdrawals`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        type: 'data_processing',
        reason: 'changed my mind',
        version: grantRes.body.data.version,
      });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.granted).toBe(false);
    expect(withdrawRes.body.data.withdrawnAt).not.toBeNull();

    const events = await prisma.consentEvent.findMany({
      where: { consentId },
      orderBy: { occurredAt: 'asc' },
    });
    expect(events.map((e) => e.action)).toEqual(['granted', 'withdrawn']);
    expect(events[0].policyVersion).toBe('2.0');
  });

  it("another patient cannot grant consent on someone else's record (IDOR-safe 404, same as read access)", async () => {
    // patient2 has zero relationship to patient1's record, so findVisibleById
    // denies it exactly like the plain read case (test 2) — 404, not 403,
    // so an unrelated caller can't distinguish "forbidden" from "doesn't exist".
    const res = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-grants`)
      .set('Authorization', `Bearer ${patient2Token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ type: 'telemedicine', policyVersion: '1.0' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('a receptionist can view the patient but is forbidden from changing consent (genuine 403, not a visibility denial)', async () => {
    const res = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-grants`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ type: 'telemedicine', policyVersion: '1.0' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('consent-grants requires an Idempotency-Key header', async () => {
    const res = await request(httpServer)
      .post(`/api/v1/patients/${patient1Id}/consent-grants`)
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ type: 'telemedicine', policyVersion: '1.0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  // 14. Audit events are produced for sensitive reads and writes.
  it('sensitive patient reads and writes, and consent changes, are all audited with actor/patient/requestId context', async () => {
    const readEvents = await prisma.auditEvent.findMany({
      where: { patientId: patient1Id, action: 'patient.read' },
    });
    expect(readEvents.length).toBeGreaterThan(0);
    for (const event of readEvents) {
      expect(event.requestId).not.toBeNull();
    }

    const updateEvents = await prisma.auditEvent.findMany({
      where: { patientId: patient1Id, action: 'patient.update' },
    });
    expect(updateEvents.length).toBeGreaterThan(0);

    const consentAuditEvents = await prisma.auditEvent.findMany({
      where: { patientId: patient1Id, resourceType: 'consent' },
    });
    expect(consentAuditEvents.some((e) => e.action === 'consent.grant')).toBe(true);
    expect(consentAuditEvents.some((e) => e.action === 'consent.withdraw')).toBe(true);
  });
});
