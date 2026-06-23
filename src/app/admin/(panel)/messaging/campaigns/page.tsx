import { requireRole } from "@/lib/auth/dal";
import { listCampaigns, getConsentStats } from "@/lib/repositories/messaging";
import { PageHeader } from "@/components/admin/ui";
import { CampaignsManager } from "@/components/admin/messaging/CampaignsManager";

export default async function CampaignsPage() {
  await requireRole("restaurant_manager");
  const [campaigns, consent] = await Promise.all([listCampaigns(), getConsentStats()]);
  return (
    <>
      <PageHeader title="Campaigns" description={`Marketing SMS/WhatsApp — ${consent.marketing} recipients have marketing consent.`} />
      <CampaignsManager campaigns={campaigns} />
    </>
  );
}
