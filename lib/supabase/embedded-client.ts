/** PostgREST may return a to-one embed as T or T[] depending on types; normalize to one row. */
export function unwrapEmbeddedOne<T>(row: T | T[] | null | undefined): T | null {
  if (row == null) {
    return null;
  }
  return Array.isArray(row) ? (row[0] ?? null) : row;
}
