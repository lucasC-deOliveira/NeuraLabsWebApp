/**
 * Canonicalizes an email for storage and lookup: trims surrounding whitespace
 * and lowercases it, so 'Foo@Bar.com ' and 'foo@bar.com' map to one account.
 * @example normalizeEmail('  Foo@Bar.COM ') // 'foo@bar.com'
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
