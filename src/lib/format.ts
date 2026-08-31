/**
 * Shared formatting + URL helpers. Single source of truth so these one-liners
 * aren't copy-pasted across dozens of files. Safe to import from both server and
 * client components (no server-only deps).
 */

/** Pence → "£12.34". */
export const money = (p: number) => `£${(p / 100).toFixed(2)}`;

/** The site's absolute origin, trailing slash trimmed. Falls back to localhost. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
