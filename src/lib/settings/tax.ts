import { z } from "zod";

// ============================================================================
// What a facility charges in tax, and what it puts on a receipt.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// `TaxSettings.tsx` has been on the settings page all along, and its Save
// button did this:
//
//     (defaultFacility as Record<string, unknown>).taxConfig = { ... };
//     toast.success("Tax settings saved");
//
// It mutated the in-memory FIXTURE — facility 11, the one every deployment
// shares — and announced success. The values survived until the next reload,
// were never sent anywhere, and were the same object for every facility on the
// platform. So a facility could enter its GST and QST registration numbers,
// be told they were saved, and have nothing on any document ever show them.
//
// ── THE DEFAULT IS NO TAX, DELIBERATELY ───────────────────────────────────
//
// The fixture defaulted to Quebec GST 5% + QST 9.975%. Carrying that over as
// the fallback would mean every facility that has never opened this screen
// starts adding 14.975% to its receipts — in Ontario, in Alberta, in the
// United States. A default that changes what a customer is charged is not a
// default, it is a decision made on the facility's behalf about their tax
// liability.
//
// So the fallback is an empty list: no tax line appears on any receipt until
// somebody chooses one. `configured: false` travels with it, so a screen can
// still tell "nobody has set this" from "they chose nothing".
// ============================================================================

export const taxEntrySchema = z.object({
  id: z.string(),
  /** As it appears on the receipt — "GST", "QST", "HST", "Sales Tax". */
  name: z.string(),
  /** A percentage, not a fraction: 9.975 means 9.975%. */
  rate: z.number().min(0).max(100),
  appliesTo: z.enum(["all", "services_only", "products_only"]),
  /** The number the facility must show on an invoice, where law requires it. */
  registrationNumber: z.string().default(""),
  description: z.string().default(""),
  /** Charged on subtotal PLUS the taxes above it, as some jurisdictions do. */
  isCompound: z.boolean().default(false),
  enabled: z.boolean(),
});

export const taxConfigSchema = z.object({
  country: z.string().default("CA"),
  province: z.string().default(""),
  taxes: z.array(taxEntrySchema).default([]),
  /** Prices already contain the tax; the receipt breaks it out rather than adding. */
  pricesIncludeTax: z.boolean().default(false),
  showTaxesSeparately: z.boolean().default(true),
  showRegistrationOnInvoice: z.boolean().default(true),
  exemptions: z
    .object({
      // A tip is a gratuity, not a supply, and is not taxable anywhere this
      // ships. It is a field rather than a constant so the one jurisdiction
      // that disagrees does not need a code change.
      tips: z.boolean().default(true),
      giftCards: z.boolean().default(true),
      storeCredit: z.boolean().default(true),
    })
    .default({ tips: true, giftCards: true, storeCredit: true }),
});

export type TaxEntry = z.infer<typeof taxEntrySchema>;
export type TaxConfig = z.infer<typeof taxConfigSchema>;

/** No tax, until a facility says otherwise. See the banner above. */
export const NO_TAX: TaxConfig = {
  country: "CA",
  province: "",
  taxes: [],
  pricesIncludeTax: false,
  showTaxesSeparately: true,
  showRegistrationOnInvoice: true,
  exemptions: { tips: true, giftCards: true, storeCredit: true },
};

export interface ComputedTax {
  name: string;
  rate: number;
  registrationNumber: string;
  amountCents: number;
}

/**
 * The tax on a sale, line by line.
 *
 * @param taxableCents the subtotal AFTER any discount and BEFORE the tip. A
 *   discount reduces the price of the supply, so it reduces the tax; a tip is
 *   not part of the supply at all.
 *
 * ── PRICES-INCLUDE-TAX IS EXTRACTION, NOT ADDITION ───────────────────────
 *
 * When a facility prices inclusively, the tax is already inside `taxableCents`
 * and the receipt only has to say how much of it was tax. Adding it again would
 * overcharge every customer, which is why the two branches are separate rather
 * than one formula with a flag.
 */
export function computeTax(
  taxableCents: number,
  config: TaxConfig,
): { lines: ComputedTax[]; totalCents: number } {
  const active = config.taxes.filter(
    (t) => t.enabled && t.rate > 0 && t.appliesTo !== "products_only",
  );
  if (active.length === 0 || taxableCents <= 0) {
    return { lines: [], totalCents: 0 };
  }

  if (config.pricesIncludeTax) {
    // The combined rate is what was baked in, so each tax's share is its own
    // rate over that combined total. Compound taxes cannot be unpicked this
    // way, and no jurisdiction that ships here prices compound taxes
    // inclusively — so they are treated as simple, and the total is exact even
    // if an individual line rounds.
    const combined = active.reduce((sum, t) => sum + t.rate, 0);
    const taxTotal = Math.round(
      taxableCents - taxableCents / (1 + combined / 100),
    );
    const lines: ComputedTax[] = [];
    let assigned = 0;
    active.forEach((t, index) => {
      const amount =
        index === active.length - 1
          ? // The last line absorbs the rounding so the parts always sum to the
            // whole. A receipt whose tax lines do not add up to its tax total is
            // a receipt somebody will query.
            taxTotal - assigned
          : Math.round((taxTotal * t.rate) / combined);
      assigned += amount;
      lines.push({
        name: t.name,
        rate: t.rate,
        registrationNumber: t.registrationNumber,
        amountCents: amount,
      });
    });
    return { lines, totalCents: taxTotal };
  }

  const lines: ComputedTax[] = [];
  let running = taxableCents;
  let total = 0;
  for (const t of active) {
    // A compound tax is charged on the subtotal plus everything already added;
    // a simple one always on the subtotal alone.
    const base = t.isCompound ? running : taxableCents;
    const amount = Math.round((base * t.rate) / 100);
    running += amount;
    total += amount;
    lines.push({
      name: t.name,
      rate: t.rate,
      registrationNumber: t.registrationNumber,
      amountCents: amount,
    });
  }
  return { lines, totalCents: total };
}
