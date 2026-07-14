import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { createTestPrisma } from './utils/test-prisma';

describe('patients / consents (T04, integration against real Postgres)', () => {
  let prisma: PrismaService;
  let organizationId: string;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();
    const org = await prisma.organization.create({
      data: { code: `it-patients-${Date.now()}`, name: 'Integration Patients Org' },
    });
    organizationId = org.id;
  });

  afterAll(async () => {
    // consent_events is append-only (verified by a test below) and consents/
    // patients/organizations all use ON DELETE RESTRICT toward anything with
    // consent history, so once a consent event exists here this organization
    // can never be hard-deleted — by design (spec section 15: "no hard delete
    // for ... consent events"). Same pattern as audit-immutability.spec.ts:
    // rely on the ephemeral tmpfs-backed test database being wiped between
    // full container runs rather than deleting rows that must not be deletable.
    await prisma.$disconnect();
  });

  async function createPatient(code: string) {
    return prisma.patient.create({
      data: {
        organizationId,
        code,
        name: 'Integration Test Patient',
        dob: new Date('1990-01-01T00:00:00.000Z'),
        phone: '0900000000',
      },
    });
  }

  it('enforces unique patient code per organization', async () => {
    const code = `PT-${randomUUID().slice(0, 8)}`;
    await createPatient(code);
    await expect(createPatient(code)).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('rejects an invalid blood_type value via the CHECK constraint', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO patients (organization_id, code, name, dob, phone, blood_type)
        VALUES (${organizationId}::uuid, ${`PT-BAD-${randomUUID().slice(0, 6)}`}, 'Bad Blood Type', '1990-01-01', '0900000000', 'Z+')`,
    ).rejects.toThrow();
  });

  it('optimistic version conflict: a stale version update is rejected, matching version succeeds', async () => {
    const patient = await createPatient(`PT-${randomUUID().slice(0, 8)}`);

    const stale = await prisma.patient.updateMany({
      where: { id: patient.id, version: 999 },
      data: { name: 'Should not apply', version: { increment: 1 } },
    });
    expect(stale.count).toBe(0);

    const correct = await prisma.patient.updateMany({
      where: { id: patient.id, version: patient.version },
      data: { name: 'Applied', version: { increment: 1 } },
    });
    expect(correct.count).toBe(1);

    const reloaded = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id } });
    expect(reloaded.name).toBe('Applied');
    expect(reloaded.version).toBe(patient.version + 1);
  });

  it('patient_care_team interval CHECK rejects endsAt <= startsAt', async () => {
    const patient = await createPatient(`PT-${randomUUID().slice(0, 8)}`);
    const user = await prisma.user.create({
      data: { email: `it-careteam-${Date.now()}@example.test`, displayName: 'Care Team Doctor' },
    });
    const now = new Date();

    await expect(
      prisma.patientCareTeamMember.create({
        data: {
          patientId: patient.id,
          userId: user.id,
          relationship: 'assigned_doctor',
          startsAt: now,
          endsAt: now, // not strictly after startsAt
        },
      }),
    ).rejects.toThrow();

    // A valid interval (or open-ended, endsAt=null) is accepted.
    await expect(
      prisma.patientCareTeamMember.create({
        data: { patientId: patient.id, userId: user.id, relationship: 'assigned_doctor' },
      }),
    ).resolves.toMatchObject({ relationship: 'assigned_doctor' });
  });

  it('consents: exactly one current row per (patient, type); a second grant of the same type upserts, not duplicates', async () => {
    const patient = await createPatient(`PT-${randomUUID().slice(0, 8)}`);
    await prisma.consent.create({
      data: {
        patientId: patient.id,
        type: 'data_processing',
        policyVersion: '1.0',
        granted: true,
        grantedAt: new Date(),
      },
    });
    await expect(
      prisma.consent.create({
        data: {
          patientId: patient.id,
          type: 'data_processing',
          policyVersion: '1.0',
          granted: true,
          grantedAt: new Date(),
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

    const count = await prisma.consent.count({
      where: { patientId: patient.id, type: 'data_processing' },
    });
    expect(count).toBe(1);
  });

  it('rejects an out-of-catalog consent type via the CHECK constraint', async () => {
    const patient = await createPatient(`PT-${randomUUID().slice(0, 8)}`);
    await expect(
      prisma.consent.create({
        data: {
          patientId: patient.id,
          type: 'marketing_email',
          policyVersion: '1.0',
          granted: true,
          grantedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it('consent_events is append-only: insert allowed, UPDATE/DELETE rejected', async () => {
    const patient = await createPatient(`PT-${randomUUID().slice(0, 8)}`);
    const consent = await prisma.consent.create({
      data: {
        patientId: patient.id,
        type: 'telemedicine',
        policyVersion: '1.0',
        granted: true,
        grantedAt: new Date(),
      },
    });
    const event = await prisma.consentEvent.create({
      data: {
        consentId: consent.id,
        patientId: patient.id,
        type: 'telemedicine',
        action: 'granted',
        policyVersion: '1.0',
      },
    });

    await expect(
      prisma.consentEvent.update({ where: { id: event.id }, data: { action: 'withdrawn' } }),
    ).rejects.toThrow(/append-only/i);
    await expect(prisma.consentEvent.delete({ where: { id: event.id } })).rejects.toThrow(
      /append-only/i,
    );

    const stillThere = await prisma.consentEvent.findUnique({ where: { id: event.id } });
    expect(stillThere?.action).toBe('granted');
  });

  it('withdrawal preserves prior grant history: the append-only event log accumulates rather than rewrites', async () => {
    const patient = await createPatient(`PT-${randomUUID().slice(0, 8)}`);
    const consent = await prisma.consent.create({
      data: {
        patientId: patient.id,
        type: 'research_data_sharing',
        policyVersion: '1.0',
        granted: true,
        grantedAt: new Date(),
      },
    });
    await prisma.consentEvent.create({
      data: {
        consentId: consent.id,
        patientId: patient.id,
        type: 'research_data_sharing',
        action: 'granted',
        policyVersion: '1.0',
      },
    });

    // Withdraw: current projection flips, a new event is appended (not a rewrite).
    await prisma.consent.update({
      where: { id: consent.id },
      data: { granted: false, withdrawnAt: new Date(), version: { increment: 1 } },
    });
    await prisma.consentEvent.create({
      data: {
        consentId: consent.id,
        patientId: patient.id,
        type: 'research_data_sharing',
        action: 'withdrawn',
        policyVersion: '1.0',
      },
    });

    const events = await prisma.consentEvent.findMany({
      where: { consentId: consent.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(events.map((e) => e.action)).toEqual(['granted', 'withdrawn']);

    const current = await prisma.consent.findUniqueOrThrow({ where: { id: consent.id } });
    expect(current.granted).toBe(false);
    expect(current.withdrawnAt).not.toBeNull();
  });

  it('a rolled-back transaction leaves no partial patient/consent state', async () => {
    const code = `PT-ROLLBACK-${randomUUID().slice(0, 6)}`;
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.patient.create({
          data: {
            organizationId,
            code,
            name: 'Rollback Patient',
            dob: new Date('1990-01-01'),
            phone: '0900000000',
          },
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const found = await prisma.patient.findFirst({ where: { organizationId, code } });
    expect(found).toBeNull();
  });
});
