import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Only Supabase (auth/REST/realtime) and Stripe run in
 * the browser; Brevo/Twilio/Anthropic/Facebook are all server-side, so they are
 * deliberately NOT in connect-src. next/font self-hosts fonts (no Google Fonts).
 *
 * Documented relaxations:
 *   - script-src 'unsafe-inline': Next.js ships inline bootstrap scripts and we
 *     don't run a nonce strategy. 'unsafe-eval' is added in dev only (HMR).
 *   - style-src 'unsafe-inline': Tailwind + Framer Motion inject inline styles.
 *   - img-src https:: allows any HTTPS image (Unsplash, Supabase Storage, review
 *     avatars). Images are low-risk; tighten to specific hosts later if desired.
 *   - frame-src google maps: in case a "Get directions" map is ever embedded.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://maps.google.com https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  images: {
    // AVIF first (≈20% smaller than WebP), WebP fallback. Next re-encodes the
    // source PNG on delivery, so the hero LCP image is never shipped as PNG.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
