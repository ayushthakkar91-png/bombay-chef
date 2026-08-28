import "server-only";

import { normalizePostcode } from "./postcode";

/**
 * UK postcode → coordinates via postcodes.io (free, no API key). Server-side
 * only, so no browser CSP applies. Used for radius-based delivery. A short
 * in-memory cache avoids re-hitting the API for the same postcode within a
 * process lifetime.
 */

export type LatLng = { lat: number; lng: number };

const cache = new Map<string, LatLng | null>();

export async function geocodePostcode(rawPostcode: string): Promise<LatLng | null> {
  const pc = normalizePostcode(rawPostcode);
  if (!pc) return null;
  if (cache.has(pc)) return cache.get(pc)!;

  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`, {
      // Postcode → coordinates is stable; let the platform cache it a day.
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      // 404 = not a real postcode → cache the negative so we don't retry it.
      if (res.status === 404) cache.set(pc, null);
      return null;
    }
    const body = (await res.json()) as { result?: { latitude?: number; longitude?: number } };
    const lat = body.result?.latitude;
    const lng = body.result?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") {
      cache.set(pc, null);
      return null;
    }
    const point = { lat, lng };
    cache.set(pc, point);
    return point;
  } catch {
    // Network/API error — signal "unknown" (caller decides how to degrade). Do
    // NOT cache, so a transient outage doesn't stick.
    return null;
  }
}

/** Great-circle distance in miles between two coordinates (haversine). */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const R = 3958.7613; // Earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
