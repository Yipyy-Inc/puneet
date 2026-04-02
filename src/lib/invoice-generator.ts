/**
 * Invoice generation for all service modules (built-in and custom).
 *
 * Supports all 7 pricing models, multi-tax, memberships, packages,
 * discounts, and tips. Uses integer math (cents) to avoid floating point.
 */

import type { Invoice, InvoiceLineItem, InvoiceTaxLine } from "@/types/booking";
import type { Booking } from "@/types/booking";
import type { Client, Membership, ClientPackage } from "@/types/client";
import type { CustomServiceModule } from "@/types/facility";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { defaultCustomServiceModules as customServiceModules } from "@/data/custom-services";

// ============================================================================
// Tax configuration — reads from facility settings
// ============================================================================

export interface TaxConfig {
  taxes: {
    name: string;
    rate: number;
    appliesTo: "all" | "services" | "products";
  }[];
  taxInclusive: boolean;
}

function getFacilityTaxConfig(facilityId?: number): TaxConfig {
  const facility = facilities.find((f) => f.id === (facilityId ?? 11));
  const tc = facility?.taxConfig;
  if (tc) {
    return {
      taxes: tc.taxes
        .filter((t) => t.enabled)
        .map((t) => {
          const a = t.appliesTo as string;
          return {
            name: t.name,
            rate: t.rate,
            appliesTo:
              a === "services_only"
                ? ("services" as const)
                : a === "products_only"
                  ? ("products" as const)
                  : ("all" as const),
          };
        }),
      taxInclusive: tc.pricesIncludeTax,
    };
  }
  // Fallback
  return {
    taxes: [
      { name: "GST", rate: 0.05, appliesTo: "all" },
      { name: "QST", rate: 0.09975, appliesTo: "all" },
    ],
    taxInclusive: false,
  };
}

// ============================================================================
// Helpers — integer math to avoid floating point
// ============================================================================

function cents(amount: number): number {
  return Math.round(amount * 100);
}

function dollars(c: number): number {
  return c / 100;
}

function nightsBetween(start: string, end: string): number {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// Pricing model calculators
// ============================================================================

function calculateBaseCharge(
  booking: Booking,
  svcModule?: CustomServiceModule,
): InvoiceLineItem {
  const basePrice = svcModule?.pricing?.basePrice ?? booking.basePrice;
  const moduleName = svcModule?.name ?? booking.service;
  const pricingModel = svcModule?.pricing?.model ?? "flat_rate";

  let quantity = 1;
  let unitPrice = basePrice;

  switch (pricingModel) {
    case "duration_based": {
      const nights = nightsBetween(booking.startDate, booking.endDate);
      quantity = Math.max(1, nights);
      // Check duration tiers
      if (svcModule?.pricing?.durationTiers?.length) {
        const durationMins = quantity * 60; // approximate
        const tier = svcModule.pricing.durationTiers
          .sort((a, b) => a.durationMinutes - b.durationMinutes)
          .find((t) => t.durationMinutes >= durationMins);
        if (tier) unitPrice = tier.price;
      }
      break;
    }
    case "per_pet": {
      const petCount = Array.isArray(booking.petId) ? booking.petId.length : 1;
      quantity = petCount;
      break;
    }
    case "per_route":
      quantity = 1; // per-trip
      break;
    case "addon_only":
      unitPrice = 0;
      quantity = 0;
      break;
    case "flat_rate":
    case "per_booking":
    case "dynamic":
    default:
      quantity = 1;
      break;
  }

  const priceCents = cents(unitPrice) * quantity;

  return {
    name: moduleName,
    unitPrice,
    quantity,
    price: dollars(priceCents),
    type: "service",
    taxable: svcModule?.pricing?.taxable ?? true,
    moduleId: svcModule?.id,
  };
}

// ============================================================================
// Discount calculation
// ============================================================================

interface DiscountInput {
  promoCode?: string;
  promoPercent?: number;
  multiPetCount?: number;
  manualDiscount?: number;
  manualDiscountReason?: string;
}

function calculateDiscounts(
  subtotalCents: number,
  membership?: Membership,
  discountInput?: DiscountInput,
): { items: InvoiceLineItem[]; totalCents: number; membershipLabel?: string } {
  const items: InvoiceLineItem[] = [];
  let totalCents = 0;

  // 1. Membership discount (applied first)
  if (membership?.status === "active" && membership.benefits.discountPercent) {
    const pct = membership.benefits.discountPercent;
    const amt = Math.round((subtotalCents * pct) / 100);
    items.push({
      name: `Membership: ${membership.plan} (${pct}%)`,
      unitPrice: dollars(amt),
      quantity: 1,
      price: dollars(amt),
      type: "discount",
      taxable: false,
    });
    totalCents += amt;
  }

  // 2. Multi-pet discount
  if (discountInput?.multiPetCount && discountInput.multiPetCount >= 2) {
    const pct = 5 * (discountInput.multiPetCount - 1); // 5% per extra pet
    const amt = Math.round(((subtotalCents - totalCents) * pct) / 100);
    items.push({
      name: `Multi-Dog Discount (${discountInput.multiPetCount} dogs)`,
      unitPrice: dollars(amt),
      quantity: 1,
      price: dollars(amt),
      type: "discount",
      taxable: false,
    });
    totalCents += amt;
  }

  // 3. Promo code
  if (discountInput?.promoCode && discountInput?.promoPercent) {
    const pct = discountInput.promoPercent;
    const amt = Math.round(((subtotalCents - totalCents) * pct) / 100);
    items.push({
      name: `Promo: ${discountInput.promoCode} (${pct}%)`,
      unitPrice: dollars(amt),
      quantity: 1,
      price: dollars(amt),
      type: "discount",
      taxable: false,
    });
    totalCents += amt;
  }

  // 4. Manual override
  if (discountInput?.manualDiscount) {
    const amt = cents(discountInput.manualDiscount);
    items.push({
      name: discountInput.manualDiscountReason ?? "Manual Discount",
      unitPrice: dollars(amt),
      quantity: 1,
      price: dollars(amt),
      type: "discount",
      taxable: false,
    });
    totalCents += amt;
  }

  return {
    items,
    totalCents,
    membershipLabel:
      membership?.status === "active"
        ? `${membership.plan} — ${membership.benefits.discountPercent}%`
        : undefined,
  };
}

// ============================================================================
// Tax calculation (multi-tax support)
// ============================================================================

function calculateTaxes(
  taxableAmountCents: number,
  config: TaxConfig = getFacilityTaxConfig(),
): { lines: InvoiceTaxLine[]; totalCents: number } {
  const lines: InvoiceTaxLine[] = [];
  let totalCents = 0;

  for (const tax of config.taxes) {
    const amt = Math.round(taxableAmountCents * tax.rate);
    lines.push({ name: tax.name, rate: tax.rate, amount: dollars(amt) });
    totalCents += amt;
  }

  return { lines, totalCents };
}

// ============================================================================
// Package credit check
// ============================================================================

function checkPackageCredits(
  client: Client,
  moduleId?: string,
): { pkg: ClientPackage; creditValue: number } | null {
  if (!client.packages || !moduleId) return null;
  const pkg = client.packages.find(
    (p) => p.moduleId === moduleId && p.remainingCredits > 0,
  );
  if (!pkg) return null;
  return { pkg, creditValue: pkg.pricePerCredit };
}

// ============================================================================
// Main generator
// ============================================================================

export function generateInvoiceForBooking(
  booking: Booking,
  options?: {
    discounts?: DiscountInput;
    tipAmount?: number;
    tipStaff?: string;
    taxConfig?: TaxConfig;
  },
): Invoice {
  const client = clients.find((c) => c.id === booking.clientId);
  const moduleId = booking.service?.toLowerCase();
  const serviceModule = customServiceModules.find(
    (m) => m.slug === moduleId || m.id === moduleId,
  );
  const taxConfig =
    options?.taxConfig ?? getFacilityTaxConfig(booking.facilityId);

  // --- Base charge ---
  const baseItem = calculateBaseCharge(booking, serviceModule);
  const items: InvoiceLineItem[] = [baseItem];
  const fees: InvoiceLineItem[] = [];

  // --- Package credit ---
  let packageCreditsUsed = 0;
  if (client && serviceModule) {
    const pkgCheck = checkPackageCredits(client, serviceModule.id);
    if (pkgCheck) {
      packageCreditsUsed = 1;
      items.push({
        name: `Package credit (${pkgCheck.pkg.name} — ${pkgCheck.pkg.remainingCredits - 1} remaining)`,
        unitPrice: pkgCheck.creditValue,
        quantity: 1,
        price: -pkgCheck.creditValue,
        type: "package_credit",
        taxable: false,
      });
    }
  }

  // --- Subtotal (before discounts) ---
  const subtotalCents = items.reduce((s, i) => s + cents(i.price), 0);

  // --- Discounts ---
  const petCount = Array.isArray(booking.petId) ? booking.petId.length : 1;
  const discountResult = calculateDiscounts(subtotalCents, client?.membership, {
    ...options?.discounts,
    multiPetCount: petCount > 1 ? petCount : undefined,
  });

  // --- Taxable amount ---
  const taxableItemsCents = items
    .filter((i) => i.taxable !== false)
    .reduce((s, i) => s + cents(i.price), 0);
  const taxableAfterDiscountCents = Math.max(
    0,
    taxableItemsCents - discountResult.totalCents,
  );
  const taxResult = calculateTaxes(taxableAfterDiscountCents, taxConfig);

  // --- Tip (never taxable) ---
  let tipTotal = 0;
  if (options?.tipAmount && options.tipAmount > 0) {
    tipTotal = options.tipAmount;
    fees.push({
      name: options.tipStaff ? `Tip (for ${options.tipStaff})` : "Tip",
      unitPrice: tipTotal,
      quantity: 1,
      price: tipTotal,
      type: "tip",
      taxable: false,
      staffName: options.tipStaff,
    });
  }

  // --- Totals ---
  const afterDiscountCents = subtotalCents - discountResult.totalCents;
  const totalCents =
    afterDiscountCents +
    taxResult.totalCents +
    cents(tipTotal) +
    fees
      .filter((f) => f.type !== "tip")
      .reduce((s, f) => s + cents(f.price), 0);

  const total = dollars(totalCents);

  return {
    id: String(10000 + booking.id),
    status: "open",
    items,
    fees,
    subtotal: dollars(subtotalCents),
    discount: dollars(discountResult.totalCents),
    discountLabel:
      discountResult.items.length > 0
        ? discountResult.items.map((d) => d.name).join(", ")
        : undefined,
    discounts:
      discountResult.items.length > 0 ? discountResult.items : undefined,
    taxRate: taxConfig.taxes.reduce((s, t) => s + t.rate, 0),
    taxAmount: dollars(taxResult.totalCents),
    taxes: taxResult.lines,
    total,
    depositCollected: 0,
    remainingDue: total,
    payments: [],
    membershipApplied: discountResult.membershipLabel,
    packageCreditsUsed: packageCreditsUsed > 0 ? packageCreditsUsed : undefined,
    tipTotal: tipTotal > 0 ? tipTotal : undefined,
  };
}
