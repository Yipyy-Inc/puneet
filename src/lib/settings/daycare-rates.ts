import { z } from "zod";

import { daycareRateSchema, type DaycareRate } from "@/types/daycare";

// ============================================================================
// The facility's daycare rates — hourly, half day, full day and the rest,
// each with its size pricing, the add-ons it includes and the sections it may
// be booked into.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `daycareRates` from `@/data/daycare`, copied into the Rates screen's
// `useState`: every edit, toggle and delete there was gone on reload, and the
// booking modal went on reading the fixture's rates to decide which sections
// a half day may use and which add-ons come free with it.
//
// ── THE FALLBACK IS EMPTY, ON PURPOSE ─────────────────────────────────────
//
// Rates are money. A facility that has not set any has none — the booking
// modal then prices a day from `daycare_config.basePrice` as it always did —
// rather than the fixture's four invented rates.
// ============================================================================

export const daycareRatesSchema = z
  .object({ rates: z.array(daycareRateSchema) })
  .passthrough();

export interface DaycareRatesConfig {
  rates: DaycareRate[];
}

export const NO_DAYCARE_RATES: DaycareRatesConfig = { rates: [] };
