import type { Metadata } from "next";

import { flags } from "@/lib/flags";
import { NewsletterForm } from "@/components/marketing/NewsletterForm";

export const metadata: Metadata = {
  title: "Newsletter | Bombay Bicycle Chef",
  description: "News, new dishes and the occasional treat from the kitchens of Bombay Bicycle Chef.",
};

export default function NewsletterPage() {
  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[104px] lg:pt-[120px] pb-24 px-6">
      <div className="max-w-[640px] mx-auto">
        <div className="text-center mb-10">
          <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-3">Stay in Touch</p>
          <h1 className="font-serif text-[40px] lg:text-[52px] text-[#2B221D] font-light leading-[1.1]">Our Newsletter</h1>
          <p className="text-[#5A524B] font-sans text-[15px] mt-3">Stories from the kitchen, new dishes, and a few things worth coming in for.</p>
        </div>
        <div className="bg-white border border-[#2A211C]/10 p-7">
          {flags.marketing ? (
            <NewsletterForm />
          ) : (
            <p className="text-[#5A524B] font-sans text-[15px] text-center">Our newsletter is opening soon — please check back.</p>
          )}
        </div>
      </div>
    </main>
  );
}
