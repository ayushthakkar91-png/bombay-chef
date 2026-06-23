import Link from "next/link";

import { getOrderingMenu } from "@/lib/repositories/ordering-menu";
import { CheckoutForm } from "@/components/order/CheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  const menu = loc ? await getOrderingMenu(loc) : null;

  if (!menu) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Checkout unavailable</p>
        <Link href="/order" className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Start an order</Link>
      </main>
    );
  }

  return <CheckoutForm menu={menu} locationSlug={loc as string} />;
}
