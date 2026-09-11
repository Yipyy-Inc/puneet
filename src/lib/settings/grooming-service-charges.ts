import { z } from "zod";

// ============================================================================
// The grooming Rates tab's service charges — a matting fee, a no-show fee, a
// travel fee — each a flat amount, per 15 minutes, per km or a percentage.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `INITIAL_SERVICE_CHARGES`, five charges typed into the component and
// copied into its useState: every add, edit, toggle and delete was gone on
// reload.
//
// ── THE FALLBACK IS EMPTY, ON PURPOSE ─────────────────────────────────────
//
// A charge is money. A facility that has set none has none, rather than
// another business's matting fee.
// ============================================================================

export const serviceChargeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    amount: z.number(),
    type: z.enum(["flat", "per-15min", "per-km", "percent"]),
    isActive: z.boolean(),
  })
  .passthrough();

export interface ServiceCharge {
  id: string;
  name: string;
  description: string;
  amount: number;
  type: "flat" | "per-15min" | "per-km" | "percent";
  isActive: boolean;
}

export const groomingServiceChargesSchema = z
  .object({ charges: z.array(serviceChargeSchema) })
  .passthrough();

export interface GroomingServiceChargesConfig {
  charges: ServiceCharge[];
}

export const NO_SERVICE_CHARGES: GroomingServiceChargesConfig = {
  charges: [],
};
