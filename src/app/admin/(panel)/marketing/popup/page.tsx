import { getStaffContext, can } from "@/lib/auth/dal";
import { getEventPopup } from "@/lib/repositories/marketing-popup";
import { PageHeader } from "@/components/admin/ui";
import { PopupManager } from "@/components/admin/PopupManager";

export default async function OffersPopupPage() {
  const [ctx, config] = await Promise.all([getStaffContext(), getEventPopup()]);
  const canManage = ctx ? can(ctx, "restaurant_manager") : false;

  return (
    <>
      <PageHeader
        title="Offers Popup"
        description="The promotional pop-up shown to guests on the homepage. Change the text, percentage and an optional image."
      />
      <PopupManager config={config} canManage={canManage} />
    </>
  );
}
