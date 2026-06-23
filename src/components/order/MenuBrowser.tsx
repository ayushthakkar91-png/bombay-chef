"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ShoppingBag, Flame } from "lucide-react";

import type { OrderingMenu, OrderMenuItem } from "@/lib/repositories/ordering-menu";
import { useOrder } from "./OrderProvider";
import { ItemModal } from "./ItemModal";
import { CartContents } from "./CartContents";

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

export function MenuBrowser({ menu, locationSlug, favouriteIds = [] }: { menu: OrderingMenu; locationSlug: string; favouriteIds?: string[] }) {
  const router = useRouter();
  const { fulfilment, lines, itemCount, setLocation, locationSlug: ctxSlug } = useOrder();
  const [modalItem, setModalItem] = useState<OrderMenuItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep the cart's location in sync with the URL (changing it clears the cart).
  useEffect(() => {
    if (ctxSlug !== locationSlug) setLocation(locationSlug);
  }, [ctxSlug, locationSlug, setLocation]);

  const subtotal = lines.reduce((s, l) => s + (l.basePence + l.modifiers.reduce((a, m) => a + m.pricePence, 0)) * l.qty, 0);
  const goCheckout = () => router.push(`/order/checkout?loc=${locationSlug}`);

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[92px] lg:pt-[104px] pb-28 lg:pb-12">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 border-b border-[#2A211C]/10 pb-5">
          <div>
            <h1 className="font-serif text-[34px] lg:text-[44px] text-[#2B221D] font-light leading-none">{menu.locationName}</h1>
            <p className="text-[#5A524B] text-[14px] font-sans mt-1.5 capitalize">
              {fulfilment} · ready in ~{fulfilment === "delivery" ? menu.prepTimeMin + menu.deliveryTimeMin : menu.prepTimeMin} min
            </p>
          </div>
          <Link href="/order" className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-sans hover:text-[#B08A3E] transition-colors">Change</Link>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
          {/* Menu */}
          <div>
            {menu.categories.map((cat) => (
              <section key={cat.id} className="mb-10">
                <h2 className="font-serif text-[26px] text-[#2B221D] mb-4">{cat.title}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setModalItem(item)}
                      className="text-left flex gap-3 p-4 bg-white/50 border border-[#2A211C]/10 hover:border-[#B08A3E]/50 transition-colors duration-300"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-serif text-[18px] text-[#2B221D]">{item.name}</h3>
                          {item.spiceLevel ? <Flame className="h-3.5 w-3.5 text-[#5D0925]" /> : null}
                        </div>
                        {item.description && <p className="text-[#5A524B] text-[13px] font-sans line-clamp-2 mt-1">{item.description}</p>}
                        <p className="text-[#2B221D] font-sans text-[15px] mt-2">{money(item.pricePence)}</p>
                      </div>
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Sticky cart (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[104px] bg-white border border-[#2A211C]/10 p-6">
              <h2 className="font-serif text-[22px] text-[#2B221D] mb-3">Your basket</h2>
              <CartContents menu={menu} locationSlug={locationSlug} onCheckout={goCheckout} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bottom bar */}
      {itemCount > 0 && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#2B221D] text-[#F6F2EA] flex items-center justify-between px-5 py-4"
        >
          <span className="flex items-center gap-2.5 text-[14px] font-sans">
            <ShoppingBag className="h-5 w-5" />
            <span className="bg-[#B08A3E] text-[#2A211C] rounded-full px-2 py-0.5 text-[12px] font-semibold">{itemCount}</span>
            View basket
          </span>
          <span className="font-sans text-[15px] tabular-nums">{money(subtotal)}</span>
        </button>
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
