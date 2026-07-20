import { Buffer } from 'buffer';

export interface OffsetPage<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function toOffsetPage<T>(
  rows: T[],
  total: number,
  page: number,
  limit: number,
): OffsetPage<T> {
  return {
    data: rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

interface CursorPayload {
  v: string;
  id: string;
}

/** Opaque cursor: base64url({v: sort-value, id: tiebreaker id}). Never a raw DB column/offset. */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof parsed?.v === 'string' && typeof parsed?.id === 'string') {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export interface CursorPage<T> {
  data: T[];
  meta: { nextCursor: string | null; limit: number };
}

export function toCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  sortValueOf: (row: T) => string,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ v: sortValueOf(last), id: last.id }) : null;
  return { data: page, meta: { nextCursor, limit } };
}
