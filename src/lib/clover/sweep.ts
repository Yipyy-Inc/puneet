import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { validAccessToken } from "./connection";
import { reconcilePayment } from "./reconcile";
import { cloverGet } from "./request";

// ============================================================================
// Asking Clover what we missed.
//
// ── WHY A WEBHOOK IS NOT ENOUGH ───────────────────────────────────────────
//
// Clover's webhook documentation specifies no retry policy, no ordering, no
// duplicate policy and no delivery guarantee. It also cannot reach a laptop, so
// in local development nothing inbound ever arrives at all.
//
// The failure that costs money is not a webhook that never comes — it is one
// that comes, fails to process, and is answered 200 so Clover never sends it
// again. That is deliberate (a 4xx would have Clover redeliver an unprocessable
// event forever), and it means `payment_webhook_events` accumulates rows in
// 'received' and 'failed' that nothing has ever drained. The index that finds
// them, `payment_webhook_events_unsettled`, has existed since the table was
// created and has never had a caller.
//
// ── IT ASKS THE SAME QUESTION THE WEBHOOK ASKS ────────────────────────────
//
// Every path here ends in `reconcilePayment`, which is gap-based: it compares
// what Clover has reversed against what the ledger already holds and writes
// only the difference. So the sweep, a duplicate delivery and a refund issued
// through Yipyy all converge on the same answer, and running this twice in a
// row is not a risk to manage — it is the design.
//
// ── THE WATERMARK IS A FLOOR, NOT A BOOKMARK ──────────────────────────────
//
// `last_swept_at` is deliberately rewound by an overlap before it is used. A
// payment modified in the same second the previous sweep read its list would
// otherwise fall between two runs and never be seen by either.
// ============================================================================

/** How far back to look before the watermark. Cheap: reconciling is idempotent. */
const OVERLAP_MS = 10 * 60 * 1000;

/** The first sweep of a connection that has never been swept. */
const COLD_START_MS = 7 * 24 * 60 * 60 * 1000;

/** One page. Clover's default is 100 and its ceiling is 1000. */
const PAGE_SIZE = 100;

/** A stop, so a facility with a long history cannot run a function to death. */
const MAX_PAGES = 10;

export interface SweepResult {
  facilityId: string;
  /** Payments read from Clover and put through the reconciler. */
  examined: number;
  /** Reversals the ledger did not have. */
  reversed: number;
  /** Lost terminal sales finished from Clover's own copy. */
  recovered: number;
  /** Payments held for somebody to place. */
  unattached: number;
  /** Deliveries that had never been settled and now have been. */
  drained: number;
  /** Said plainly rather than thrown: one bad facility must not stop the rest. */
  problem: string | null;
}

interface CloverPaymentList {
  elements?: { id?: string }[];
}

function emptyResult(facilityId: string, problem: string | null): SweepResult {
  return {
    facilityId,
    examined: 0,
    reversed: 0,
    recovered: 0,
    unattached: 0,
    drained: 0,
    problem,
  };
}

/**
 * Bring one facility's ledger in line with Clover.
 *
 * Safe to run at any time, from anywhere, as often as you like.
 */
export async function sweepFacility(facilityId: string): Promise<SweepResult> {
  if (!hasServiceRoleKey()) {
    return emptyResult(facilityId, "The server cannot reach the database.");
  }

  const admin = createAdminClient();
  const result = emptyResult(facilityId, null);

  const { data: connection } = await admin
    .from("payment_connections")
    .select("merchant_id, status, last_swept_at")
    .eq("processor", "clover")
    .eq("facility_id", facilityId)
    .maybeSingle();

  if (!connection) {
    return emptyResult(facilityId, "This facility has no Clover connection.");
  }
  if (connection.status === "revoked") {
    // Not a problem to report. A facility that removed Yipyy from their Clover
    // dashboard is in a settled state, not a broken one.
    return emptyResult(facilityId, null);
  }

  const active = await validAccessToken(facilityId);
  if (!active) {
    return emptyResult(
      facilityId,
      "The Clover connection could not be refreshed.",
    );
  }

  const config = cloverConfig(active.environment);
  if (!config) {
    return emptyResult(
      facilityId,
      `Clover is not configured for ${active.environment}.`,
    );
  }

  const since = connection.last_swept_at
    ? Date.parse(connection.last_swept_at) - OVERLAP_MS
    : Date.now() - COLD_START_MS;

  // Taken BEFORE the read, not after. A payment modified while this runs must
  // be caught by the next sweep rather than skipped by a watermark that claims
  // to have covered the moment it was written.
  const startedAt = new Date().toISOString();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = [
      `filter=modifiedTime>${since}`,
      `limit=${PAGE_SIZE}`,
      `offset=${page * PAGE_SIZE}`,
      "expand=refunds",
    ].join("&");

    const read = await cloverGet<CloverPaymentList>(
      config.apiOrigin,
      `/v3/merchants/${active.merchantId}/payments?${query}`,
      active.accessToken,
      active.merchantId,
    );

    if (!read.data) {
      result.problem = read.status
        ? `Clover answered ${read.status} listing payments.`
        : "Could not reach Clover.";
      break;
    }

    const ids = (read.data.elements ?? [])
      .map((element) => element.id)
      .filter((id): id is string => Boolean(id));

    for (const id of ids) {
      const outcome = await reconcilePayment(facilityId, id);
      result.examined += 1;
      if (outcome.kind === "reversed") result.reversed += 1;
      if (outcome.kind === "recovered") result.recovered += 1;
      if (outcome.kind === "unattached") result.unattached += 1;
    }

    // A short page is the last page.
    if (ids.length < PAGE_SIZE) break;
  }

  result.drained = await drainUnsettled(admin, facilityId, active.merchantId);

  // Only on a clean pass. Moving the watermark past a page Clover refused to
  // give us would turn a temporary failure into a permanent hole.
  if (!result.problem) {
    await admin
      .from("payment_connections")
      .update({ last_swept_at: startedAt })
      .eq("processor", "clover")
      .eq("facility_id", facilityId);
    // rls-write-ok: the service-role client, on a row this function has already
    // read by primary key. There is no policy that could refuse it and so no
    // silent zero-row case to tell apart from a refusal.
  }

  return result;
}

/**
 * Settle deliveries that were recorded and never finished.
 *
 * The webhook route answers 200 even when processing fails — correctly, since
 * Clover would otherwise redeliver an unprocessable event forever. The cost of
 * that choice is a ledger of unfinished work that, until now, nothing read.
 *
 * ── A DELIVERY FROM A MERCHANT WE NO LONGER HOLD IS NOT WORK ──────────────
 *
 * Measured 2026-08-26, and it is why this needed the merchant argument. Three
 * events had been sitting `failed` since 8 August and were being retried every
 * fifteen minutes — roughly 1,700 attempts — with no possibility of ever
 * succeeding: they name merchant `796PJWMTZZH01`, and the facility's live
 * connection is `5ZQH512PQ0KP1`. `reconcilePayment` reads with the CURRENT
 * merchant's token, Clover answers 404 for a payment belonging to a different
 * estate, that returns `unreadable`, and `unreadable` was skipped and left for
 * next time. Forever, invisibly, burning a Clover API call each pass.
 *
 * A facility that reconnected under a new merchant leaves its old deliveries
 * behind by definition. They are closed as `ignored` — which is what they are,
 * historically true and permanently unactionable — rather than retried until
 * somebody happens to look.
 */
async function drainUnsettled(
  admin: ReturnType<typeof createAdminClient>,
  facilityId: string,
  merchantId: string,
): Promise<number> {
  const { data: stuck } = await admin
    .from("payment_webhook_events")
    .select("id, object_kind, object_id, merchant_id")
    .eq("facility_id", facilityId)
    .eq("object_kind", "P")
    .in("status", ["received", "failed"])
    .not("object_id", "is", null)
    .order("received_at", { ascending: true })
    .limit(50);

  let drained = 0;

  for (const event of stuck ?? []) {
    const objectId = event.object_id as string;

    // Closed WITHOUT a Clover read: there is no token that could satisfy it.
    if (event.merchant_id && event.merchant_id !== merchantId) {
      await admin.rpc("close_payment_webhook", {
        p_event_id: event.id as string,
        p_status: "ignored",
        p_outcome: `Merchant ${event.merchant_id} is no longer the one this facility has connected (${merchantId}); nothing here can read it.`,
      });
      drained += 1;
      continue;
    }

    const outcome = await reconcilePayment(facilityId, objectId);

    // Still unreadable. Leave it exactly as it is — a row that has failed twice
    // is more useful to a person than one whose failure has been rewritten.
    if (outcome.kind === "unreadable") continue;

    await admin.rpc("close_payment_webhook", {
      p_event_id: event.id as string,
      p_status: outcome.kind === "not_ours" ? "ignored" : "processed",
      p_outcome: `Settled by the sweep: ${outcome.detail}`,
    });
    drained += 1;
  }

  return drained;
}

/**
 * Every facility with a live Clover connection.
 *
 * One facility's failure is recorded on its own result and never thrown, so a
 * single revoked merchant cannot stop the sweep for everybody else.
 */
export async function sweepEveryFacility(): Promise<SweepResult[]> {
  if (!hasServiceRoleKey()) return [];

  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("payment_connections")
    .select("facility_id")
    .eq("processor", "clover")
    .in("status", ["connected", "error"]);

  const results: SweepResult[] = [];
  for (const connection of connections ?? []) {
    try {
      results.push(await sweepFacility(connection.facility_id as string));
    } catch (error) {
      results.push(
        emptyResult(
          connection.facility_id as string,
          error instanceof Error ? error.message : "The sweep threw.",
        ),
      );
    }
  }
  return results;
}
