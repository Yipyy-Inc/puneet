/**
 * Deterministic pseudo-geocoded coordinates for clients. The mock client data
 * stores only postal addresses, so for the service-area map view we derive a
 * stable [lat, lng] from the client id. Real deployments would geocode the
 * street address; this keeps the demo map populated without a geocoder.
 *
 * Pins are clustered loosely around the Los Angeles bounding box so they
 * visually correlate with the demo ZIP polygons used elsewhere.
 */

import type { Client } from "@/types/client";

const LA_CENTER_LAT = 34.05;
const LA_CENTER_LNG = -118.34;
const LAT_SPREAD = 0.18; // ~20 km north-south
const LNG_SPREAD = 0.32; // ~30 km east-west

function hashId(id: string | number): number {
  const s = String(id);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Map a client to a stable demo [lat, lng]. The same client always returns
 * the same coordinates so pins don't jitter across renders.
 */
export function clientLatLng(client: Client): [number, number] {
  const h = hashId(client.id);
  // Two independent components from the same hash for lat / lng.
  const u1 = (h % 10000) / 10000; // 0..1
  const u2 = ((h >>> 16) % 10000) / 10000; // 0..1
  const lat = LA_CENTER_LAT + (u1 - 0.5) * LAT_SPREAD;
  const lng = LA_CENTER_LNG + (u2 - 0.5) * LNG_SPREAD;
  return [lat, lng];
}
