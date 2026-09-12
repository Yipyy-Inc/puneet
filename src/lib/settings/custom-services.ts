import { z } from "zod";

import {
  customServiceStatusEnum,
  facilityResourceTypeEnum,
  type CustomServiceModule,
  type FacilityResource,
} from "@/types/facility";

// ============================================================================
// A facility's custom services, and the resources they book, as the
// facility's own settings (2026-09-12).
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `useCustomServices()` kept both lists in the browser's localStorage, seeded
// from src/data/custom-services.ts. So every facility, in every browser, was
// shown the same invented services ("Yoda's Splash", a mobile van route…);
// what one person edited, nobody else saw; and the customer booking flow —
// which offers every active, online-bookable module — offered a customer
// services their facility had never heard of, and saved the booking.
//
// ── THE FALLBACKS ARE EMPTY ───────────────────────────────────────────────
//
// A custom service is something a facility sells, so a facility that has
// never configured one has none. Same for resources.
//
// ── THE SHAPE ─────────────────────────────────────────────────────────────
//
// One list per domain, the module shape the screens already use, checked at
// the fields everything else keys on (id, slug, name, status) and passed
// through past them. Slugs are unique within a facility: they are the URL of
// the module's pages and the `service` a booking is saved under.
//
// A CUSTOMER never reads these rows: some fields are the facility's own
// (internal notes, staff assignment, the disable reason). They read the
// projection `public.offered_custom_services()` returns instead
// (20260912172123_a_custom_service_is_the_facilitys.sql).
// ============================================================================

const moduleSchema = z
  .object({
    id: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/, "A slug is lowercase letters, digits and dashes."),
    name: z.string().min(1).max(120),
    status: customServiceStatusEnum,
  })
  .passthrough();

export const customServicesSchema = z
  .object({ modules: z.array(moduleSchema) })
  .passthrough()
  .refine(
    (v) => new Set(v.modules.map((m) => m.slug)).size === v.modules.length,
    { message: "Two custom services cannot share a slug." },
  );

const resourceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    type: facilityResourceTypeEnum,
    capacity: z.number().int().min(0),
    isAvailable: z.boolean(),
  })
  .passthrough();

export const facilityResourcesSchema = z
  .object({ resources: z.array(resourceSchema) })
  .passthrough();

export const NO_CUSTOM_SERVICES: { modules: CustomServiceModule[] } = {
  modules: [],
};
export const NO_FACILITY_RESOURCES: { resources: FacilityResource[] } = {
  resources: [],
};
