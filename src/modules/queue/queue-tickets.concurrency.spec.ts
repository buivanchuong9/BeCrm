/**
 * PostgreSQL-backed concurrency integration tests for the clinic queue.
 *
 * REQUIRES: DATABASE_URL pointing to a real PostgreSQL instance with the schema
 * applied (npx prisma migrate deploy).  Tests are skipped when DATABASE_URL is
 * absent so the suite still passes in purely unit-test CI environments.
 *
 * Each test suite creates an isolated scope (random org/location codes) and
 * deletes all created rows in afterAll — safe to run alongside other tests.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { allocateQueueNumber } from './queue-number-allocator';
import { QueueTicketsRepository } from './queue-tickets.repository';
import { toClinicDate } from './clinic-date.util';

// Guard: skip the entire suite if DATABASE_URL is absent OR if the DB is not
// reachable.  We probe synchronously via the INTEGRATION_TESTS env var which
// must be explicitly set to '1' to opt in (prevents accidental failures when
// the developer's local Postgres is down).
const RUN_INTEGRATION = process.env.INTEGRATION_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const describeDb = RUN_INTEGRATION ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let prisma: PrismaClient;
let orgId: string;
let locId: string;
let patientId: string;
const TZ = 'Asia/Ho_Chi_Minh';
// Fixed clinic date for all tests — midnight UTC representing 2026-08-06 in VN
const CLINIC_DATE = toClinicDate(TZ, new Date('2026-08-06T04:00:00Z'));

async function createFixtures(suffix: string) {
  const code = `TST-${suffix}`;
  const org = await prisma.organization.create({
    data: { code, name: `Test Org ${code}`, timezone: TZ },
  });
  const loc = await prisma.clinicLocation.create({
    data: {
      organizationId: org.id,
      code,
      name: `Test Clinic ${code}`,
      timezone: TZ,
    },
  });
  const patient = await prisma.patient.create({
    data: {
      organizationId: org.id,
      code: `PT-${code}`,
      name: 'Test Patient',
      dob: new Date('1990-01-01'),
      phone: '0900000000',
    },
  });
  return { orgId: org.id, locId: loc.id, patientId: patient.id };
}

async function deleteFixtures(organizationId: string) {
  // Delete in FK-safe order
  await prisma.queueTicket.deleteMany({ where: { organizationId } });
  await prisma.dailyQueueCounter.deleteMany({ where: { organizationId } });
  await prisma.patient.deleteMany({ where: { organizationId } });
  await prisma.clinicLocation.deleteMany({ where: { organizationId } });
  await prisma.organization.delete({ where: { id: organizationId } });
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describeDb('queue concurrency (PostgreSQL)', () => {
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    prisma = new PrismaClient();
    const fixtures = await createFixtures(suffix);
    orgId = fixtures.orgId;
    locId = fixtures.locId;
    patientId = fixtures.patientId;
  });

  afterAll(async () => {
    await deleteFixtures(orgId);
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // 1. Atomic counter — 100 simultaneous allocations must produce unique seqNumbers
  // -------------------------------------------------------------------------
  describe('allocateQueueNumber', () => {
    it('100 concurrent allocations produce 100 unique, gapless seqNumbers', async () => {
      const dept = `alloc-${suffix}`;
      const results = await Promise.all(
        Array.from({ length: 100 }, () =>
          prisma.$transaction((tx) =>
            allocateQueueNumber(tx, {
              organizationId: orgId,
              clinicLocationId: locId,
              clinicDate: CLINIC_DATE,
              department: dept,
              prefix: 'T',
            }),
          ),
        ),
      );

      const seqNumbers = results.map((r) => r.seqNumber).sort((a, b) => a - b);
      // All 100 values must be unique integers 1..100
      expect(seqNumbers).toHaveLength(100);
      expect(new Set(seqNumbers).size).toBe(100);
      expect(seqNumbers[0]).toBe(1);
      expect(seqNumbers[99]).toBe(100);

      // Display codes must match the seqNumber
      for (const r of results) {
        expect(r.displayCode).toBe(`T${String(r.seqNumber).padStart(3, '0')}`);
      }
    });

    it('second batch continues from where the first left off', async () => {
      const dept = `alloc-cont-${suffix}`;
      // First allocation to initialise the counter
      const first = await prisma.$transaction((tx) =>
        allocateQueueNumber(tx, {
          organizationId: orgId,
          clinicLocationId: locId,
          clinicDate: CLINIC_DATE,
          department: dept,
          prefix: 'B',
        }),
      );
      expect(first.seqNumber).toBe(1);

      // 5 more concurrent allocations must start from 2
      const more = await Promise.all(
        Array.from({ length: 5 }, () =>
          prisma.$transaction((tx) =>
            allocateQueueNumber(tx, {
              organizationId: orgId,
              clinicLocationId: locId,
              clinicDate: CLINIC_DATE,
              department: dept,
              prefix: 'B',
            }),
          ),
        ),
      );
      const seqs = more.map((r) => r.seqNumber).sort((a, b) => a - b);
      expect(seqs).toEqual([2, 3, 4, 5, 6]);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Atomic callNext — 10 simultaneous calls must each get a distinct ticket
  // -------------------------------------------------------------------------
  describe('callNext (FOR UPDATE SKIP LOCKED)', () => {
    let repo: QueueTicketsRepository;

    beforeAll(() => {
      repo = new QueueTicketsRepository(prisma as any);
    });

    it('10 concurrent callNext calls each select a different ticket', async () => {
      const dept = `callnext-${suffix}`;
      // Seed exactly 10 waiting tickets for this scope
      await prisma.queueTicket.deleteMany({
        where: { organizationId: orgId, department: dept },
      });
      // Allocate seq numbers first
      for (let seq = 1; seq <= 10; seq++) {
        await prisma.queueTicket.create({
          data: {
            organizationId: orgId,
            clinicLocationId: locId,
            patientId,
            sourceType: 'walk_in',
            clinicDate: CLINIC_DATE,
            seqNumber: seq,
            number: `C${String(seq).padStart(3, '0')}`,
            department: dept,
            serviceStation: dept,
            waitingArea: dept,
            status: 'waiting',
          },
        });
      }

      const callerIds = Array.from({ length: 10 }, () => randomUUID());
      const results = await Promise.all(
        callerIds.map((callerId) =>
          prisma.$transaction((tx) =>
            repo.callNext(tx as any, orgId, locId, CLINIC_DATE, dept, callerId),
          ),
        ),
      );

      const called = results.filter(Boolean);
      const calledIds = called.map((t) => t!.id);

      // All 10 should have succeeded (10 tickets, 10 callers)
      expect(called).toHaveLength(10);
      // No duplicates
      expect(new Set(calledIds).size).toBe(10);
      // All must be in 'called' status
      for (const t of called) {
        expect(t!.status).toBe('called');
        expect(t!.calledAt).not.toBeNull();
      }
    });

    it('11th concurrent callNext returns null when queue is empty', async () => {
      const dept = `callnext-empty-${suffix}`;
      // No tickets seeded — callNext should immediately return null
      const result = await prisma.$transaction((tx) =>
        repo.callNext(tx as any, orgId, locId, CLINIC_DATE, dept, randomUUID()),
      );
      expect(result).toBeNull();
    });

    it('callNext without department filter works across all departments', async () => {
      const deptA = `cross-dept-a-${suffix}`;
      const deptB = `cross-dept-b-${suffix}`;
      await prisma.queueTicket.create({
        data: {
          organizationId: orgId,
          clinicLocationId: locId,
          patientId,
          sourceType: 'walk_in',
          clinicDate: CLINIC_DATE,
          seqNumber: 1,
          number: 'A001',
          department: deptA,
          serviceStation: deptA,
          waitingArea: deptA,
          status: 'waiting',
        },
      });
      await prisma.queueTicket.create({
        data: {
          organizationId: orgId,
          clinicLocationId: locId,
          patientId,
          sourceType: 'walk_in',
          clinicDate: CLINIC_DATE,
          seqNumber: 1,
          number: 'B001',
          department: deptB,
          serviceStation: deptB,
          waitingArea: deptB,
          status: 'waiting',
        },
      });

      const result = await prisma.$transaction((tx) =>
        repo.callNext(tx as any, orgId, locId, CLINIC_DATE, null, randomUUID()),
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('called');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Optimistic locking — concurrent transitions on same ticket
  // -------------------------------------------------------------------------
  describe('transition (optimistic version lock)', () => {
    let repo: QueueTicketsRepository;

    beforeAll(() => {
      repo = new QueueTicketsRepository(prisma as any);
    });

    it('only one of two concurrent transitions on the same ticket wins', async () => {
      const ticket = await prisma.queueTicket.create({
        data: {
          organizationId: orgId,
          clinicLocationId: locId,
          patientId,
          sourceType: 'walk_in',
          clinicDate: CLINIC_DATE,
          seqNumber: 99,
          number: 'Q099',
          department: `opt-lock-${suffix}`,
          serviceStation: `opt-lock-${suffix}`,
          waitingArea: `opt-lock-${suffix}`,
          status: 'called',
        },
      });

      // Two clients both read version=1 and try to transition called → in_service
      const [r1, r2] = await Promise.all([
        prisma.$transaction((tx) =>
          repo.transition(tx as any, ticket.id, ticket.version, ['called'], {
            status: 'in_service',
            serviceStartedAt: new Date(),
          }),
        ),
        prisma.$transaction((tx) =>
          repo.transition(tx as any, ticket.id, ticket.version, ['called'], {
            status: 'in_service',
            serviceStartedAt: new Date(),
          }),
        ),
      ]);

      const totalUpdated = r1.count + r2.count;
      // Exactly one must have succeeded; the other's WHERE version=1 matches nothing
      expect(totalUpdated).toBe(1);

      const final = await prisma.queueTicket.findUnique({ where: { id: ticket.id } });
      expect(final!.status).toBe('in_service');
      // Version was incremented once
      expect(final!.version).toBe(ticket.version + 1);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Rollback safety — a thrown error inside a transaction must not leave
  //    partial state (counter incremented but ticket not created)
  // -------------------------------------------------------------------------
  describe('rollback safety', () => {
    it('counter does not advance if the ticket create throws', async () => {
      const dept = `rollback-${suffix}`;

      const counterBefore = await prisma.dailyQueueCounter.findUnique({
        where: {
          clinicLocationId_clinicDate_department: {
            clinicLocationId: locId,
            clinicDate: CLINIC_DATE,
            department: dept,
          },
        },
      });
      expect(counterBefore).toBeNull();

      // Simulate a transaction that allocates a number but then fails
      await expect(
        prisma.$transaction(async (tx) => {
          await allocateQueueNumber(tx, {
            organizationId: orgId,
            clinicLocationId: locId,
            clinicDate: CLINIC_DATE,
            department: dept,
            prefix: 'R',
          });
          // Intentional failure after allocation
          throw new Error('Simulated downstream failure');
        }),
      ).rejects.toThrow('Simulated downstream failure');

      // The counter insert was rolled back — no row should exist
      const counterAfter = await prisma.dailyQueueCounter.findUnique({
        where: {
          clinicLocationId_clinicDate_department: {
            clinicLocationId: locId,
            clinicDate: CLINIC_DATE,
            department: dept,
          },
        },
      });
      expect(counterAfter).toBeNull();

      // No tickets were created
      const tickets = await prisma.queueTicket.count({
        where: { organizationId: orgId, department: dept },
      });
      expect(tickets).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Concurrent check-in retries — idempotent re-entry from same scope
  // -------------------------------------------------------------------------
  describe('concurrent allocation scoping', () => {
    it('allocations in different departments do not share a counter', async () => {
      const deptX = `scope-x-${suffix}`;
      const deptY = `scope-y-${suffix}`;

      const [rx, ry] = await Promise.all([
        prisma.$transaction((tx) =>
          allocateQueueNumber(tx, {
            organizationId: orgId,
            clinicLocationId: locId,
            clinicDate: CLINIC_DATE,
            department: deptX,
            prefix: 'X',
          }),
        ),
        prisma.$transaction((tx) =>
          allocateQueueNumber(tx, {
            organizationId: orgId,
            clinicLocationId: locId,
            clinicDate: CLINIC_DATE,
            department: deptY,
            prefix: 'Y',
          }),
        ),
      ]);

      // Both start at 1 — independent counters
      expect(rx.seqNumber).toBe(1);
      expect(ry.seqNumber).toBe(1);
    });

    it('allocations on different clinicDates do not share a counter', async () => {
      const dept = `scope-date-${suffix}`;
      const date1 = toClinicDate(TZ, new Date('2026-08-06T04:00:00Z'));
      const date2 = toClinicDate(TZ, new Date('2026-08-07T04:00:00Z'));

      const [r1, r2] = await Promise.all([
        prisma.$transaction((tx) =>
          allocateQueueNumber(tx, {
            organizationId: orgId,
            clinicLocationId: locId,
            clinicDate: date1,
            department: dept,
            prefix: 'D',
          }),
        ),
        prisma.$transaction((tx) =>
          allocateQueueNumber(tx, {
            organizationId: orgId,
            clinicLocationId: locId,
            clinicDate: date2,
            department: dept,
            prefix: 'D',
          }),
        ),
      ]);

      expect(r1.seqNumber).toBe(1);
      expect(r2.seqNumber).toBe(1);
    });
  });
});
