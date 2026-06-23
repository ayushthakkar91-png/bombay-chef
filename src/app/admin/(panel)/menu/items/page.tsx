import { requireRole } from "@/lib/auth/dal";
import { listCategories, listItems, listAllergens } from "@/lib/repositories/admin-menu";
import { PageHeader } from "@/components/admin/ui";
import { ItemsManager } from "@/components/admin/ItemsManager";

export default async function ItemsPage() {
  await requireRole("restaurant_manager");
  const [items, categories, allergens] = await Promise.all([
    listItems(),
    listCategories(),
    listAllergens(),
  ]);

  return (
    <>
      <PageHeader
        title="Dishes"
        description="Every dish on the menu — pricing, allergens, dietary tags, photos and availability."
      />
      <ItemsManager items={items} categories={categories} allergens={allergens} canManage />
    </>
  );
}
