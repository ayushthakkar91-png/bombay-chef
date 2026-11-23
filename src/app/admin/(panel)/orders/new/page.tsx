import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { getOrderingMenu } from "@/lib/repositories/ordering-menu";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { PhoneOrderForm } from "@/components/admin/orders/PhoneOrderForm";

/**
 * Take an order over the phone.
 *
 * One screen, built for somebody with a caller waiting: phone number first
 * (so a returning customer's name and address fill themselves in), then what
 * they want, then how they will pay. The order prints on the till like any
 * other, with the day's number, within a few seconds of "Place order".
 */
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (<><PageHeader title="New order" /><p className="text-sm text-body">No locations are assigned to your account yet.</p></>);
  }
  const location = scoped.find((l) => l.slug === sp.loc || l.id === sp.loc) ?? scoped[0];
  const menu = await getOrderingMenu(location.slug);

  return (
    <>
      <PageHeader
        title="New order"
        description={`Taken over the phone or at the counter, for ${location.name}. Prints on the till like any other order.`}
        actions={<LocationSwitcher locations={scoped} current={location.id} />}
      />
      {menu ? (
        <PhoneOrderForm
          location={{ id: location.id, slug: location.slug, name: location.name, deliveryEnabled: location.deliveryEnabled, collectionEnabled: location.collectionEnabled }}
          menu={menu}
          takenBy={ctx.fullName ?? ctx.email ?? "staff"}
        />
      ) : (
        <p className="text-sm text-body">The menu for {location.name} could not be loaded.</p>
      )}
    </>
  );
}
