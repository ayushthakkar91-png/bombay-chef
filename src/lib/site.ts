/**
 * Canonical public origin for SEO (schema, sitemap, canonical URLs, OG).
 * Uses NEXT_PUBLIC_SITE_URL when it's an explicit https origin (production);
 * otherwise falls back to the production domain — so dev/localhost never leaks
 * into structured data or the sitemap.
 */
const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
export const SITE_URL = env && env.startsWith("https://") ? env : "https://www.bombay-bicycle-chef.com";

/** Square brand logo for Organization schema. A placeholder lives at
 *  /public/logo.svg — drop in a real square PNG (≥112px) and point this at it. */
export const LOGO_URL = `${SITE_URL}/logo.svg`;
