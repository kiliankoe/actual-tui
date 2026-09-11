/** Rows kept visible beyond the cursor before the window starts scrolling. */
const SCROLL_MARGIN = 3;

/**
 * Slice of a list that fits into `height` rows, scrolled just far enough to keep
 * `selected` at least `SCROLL_MARGIN` rows away from either edge. Pass the previous
 * `start` back in so the cursor can move inside a stationary window; deriving the
 * window from `selected` alone would pin the cursor to whichever edge it last hit.
 */
export function visibleRange({
  total,
  selected,
  height,
  start = 0,
}: {
  total: number;
  selected: number;
  height: number;
  start?: number;
}): { start: number; end: number } {
  if (total === 0 || height <= 0) return { start: 0, end: 0 };
  const maxStart = Math.max(0, total - height);
  // A short window cannot honour the full margin on both sides of the cursor.
  const margin = Math.min(SCROLL_MARGIN, Math.floor((height - 1) / 2));
  let next = Math.min(Math.max(0, start), maxStart);
  if (selected < next + margin) next = selected - margin;
  else if (selected > next + height - 1 - margin)
    next = selected - height + 1 + margin;
  next = Math.min(Math.max(0, next), maxStart);
  return { start: next, end: Math.min(total, next + height) };
}

/** Case-insensitive substring filter that ranks prefix matches first. */
export function filterByQuery<T>(
  items: readonly T[],
  query: string,
  label: (item: T) => string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...items];
  const prefix: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const haystack = label(item).toLowerCase();
    if (haystack.startsWith(needle)) prefix.push(item);
    else if (haystack.includes(needle)) rest.push(item);
  }
  return [...prefix, ...rest];
}

/** True when every whitespace-separated term of `query` occurs in `haystack`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const text = haystack.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term !== "")
    .every((term) => text.includes(term));
}
