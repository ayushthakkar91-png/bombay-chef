import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bombay Bicycle Chef | Modern Indian Kitchen",
  description: "Inspired by the flavours, memories and gathering places of old Bombay, reimagined for modern London dining.",
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
        {/* Global Atmosphere: Cinematic Grain & Depth */}
        <div className="pointer-events-none fixed inset-0 z-[100] opacity-[0.05] mix-blend-multiply">
          <svg className="w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>
        <div className="pointer-events-none fixed inset-0 z-[90] bg-[radial-gradient(circle_at_top_right,rgba(168,132,66,0.06),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(93,9,37,0.04),transparent_50%)]" />

        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
