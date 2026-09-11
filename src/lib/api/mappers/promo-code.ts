import type { MarketingPromoCode } from "@/types/marketing";

// ============================================================================
// A promo code, row ⇄ the shape Marketing → Promo Codes draws
// (20260911173538).
//
// The columns are what `redeem_promo_code` enforces; `detail` keeps the rest
// of the editor (auto-apply, days of the week). A free-service code names its
// service in `applies_to`, which is also what the database checks the
// booking's service against. The used count is COUNTED by the route from the
// redemptions, never stored.
// ============================================================================

export const PROMO_CODE_SELECT = `
  id, code, description, discount_type, discount_value, min_purchase,
  max_discount, valid_from, valid_until, usage_limit, per_customer_limit,
  applies_to, first_time_only, is_active, detail, created_by, created_at
`;

export interface PromoCodeRow {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number | string;
  min_purchase: number | string | null;
  max_discount: number | string | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  applies_to: string[] | null;
  first_time_only: boolean;
  is_active: boolean;
  detail: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

const num = (v: number | string | null) => (v === null ? undefined : Number(v));

export function rowToPromoCode(
  row: PromoCodeRow,
  usedCount: number,
): MarketingPromoCode {
  const detail = (row.detail ?? {}) as {
    autoApply?: boolean;
    specificDays?: string[];
  };
  const appliesTo = row.applies_to ?? [];
  const type = row.discount_type as MarketingPromoCode["type"];
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    type,
    value:
      type === "free_service"
        ? (appliesTo[0] ?? "")
        : Number(row.discount_value),
    minPurchase: num(row.min_purchase),
    maxDiscount: num(row.max_discount),
    validFrom: row.valid_from ?? "",
    validUntil: row.valid_until ?? "",
    usageLimit: row.usage_limit ?? undefined,
    usedCount,
    perCustomerLimit: row.per_customer_limit ?? undefined,
    applicableServices: appliesTo,
    autoApply: detail.autoApply ?? false,
    conditions: {
      firstTimeCustomer: row.first_time_only,
      specificDays: detail.specificDays ?? [],
      specificServices: appliesTo,
    },
    isActive: row.is_active,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
  };
}

/** What a create or an edit writes. Only the fields that were sent. */
export function promoCodeToColumns(input: Partial<MarketingPromoCode>) {
  const out: Record<string, unknown> = {};
  if (input.code !== undefined) out.code = input.code.trim().toUpperCase();
  if (input.description !== undefined) out.description = input.description;
  if (input.type !== undefined) out.discount_type = input.type;
  if (input.value !== undefined) {
    if (input.type === "free_service") {
      out.discount_value = 0;
      out.applies_to = String(input.value)
        ? [String(input.value).toLowerCase()]
        : [];
    } else {
      out.discount_value = Number(input.value);
    }
  }
  if (input.type !== "free_service" && input.applicableServices !== undefined) {
    out.applies_to = input.applicableServices.map((s) => s.toLowerCase());
  }
  if (input.minPurchase !== undefined) out.min_purchase = input.minPurchase;
  if (input.maxDiscount !== undefined) out.max_discount = input.maxDiscount;
  if (input.validFrom !== undefined) out.valid_from = input.validFrom || null;
  if (input.validUntil !== undefined)
    out.valid_until = input.validUntil || null;
  if (input.usageLimit !== undefined) out.usage_limit = input.usageLimit;
  if (input.perCustomerLimit !== undefined)
    out.per_customer_limit = input.perCustomerLimit;
  if (input.isActive !== undefined) out.is_active = input.isActive;
  if (input.conditions?.firstTimeCustomer !== undefined)
    out.first_time_only = input.conditions.firstTimeCustomer;
  if (
    input.autoApply !== undefined ||
    input.conditions?.specificDays !== undefined
  ) {
    out.detail = {
      autoApply: input.autoApply ?? false,
      specificDays: input.conditions?.specificDays ?? [],
    };
  }
  return out;
}
