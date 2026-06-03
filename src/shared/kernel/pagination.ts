/**
 * Builds the standard CareFollow paginated list response.
 * Frontend contract (docs.md):
 *   result.items       – array of records
 *   result.total       – same as totalCount
 *   result.totalCount  – total matching records
 *   result.page        – current page
 *   result.limit       – page size
 *   result.loadMoreAble – true when more pages exist
 *
 * Also mirrors legacy top-level keys that some FE pages still read:
 *   total, totalCount, recordsTotal, recordsFiltered
 */
export interface PagedResult<T> {
  items: T[];
  loadMoreAble: boolean;
  total: number;
  totalCount: number;
  page: number;
  limit: number;
}

export function buildPagedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PagedResult<T> {
  return {
    items,
    loadMoreAble: page * limit < total,
    total,
    totalCount: total,
    page,
    limit,
  };
}

export function parsePage(raw: string | number | undefined, defaultVal = 1): number {
  const v = Number(raw ?? defaultVal);
  return Number.isFinite(v) && v > 0 ? v : defaultVal;
}

export function parseLimit(raw: string | number | undefined, defaultVal = 20): number {
  const v = Number(raw ?? defaultVal);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 500) : defaultVal;
}
