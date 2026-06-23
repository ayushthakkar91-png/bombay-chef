import { Star } from "lucide-react";

/** Compact Google-reviews trust band — sits right after the hero. */
export function GoogleReviews() {
  return (
    <section className="border-b border-[#2A211C]/8 bg-[#F5F0E6] px-6 py-10 lg:py-12">
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-[#B08A3E] text-[#B08A3E]" strokeWidth={0} />
            ))}
          </div>
          <span className="font-serif text-[22px] text-[#2B221D]">4.8<span className="ml-0.5 text-[15px] text-[#5A524B]">/5</span></span>
        </div>

        <p className="max-w-xl font-serif text-[22px] font-light italic leading-snug text-[#2B221D] lg:text-[26px]">
          &ldquo;Best Indian food in South London&rdquo;
        </p>

        <div className="flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.18em] text-[#5A524B]">
          <GoogleG /> Google Reviews
        </div>
      </div>
    </section>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}
