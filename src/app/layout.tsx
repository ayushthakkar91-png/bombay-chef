import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { OrganizationSchema } from "@/components/seo/Schema";

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
  metadataBase: new URL("https://www.bombaybicyclechef.uk"),
  title: {
    default: "Bombay Bicycle Chef | Modern Indian Restaurant in London",
    template: "%s",
  },
  description: "Inspired by the flavours, memories and gathering places of old Bombay, reimagined for modern London dining. Dine-in, collection and delivery across Balham, Battersea and Kilburn.",
  keywords: ["Bombay Bicycle Chef", "Indian restaurant London", "Indian restaurant Balham", "Indian takeaway London", "Indian food delivery London", "modern Indian restaurant", "book a table Indian restaurant"],
  applicationName: "Bombay Bicycle Chef",
  openGraph: {
    siteName: "Bombay Bicycle Chef",
    type: "website",
    locale: "en_GB",
    images: [{ url: "/images/hero/hero-bg.png", width: 1200, height: 630, alt: "Bombay Bicycle Chef" }],
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
        {/* Public marketing chrome (smooth scroll, grain, navbar, footer) wraps
            every route except /admin, which renders on a bare canvas. The public
            site is unchanged. */}
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
