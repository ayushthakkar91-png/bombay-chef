import { requireRole } from "@/lib/auth/dal";
import { listPromos } from "@/lib/repositories/admin-marketing";
import { PageHeader } from "@/components/admin/ui";
import { Promotions } from "@/components/admin/marketing/Promotions";

export default async function PromotionsPage() {
  await requireRole("restaurant_manager");
  const promos = await listPromos();
  return (
    <>
      <PageHeader title="Promotions" description="Public discount codes for the ordering checkout. (Loyalty vouchers are managed automatically.)" />
      <Promotions promos={promos} />
    </>
  );
}
