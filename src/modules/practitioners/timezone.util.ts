function partsAt(instant: Date, timezone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );
}

/** Converts a clinic-local date and minute-of-day to an instant without
 * trusting the API caller to provide an offset. The second pass handles DST
 * boundaries for timezones that observe them. */
export function clinicLocalMinuteToUtc(date: string, minute: number, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const hour = Math.floor(minute / 60);
  const localMinute = minute % 60;
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, localMinute, 0, 0);

  let candidate = new Date(wallClockAsUtc);
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = partsAt(candidate, timezone);
    const representedWallClock = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    candidate = new Date(candidate.getTime() + (wallClockAsUtc - representedWallClock));
  }
  return candidate;
}

export function weekdayForDate(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}
