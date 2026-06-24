"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-only sticky category rail. Scroll-spy highlights the section in view;
 * tapping smooth-scrolls to it. Hidden on lg+ (desktop layout is unchanged).
 */
export function MenuCategoryNav({ categories }: { categories: { id: string; title: string }[] }) {
  const [active, setActive] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace("cat-", ""));
      },
      { rootMargin: "-150px 0px -65% 0px", threshold: 0 },
    );
    for (const c of categories) {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [categories]);

  const go = (id: string) => {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  if (categories.length < 2) return null;

  return (
    <nav className="sticky top-[84px] z-20 border-b border-[#2A211C]/8 bg-[#F6F2EA]/95 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto px-5 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => go(c.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 font-sans text-[12px] uppercase tracking-[0.1em] transition-colors ${
              active === c.id ? "bg-[#5D0925] text-[#F6F2EA]" : "border border-[#2A211C]/15 text-[#5A524B]"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
    </nav>
  );
}
