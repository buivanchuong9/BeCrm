import { ValidationAppError } from '../../core/errors/app-error';

/**
 * Every clinic location in this deployment defaults to `Asia/Ho_Chi_Minh`
 * (UTC+7, no daylight saving — Vietnam has observed a fixed offset since
 * 1975), so a fixed-offset conversion is correct for the confirmed scope of
 * this deployment. docs/api.md's UNKNOWN-6 (doctor scheduling) already flags
 * that a full per-clinic-timezone scheduling subsystem is a later decision;
 * this helper intentionally does not pull in a timezone-database dependency
 * for a single-offset MVP. Revisit if a non-Vietnam clinic location ships.
 */
const VN_OFFSET_MINUTES = 7 * 60;

export function combineDateTimeToUtc(date: string, time: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) {
    throw new ValidationAppError(
      [{ field: 'date', code: 'VALIDATION_FAILED' }],
      'Invalid date/time.',
    );
  }
  const [, y, mo, d] = dateMatch;
  const [, h, mi] = timeMatch;
  const utcMillis =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)) -
    VN_OFFSET_MINUTES * 60_000;
  return new Date(utcMillis);
}
