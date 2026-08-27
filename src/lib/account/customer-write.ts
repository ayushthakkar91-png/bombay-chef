import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/**
 * Apply a customer's edit to their OWN `customers` row via the service role, with
 * a hard column allowlist.
 *
 * Since migration 0021, `customers` is self-READ only under RLS (F2), so a
 * customer's JWT can no longer UPDATE the row directly through PostgREST. The two
 * fields a customer legitimately controls are written here instead. Every
 * system/CRM column — lifetime_value_pence, orders_count, tags,
 * stripe_customer_id, last_order_at, loyalty_opt_in, id — is rejected by being
 * absent from the allowlist, so it can never be set through this path even if a
 * caller passes it.
 *
 * The caller MUST have already authenticated the customer (requireCustomer) and
 * pass that verified userId — never a client-supplied id.
 */
export type OwnCustomerFields = {
  birthday?: string | null;
  default_address_id?: string | null;
};

const ALLOWED_FIELDS = ["birthday", "default_address_id"] as const;

export async function patchOwnCustomer(userId: string, fields: OwnCustomerFields): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) patch[key] = fields[key];
  }
  if (Object.keys(patch).length === 0) return;

  await supabase.from("customers").update(patch).eq("id", userId);
}
