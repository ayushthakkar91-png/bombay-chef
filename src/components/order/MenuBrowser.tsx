"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Flame } from "lucide-react";

import type { OrderingMenu, OrderMenuItem } from "@/lib/repositories/ordering-menu";
import { useOrder } from "./OrderProvider";
import { ItemModal } from "./ItemModal";
import { CartContents } from "./CartContents";
import { OrderBar } from "./OrderBar";
import { MenuCategoryNav } from "./MenuCategoryNav";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export function MenuBrowser({ menu, locationSlug, branches = [], favouriteIds = [] }: { menu: OrderingMenu; locationSlug: string; branches?: { slug: string; name: string }[]; favouriteIds?: string[] }) {
  const router = useRouter();
  const { lines, itemCount, setLocation, locationSlug: ctxSlug } = useOrder();
  const [modalItem, setModalItem] = useState<OrderMenuItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep the cart's location in sync with the URL (changing it clears the cart).
  useEffect(() => {
    if (ctxSlug !== locationSlug) setLocation(locationSlug);
  }, [ctxSlug, locationSlug, setLocation]);

  const subtotal = lines.reduce((s, l) => s + (l.basePence + l.modifiers.reduce((a, m) => a + m.pricePence, 0)) * l.qty, 0);
  const goCheckout = () => router.push(`/order/checkout?loc=${locationSlug}`);

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[84px] pb-28 lg:pt-[88px] lg:pb-12">
      <OrderBar menu={menu} branches={branches} locationSlug={locationSlug} />
      <MenuCategoryNav categories={menu.categories.map((c) => ({ id: c.id, title: c.title }))} />
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 pt-6 lg:pt-7">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
          {/* Menu */}
          <div>
            {menu.categories.map((cat) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="mb-10 scroll-mt-[140px] lg:scroll-mt-0">
                <h2 className="mb-4 font-serif text-[24px] text-[#2B221D] sm:text-[26px]">{cat.title}</h2>
                {/* Phones: a typography-first divided list. Tablet/desktop keep the card grid (unchanged). */}
                <div className="divide-y divide-[#2A211C]/10 sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setModalItem(item)}
                      className="flex w-full items-start gap-4 py-5 text-left transition-colors duration-300 sm:gap-3 sm:border sm:border-[#2A211C]/10 sm:bg-white/50 sm:p-4 sm:py-4 sm:hover:border-[#B08A3E]/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-serif text-[17px] text-[#2B221D] sm:text-[18px]">{item.name}</h3>
                          {item.spiceLevel ? <Flame className="h-3.5 w-3.5 shrink-0 text-[#5D0925]" /> : null}
                        </div>
                        {item.description && <p className="mt-1 line-clamp-2 font-sans text-[13px] leading-relaxed text-[#5A524B]">{item.description}</p>}
                        <p className="mt-2 font-sans text-[15px] tracking-wide text-[#2B221D]">{money(item.pricePence)}</p>
                      </div>
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="h-[68px] w-[68px] shrink-0 object-cover sm:h-20 sm:w-20" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Sticky cart (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[164px] bg-white border border-[#2A211C]/10 p-6">
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Your basket</h2>
              <CartContents menu={menu} locationSlug={locationSlug} onCheckout={goCheckout} />
            </div>
          </aside>
        </div>
      </div>

      {/* Persistent bottom cart bar (mobile) — edge-to-edge, one-handed, safe-area aware */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#B08A3E]/30 bg-[#2B221D] pb-[env(safe-area-inset-bottom)] lg:hidden">
          <button onClick={() => setDrawerOpen(true)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-[#F6F2EA] active:bg-[#5D0925]">
            <span className="flex items-center gap-2.5 font-sans text-[14px] tracking-[0.05em]">
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#B08A3E] px-1.5 text-[12px] font-semibold text-[#2A211C]">{itemCount}</span>
              View basket
            </span>
            <span className="font-serif text-[19px] tabular-nums">{money(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto bg-[#F6F2EA] p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-[24px] text-[#2B221D]">Your basket</h2>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close"><X className="h-6 w-6 text-[#2B221D]" /></button>
            </div>
            <CartContents menu={menu} locationSlug={locationSlug} onCheckout={goCheckout} />
          </div>
        </div>
      )}

      {modalItem && <ItemModal item={modalItem} onClose={() => setModalItem(null)} isFavourite={favouriteIds.includes(modalItem.id)} />}
    </main>
  );
}
