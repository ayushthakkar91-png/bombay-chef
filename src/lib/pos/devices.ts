import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

export async function registerDevice(params: {
  fcmToken: string;
  locationId: string;
  profileId: string;
  deviceName?: string;
  deviceModel?: string;
}): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase || !params.fcmToken) return false;
  const { error } = await supabase.from("pos_devices").upsert(
    {
      fcm_token: params.fcmToken,
      location_id: params.locationId,
      profile_id: params.profileId,
      device_name: params.deviceName ?? null,
      device_model: params.deviceModel ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "fcm_token" },
  );
  return !error;
}
