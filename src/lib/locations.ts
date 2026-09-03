import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/** Active location id for a slug, or null. Shared by the customer order flow and
 *  the POS routes (was copy-pasted in three places). */
export async function locationIdFromSlug(slug: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("locations")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ? (data.id as string) : null;
}
