import type { NextConfig } from "next";

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
};

export default nextConfig;
