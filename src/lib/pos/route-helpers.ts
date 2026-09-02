import { getServiceClient } from "@/lib/supabase/clients";

export async function locationOfOrder(orderId: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("orders").select("location_id").eq("id", orderId).maybeSingle();
  return data ? (data.location_id as string) : null;
}
