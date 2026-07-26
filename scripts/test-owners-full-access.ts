import 'dotenv/config';
import { Prisma, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_OWNER_EMAILS = [
  'buivanchuong@dermahealth.vn',
  'nguyenmanhcuong@dermahealth.vn',
  'daovanduong@dermahealth.vn',
  'phamthihongchuc@dermahealth.vn',
] as const;

const ALL_ROLES = Object.values(UserRole);
const MODE = process.argv[2];
const GRANT_CONFIRMATION = 'GRANT_TEST_OWNERS_FULL_ACCESS';
const REVOKE_CONFIRMATION = 'REVOKE_TEST_OWNERS_FULL_ACCESS';

function requiredConfirmation(expected: string): void {
  if (process.env.TEST_OWNER_ACCESS_CONFIRM !== expected) {
    throw new Error(`TEST_OWNER_ACCESS_CONFIRM must equal ${expected}.`);
  }
}

async function resolveTargetOrganization(tx: Prisma.TransactionClient): Promise<string> {
  const configuredCode = process.env.TEST_OWNER_ORGANIZATION_CODE?.trim();
  if (configuredCode) {
    const organization = await tx.organization.findUnique({
      where: { code: configuredCode },
      select: { id: true },
    });
    if (!organization) {
      throw new Error(`Organization not found: ${configuredCode}`);
    }
    return organization.id;
  }

  const ownerMemberships = await tx.userMembership.findMany({
    where: {
      role: 'super_administrator',
      status: 'active',
      user: { email: { in: [...TEST_OWNER_EMAILS] } },
    },
    select: { organizationId: true },
    distinct: ['organizationId'],
  });
  if (ownerMemberships.length !== 1) {
    throw new Error(
      'The four test Owners must share exactly one active Owner organization, or TEST_OWNER_ORGANIZATION_CODE must be set.',
    );
  }
  return ownerMemberships[0].organizationId;
}

async function assertExactOwners(
  tx: Prisma.TransactionClient,
): Promise<Array<{ id: string; email: string }>> {
  const users = await tx.user.findMany({
    where: { email: { in: [...TEST_OWNER_EMAILS] } },
    select: {
      id: true,
      email: true,
      status: true,
      memberships: {
        where: { role: 'super_administrator', status: 'active' },
        select: { id: true },
      },
    },
    orderBy: { email: 'asc' },
  });
  const found = new Set(users.map((user) => user.email));
  const missing = TEST_OWNER_EMAILS.filter((email) => !found.has(email));
  if (missing.length > 0) {
    throw new Error(`Missing test Owner account(s): ${missing.join(', ')}`);
  }
  for (const user of users) {
    if (user.status !== 'active') throw new Error(`Test Owner is not active: ${user.email}`);
    if (user.memberships.length === 0) {
      throw new Error(`Test Owner lacks an active super_administrator membership: ${user.email}`);
    }
  }
  return users.map(({ id, email }) => ({ id, email }));
}

async function grant(): Promise<void> {
  requiredConfirmation(GRANT_CONFIRMATION);
  await prisma.$transaction(
    async (tx) => {
      const users = await assertExactOwners(tx);
      const organizationId = await resolveTargetOrganization(tx);

      for (const user of users) {
        for (const role of ALL_ROLES) {
          const existing = await tx.userMembership.findFirst({
            where: {
              userId: user.id,
              organizationId,
              clinicLocationId: null,
              role,
            },
            select: { id: true },
          });
          if (existing) {
            await tx.userMembership.update({
              where: { id: existing.id },
              data: { status: 'active', endsAt: null },
            });
          } else {
            await tx.userMembership.create({
              data: { userId: user.id, organizationId, role, status: 'active' },
            });
          }
        }
        await tx.auditEvent.create({
          data: {
            actorId: null,
            action: 'admin.test_owner_full_access_granted',
            resourceType: 'user',
            resourceId: user.id,
            organizationId,
            result: 'success',
            reason: 'Temporary UAT access for the fixed four test Owner accounts',
            changedFields: ['memberships'],
          },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  console.log(`Granted all ${ALL_ROLES.length} roles to ${TEST_OWNER_EMAILS.length} test Owners.`);
  console.log('Existing sessions must sign out and sign in again to receive the new memberships.');
}

async function revoke(): Promise<void> {
  requiredConfirmation(REVOKE_CONFIRMATION);
  await prisma.$transaction(async (tx) => {
    const users = await assertExactOwners(tx);
    const organizationId = await resolveTargetOrganization(tx);
    const endedAt = new Date();
    for (const user of users) {
      await tx.userMembership.updateMany({
        where: {
          userId: user.id,
          organizationId,
          role: { not: 'super_administrator' },
          status: 'active',
        },
        data: { status: 'revoked', endsAt: endedAt },
      });
      await tx.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: endedAt, revokedReason: 'test_owner_full_access_revoked' },
      });
      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: 'admin.test_owner_full_access_revoked',
          resourceType: 'user',
          resourceId: user.id,
          organizationId,
          result: 'success',
          reason: 'Temporary UAT access removed',
          changedFields: ['memberships', 'refreshSessions'],
        },
      });
    }
  });
  console.log(`Revoked temporary roles and sessions for ${TEST_OWNER_EMAILS.length} test Owners.`);
}

async function main(): Promise<void> {
  if (MODE === 'grant') return grant();
  if (MODE === 'revoke') return revoke();
  throw new Error('Usage: npm run admin:test-owners-full-access -- grant|revoke');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
