import { requireRole } from "@/lib/auth/dal";
import { listDishCosting, listAllRecipes } from "@/lib/repositories/costing";
import { listItems } from "@/lib/repositories/inventory";
import { PageHeader, Stat } from "@/components/admin/ui";
import { CostingManager } from "@/components/admin/inventory/CostingManager";

export default async function CostingPage() {
  await requireRole("restaurant_manager");
  const [dishes, items, recipes] = await Promise.all([listDishCosting(), listItems(), listAllRecipes()]);

  const withPct = dishes.filter((d) => d.foodCostPct != null);
  const avgPct = withPct.length ? Math.round(withPct.reduce((s, d) => s + (d.foodCostPct ?? 0), 0) / withPct.length) : null;
  const withRecipe = dishes.filter((d) => d.hasRecipe).length;

  return (
    <>
      <PageHeader title="Costing" description="Food cost, margin and profit per dish — driven by recipes and ingredient costs." />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-lg sm:grid-cols-3">
        <Stat label="Avg food cost" value={avgPct == null ? "—" : `${avgPct}%`} />
        <Stat label="Dishes costed" value={`${withRecipe}/${dishes.length}`} />
        <Stat label="Ingredients" value={items.length} />
      </div>
      <CostingManager dishes={dishes} items={items} recipes={recipes} />
    </>
  );
}
