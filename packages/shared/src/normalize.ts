/**
 * M4 invariant 1: this is THE function that computes `employees.name_normalized`. Both the
 * admin directory-create path (M2) and the inline resolve-or-create path (M4) MUST call it,
 * so the unique index and every lookup agree. One function, one place — if they diverge,
 * inline creation starts producing the duplicates it exists to prevent.
 *
 * lowercase → trim → collapse internal whitespace.
 *   "Juan Dela Cruz", "juan dela cruz", "Juan  Dela  Cruz" → "juan dela cruz"
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
