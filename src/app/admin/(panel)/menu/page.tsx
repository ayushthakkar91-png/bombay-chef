import Link from "next/link";
import { FolderTree, ListOrdered, ToggleRight, ArrowRight } from "lucide-react";

import { getStaffContext, can } from "@/lib/auth/dal";
import { listCategories, listItems } from "@/lib/repositories/admin-menu";
import { PageHeader } from "@/components/admin/ui";

export default async function MenuOverviewPage() {
  const [ctx, categories, items] = await Promise.all([
    getStaffContext(),
    listCategories(),
    listItems(),
  ]);

  const isManager = ctx ? can(ctx, "restaurant_manager") : false;

  const cards = [
    {
      href: "/admin/menu/items",
      icon: ListOrdered,
      title: "Dishes",
      detail: `${items.length} dishes across ${categories.length} categories`,
      show: isManager,
    },
    {
      href: "/admin/menu/categories",
      icon: FolderTree,
      title: "Categories",
      detail: `${categories.length} menu sections`,
      show: isManager,
    },
    {
      href: "/admin/menu/availability",
      icon: ToggleRight,
      title: "Branch availability",
      detail: "Turn dishes on or off per location",
      show: true,
    },
  ].filter((c) => c.show);

  return (
    <>
      <PageHeader title="Menu" description="The single source of truth for what every branch serves." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-3 rounded-lg border border-sand bg-surface p-5 transition-colors hover:border-brass/50 hover:bg-bg/30"
            >
              <Icon className="h-6 w-6 text-brass" strokeWidth={1.5} />
              <div>
                <p className="flex items-center gap-1.5 font-medium text-text">
                  {c.title}
                  <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </p>
                <p className="mt-0.5 text-sm text-body">{c.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
