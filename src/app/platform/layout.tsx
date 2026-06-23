import { redirect } from "next/navigation";

import { flags } from "@/lib/flags";
import { requirePlatformAdmin } from "@/lib/saas/tenancy";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!flags.platform) redirect("/admin"); // SaaS platform disabled
  const ctx = await requirePlatformAdmin();
  return <PlatformShell email={ctx.email}>{children}</PlatformShell>;
}
