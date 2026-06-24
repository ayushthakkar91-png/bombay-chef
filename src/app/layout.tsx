import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/Schema";
import { SITE_URL } from "@/lib/site";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bombay Bicycle Chef | Modern Indian Restaurant in London",
    template: "%s",
  },
  description: "Modern Indian dining inspired by Bombay, made for London. Reserve a table, view the menu, or order online from Bombay Bicycle Chef.",
  keywords: ["Bombay Bicycle Chef", "Indian restaurant London", "Indian restaurant Balham", "Indian takeaway London", "Indian food delivery London", "modern Indian restaurant", "book a table Indian restaurant"],
  applicationName: "Bombay Bicycle Chef",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    siteName: "Bombay Bicycle Chef",
    type: "website",
    locale: "en_GB",
    images: [{ url: "/images/hero/hero-bg.jpg", width: 1200, height: 630, alt: "Bombay Bicycle Chef" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F5F0E6]">
        <OrganizationSchema />
        <WebSiteSchema />
        {/* Public marketing chrome (smooth scroll, grain, navbar, footer) wraps
            every route except /admin, which renders on a bare canvas. The public
            site is unchanged. */}
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
