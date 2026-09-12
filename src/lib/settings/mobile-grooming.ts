import { z } from "zod";

import {
  mobileGroomingVanSchema,
  serviceAreaSchema,
  staffServiceAreaScheduleSchema,
  travelZoneSchema,
  type MobileGroomingVan,
  type ServiceArea,
  type StaffServiceAreaSchedule,
  type TravelZone,
} from "@/types/grooming";

// ============================================================================
// Mobile grooming, as the facility's own setting (2026-09-12).
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `useMobileGrooming()` kept all of this in the browser's localStorage, seeded
// with two invented vans, two Montréal service areas, three travel zones and a
// week of area schedules for staff from a fixture. So every facility's
// booking form offered a van visit priced with those zones, the calendar drew
// van columns nobody had set up, and what one person configured reached no
// other device and no customer.
//
// ── ONE DOMAIN ────────────────────────────────────────────────────────────
//
// The switch, the arrival window, vans, service areas, travel zones and the
// per-groomer area schedules are one feature and are read together. Writes
// re-read the current value and change only their own part
// (hooks/use-mobile-grooming.tsx), which keeps two editors of different lists
// from overwriting each other.
//
// ── THE FALLBACK IS OFF ───────────────────────────────────────────────────
//
// A facility that has never set it up does not offer van visits: switched
// off, no vans, no areas, no zones. The ZIP/postal tax rates the browser copy
// also held are gone for good — tax comes from the facility's tax settings
// (e164eec9).
//
// A CUSTOMER never reads this row — vans carry plates and a home address, and
// the schedules say which groomer is where on which day. They read
// `public.offered_mobile_grooming()` (see its migration).
// ============================================================================

export const mobileGroomingSettingsSchema = z
  .object({
    enabled: z.boolean(),
    arrivalWindowMinutes: z.number().int().min(0).max(240),
    certainAreaEnabled: z.boolean(),
    vans: z.array(mobileGroomingVanSchema.passthrough()),
    serviceAreas: z.array(serviceAreaSchema.passthrough()),
    travelZones: z.array(travelZoneSchema.passthrough()),
    staffSchedules: z.array(staffServiceAreaScheduleSchema.passthrough()),
  })
  .passthrough();

export interface MobileGroomingSettings {
  enabled: boolean;
  /** Client-facing arrival window size, in minutes; 0 shows the precise time. */
  arrivalWindowMinutes: number;
  /** "Certain Area for Certain Days": coverage follows each groomer's
   *  schedule rather than the area's own days. */
  certainAreaEnabled: boolean;
  vans: MobileGroomingVan[];
  serviceAreas: ServiceArea[];
  travelZones: TravelZone[];
  /** Keyed by the groomer's staff id (a stylist's `staffId`, else its id). */
  staffSchedules: StaffServiceAreaSchedule[];
}

export const MOBILE_GROOMING_OFF: MobileGroomingSettings = {
  enabled: false,
  arrivalWindowMinutes: 60,
  certainAreaEnabled: false,
  vans: [],
  serviceAreas: [],
  travelZones: [],
  staffSchedules: [],
};
