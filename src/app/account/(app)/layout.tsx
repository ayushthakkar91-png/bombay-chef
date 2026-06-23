import type { Metadata } from "next";

import { requireCustomer } from "@/lib/auth/customer";
import { AccountShell } from "@/components/account/AccountShell";

export const metadata: Metadata = {
  title: "Your account | Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function AccountAppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCustomer();
  return <AccountShell name={ctx.fullName}>{children}</AccountShell>;
}
