/**
 * Master service catalog — set up once at HQ level.
 * Each location can selectively activate, override pricing, and configure
 * its own add-ons / packages on top of the master entry.
 */

import { z } from "zod";

export const serviceCategoryEnum = z.enum([
  "boarding",
  "daycare",
  "grooming",
  "training",
  "addon",
  "spa",
  "transport",
  "custom",
]);
export type ServiceCategory = z.infer<typeof serviceCategoryEnum>;

export const masterServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: serviceCategoryEnum,
  description: z.string(),
  defaultPrice: z.number(),
  durationMinutes: z.number().optional(),
  unit: z.enum(["per_visit", "per_night", "per_hour", "per_session", "flat"]),
  taxable: z.boolean(),
  requiresApproval: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MasterService = z.infer<typeof masterServiceSchema>;

export const locationServiceOverrideSchema = z.object({
  serviceId: z.string(),
  locationId: z.string(),
  /** When false, the service is hidden at this location */
  isActive: z.boolean(),
  /** Override price (null = use master defaultPrice) */
  priceOverride: z.number().nullable(),
  /** Per-location add-ons available with this service */
  addOnIds: z.array(z.string()),
  /** Per-location packages built on this service */
  packageIds: z.array(z.string()),
  /** Per-location override notes (visible to staff) */
  notes: z.string().optional(),
  updatedAt: z.string(),
});
export type LocationServiceOverride = z.infer<
  typeof locationServiceOverrideSchema
>;

/** Convenience view: master service + this location's override merged together. */
export interface ResolvedService {
  service: MasterService;
  override: LocationServiceOverride | null;
  effectivePrice: number;
  isActiveAtLocation: boolean;
  isUsingOverride: boolean;
}

export function resolveService(
  service: MasterService,
  override: LocationServiceOverride | null,
): ResolvedService {
  const isUsingOverride = Boolean(
    override && (override.priceOverride !== null || override.isActive === false),
  );
  return {
    service,
    override,
    effectivePrice: override?.priceOverride ?? service.defaultPrice,
    isActiveAtLocation: override?.isActive ?? service.isActive,
    isUsingOverride,
  };
}
