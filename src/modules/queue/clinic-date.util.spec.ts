import { toClinicDate } from './clinic-date.util';

const TZ_VN = 'Asia/Ho_Chi_Minh'; // UTC+7, no DST

describe('toClinicDate', () => {
  // Helper: build a Date from explicit UTC components
  const utc = (y: number, m: number, d: number, h = 0, min = 0) =>
    new Date(Date.UTC(y, m - 1, d, h, min));

  it('returns a Date whose UTC midnight represents the clinic-local calendar date', () => {
    // 2026-08-06 14:00 UTC = 2026-08-06 21:00 VN → clinic date is 2026-08-06
    const result = toClinicDate(TZ_VN, utc(2026, 8, 6, 14, 0));
    expect(result).toEqual(new Date(Date.UTC(2026, 7, 6))); // August is month index 7
  });

  it('23:59 local time: stays on current local calendar date', () => {
    // 2026-08-06T16:59:00Z = 2026-08-06T23:59:00+07:00 → clinic date Aug 6
    const ref = utc(2026, 8, 6, 16, 59);
    expect(toClinicDate(TZ_VN, ref)).toEqual(new Date(Date.UTC(2026, 7, 6)));
  });

  it('00:01 local time: falls on the NEW calendar date (next day vs UTC)', () => {
    // 2026-08-05T17:01:00Z = 2026-08-06T00:01:00+07:00 → clinic date Aug 6
    // setHours(0,0,0,0) in a UTC process would give Aug 5 ← the production bug.
    const ref = utc(2026, 8, 5, 17, 1);
    const result = toClinicDate(TZ_VN, ref);
    expect(result).toEqual(new Date(Date.UTC(2026, 7, 6)));
    // setHours(0,0,0,0) is environment-dependent; the result differs between
    // UTC and +07:00 hosts.  We only assert the CORRECT answer above.
  });

  it('UTC date diverges from clinic-local date at 17:00 UTC exactly (VN day boundary)', () => {
    // Exactly midnight Vietnam time = 17:00 UTC
    const midnight_vn = utc(2026, 8, 6, 17, 0); // 2026-08-07T00:00:00+07:00
    expect(toClinicDate(TZ_VN, midnight_vn)).toEqual(new Date(Date.UTC(2026, 7, 7)));
  });

  it('UTC date diverges: 16:59 UTC is still Aug 6 in VN, 17:00 UTC is already Aug 7', () => {
    const lastMinuteOfAug6_vn = utc(2026, 8, 6, 16, 59);
    const firstMinuteOfAug7_vn = utc(2026, 8, 6, 17, 0);
    expect(toClinicDate(TZ_VN, lastMinuteOfAug6_vn)).toEqual(new Date(Date.UTC(2026, 7, 6)));
    expect(toClinicDate(TZ_VN, firstMinuteOfAug7_vn)).toEqual(new Date(Date.UTC(2026, 7, 7)));
  });

  it('defaults to current instant when no reference is supplied', () => {
    // Just verify it does not throw and returns a valid Date
    const now = new Date();
    const result = toClinicDate(TZ_VN);
    expect(result).toBeInstanceOf(Date);
    // Must be within the same or adjacent day as now
    const diffMs = Math.abs(result.getTime() - now.getTime());
    expect(diffMs).toBeLessThan(48 * 60 * 60 * 1000);
  });

  it('works for UTC timezone (no offset)', () => {
    const ref = utc(2026, 8, 6, 23, 30);
    expect(toClinicDate('UTC', ref)).toEqual(new Date(Date.UTC(2026, 7, 6)));
  });

  it('works for UTC-7 (clinic in opposite offset direction)', () => {
    // 2026-08-07T02:30:00Z = 2026-08-06T19:30:00-07:00 → clinic date Aug 6
    const ref = utc(2026, 8, 7, 2, 30);
    expect(toClinicDate('America/Denver', ref)).toEqual(new Date(Date.UTC(2026, 7, 6)));
  });

  it('preserves Prisma @db.Date round-trip convention (midnight UTC)', () => {
    const result = toClinicDate(TZ_VN, utc(2026, 8, 6, 12, 0));
    // Prisma serialises @db.Date as midnight UTC, so hours/minutes/seconds must be zero
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});
