import { PatientsService } from './patients.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { PatientWithDoctor } from './patients.repository';

function principal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return {
    userId: 'user-a',
    email: 'a@example.com',
    displayName: 'User A',
    memberships: [
      {
        organizationId: 'org-1',
        clinicLocationId: null,
        departmentId: null,
        role: 'patient' as any,
      },
    ],
    ...overrides,
  };
}

function patientRow(overrides: Partial<PatientWithDoctor> = {}): PatientWithDoctor {
  return {
    id: 'patient-a',
    organizationId: 'org-1',
    code: 'PT-1001',
    userId: 'user-a',
    name: 'User A',
    dob: new Date('1990-01-01T00:00:00.000Z'),
    gender: 'male' as any,
    phone: '0900000000',
    email: 'a@example.com',
    address: null,
    bloodType: 'unknown',
    heightCm: null,
    weightKg: null,
    primaryDoctorId: null,
    version: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    primaryDoctor: null,
    ...overrides,
  } as PatientWithDoctor;
}

describe('PatientsService — /patients/me identity resolution and update-only invariants', () => {
  let prisma: any;
  let patients: any;
  let consents: any;
  let audit: any;
  let service: PatientsService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: any) =>
        cb({
          patient: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: jest.fn(),
          },
          userMembership: { create: jest.fn() },
        }),
      ),
    };
    patients = {
      findByUserId: jest.fn(),
      findVisibleById: jest.fn(),
      createWithGeneratedCode: jest.fn(),
      replacePrimaryDoctorCareTeamRow: jest.fn(),
    };
    consents = { listByPatientId: jest.fn() };
    audit = { write: jest.fn().mockResolvedValue(null) };
    service = new PatientsService(prisma, patients, consents, audit);
  });

  describe('updateSelf — PATCH /patients/me', () => {
    it('resolves the target patient exclusively from the authenticated principal.userId, not from any client-supplied id', async () => {
      const row = patientRow();
      patients.findByUserId.mockResolvedValue(row);
      patients.findVisibleById.mockResolvedValue(row);
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          patient: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: jest.fn().mockResolvedValue({ ...row, phone: '0911111111' }),
          },
          userMembership: { create: jest.fn() },
        }),
      );

      await service.updateSelf(
        principal({ userId: 'user-a' }),
        { phone: '0911111111', version: 1 } as any,
        {},
      );

      expect(patients.findByUserId).toHaveBeenCalledWith('user-a');
      expect(patients.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('throws 404 (never creates) when the authenticated user has no patient row', async () => {
      patients.findByUserId.mockResolvedValue(null);

      await expect(
        service.updateSelf(principal(), { phone: '0911111111', version: 1 } as any, {}),
      ).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });

      expect(patients.createWithGeneratedCode).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('never touches patientCode, userId, id, organizationId, or createdAt in the update payload', async () => {
      const row = patientRow();
      patients.findByUserId.mockResolvedValue(row);
      patients.findVisibleById.mockResolvedValue(row);
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          patient: { updateMany, findUniqueOrThrow: jest.fn().mockResolvedValue(row) },
          userMembership: { create: jest.fn() },
        }),
      );

      // Attacker-shaped body: tries to smuggle identity/code fields the DTO
      // doesn't declare. TypeScript wouldn't allow this through the real
      // DTO type, so this simulates what happens if validation/whitelisting
      // were ever weakened — the service itself must not forward them.
      const maliciousDto: any = {
        phone: '0922222222',
        version: 1,
        userId: 'user-b',
        patientId: 'patient-b',
        id: 'patient-b',
        code: 'PT-9999',
        organizationId: 'org-2',
        createdAt: '2000-01-01',
      };

      await service.updateSelf(principal(), maliciousDto, {});

      expect(updateMany).toHaveBeenCalledTimes(1);
      const [[callArgs]] = updateMany.mock.calls;
      expect(callArgs.where).toEqual({ id: row.id, version: 1 });
      expect(callArgs.data).not.toHaveProperty('userId');
      expect(callArgs.data).not.toHaveProperty('code');
      expect(callArgs.data).not.toHaveProperty('id');
      expect(callArgs.data).not.toHaveProperty('organizationId');
      expect(callArgs.data).not.toHaveProperty('createdAt');
      expect(callArgs.data.phone).toBe('0922222222');
    });

    it('a valid update (correct version, patient exists) never returns 409', async () => {
      const row = patientRow();
      patients.findByUserId.mockResolvedValue(row);
      patients.findVisibleById.mockResolvedValue(row);
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          patient: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: jest.fn().mockResolvedValue(row),
          },
          userMembership: { create: jest.fn() },
        }),
      );

      await expect(
        service.updateSelf(principal(), { address: 'Hanoi', version: 1 } as any, {}),
      ).resolves.toBeDefined();
    });

    it("cross-account: principal A can never update principal B's patient (userId always sourced from the token, never the body)", async () => {
      // findByUserId is the only entry point into `update()`; it is called
      // with principal.userId regardless of anything in the DTO, so an
      // attacker cannot redirect the update by stuffing a different id
      // anywhere in the request body.
      patients.findByUserId.mockImplementation((userId: string) =>
        userId === 'user-a' ? patientRow({ id: 'patient-a', userId: 'user-a' }) : null,
      );
      patients.findVisibleById.mockResolvedValue(patientRow({ id: 'patient-a', userId: 'user-a' }));
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          patient: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: jest.fn().mockResolvedValue(patientRow()),
          },
          userMembership: { create: jest.fn() },
        }),
      );

      await service.updateSelf(
        principal({ userId: 'user-a' }),
        { phone: '0900000001', version: 1, userId: 'user-b', patientId: 'patient-b' } as any,
        {},
      );

      expect(patients.findByUserId).toHaveBeenCalledWith('user-a');
      expect(patients.findByUserId).not.toHaveBeenCalledWith('user-b');
    });
  });

  describe('createSelf — POST /patients/me', () => {
    it('creates only when the authenticated user has no existing patient', async () => {
      patients.findByUserId.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-a',
        displayName: 'User A',
        email: 'a@example.com',
      });
      patients.createWithGeneratedCode.mockImplementation(async (_orgId: string, run: any) =>
        run(
          {
            userMembership: { create: jest.fn() },
          },
          'PT-1001',
        ),
      );
      // The `run` callback calls `this.patients.create`, which isn't part of
      // this mock surface — stub it directly on the instance under test.
      (service as any).patients.create = jest.fn().mockResolvedValue(patientRow());

      await service.createSelf(
        principal(),
        { dob: '1990-01-01', gender: 'male', phone: '0900000000' } as any,
        {},
      );

      expect(patients.createWithGeneratedCode).toHaveBeenCalledTimes(1);
    });

    it('returns 409 and never calls createWithGeneratedCode when a patient already exists for this account', async () => {
      patients.findByUserId.mockResolvedValue(patientRow());

      await expect(
        service.createSelf(
          principal(),
          { dob: '1990-01-01', gender: 'male', phone: '0900000000' } as any,
          {},
        ),
      ).rejects.toMatchObject({ code: 'CONFLICT' });

      expect(patients.createWithGeneratedCode).not.toHaveBeenCalled();
    });
  });
});
