import { Prisma } from '@prisma/client';

/**
 * Atomically claims the next queue number for a given scope.
 *
 * Returns both the raw integer (seqNumber) and the patient-facing display
 * code (displayCode = prefix + zero-padded seqNumber, e.g. "D003").
 *
 * ATOMICITY: The UPSERT is serialized by PostgreSQL at the row level inside
 * an explicit Prisma interactive transaction.  Two concurrent calls inside
 * the same transaction scope produce strictly sequential numbers — no COUNT+1
 * race condition.
 *
 * SCOPE: Uses the same (clinic_location_id, clinic_date, department) key as
 * the queue_tickets unique constraint so counter and ticket stay in sync.
 */
export async function allocateQueueNumber(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    clinicLocationId: string;
    clinicDate: Date;
    department: string;
    prefix: string;
  },
): Promise<{ seqNumber: number; displayCode: string }> {
  const { organizationId, clinicLocationId, clinicDate, department, prefix } = params;

  const rows = await tx.$queryRaw<[{ last_number: number }]>(Prisma.sql`
    INSERT INTO daily_queue_counters
      (organization_id, clinic_location_id, clinic_date, department, last_number, updated_at)
    VALUES
      (${organizationId}::uuid, ${clinicLocationId}::uuid, ${clinicDate}::date, ${department}, 1, now())
    ON CONFLICT (clinic_location_id, clinic_date, department)
    DO UPDATE SET
      last_number = daily_queue_counters.last_number + 1,
      updated_at  = now()
    RETURNING last_number
  `);

  const seqNumber = Number(rows[0].last_number);
  return {
    seqNumber,
    displayCode: `${prefix}${String(seqNumber).padStart(3, '0')}`,
  };
}
