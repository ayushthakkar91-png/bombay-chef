import { requireRole } from "@/lib/auth/dal";
import { listCategories } from "@/lib/repositories/admin-menu";
import { PageHeader } from "@/components/admin/ui";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export default async function CategoriesPage() {
  await requireRole("restaurant_manager");
  const categories = await listCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        description="The sections that organise your menu. Order them, rename them, or add new ones."
      />
      <CategoriesManager categories={categories} canManage />
    </>
  );
}
