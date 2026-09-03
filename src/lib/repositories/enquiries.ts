import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/** Contact-form enquiries. Service client throughout (no public RLS policy). */
export type Enquiry = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  handled: boolean;
  createdAt: string;
};

export async function createEnquiry(input: {
  name: string;
  email: string;
  subject: string | null;
  message: string;
}): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from("contact_enquiries").insert({
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
  });
  return !error;
}

export async function listEnquiries(limit = 100): Promise<Enquiry[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("contact_enquiries")
    .select("id, name, email, subject, message, handled, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Record<string, unknown>[] | null ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    email: r.email as string,
    subject: (r.subject as string | null) ?? null,
    message: r.message as string,
    handled: (r.handled as boolean) ?? false,
    createdAt: r.created_at as string,
  }));
}

export async function setEnquiryHandled(id: string, handled: boolean): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from("contact_enquiries").update({ handled }).eq("id", id);
  return !error;
}
