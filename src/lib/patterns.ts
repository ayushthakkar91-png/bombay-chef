/**
 * Shared validation patterns + limits. Single source of truth so the same rule
 * can't drift across the many server actions that validate the same inputs.
 */

/** Loose email shape check (real deliverability is enforced by the provider). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ISO calendar date, YYYY-MM-DD. */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Largest party size accepted for an online reservation. */
export const MAX_PARTY = 12;
