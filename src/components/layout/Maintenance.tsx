/**
 * Public-site holding screen shown when NEXT_PUBLIC_SITE_ENABLED=false.
 * On-brand, dark + gold. The /admin panel is unaffected (gated upstream in
 * PublicChrome), so staff can keep working while this is up.
 */
export function Maintenance() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#1A130D] px-6 py-16 text-center selection:bg-[#C8A96B] selection:text-[#1A130D]">
      {/* Brand mark */}
      <div
        aria-hidden
        className="mb-10 h-[64px] w-[54px] bg-[#C8A96B]"
        style={{
          WebkitMaskImage: "url('/images/brand/logo.svg')",
          maskImage: "url('/images/brand/logo.svg')",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />

      <p className="mb-6 font-sans text-[11px] uppercase tracking-[0.35em] text-[#C8A96B]">
        Bombay Bicycle Chef · London
      </p>

      <h1 className="max-w-[14ch] font-serif text-[40px] font-light leading-[1.12] text-[#F5F0E6] md:text-[60px]">
        We&rsquo;ll Be Right Back
      </h1>

      <p className="mt-6 max-w-[440px] font-sans text-[15px] leading-[1.9] text-[#F5F0E6]/70">
        Our website is being polished. We&rsquo;re still cooking — please call the restaurant to order or reserve in the meantime.
      </p>

      <div className="mt-12 flex flex-col items-center gap-4 font-sans text-[13px] tracking-[0.05em] text-[#F5F0E6]/80">
        <a href="tel:+442087723222" className="transition-colors hover:text-[#C8A96B]">
          Balham &middot; 020 8772 3222
        </a>
        <a href="mailto:hello@bombay-bicycle-chef.com" className="transition-colors hover:text-[#C8A96B]">
          hello@bombay-bicycle-chef.com
        </a>
      </div>
    </main>
  );
}
