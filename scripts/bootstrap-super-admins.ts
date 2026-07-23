import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const CONFIRMATION = 'CREATE_INITIAL_PLATFORM_OWNERS';

type InitialOwner = { email: string; displayName: string };

function requiredEnv(name: 'SUPER_ADMIN_PASSWORD' | 'PASSWORD_PEPPER') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set.`);
  return value;
}

function initialOwners(): InitialOwner[] {
  const raw = process.env.INITIAL_PLATFORM_OWNERS_JSON?.trim();
  if (!raw) throw new Error('INITIAL_PLATFORM_OWNERS_JSON must be set.');

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('INITIAL_PLATFORM_OWNERS_JSON must be valid JSON.');
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('INITIAL_PLATFORM_OWNERS_JSON must contain at least one owner.');
  }

  const owners = value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Owner at index ${index} must be an object.`);
    }
    const email = String((item as Record<string, unknown>).email ?? '')
      .trim()
      .toLowerCase();
    const displayName = String((item as Record<string, unknown>).displayName ?? '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || !displayName) {
      throw new Error(`Owner at index ${index} must have a valid email and displayName.`);
    }
    return { email, displayName };
  });
  if (new Set(owners.map((owner) => owner.email)).size !== owners.length) {
    throw new Error('INITIAL_PLATFORM_OWNERS_JSON contains duplicate emails.');
  }
  return owners;
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
  const organizationCode = process.env.OWNER_BOOTSTRAP_ORGANIZATION_CODE?.trim();
  const organizationName = process.env.OWNER_BOOTSTRAP_ORGANIZATION_NAME?.trim();
  const organizationTimezone = process.env.OWNER_BOOTSTRAP_ORGANIZATION_TIMEZONE?.trim();
  if (!organizationCode || !organizationName || !organizationTimezone) {
    throw new Error(
      'OWNER_BOOTSTRAP_ORGANIZATION_CODE, OWNER_BOOTSTRAP_ORGANIZATION_NAME and OWNER_BOOTSTRAP_ORGANIZATION_TIMEZONE must be set.',
    );
  }
  const owners = initialOwners();

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

      const organization = await tx.organization.upsert({
        where: { code: organizationCode },
        update: {},
        create: {
          code: organizationCode,
          name: organizationName,
          timezone: organizationTimezone,
        },
        select: { id: true },
      });

      for (const owner of owners) {
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

  console.log(`Created ${owners.length} initial super administrator account(s).`);
  for (const owner of owners) console.log(`OK ${owner.email}`);
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
