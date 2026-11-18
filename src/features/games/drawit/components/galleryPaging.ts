/** Drawings shown per gallery page: a fixed 4×2 grid. */
export const GALLERY_PAGE_SIZE = 8;

/** Number of pages for `count` items; never less than 1 so the counter reads "1/1" when empty. */
export function pageCount(count: number, pageSize = GALLERY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

/** Items on zero-based `page`, with `page` clamped into range. */
export function pageSlice<T>(items: readonly T[], page: number, pageSize = GALLERY_PAGE_SIZE): T[] {
  const last = pageCount(items.length, pageSize) - 1;
  const p = Math.min(Math.max(0, page), last);
  return items.slice(p * pageSize, (p + 1) * pageSize);
}
