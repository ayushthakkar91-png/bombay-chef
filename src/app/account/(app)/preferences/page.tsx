import { requireCustomer } from "@/lib/auth/customer";
import { PreferencesForm } from "@/components/account/PreferencesForm";

export default async function AccountPreferencesPage() {
  const ctx = await requireCustomer();
  return (
    <PreferencesForm
      email={ctx.email}
      fullName={ctx.fullName}
      phone={ctx.phone}
      birthday={ctx.birthday}
      marketingEmail={ctx.marketingEmail}
      marketingSms={ctx.marketingSms}
    />
  );
}
