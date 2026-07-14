import { PrismaService } from '../../../src/infrastructure/database/prisma.service';

/** Direct Prisma connection against the isolated test database (.env.test) —
 * no full Nest app bootstrap needed for pure DB-constraint/trigger tests. */
export function createTestPrisma(): PrismaService {
  return new PrismaService();
}
