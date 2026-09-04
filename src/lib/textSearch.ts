/** Token search shared by the provider inbox, order history and workspace lists, so the same
 *  query behaves identically on every staff screen. */

/** Lowercase, collapse runs of whitespace, trim. Safe for null/undefined. */
export function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when every token appears somewhere in the haystack (AND search, order-independent). */
export function includesAll(haystack: string, tokens: string[]): boolean {
  const h = norm(haystack)
  return tokens.every((t) => h.includes(t))
}
