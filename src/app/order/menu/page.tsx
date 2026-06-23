import { redirect } from "next/navigation";
import Link from "next/link";

import { getOrderingMenu, getOrderLocations } from "@/lib/repositories/ordering-menu";
import { getCustomer } from "@/lib/auth/customer";
import { getMyFavouriteIds } from "@/lib/repositories/account";
import { MenuBrowser } from "@/components/order/MenuBrowser";

export default async function OrderMenuPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const { loc } = await searchParams;

  // Resolve branches once (lightweight) so we can default + drive the location switcher.
  const orderable = (await getOrderLocations()).filter((l) => l.collectionEnabled || l.deliveryEnabled);
  if (orderable.length === 0) redirect("/order"); // single hop → /order shows the unavailable state
  const slug = orderable.find((l) => l.slug === loc)?.slug ?? orderable[0].slug;

  const [menu, customer] = await Promise.all([getOrderingMenu(slug), getCustomer()]);

  // Branch is online but its menu isn't ready — render inline (never redirect, to
  // avoid an /order ⇄ /order/menu loop).
  if (!menu) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] px-6 pb-24 pt-[120px] text-center">
        <p className="mb-3 font-serif text-[28px] text-[#2B221D]">Menu coming soon</p>
        <p className="mb-8 font-sans text-[15px] text-[#5A524B]">This kitchen&apos;s online menu isn&apos;t available just yet.</p>
        <Link href="/contact" className="inline-flex h-[52px] items-center justify-center bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]">Contact the restaurant</Link>
      </main>
    );
  }

  const favouriteIds = customer ? await getMyFavouriteIds(customer.userId) : [];
  const branches = orderable.map((l) => ({ slug: l.slug, name: l.name }));

  return <MenuBrowser menu={menu} locationSlug={slug} branches={branches} favouriteIds={favouriteIds} />;
}
