import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const CONFIRMATION = 'CREATE_INITIAL_PLATFORM_OWNERS';
const OWNERS = [
  { email: 'buivanchuong@dermahealth.vn', displayName: 'Bùi Văn Chương' },
  { email: 'nguyenmanhcuong@dermahealth.vn', displayName: 'Nguyễn Mạnh Cường' },
  { email: 'daovanduong@dermahealth.vn', displayName: 'Đào Văn Dương' },
  { email: 'phamthihongchuc@dermahealth.vn', displayName: 'Phạm Thị Hồng Chúc' },
] as const;

function requiredEnv(name: 'SUPER_ADMIN_PASSWORD' | 'PASSWORD_PEPPER') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set.`);
  return value;
}

async function main() {
  if (process.env.OWNER_BOOTSTRAP_CONFIRM !== CONFIRMATION) {
    throw new Error(`OWNER_BOOTSTRAP_CONFIRM must equal ${CONFIRMATION}.`);
  }

  const password = requiredEnv('SUPER_ADMIN_PASSWORD');
  if (password.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const pepper = requiredEnv('PASSWORD_PEPPER');
  const passwordHash = await argon2.hash(`${password}${pepper}`, { type: argon2.argon2id });
  const organizationCode = process.env.OWNER_BOOTSTRAP_ORGANIZATION_CODE?.trim() || 'dermahealth';

  await prisma.$transaction(
    async (tx) => {
      // This is deliberately a one-time, all-or-nothing bootstrap. Once any
      // active Owner exists, additional Owners must use the governed workflow.
      const activeOwnerCount = await tx.userMembership.count({
        where: { role: 'super_administrator', status: 'active' },
      });
      if (activeOwnerCount > 0) {
        throw new Error(
          `Refusing initial Owner bootstrap: ${activeOwnerCount} active super administrator membership(s) already exist.`,
        );
      }

      const organization = await tx.organization.findUnique({
        where: { code: organizationCode },
        select: { id: true },
      });
      if (!organization) {
        throw new Error(`Organization not found: ${organizationCode}`);
      }

      const department = await tx.department.findUnique({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: 'BQT-HE-THONG',
          },
        },
        select: { id: true },
      });

      for (const owner of OWNERS) {
        const existingUser = await tx.user.findUnique({
          where: { email: owner.email },
          select: { id: true },
        });
        if (existingUser) {
          throw new Error(`Refusing initial Owner bootstrap: user already exists: ${owner.email}`);
        }

        const user = await tx.user.create({
          data: {
            email: owner.email,
            displayName: owner.displayName,
            passwordHash,
            status: 'active',
            emailVerifiedAt: new Date(),
          },
          select: { id: true },
        });

        await tx.userMembership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            departmentId: department?.id ?? null,
            role: 'super_administrator',
            status: 'active',
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: null,
            action: 'admin.initial_super_admin_provisioned',
            resourceType: 'user',
            resourceId: user.id,
            organizationId: organization.id,
            result: 'success',
            reason: 'One-time production Owner bootstrap',
            changedFields: [
              'user',
              'passwordHash',
              'status',
              'emailVerifiedAt',
              'super_administrator_membership',
            ],
          },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  console.log(`Created ${OWNERS.length} initial super administrator accounts.`);
  for (const owner of OWNERS) console.log(`OK ${owner.email}`);
  console.log('Initial Owner bootstrap is now permanently disabled by the active-owner guard.');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Initial super administrator bootstrap failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
