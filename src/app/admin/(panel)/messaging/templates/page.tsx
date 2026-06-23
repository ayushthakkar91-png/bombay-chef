import { requireRole } from "@/lib/auth/dal";
import { listTemplates } from "@/lib/repositories/messaging";
import { PageHeader } from "@/components/admin/ui";
import { TemplatesManager } from "@/components/admin/messaging/TemplatesManager";

export default async function TemplatesPage() {
  await requireRole("restaurant_manager");
  const templates = await listTemplates();
  return (
    <>
      <PageHeader title="Templates" description="Reservation, order and marketing message templates. Use {{placeholders}}." />
      <TemplatesManager templates={templates} />
    </>
  );
}
