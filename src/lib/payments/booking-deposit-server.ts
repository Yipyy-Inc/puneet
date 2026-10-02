import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { chargeCard } from "@/lib/clover/charge";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import { depositPlan, type DepositPlan } from "@/lib/payments/deposit-shares";
import { depositConfigSchema, NO_DEPOSITS } from "@/lib/settings/deposits";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// A booking's deposit, taken (the booking wizard's Confirm, 2026-10-02).
//
//   staff     "Charge Visa •••• 4242" — the client's saved card, right after
//             the booking is made (POST /api/bookings/deposit)
//   customer  the card they consented to with their request, charged when the
//             facility confirms it (the decision route, auto-confirm)
//
// The amount is never anybody's to name: `depositPlan` works it out from the
// facility's rule and the rows, the same arithmetic the wizard showed. Each
// part's share is one charge with the facility's tax on top, under the key
// `<prefix>:<booking>`, so the same deposit can never be charged twice — a
// second attempt is refused before Clover is called.
//
// Everything here runs as the service role, AFTER the caller proved they may
// act on these bookings: a customer's card at confirmation is charged by the
// facility, not by the person confirming.
// ============================================================================

export interface DepositRow {
  id: string;
  ref: number;
  facility_id: string;
  client_id: string;
  service: string;
  status: string;
  amount_due: number | string | null;
  amount_paid: number | string | null;
  total_cost: number | string | null;
  extras_total: number | string | null;
  taxable_extras_total?: number | string | null;
  taxable: boolean | null;
  details: Record<string, unknown> | null;
}

export const DEPOSIT_ROW_SELECT =
  "id, ref, facility_id, client_id, service, status, amount_due, amount_paid, total_cost, extras_total, taxable_extras_total, taxable, details";

/** The request a booking belongs to: every part of its group, in order. */
export async function requestRows(
  admin: SupabaseClient,
  booking: DepositRow,
): Promise<DepositRow[]> {
  const group = (booking.details ?? {})["bookingGroup"] as
    | { id?: unknown }
    | undefined;
  if (typeof group?.id !== "string" || !group.id) return [booking];
  const { data } = await admin
    .from("bookings")
    .select(DEPOSIT_ROW_SELECT)
    .eq("facility_id", booking.facility_id)
    .eq("client_id", booking.client_id)
    .eq("details->bookingGroup->>id", group.id)
    .neq("status", "cancelled")
    .order("start_at", { ascending: true });
  const rows = (data ?? []) as unknown as DepositRow[];
  return rows.length > 0 ? rows : [booking];
}

/** What the request owes as a deposit, and on which parts. */
export async function planDeposit(
  admin: SupabaseClient,
  rows: readonly DepositRow[],
): Promise<DepositPlan> {
  const first = rows[0];
  if (!first) return { rule: null, amount: 0, shares: [] };
  const { data } = await admin
    .from("facility_settings")
    .select("value")
    .eq("facility_id", first.facility_id)
    .eq("domain", "deposit_rules")
    .maybeSingle();
  const parsed = depositConfigSchema.safeParse(data?.value);
  const config = parsed.success ? parsed.data : NO_DEPOSITS;
  return depositPlan({
    rules: config.rules,
    bookings: rows
      .filter((row) => row.status !== "cancelled")
      .map((row) => ({
        id: row.id,
        ref: row.ref,
        service: row.service,
        due: Number(row.amount_due ?? 0),
        paid: Number(row.amount_paid ?? 0),
      })),
  });
}

export type DepositChargeResult =
  | { ok: true; chargedCents: number; cardLabel: string | null }
  | { ok: false; code: string; message: string; chargedCents: number };

/**
 * Charge each share of the plan to a saved card. Stops at the first refusal,
 * saying what was taken before it: a deposit half-charged is a fact staff
 * must see, not a failure that hides the money already moved.
 */
export async function chargeDepositShares(input: {
  rows: readonly DepositRow[];
  plan: DepositPlan;
  savedCardId: string;
  /** `merchant`: staff at the desk, or a charge made at confirmation. */
  initiator: "merchant" | "cardholder";
  createdBy: string | null;
  authorName: string;
  /** `deposit` from the desk, `deposit-auto` at confirmation. */
  keyPrefix: string;
}): Promise<DepositChargeResult> {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const first = input.rows[0];
  if (!first || input.plan.shares.length === 0) {
    return { ok: true, chargedCents: 0, cardLabel: null };
  }
  const { data: card } = await admin
    .from("saved_cards")
    .select(
      "id, client_id, facility_id, processor_customer_id, consent_at, revoked_at, card_brand, card_last4",
    )
    .eq("id", input.savedCardId)
    .maybeSingle();
  const saved = card as {
    id: string;
    client_id: string;
    facility_id: string;
    processor_customer_id: string;
    consent_at: string | null;
    revoked_at: string | null;
    card_brand: string | null;
    card_last4: string | null;
  } | null;
  if (
    !saved ||
    saved.revoked_at ||
    saved.facility_id !== first.facility_id ||
    saved.client_id !== first.client_id
  ) {
    return {
      ok: false,
      code: "no_card",
      message: "That saved card is not available.",
      chargedCents: 0,
    };
  }
  if (!saved.consent_at) {
    return {
      ok: false,
      code: "no_consent",
      message:
        "That card was saved without the cardholder's consent to charge it again.",
      chargedCents: 0,
    };
  }

  const taxConfig = await facilityTaxConfig(admin, first.facility_id);
  let chargedCents = 0;
  for (const share of input.plan.shares) {
    const row = input.rows.find((r) => r.id === share.bookingId);
    if (!row) continue;
    const subtotalCents = Math.round(share.amount * 100);
    const outcome = await chargeCard({
      facilityId: row.facility_id,
      bookingId: row.id,
      clientId: row.client_id,
      subtotalCents,
      taxCents: taxToAddCents(taxConfig, subtotalCents, row),
      source: saved.processor_customer_id,
      storedCard: {
        initiator: input.initiator,
        scheduled: false,
        savedCardId: saved.id,
      },
      createdBy: input.createdBy,
      authorName: input.authorName,
      idempotencyKey: `${input.keyPrefix}:${row.id}`,
    });
    if (!outcome.ok) {
      return {
        ok: false,
        code: outcome.code,
        message: outcome.message,
        chargedCents,
      };
    }
    chargedCents += outcome.amountCents;
  }
  return {
    ok: true,
    chargedCents,
    cardLabel: saved.card_last4
      ? `${saved.card_brand ?? "Card"} •••• ${saved.card_last4}`
      : null,
  };
}

/**
 * A customer's deposit, when the facility confirms their request — by staff
 * approving it, or by the facility's own rule confirming it on arrival. The
 * card the customer chose with the request (`details.depositCardId`) is
 * charged; with no card, or a refusal, the deposit link goes to them by
 * email instead. Never throws: the confirmation stands whatever happens to
 * the money, and the answer says which.
 */
export async function collectDepositOnConfirm(input: {
  bookingIds: readonly string[];
  request: Request;
  createdBy: string | null;
}): Promise<"charged" | "linked" | "none" | "failed"> {
  try {
    if (input.bookingIds.length === 0) return "none";
    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data } = await admin
      .from("bookings")
      .select(DEPOSIT_ROW_SELECT)
      .in("id", [...input.bookingIds])
      .eq("status", "confirmed");
    const confirmed = (data ?? []) as unknown as DepositRow[];
    const first = confirmed[0];
    if (!first) return "none";
    const rows = await requestRows(admin, first);
    const plan = await planDeposit(admin, rows);
    if (plan.shares.length === 0) return "none";

    const cardId = rows
      .map((row) => (row.details ?? {})["depositCardId"])
      .find((id): id is string => typeof id === "string" && id.length > 0);
    if (cardId) {
      const charged = await chargeDepositShares({
        rows,
        plan,
        savedCardId: cardId,
        initiator: "merchant",
        createdBy: input.createdBy,
        authorName: "Deposit at confirmation",
        keyPrefix: "deposit-auto",
      });
      if (charged.ok) return "charged";
    }
    const { sendDepositLinks } =
      await import("@/lib/payments/deposit-links.server");
    const linked = await sendDepositLinks({
      admin,
      rows,
      plan,
      channel: "email",
      request: input.request,
    });
    return linked.sent ? "linked" : "failed";
  } catch (failure) {
    console.warn("[deposit] not collected at confirmation:", failure);
    return "failed";
  }
}
