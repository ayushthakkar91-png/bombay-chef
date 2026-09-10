import Link from "next/link";

import { getOrderingMenu } from "@/lib/repositories/ordering-menu";
import { isInternalOrdering } from "@/lib/ordering/routing";
import { getCustomer } from "@/lib/auth/customer";
import { listMyAddresses } from "@/lib/repositories/account";
import { CheckoutForm } from "@/components/order/CheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;
  // Only internal branches can reach checkout — an external/typed loc falls through
  // to the "unavailable" state below.
  const menu = loc && isInternalOrdering(loc) ? await getOrderingMenu(loc) : null;

  if (!menu) {
    return (
      <main className="min-h-screen bg-[#F6F2EA] pt-[120px] pb-24 px-6 text-center">
        <p className="font-serif text-[28px] text-[#2B221D] mb-3">Checkout unavailable</p>
        <Link href="/order" className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors">Start an order</Link>
      </main>
    );
  }

  // Quick checkout: a signed-in customer gets their contact details + default
  // delivery address prefilled, so they don't retype what we already hold.
  // Guests get the plain form plus a "sign in for faster checkout" prompt.
  const customer = await getCustomer();
  const addresses = customer ? await listMyAddresses(customer.userId) : [];
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  return (
    <CheckoutForm
      menu={menu}
      locationSlug={loc as string}
      signedIn={Boolean(customer)}
      initialContact={customer ? { name: customer.fullName ?? "", email: customer.email ?? "", phone: customer.phone ?? "" } : undefined}
      initialAddress={defaultAddr ? { line1: defaultAddr.line1, line2: defaultAddr.line2 ?? "", city: defaultAddr.city, postcode: defaultAddr.postcode } : undefined}
    />
  );
}
