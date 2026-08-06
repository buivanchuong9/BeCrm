/**
 * Converts a UTC instant to the calendar date in the specified IANA timezone.
 *
 * WHY NOT setHours(0,0,0,0):
 *   In production the Node.js process runs in UTC.  Calling setHours(0,0,0,0)
 *   clears hours in the process timezone, so "today" is always the UTC date —
 *   which diverges from Vietnam time (UTC+7) by up to 7 hours.  At 23:30 UTC
 *   on Jan 1 it is already 06:30 Jan 2 in Hanoi; setHours gives Jan 1,
 *   toClinicDate('Asia/Ho_Chi_Minh') correctly returns Jan 2.
 *
 * RETURN VALUE:
 *   A Date whose UTC epoch corresponds to midnight UTC of the local calendar
 *   date (e.g. clinic-local "2026-08-07" → 2026-08-07T00:00:00.000Z).
 *   Prisma maps @db.Date columns to/from midnight-UTC Date objects, so this
 *   representation round-trips through Prisma without timezone drift.
 *
 * EDGE CASES TESTED:
 *   - 23:59 local time: same calendar date as 23:00 local.
 *   - 00:01 local time: next calendar date vs previous UTC date.
 *   - UTC date differing from clinic-local date (the main production risk).
 */
export function toClinicDate(timezone: string, reference: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);

  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  // Midnight UTC of the local calendar date.  PostgreSQL DATE is stored as
  // a plain (year, month, day) triple; Prisma serialises @db.Date fields as
  // midnight-UTC, so this value stores and compares correctly.
  return new Date(Date.UTC(year, month - 1, day));
}
