/** Slice of a list that fits into `height` rows while keeping `selected` visible. */
export function visibleRange({
  total,
  selected,
  height,
}: {
  total: number;
  selected: number;
  height: number;
}): { start: number; end: number } {
  if (total === 0 || height <= 0) return { start: 0, end: 0 };
  const maxStart = Math.max(0, total - height);
  const start = Math.min(Math.max(0, selected - height + 1), maxStart);
  return { start, end: Math.min(total, start + height) };
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
