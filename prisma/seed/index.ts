import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from '../../src/common/authorization/permissions.catalog';
import { FEATURE_FLAG_CATALOG } from '../../src/common/authorization/feature-flags.catalog';

/**
 * Initializes platform metadata only. This command must never create tenant or
 * clinical data: organizations, locations, departments, users, practitioners,
 * schedules, patients, consents, appointments and encounters are all runtime
 * records and must come from real setup/user workflows.
 */
const prisma = new PrismaClient();

async function main() {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description, dangerous: permission.dangerous ?? false },
      create: {
        code: permission.code,
        description: permission.description,
        dangerous: permission.dangerous ?? false,
      },
    });
  }

  for (const [role, permissionCodes] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as Array<
    [UserRole, string[]]
  >) {
    for (const permissionCode of permissionCodes) {
      await prisma.rolePermission.upsert({
        where: { role_permissionCode: { role, permissionCode } },
        update: {},
        create: { role, permissionCode },
      });
    }
  }

  for (const flag of FEATURE_FLAG_CATALOG) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { description: flag.description },
      create: { key: flag.key, description: flag.description, enabledDefault: flag.enabledDefault },
    });
  }

  await prisma.platformSecuritySetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Platform metadata initialized: ${PERMISSION_CATALOG.length} permissions and ${FEATURE_FLAG_CATALOG.length} feature flags. No tenant or clinical records were created.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
