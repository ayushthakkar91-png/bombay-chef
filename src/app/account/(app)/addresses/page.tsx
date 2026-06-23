import { requireCustomer } from "@/lib/auth/customer";
import { listMyAddresses } from "@/lib/repositories/account";
import { AddressManager } from "@/components/account/AddressManager";

export default async function AccountAddressesPage() {
  const ctx = await requireCustomer();
  const addresses = await listMyAddresses(ctx.userId);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[#5A524B] font-sans text-[15px]">Saved addresses speed up delivery checkout.</p>
      <AddressManager addresses={addresses} />
    </div>
  );
}
