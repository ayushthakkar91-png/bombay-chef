/**
 * Canonical public origin for SEO (schema, sitemap, canonical URLs, OG).
 * Uses NEXT_PUBLIC_SITE_URL when it's an explicit https origin (production);
 * otherwise falls back to the production domain — so dev/localhost never leaks
 * into structured data or the sitemap.
 */
const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
export const SITE_URL = env && env.startsWith("https://") ? env : "https://www.bombay-bicycle-chef.com";

/** Square brand logo (512×512 PNG) for Organization schema / Google. */
export const LOGO_URL = `${SITE_URL}/logo.png`;
