import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { validAccessToken } from "./connection";
import { facilityTerminals } from "./devices";
import { fetchMerchantProfile } from "./merchant";
import { cloverGet } from "./request";
import {
  allocate,
  refundCents,
  reversalsToRecord,
  settledRefunds,
  type Components,
} from "./reversal";

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
// voided, otherwise the sum of the refunds THAT SUCCEEDED — a listed refund
// carrying `status` other than SUCCESS, or `voided: true`, is not money, in
// exactly the way `payment.result` is checked one level up.
//
// ── IT RECONCILES THE GAP, NOT THE EVENT ──────────────────────────────────
//
// The question asked is never "did a refund happen" but "does our ledger
// already account for everything Clover has reversed". A duplicate delivery, a
// refund we issued ourselves through the app, and a manual reversal in Clover's
// dashboard all reduce to the same arithmetic, and only the shortfall is
// written. That is what makes this safe to run twice.
//
// ── AND IT IS WRITTEN ONE ROW PER REVERSAL ────────────────────────────────
//
// The shortfall says HOW MUCH is missing; it does not say what to call it. Each
// row is keyed to the id of the individual Clover void or refund it records, so
// two partial refunds on one payment are two rows with two identities. Keyed on
// the first refund instead — which is what this did until 2026-08-26 — the
// second one collided with the first on `payments_processor_identity` and was
// refused, and the money was simply never recorded.
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
  order?: { id?: string; currency?: string };
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
  /**
   * ── A REFUND ELEMENT IS NOT PROOF MONEY MOVED ───────────────────────────
   *
   * `status` and `voided` were both missing from this type and are both
   * present in the payloads Clover actually sends — verified against a stored
   * one: `{"id":"HNJGHGMPZ55BA","amount":40,"status":"SUCCESS","voided":false,…}`.
   *
   * This is the same trap that `payment.result === "SUCCESS"` exists to stop,
   * one level down, and it was never applied here: summing every element
   * counts a FAILED or subsequently VOIDED refund as money given back, so the
   * ledger records a reversal that never happened and the facility appears to
   * have returned money it still holds.
   *
   * There is deliberately NO taxAmount/tipAmount here, because Clover does not
   * send them on a refund. The nested `payment` object carries the ORIGINAL
   * payment's tax and tip, not this refund's share of them — which is why the
   * split has to be derived. See `allocate()`.
   */
  refunds?: {
    elements?: {
      id?: string;
      amount?: number;
      status?: string;
      voided?: boolean;
    }[];
  };
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
 *
 * ── `reason` IS ONLY EVER THE OPERATOR'S ──────────────────────────────────
 *
 * Optional, and optional in a way that matters. `/api/payments/clover/refund`
 * has one — somebody typed it into the dialog — and passes it so the row can
 * say why. The sweep and the webhook do NOT: they are looking at a reversal
 * that happened at Clover, where nobody here was asked anything, and inventing
 * a reason for it would be worse than leaving the field empty. `author_name`
 * already says "Refunded at Clover" in that case, which is the whole truth.
 */
export async function reconcilePayment(
  facilityId: string,
  cloverPaymentId: string,
  reason?: string,
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
    `/v3/merchants/${active.merchantId}/payments/${cloverPaymentId}?expand=refunds,order,device,tender,cardTransaction`,
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
    return claimOrHold(admin, facilityId, payment, active.merchantId);
  }

  const voided = payment.result === "VOIDED";
  const refunds = settledRefunds(payment.refunds?.elements);
  const refunded = refunds.reduce(
    (sum, refund) => sum + refundCents(refund),
    0,
  );
  // Not added together: a void reverses the payment whole, and Clover leaves
  // refunds empty when it does.
  const reversedAtClover = voided ? cents(original.grand_total) : refunded;

  const { data: ours } = await admin
    .from("payments")
    .select("grand_total, processor_payment_id")
    .eq("refund_of_payment_id", original.id);

  const reversedInLedger = (ours ?? []).reduce(
    (sum, row) => sum + Math.abs(cents(row.grand_total)),
    0,
  );

  // Which of Clover's reversals the ledger can already name. A row written
  // before this file recorded refunds individually carries an aggregate
  // identity that matches none of them — which is exactly why the gap below
  // stays as a ceiling rather than being replaced by this set.
  const alreadyRecorded = new Set(
    (ours ?? [])
      .map((row) => row.processor_payment_id)
      .filter((id): id is string => Boolean(id)),
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

  const of: Components = {
    subtotal: cents(original.subtotal),
    tax: cents(original.tax),
    tip: cents(original.tip),
    grandTotal: cents(original.grand_total),
  };

  // One row per thing Clover actually did, each keyed to its own Clover id, and
  // the gap kept as a ceiling so a legacy aggregate row is not double-counted.
  // The reasoning, and the collision this replaced, are in `reversal.ts`.
  const reversals = reversalsToRecord({
    voided,
    voidReference: payment.voidPaymentRef?.id,
    paymentId: cloverPaymentId,
    refunds,
    gap,
    alreadyRecorded,
  });

  if (reversals.length === 0) {
    return {
      kind: "settled",
      detail: `Clover reports ${reversedAtClover} cents reversed and the ledger holds ${reversedInLedger}, but no reversal could be named to record the difference.`,
    };
  }

  let recorded = 0;
  const notes: string[] = [];

  for (const reversal of reversals) {
    const split = allocate(reversal.amount, of);
    const whole = split.total >= of.grandTotal;

    const { error } = await admin.from("payments").insert({
      facility_id: original.facility_id,
      booking_id: original.booking_id,
      client_id: original.client_id,
      method: original.method,
      subtotal: -split.subtotal / 100,
      tax: -split.tax / 100,
      tip: -split.tip / 100,
      grand_total: -split.total / 100,
      // The whole payment coming back returns exactly what was charged; a part
      // of it returns that part.
      amount_charged: whole
        ? -Number(original.amount_charged)
        : -split.total / 100,
      processor: "clover",
      processor_payment_id: reversal.reference,
      refund_of_payment_id: original.id,
      card_brand: original.card_brand,
      card_last4: original.card_last4,
      entry_method: original.entry_method,
      author_name: voided
        ? `Voided at Clover (${payment.voidReason ?? "no reason given"})`
        : "Refunded at Clover",
      // WHY, when somebody was there to say. Null from the sweep and the webhook
      // on purpose — see the note on this function's signature. Clover's own
      // void reason is not it: that is a processor code, and it is already in
      // `author_name` and on the webhook event.
      note: reason?.trim() || null,
    });

    if (error) {
      // A replay of a reversal already in the ledger. Normal, not a failure:
      // the webhook and the sweep ask the same question and both are meant to
      // be able to run twice.
      //
      // EXCEPT when the reference is the PAYMENT's own id. That is the last-
      // resort identity used when Clover names neither a void nor a refund, and
      // the row it collides with is then the original payment itself — not a
      // reversal already recorded. Reading that as "already done" would report
      // a reversal as settled while nothing was written and the booking still
      // showed the money as held. It has to stay loud, which is what the
      // previous single-row version promised and this nearly took away.
      if (error.code === "23505" && reversal.reference !== cloverPaymentId) {
        notes.push(`${reversal.reference}: already recorded`);
        continue;
      }
      // Anything else is left OUTSTANDING on purpose — the rows written before
      // it stand (the money did come back), and the gap arithmetic will bring
      // the rest round again on the next sweep.
      return {
        kind: "unreadable",
        detail: `Clover reversed ${gap} cents; recorded ${recorded} before the ledger refused ${reversal.reference}: ${error.message}`,
      };
    }

    recorded += reversal.amount;
    notes.push(`${reversal.reference}: ${reversal.amount}`);
  }

  if (recorded === 0) {
    return {
      kind: "settled",
      detail: `Already reconciled: ${reversedAtClover} cents reversed, every reversal already in the ledger.`,
    };
  }

  const mirrored = recorded === of.grandTotal && reversedInLedger === 0;

  return {
    kind: "reversed",
    amountCents: recorded,
    detail: mirrored
      ? `${voided ? "Voided" : "Refunded"} in full at Clover; ledger mirrored.`
      : `Partial reversal of ${recorded} cents across ${reversals.length} reversal(s) — ${notes.join(", ")}. Tax and tip split in proportion to the original; Clover does not say how it splits them.`,
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

/**
 * The Clover `result` values that mean money actually changed hands.
 *
 * Measured, not assumed: the first sweep of the live merchant surfaced two
 * $62.50 payments against booking 896 that this file offered up for a human to
 * attach. Both were `FAIL` — a declined card, no `cardTransaction`, no
 * `device`, no money. Attaching one would have marked the booking paid for
 * takings that do not exist, which is the precise inverse of what holding
 * unattached payments is for.
 *
 * `SUCCESS` alone. Not `FAIL`, not `INITIALIZED`, and not `AUTH` — an
 * authorisation is a hold, not a taking. `VOIDED` is deliberately absent too:
 * a void that never reached the ledger nets to nothing, so there is nothing to
 * attach. (A void on a payment Yipyy DOES know about is handled far above, on
 * the branch that mirrors reversals.)
 */
const RESULT_MEANS_MONEY_MOVED = "SUCCESS";

async function claimOrHold(
  admin: ReturnType<typeof createAdminClient>,
  facilityId: string,
  payment: CloverV3Payment,
  merchantId: string,
): Promise<PaymentReconciliation> {
  const cloverPaymentId = payment.id as string;

  // BEFORE the intent lookup, deliberately. A failed payment that happens to
  // carry a matching externalPaymentId is the worse case of the two: it would
  // not merely be held for review, it would go straight into
  // `record_clover_payment` and become an append-only ledger row for a card
  // that declined. There is no correcting that row afterwards.
  if (payment.result !== RESULT_MEANS_MONEY_MOVED) {
    return {
      kind: "not_ours",
      detail: `Clover reports this payment as ${payment.result ?? "having no result"}; no money was taken.`,
    };
  }

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
      await holdIt(
        admin,
        facilityId,
        payment,
        merchantId,
        baseCents,
        tipCents,
        taxCents,
      );
      return {
        kind: "unattached",
        detail: `Matched intent ${intentId} but could not settle it (${why}). Held for review.`,
      };
    }
  }

  await holdIt(
    admin,
    facilityId,
    payment,
    merchantId,
    baseCents,
    tipCents,
    taxCents,
  );
  return {
    kind: "unattached",
    detail:
      "Taken at this merchant with no Yipyy payment behind it. Held to be attached.",
  };
}

// ── Which till took it ────────────────────────────────────────────────────
//
// Clover carries `device` on a payment as a bare reference — `{ id: "43cbda75-
// 8d97-757c-1c59-068cf4026206" }` — and `expand=device` does NOT add the
// serial. Measured, not assumed: the first live sweep stored exactly that and
// left `processor_device_serial` null on every payment it held.
//
// A uuid means nothing to the person holding the terminal. The serial is the
// number printed on the sticker, and it is already what the terminal path
// writes into that column via `record_clover_payment`. Translating here keeps
// ONE meaning in the column instead of two, which is the whole reason the
// column is named for the serial and not for "whatever Clover said".
//
// Cached per facility: a sweep of a hundred payments must not become a hundred
// device lookups, and a merchant's terminals do not change between two
// payments. A miss is null — an unknown till is not worth failing a sweep for.
const DEVICE_ESTATE_MS = 5 * 60_000;
const deviceEstate = new Map<
  string,
  { readAt: number; serialById: Map<string, string> }
>();

async function serialFor(
  facilityId: string,
  deviceId: string | undefined,
): Promise<string | null> {
  if (!deviceId) return null;

  const cached = deviceEstate.get(facilityId);
  if (cached && Date.now() - cached.readAt < DEVICE_ESTATE_MS) {
    return cached.serialById.get(deviceId) ?? null;
  }

  const read = await facilityTerminals(facilityId);
  const serialById = new Map<string, string>();
  if (read.kind === "terminals") {
    for (const terminal of read.terminals) {
      if (terminal.serial) serialById.set(terminal.id, terminal.serial);
    }
  }
  deviceEstate.set(facilityId, { readAt: Date.now(), serialById });
  return serialById.get(deviceId) ?? null;
}

async function holdIt(
  admin: ReturnType<typeof createAdminClient>,
  facilityId: string,
  payment: CloverV3Payment,
  merchantId: string,
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
    // Both of these have been parameters of record_unattached_payment since the
    // migration that created it, defaulting to null, and nothing passed either.
    // The merchant is the sharp one: attach_unattached_payment copies it onto
    // the `payments` row, and `payments` cannot be updated — so a null here is
    // a permanently anonymous ledger row, which is the exact thing the client
    // asked us not to produce.
    p_processor_merchant_id: merchantId,
    // Clover states it on the order, per payment, rather than making us assume
    // the connection's settlement currency still matches this one.
    p_currency: payment.order?.currency ?? null,
    p_processor_device_serial:
      payment.device?.serial ??
      (await serialFor(facilityId, payment.device?.id)),
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
