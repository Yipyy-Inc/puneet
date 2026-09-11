import { z } from "zod";

import {
  retailConfig as SHIPPED_RETAIL_CONFIG,
  type RetailConfig,
} from "@/data/retail-config";

// ============================================================================
// The facility's retail configuration — product categories, brands, tags and
// units; the receipt; the low-stock threshold; the pricing defaults; the
// per-brand margin rules.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `retailConfig` from `@/data/retail-config`, a module object the Retail
// settings section assigned into and the till, the Products tab and the
// orders screen read back: every save lasted until the page reloaded, and
// was never what another till saw.
//
// ── THE FALLBACK ──────────────────────────────────────────────────────────
//
// The shipped categories, tags, units and receipt text — an empty category
// list is an empty product form — but NO suppliers, brands or brand margin
// rules: those name businesses, and another facility's are not a default.
// Tax is not here for the till: it charges the facility's own tax
// (`tax_config`), the same the booking checkout charges.
// ============================================================================

export const retailConfigSchema = z
  .object({
    categories: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    suppliers: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    brands: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    productTags: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    unitsOfMeasure: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    taxConfig: z.object({}).passthrough(),
    receiptConfig: z.object({}).passthrough(),
    lowStockConfig: z.object({}).passthrough(),
    pricingConfig: z.object({}).passthrough(),
    brandMarginRules: z.array(
      z.object({ id: z.string(), brandName: z.string() }).passthrough(),
    ),
  })
  .passthrough();

export const SHIPPED_RETAIL_SETTINGS: RetailConfig = {
  ...SHIPPED_RETAIL_CONFIG,
  suppliers: [],
  brands: [],
  brandMarginRules: [],
};
