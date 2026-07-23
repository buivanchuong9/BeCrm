import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { memberships: { some: { role: 'super_administrator', status: 'active' } } },
    select: {
      email: true,
      status: true,
      passwordHash: true,
      failedLoginCount: true,
      lockedUntil: true,
      memberships: {
        where: { role: 'super_administrator', status: 'active' },
        select: { id: true },
      },
    },
  });
  let healthy = users.length > 0;
  if (users.length === 0) console.log('ERROR no active super administrator account exists');

  for (const user of users) {
    const issues: string[] = [];
    if (user.status !== 'active') issues.push(`status=${user.status}`);
    if (!user.passwordHash) issues.push('password not configured');
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      issues.push(`locked until ${user.lockedUntil.toISOString()}`);
    }

    if (issues.length > 0) healthy = false;
    const suffix = `; failedLoginCount=${user.failedLoginCount}`;
    console.log(
      `${issues.length === 0 ? 'OK' : 'ERROR'} ${user.email}${suffix}${issues.length ? `; ${issues.join('; ')}` : ''}`,
    );
  }

  if (!healthy) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Super administrator check failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
