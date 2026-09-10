import type { Metadata } from "next";

import { requireCustomer } from "@/lib/auth/customer";
import { AccountShell } from "@/components/account/AccountShell";
import { OrderProvider } from "@/components/order/OrderProvider";

export const metadata: Metadata = {
  title: "Your account | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function AccountAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCustomer();
  // OrderProvider wraps the account area too: the "Reorder" button rebuilds the
  // cart (same localStorage key as /order), so it must have the cart context.
  return (
    <OrderProvider>
      <AccountShell name={ctx.fullName}>{children}</AccountShell>
    </OrderProvider>
  );
}
