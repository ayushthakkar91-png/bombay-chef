import { redirect } from "next/navigation";

import { flags } from "@/lib/flags";
import { requirePlatformAdmin } from "@/lib/saas/tenancy";
import { PlatformShell } from "@/components/platform/PlatformShell";

// Never prerender these at build time. The pages under here query tables that
// only exist once the platform migration (0017) is run; with the feature off,
// every Vercel build was logging "column locations.tenant_id does not exist"
// four times over, once per static page, for a console nobody can open.
export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  if (!flags.platform) redirect("/admin"); // SaaS platform disabled
  const ctx = await requirePlatformAdmin();
  return <PlatformShell email={ctx.email}>{children}</PlatformShell>;
}
