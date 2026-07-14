import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { createTestPrisma } from './utils/test-prisma';

describe('user_memberships partial unique indexes (F-004, integration)', () => {
  let prisma: PrismaService;
  let organizationId: string;
  let clinicId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();

    const org = await prisma.organization.create({
      data: { code: `it-membership-${Date.now()}`, name: 'Integration Membership Org' },
    });
    organizationId = org.id;
    const clinic = await prisma.clinicLocation.create({
      data: { organizationId, code: 'IT-CLINIC', name: 'Integration Clinic' },
    });
    clinicId = clinic.id;
    const user = await prisma.user.create({
      data: {
        email: `it-membership-${Date.now()}@example.test`,
        displayName: 'Membership Test User',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.userMembership.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.clinicLocation.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it('rejects a duplicate clinic-scoped membership for the same user/org/clinic/role', async () => {
    await prisma.userMembership.create({
      data: {
        userId,
        organizationId,
        clinicLocationId: clinicId,
        role: 'doctor',
        status: 'active',
      },
    });

    await expect(
      prisma.userMembership.create({
        data: {
          userId,
          organizationId,
          clinicLocationId: clinicId,
          role: 'doctor',
          status: 'active',
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('rejects a duplicate org-wide (clinicLocationId=null) membership for the same user/org/role', async () => {
    await prisma.userMembership.create({
      data: {
        userId,
        organizationId,
        clinicLocationId: null,
        role: 'medical_administrator',
        status: 'active',
      },
    });

    await expect(
      prisma.userMembership.create({
        data: {
          userId,
          organizationId,
          clinicLocationId: null,
          role: 'medical_administrator',
          status: 'active',
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it('allows an org-wide membership and a clinic-scoped membership for the same role to coexist', async () => {
    // Distinct scopes (one row has clinicLocationId=null, the other set) must
    // not collide with each other — this is exactly the case a plain
    // (user,org,clinic,role) unique constraint would get wrong, since NULL is
    // "distinct from itself" in Postgres and would let duplicates of the NULL
    // row through instead of correctly comparing scope.
    await prisma.userMembership.create({
      data: {
        userId,
        organizationId,
        clinicLocationId: null,
        role: 'system_administrator',
        status: 'active',
      },
    });
    await expect(
      prisma.userMembership.create({
        data: {
          userId,
          organizationId,
          clinicLocationId: clinicId,
          role: 'system_administrator',
          status: 'active',
        },
      }),
    ).resolves.toMatchObject({ role: 'system_administrator' });
  });

  it('allows re-granting the same scope/role after the prior membership was revoked', async () => {
    const first = await prisma.userMembership.create({
      data: { userId, organizationId, clinicLocationId: clinicId, role: 'nurse', status: 'active' },
    });
    await prisma.userMembership.update({ where: { id: first.id }, data: { status: 'revoked' } });

    await expect(
      prisma.userMembership.create({
        data: {
          userId,
          organizationId,
          clinicLocationId: clinicId,
          role: 'nurse',
          status: 'active',
        },
      }),
    ).resolves.toMatchObject({ role: 'nurse', status: 'active' });
  });
});
