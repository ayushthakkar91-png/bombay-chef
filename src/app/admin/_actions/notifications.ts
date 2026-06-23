"use server";

import { requireStaff } from "@/lib/auth/dal";
import { listRecentActivity, type ActivityItem } from "@/lib/repositories/dashboard";

/** Recent notifications for the header bell. Staff-gated, read-only. */
export async function getNotifications(): Promise<ActivityItem[]> {
  await requireStaff();
  return listRecentActivity(Date.now(), 15);
}
