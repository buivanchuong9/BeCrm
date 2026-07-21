import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_OWNERS = [
  'buivanchuong@dermahealth.vn',
  'nguyenmanhcuong@dermahealth.vn',
  'daovanduong@dermahealth.vn',
  'phamthihongchuc@dermahealth.vn',
] as const;

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: [...EXPECTED_OWNERS] } },
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
  const byEmail = new Map(users.map((user) => [user.email, user]));
  let healthy = true;

  for (const email of EXPECTED_OWNERS) {
    const user = byEmail.get(email);
    const issues: string[] = [];
    if (!user) {
      issues.push('missing user');
    } else {
      if (user.status !== 'active') issues.push(`status=${user.status}`);
      if (!user.passwordHash) issues.push('password not configured');
      if (user.memberships.length === 0)
        issues.push('missing active super_administrator membership');
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        issues.push(`locked until ${user.lockedUntil.toISOString()}`);
      }
    }

    if (issues.length > 0) healthy = false;
    const suffix = user ? `; failedLoginCount=${user.failedLoginCount}` : '';
    console.log(
      `${issues.length === 0 ? 'OK' : 'ERROR'} ${email}${suffix}${issues.length ? `; ${issues.join('; ')}` : ''}`,
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
