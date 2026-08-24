import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { validAccessToken } from "./connection";
import { fetchMerchantProfile } from "./merchant";
import { cloverGet } from "./request";

// ============================================================================
// Acting on what a webhook named — after asking Clover what actually happened.
//
// A delivery carries an object id and nothing else, and the auth header behind
// it is a shared secret with no per-message integrity. So nothing here trusts
// the message: it is a prompt to go and read the object with the merchant's own
// token, and every decision is made from that read.
//
// ── A REVERSAL IS NOT ALWAYS A REFUND ─────────────────────────────────────
//
// Measured against the sandbox, and it would have been a silent bug: calling
// /v1/refunds on a charge from the same batch produces a VOID, not a refund.
// The payment comes back as
//
//     { "result": "VOIDED", "voidReason": "USER_CANCEL", "refunds": {"elements": []} }
//
// — reversed in full, with an EMPTY refunds array. Reconciling on refunds[]
// alone, which is the obvious reading of the API, would have missed every
// same-day reversal a facility ever made and reported the money as still taken.
//
// So "how much has Clover given back" is: the whole amount if the payment is
// voided, otherwise the sum of its refunds.
//
// ── IT RECONCILES THE GAP, NOT THE EVENT ──────────────────────────────────
//
// The question asked is never "did a refund happen" but "does our ledger
// already account for everything Clover has reversed". A duplicate delivery, a
// refund we issued ourselves through the app, and a manual reversal in Clover's
// dashboard all reduce to the same arithmetic, and only the shortfall is
// written. That is what makes this safe to run twice.
// ============================================================================

export type PaymentReconciliation =
  | { kind: "not_ours"; detail: string }
  | { kind: "unreadable"; detail: string }
  | { kind: "settled"; detail: string }
  | { kind: "reversed"; detail: string; amountCents: number }
  /** A terminal sale whose HTTP response was lost, finished from Clover's copy. */
  | { kind: "recovered"; detail: string; paymentId: string }
  /** Real money at this merchant that Yipyy cannot place. Held, not discarded. */
  | { kind: "unattached"; detail: string };

interface CloverV3Payment {
  id?: string;
  amount?: number;
  tipAmount?: number;
  taxAmount?: number;
  result?: string;
  voidReason?: string;
  createdTime?: number;
  /**
   * What the POS called this payment. Yipyy sends the intent id with its dashes
   * stripped, because Clover caps the field at 32 characters and a uuid is 36.
   */
  externalPaymentId?: string;
  order?: { id?: string };
  device?: { id?: string; serial?: string };
  tender?: { label?: string; labelKey?: string };
  cardTransaction?: {
    cardType?: string;
    last4?: string;
    entryType?: string;
    authCode?: string;
  };
  /** Clover's id for the VOID itself — a real id, not one we invent. */
  voidPaymentRef?: { id?: string };
  refunds?: { elements?: { id?: string; amount?: number }[] };
}

/** Clover's entryType vocabulary, mapped onto the column's CHECK. */
function entryMethodOf(payment: CloverV3Payment): string | null {
  const raw = payment.cardTransaction?.entryType?.toUpperCase();
  if (!raw) return null;
  if (raw.includes("SWIPE")) return "swipe";
  if (raw.includes("CONTACTLESS") || raw.includes("NFC")) return "contactless";
  if (raw.includes("CHIP") || raw.includes("EMV")) return "chip";
  if (raw.includes("KEYED") || raw.includes("MANUAL")) return "keyed";
  if (raw.includes("ECOM")) return "ecom";
  // Unrecognised is null, never a guess: the CHECK would refuse an invented
  // value and take the whole row with it.
  return null;
}

/** Cents, from a numeric-dollars column. */
function cents(value: unknown): number {
  return Math.round(Number(value ?? 0) * 100);
}

/**
 * Bring our ledger in line with what Clover says about one payment.
 *
 * Service role throughout: this runs from a webhook, where there is no caller
 * and therefore nobody for RLS to be evaluated against.
 */
export async function reconcilePayment(
  facilityId: string,
  cloverPaymentId: string,
): Promise<PaymentReconciliation> {
  if (!hasServiceRoleKey()) {
    return { kind: "unreadable", detail: "Clover is not configured here." };
  }

  const admin = createAdminClient();

  const active = await validAccessToken(facilityId);
  if (!active) {
    return {
      kind: "unreadable",
      detail: "No usable access token for this merchant.",
    };
  }

  // The CONNECTION's estate, not the deployment's — a sandbox merchant read
  // against api.clover.com is a 401 that looks like a revoked grant.
  const config = cloverConfig(active.environment);
  if (!config) {
    return {
      kind: "unreadable",
      detail: `Clover is not configured for ${active.environment}.`,
    };
  }

  // Through the retrying reader. A 429 here used to close the delivery as
  // 'failed' and stop — and because the route answers 200 even on failure (so
  // Clover does not redeliver forever), a dropped read stayed dropped.
  // `order`, `device` and `tender` are expanded because a payment we do NOT
  // recognise has to be describable to whoever will place it, and the only
  // chance to ask is this read.
  const read = await cloverGet<CloverV3Payment>(
    config.apiOrigin,
    `/v3/merchants/${active.merchantId}/payments/${cloverPaymentId}?expand=refunds,order,device,tender`,
    active.accessToken,
    active.merchantId,
  );
  const payment = read.data;

  if (!payment?.id) {
    return {
      kind: "unreadable",
      detail: read.status
        ? `Clover answered ${read.status} for this payment.`
        : "Could not reach Clover.",
    };
  }

  // The ORIGINAL row. A reversal also carries a processor_payment_id — the
  // void's or refund's own id — so restricting to a positive grand_total is
  // what keeps a reversal from being mistaken for the payment it reverses.
  const { data: original } = await admin
    .from("payments")
    .select(
      "id, facility_id, booking_id, client_id, method, subtotal, tax, tip, grand_total, amount_charged, card_brand, card_last4, entry_method, processor",
    )
    .eq("processor", "clover")
    .eq("processor_payment_id", cloverPaymentId)
    .gt("grand_total", 0)
    .maybeSingle();

  if (!original) {
    // This used to return `not_ours` and stop, on the reasoning that a payment
    // the merchant took on their own terminal is their business and inventing a
    // ledger row for it would put walk-in trade into Yipyy revenue.
    //
    // That reasoning was right about the ledger and wrong about the silence.
    // Two different things arrive here and only one of them is a stranger:
    //
    //   a TERMINAL SALE WHOSE RESPONSE WE LOST. The 150-second call died, so
    //   nothing was ever written — but Clover has the money and is holding the
    //   intent id we sent as externalPaymentId. That is ours, and recoverable.
    //
    //   a payment genuinely taken outside Yipyy. Still not a ledger row, but
    //   held where somebody can say what it was, instead of discarded so that
    //   the day's takings can never agree with Clover's.
    return claimOrHold(admin, facilityId, payment);
  }

  const voided = payment.result === "VOIDED";
  const refunded = (payment.refunds?.elements ?? []).reduce(
    (sum, refund) => sum + Math.max(0, Math.round(Number(refund.amount ?? 0))),
    0,
  );
  // Not added together: a void reverses the payment whole, and Clover leaves
  // refunds empty when it does.
  const reversedAtClover = voided ? cents(original.grand_total) : refunded;

  const { data: ours } = await admin
    .from("payments")
    .select("grand_total")
    .eq("refund_of_payment_id", original.id);

  const reversedInLedger = (ours ?? []).reduce(
    (sum, row) => sum + Math.abs(cents(row.grand_total)),
    0,
  );

  const gap = reversedAtClover - reversedInLedger;
  if (gap <= 0) {
    return {
      kind: "settled",
      detail:
        reversedAtClover === 0
          ? "Clover has reversed nothing on this payment."
          : `Already reconciled: ${reversedAtClover} cents reversed, ${reversedInLedger} recorded.`,
    };
  }

  // A FULL reversal is mirrored exactly — every component negated, so tax and
  // tip come back as they went out. A PARTIAL one cannot be split that way
  // without inventing an allocation, so it lands on the subtotal and the event
  // says so rather than quietly assigning somebody's tip.
  const full = gap === cents(original.grand_total) && reversedInLedger === 0;

  const row = full
    ? {
        subtotal: -Number(original.subtotal),
        tax: -Number(original.tax),
        tip: -Number(original.tip),
        grand_total: -Number(original.grand_total),
        amount_charged: -Number(original.amount_charged),
      }
    : {
        subtotal: -gap / 100,
        tax: 0,
        tip: 0,
        grand_total: -gap / 100,
        amount_charged: -gap / 100,
      };

  // Clover's own id for the reversal — the void's, or the refund's. Never one
  // we invent: `payments_processor_identity` is unique on it, so a made-up
  // value would be a made-up identity that a real delivery could then collide
  // with. Falling back to the payment id keeps the row insertable if Clover
  // ever omits both, and it will collide loudly rather than silently.
  const reference =
    (voided
      ? payment.voidPaymentRef?.id
      : payment.refunds?.elements?.[0]?.id) ?? cloverPaymentId;

  const { error } = await admin.from("payments").insert({
    facility_id: original.facility_id,
    booking_id: original.booking_id,
    client_id: original.client_id,
    method: original.method,
    ...row,
    processor: "clover",
    processor_payment_id: reference,
    refund_of_payment_id: original.id,
    card_brand: original.card_brand,
    card_last4: original.card_last4,
    entry_method: original.entry_method,
    // `payments` has no note column, so the author line is the only place the
    // reason survives on the row itself. The full detail — Clover's void
    // reason, the amounts on both sides — is on the webhook event.
    author_name: voided
      ? `Voided at Clover (${payment.voidReason ?? "no reason given"})`
      : "Refunded at Clover",
  });

  if (error) {
    return {
      kind: "unreadable",
      detail: `Clover reversed ${gap} cents but the ledger refused the row: ${error.message}`,
    };
  }

  return {
    kind: "reversed",
    amountCents: gap,
    detail: full
      ? `${voided ? "Voided" : "Refunded"} in full at Clover; ledger mirrored.`
      : `Partial reversal of ${gap} cents recorded against the subtotal — Clover does not say how it splits across tax and tip.`,
  };
}

export type ProfileRefresh =
  | { kind: "unchanged"; detail: string }
  | { kind: "updated"; detail: string }
  | { kind: "unreadable"; detail: string };

/**
 * Re-read the three facts a connection stores about its merchant.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * Currency and country are read ONCE, when the merchant connects, and then
 * believed forever. Currency is load-bearing: `chargeCard` refuses outright
 * rather than guess, because labelling a Canadian merchant's takings in dollars
 * is the sort of error that surfaces in an audit rather than in a test. A
 * merchant who changes their default currency in Clover would, without this,
 * keep being charged in the old one indefinitely.
 *
 * `M:` deliveries are the signal that something about the merchant moved. What
 * moved is not in the payload, so all three are re-read and compared.
 *
 * ── A NULL FROM CLOVER IS NOT A CHANGE ────────────────────────────────────
 *
 * fetchMerchantProfile returns null for anything it could not ask about, and
 * those three lookups fail independently. So a null means "no answer", never
 * "it is now empty", and nothing here overwrites a stored value with one. The
 * failure that rule prevents is a timeout on the properties call blanking a
 * currency and taking the facility's card payments down with it.
 */
export async function refreshMerchantProfile(
  facilityId: string,
): Promise<ProfileRefresh> {
  if (!hasServiceRoleKey()) {
    return { kind: "unreadable", detail: "No service role key." };
  }
  const admin = createAdminClient();

  const { data: connection } = await admin
    .from("payment_connections")
    .select("currency, country, public_api_key")
    .eq("processor", "clover")
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (!connection) {
    return { kind: "unreadable", detail: "No connection for this facility." };
  }

  const active = await validAccessToken(facilityId);
  if (!active) {
    return {
      kind: "unreadable",
      detail: "No usable access token for this merchant.",
    };
  }

  const profile = await fetchMerchantProfile(
    active.accessToken,
    active.merchantId,
    active.environment,
  );

  const changes: Record<string, string> = {};
  const notes: string[] = [];
  /**
   * Fields Clover would not answer for.
   *
   * Tracked separately because "we asked and it is the same" and "we asked and
   * got nothing" are different facts, and the first version of this reported
   * both as "all match" — a sentence asserting something it had not checked.
   */
  const unanswered: string[] = [];

  const compare = (
    column: "currency" | "country" | "public_api_key",
    label: string,
    fresh: string | null,
    quoteValues: boolean,
  ) => {
    if (fresh === null) {
      unanswered.push(label);
      return;
    }
    const stored = connection[column] as string | null;
    if (fresh === stored) return;
    changes[column] = fresh;
    notes.push(
      quoteValues
        ? `${label} ${stored ?? "unset"} → ${fresh}`
        : `${label} replaced`,
    );
  };

  compare("currency", "currency", profile.currency, true);
  compare("country", "country", profile.country, true);
  // Named but not printed: it is public, but a rotated key in an event log is
  // noise rather than information.
  compare("public_api_key", "public key", profile.publicApiKey, false);

  if (Object.keys(changes).length === 0) {
    if (unanswered.length > 0) {
      // NOT "unchanged". Something moved at the merchant, and the field that
      // might have moved is the one we could not read.
      return {
        kind: "unreadable",
        detail: `Merchant re-read, but Clover did not answer for: ${unanswered.join(", ")}. Nothing was overwritten.`,
      };
    }
    return {
      kind: "unchanged",
      detail: "Merchant re-read; currency, country and public key all match.",
    };
  }

  const { error } = await admin
    .from("payment_connections")
    .update({ ...changes, last_verified_at: new Date().toISOString() })
    .eq("processor", "clover")
    .eq("facility_id", facilityId);

  if (error) {
    return {
      kind: "unreadable",
      detail: `Merchant changed (${notes.join("; ")}) but the update failed: ${error.message}`,
    };
  }

  return {
    kind: "updated",
    detail:
      `Merchant updated — ${notes.join("; ")}.` +
      (unanswered.length > 0
        ? ` Clover did not answer for ${unanswered.join(", ")}; those were left alone.`
        : ""),
  };
}

export type ConnectionCheck = "live" | "revoked" | "unreachable";

/**
 * Is this merchant still ours?
 *
 * Asked whenever Clover reports an app-level event, because install, uninstall
 * and subscription changes all arrive as the same `A:` object and the payload
 * does not say which. Rather than infer it from the CREATE/UPDATE/DELETE verb —
 * a guess about Clover's vocabulary — the question is put to the API: a
 * merchant we can still read is connected, and a 401 is the grant being gone.
 *
 * `unreachable` is deliberately its own answer. A network blip must not revoke
 * a working merchant, so anything that is not a definite refusal leaves the
 * connection exactly as it was.
 */
export async function verifyConnection(
  facilityId: string,
): Promise<ConnectionCheck> {
  const active = await validAccessToken(facilityId);
  // No token at all, after a refresh attempt, is the strongest signal short of
  // a 401 — but it is still not a refusal from Clover, so it is not treated as
  // one. validAccessToken has already recorded the error on the connection.
  if (!active) return "unreachable";

  const config = cloverConfig(active.environment);
  if (!config) return "unreachable";

  const read = await cloverGet(
    config.apiOrigin,
    `/v3/merchants/${active.merchantId}`,
    active.accessToken,
    active.merchantId,
  );
  // `refused` is 401/403 only — the grant being gone. A 429 has already been
  // retried and, if it never cleared, reports as unreachable rather than
  // revoking a merchant for being busy.
  if (read.refused) return "revoked";
  return read.data ? "live" : "unreachable";
}

// ============================================================================
// A Clover payment with no Yipyy ledger row behind it.
//
// Two things arrive here wearing the same clothes, and telling them apart is
// the entire job.
//
// ── ONE OF THEM IS OURS AND WE LOST IT ────────────────────────────────────
//
// `chargeOnTerminal` is a single 150-second HTTP call. If it dies — a function
// timeout, a deploy, a dropped connection — Clover has taken the money and
// nothing was written. What survives is `externalPaymentId`: the intent id with
// its dashes stripped, which Clover has been storing on every terminal sale
// since the path was built and which nothing has ever read back.
//
// Put the dashes back and it is a primary key. That is why this needs no
// clever lookup: the identifier IS the row's id, written differently.
//
// ── THE OTHER IS SOMEBODY ELSE'S SALE ─────────────────────────────────────
//
// A walk-in rung up on the merchant's own terminal is real money at that
// merchant and NOT a Yipyy ledger row — inventing one would put a facility's
// counter trade into their Yipyy revenue. But discarding it, which is what
// happened until now, guarantees the day's takings in Yipyy can never agree
// with the day's takings in Clover, and gives nobody anything to look at.
//
// So it is held in `unattached_payments` until a person says what it was.
// ============================================================================

/** The 32 hex characters Clover holds, back into the uuid they came from. */
function intentIdFrom(external: string | undefined): string | null {
  if (!external || !/^[0-9a-fA-F]{32}$/.test(external)) return null;
  const h = external.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function claimOrHold(
  admin: ReturnType<typeof createAdminClient>,
  facilityId: string,
  payment: CloverV3Payment,
): Promise<PaymentReconciliation> {
  const cloverPaymentId = payment.id as string;

  // Clover's `amount` EXCLUDES the tip; `tipAmount` carries it separately. The
  // intent was opened for the sum of the two, which is what makes the check
  // inside record_clover_payment meaningful.
  const baseCents = Math.max(0, Math.round(Number(payment.amount ?? 0)));
  const tipCents = Math.max(0, Math.round(Number(payment.tipAmount ?? 0)));
  const taxCents = Math.max(
    0,
    Math.min(baseCents, Math.round(Number(payment.taxAmount ?? 0))),
  );

  // ── Was it ours all along? ───────────────────────────────────────────────
  const intentId = intentIdFrom(payment.externalPaymentId);
  if (intentId) {
    const { data: intent } = await admin
      .from("payment_intents")
      .select("id, facility_id, payment_id, amount_cents")
      .eq("id", intentId)
      .maybeSingle();

    // Belonging to ANOTHER facility is not a near miss to be tidied up — it
    // would attach this money to the wrong business. Fall through and hold it.
    if (intent && intent.facility_id === facilityId) {
      if (intent.payment_id) {
        // The intent already has its row, and the lookup at the top of
        // reconcilePayment did not find it. That means the ledger row carries a
        // different Clover id from this one, which is a real inconsistency and
        // not something to paper over by writing a second row.
        return {
          kind: "unreadable",
          detail: `Intent ${intentId} is already settled against a different payment id.`,
        };
      }

      const recorded = await admin.rpc("record_clover_payment", {
        p_intent_id: intentId,
        p_processor_payment_id: cloverPaymentId,
        p_subtotal_cents: baseCents - taxCents,
        p_tax_cents: taxCents,
        p_tip_cents: tipCents,
        p_card_brand: payment.cardTransaction?.cardType ?? null,
        p_card_last4: payment.cardTransaction?.last4 ?? null,
        p_auth_code: payment.cardTransaction?.authCode ?? null,
        p_entry_method: entryMethodOf(payment) ?? "chip",
        p_author_name: "Recovered from Clover",
      });

      if (!recorded.error && recorded.data) {
        return {
          kind: "recovered",
          detail: `A terminal sale whose response was lost has been completed from Clover's own record (intent ${intentId}).`,
          paymentId: recorded.data as unknown as string,
        };
      }

      // The commonest refusal is the amount check: the device collected a tip
      // we did not ask for, so Clover's total is not the total the intent was
      // opened for. That is a disagreement about money and it is held for a
      // person, never forced through.
      const why = recorded.error?.message ?? "the ledger refused the row";
      await holdIt(admin, facilityId, payment, baseCents, tipCents, taxCents);
      return {
        kind: "unattached",
        detail: `Matched intent ${intentId} but could not settle it (${why}). Held for review.`,
      };
    }
  }

  await holdIt(admin, facilityId, payment, baseCents, tipCents, taxCents);
  return {
    kind: "unattached",
    detail:
      "Taken at this merchant with no Yipyy payment behind it. Held to be attached.",
  };
}

async function holdIt(
  admin: ReturnType<typeof createAdminClient>,
  facilityId: string,
  payment: CloverV3Payment,
  baseCents: number,
  tipCents: number,
  taxCents: number,
): Promise<void> {
  await admin.rpc("record_unattached_payment", {
    p_facility_id: facilityId,
    p_processor_payment_id: payment.id as string,
    // The whole of it, tip included: this is what Clover took, and what a
    // person comparing the two systems is looking at.
    p_amount_cents: baseCents + tipCents,
    p_tip_cents: tipCents,
    p_tax_cents: taxCents,
    p_processor_order_id: payment.order?.id ?? null,
    p_processor_device_serial: payment.device?.serial ?? null,
    p_card_brand: payment.cardTransaction?.cardType ?? null,
    p_card_last4: payment.cardTransaction?.last4 ?? null,
    p_entry_method: entryMethodOf(payment),
    p_taken_at: payment.createdTime
      ? new Date(payment.createdTime).toISOString()
      : null,
    p_payload: payment as never,
  });
}

// ============================================================================
// An order event, which is a payment event wearing a different hat.
//
// Clover has no refund event type. A reversal surfaces as a `P:` UPDATE, and
// sometimes as an `O:` UPDATE on the order the payment belonged to — an amount
// changed, a line voided, a refund attached. Neither says what happened; both
// are a prompt to go and read.
//
// So an order resolves to its payments and each one is reconciled by the same
// gap arithmetic. Nothing here is order-specific, deliberately: a second way of
// deciding what a reversal means is a second thing to keep in step with the
// first.
// ============================================================================

export interface OrderReconciliation {
  status: "processed" | "ignored" | "failed";
  detail: string;
}

export async function reconcileOrder(
  facilityId: string,
  cloverOrderId: string,
): Promise<OrderReconciliation> {
  if (!hasServiceRoleKey()) {
    return { status: "failed", detail: "Clover is not configured here." };
  }

  const active = await validAccessToken(facilityId);
  if (!active) {
    return {
      status: "failed",
      detail: "No usable access token for this merchant.",
    };
  }

  const config = cloverConfig(active.environment);
  if (!config) {
    return {
      status: "failed",
      detail: `Clover is not configured for ${active.environment}.`,
    };
  }

  const read = await cloverGet<{
    id?: string;
    payments?: { elements?: { id?: string }[] };
  }>(
    config.apiOrigin,
    `/v3/merchants/${active.merchantId}/orders/${cloverOrderId}?expand=payments`,
    active.accessToken,
    active.merchantId,
  );

  if (!read.data?.id) {
    return {
      status: "failed",
      detail: read.status
        ? `Clover answered ${read.status} for order ${cloverOrderId}.`
        : `Could not read order ${cloverOrderId}.`,
    };
  }

  const paymentIds = (read.data.payments?.elements ?? [])
    .map((element) => element.id)
    .filter((id): id is string => Boolean(id));

  if (paymentIds.length === 0) {
    // An order with no payments is a cart, not money. Common and uninteresting:
    // Clover creates one the moment a line item is rung up.
    return {
      status: "ignored",
      detail: `Order ${cloverOrderId} carries no payments.`,
    };
  }

  const outcomes: string[] = [];
  let worst: OrderReconciliation["status"] = "processed";

  for (const paymentId of paymentIds) {
    const result = await reconcilePayment(facilityId, paymentId);
    outcomes.push(`${paymentId}: ${result.kind}`);
    // One unreadable payment does not make the others unhandled, but it does
    // leave work outstanding — and the whole delivery is the unit that gets
    // retried, so the worst outcome is the one that counts.
    if (result.kind === "unreadable") worst = "failed";
  }

  return {
    status: worst,
    detail: `Order ${cloverOrderId} → ${outcomes.join("; ")}`,
  };
}
