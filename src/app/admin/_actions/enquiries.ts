"use server";

import { revalidatePath } from "next/cache";

import { getStaffContext } from "@/lib/auth/dal";
import { setEnquiryHandled } from "@/lib/repositories/enquiries";

/** Mark a contact enquiry handled / reopen it. Any signed-in staff member. */
export async function markEnquiryHandled(id: string, handled: boolean): Promise<{ ok: boolean }> {
  const ctx = await getStaffContext();
  if (!ctx) return { ok: false };
  const ok = await setEnquiryHandled(id, handled);
  if (ok) revalidatePath("/admin/enquiries");
  return { ok };
}
