import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function requiredEnv(name: 'SUPER_ADMIN_EMAIL' | 'SUPER_ADMIN_PASSWORD' | 'PASSWORD_PEPPER') {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set.`);
  return value;
}

async function main() {
  const email = requiredEnv('SUPER_ADMIN_EMAIL').toLowerCase();
  const password = requiredEnv('SUPER_ADMIN_PASSWORD');
  const pepper = requiredEnv('PASSWORD_PEPPER');

  if (password.length < 12) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { role: 'super_administrator', status: 'active' },
        select: { organizationId: true },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    throw new Error(`Active super administrator not found: ${email}`);
  }

  const passwordHash = await argon2.hash(`${password}${pepper}`, { type: argon2.argon2id });
  const revokedAt = new Date();

  const [, revokedSessions] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'active',
        failedLoginCount: 0,
        lockedUntil: null,
        version: { increment: 1 },
      },
    }),
    prisma.refreshSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt, revokedReason: 'admin_password_rotation' },
    }),
    prisma.auditEvent.create({
      data: {
        actorId: null,
        action: 'admin.super_admin_password_rotated',
        resourceType: 'user',
        resourceId: user.id,
        organizationId: user.memberships[0].organizationId,
        result: 'success',
        reason: 'One-time operational credential rotation',
        changedFields: ['passwordHash', 'failedLoginCount', 'lockedUntil', 'refreshSessions'],
      },
    }),
  ]);

  console.log(`Super administrator password rotated for ${email}.`);
  console.log(`Revoked active refresh sessions: ${revokedSessions.count}.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Super administrator password rotation failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
