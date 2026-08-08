import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig, cloverEnvironment } from "@/lib/clover/config";
import {
  reconcilePayment,
  refreshMerchantProfile,
  verifyConnection,
} from "@/lib/clover/reconcile";
import {
  authenticDelivery,
  parseDeliveries,
  verificationCode,
  webhookSecret,
  type CloverDelivery,
} from "@/lib/clover/webhook";

// ============================================================================
// What the merchant did when Yipyy was not looking.
//
// ── 200 IS ALMOST ALWAYS THE RIGHT ANSWER ─────────────────────────────────
//
// Clover retries anything that is not a 200, so a status code here is a
// scheduling instruction, not an opinion. An event we can never process — a
// payment that was never ours, a merchant we do not know — would be redelivered
// forever if it were a 4xx. It is recorded, closed with the reason, and
// answered 200.
//
// The one exception is authentication. A delivery without the shared secret
// gets a 401 and is not recorded, because recording it is exactly what an
// unauthenticated writer would want.
//
// ── THE HANDSHAKE CANNOT BE AUTHENTICATED, SO IT CLOSES ITSELF ────────────
//
// Clover's setup flow POSTs {"verificationCode":"…"} and, by their own
// documentation, the auth header only starts appearing AFTER the URL is
// verified. So the first message can never carry the secret.
//
// Rather than leave an unauthenticated door open forever, this branch is only
// live while CLOVER_WEBHOOK_SIGNING_SECRET is UNSET. Setting the secret is the
// last step of the handshake, so the door shuts the moment you finish walking
// through it, and nothing has to be remembered later.
//
// The code is written to payment_webhook_events, not just logged, because the
// person who needs to read it is looking at a deployed environment and should
// not have to go trawling platform logs for a UUID.
//
// ── A DELIVERY IS A HINT, NEVER A FACT ────────────────────────────────────
//
// `X-Clover-Auth` is a static shared secret; there is no signature and no
// replay protection in the protocol. So nothing here acts on what the message
// SAYS. It records that Clover mentioned an object, then goes and reads that
// object from the API with the merchant's own token, and every decision comes
// from the read. See lib/clover/reconcile.ts.
// ============================================================================

export const dynamic = "force-dynamic";

/** A delivery larger than this is not Clover. */
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  if (!cloverConfig()) {
    return NextResponse.json(
      { error: "Clover is not configured on this deployment." },
      { status: 503 },
    );
  }
  if (!hasServiceRoleKey()) {
    // Refusing is right: without the service role nothing can be recorded, and
    // answering 200 would tell Clover the delivery was handled when it was
    // dropped. A 503 makes them retry after the key is set.
    return NextResponse.json(
      { error: "The server cannot record deliveries." },
      { status: 503 },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Too large." }, { status: 413 });
  }

  const payload: unknown = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();
  if (!payload) {
    return NextResponse.json({ error: "Not JSON." }, { status: 400 });
  }

  const environment = cloverEnvironment();
  const admin = createAdminClient();

  // ── The handshake ────────────────────────────────────────────────────────
  const code = verificationCode(payload);
  if (code) {
    if (webhookSecret()) {
      // Already verified. Clover has no reason to send this again, and we have
      // no reason to accept an unauthenticated write.
      return NextResponse.json({ error: "Already verified." }, { status: 409 });
    }
    const handshake = await admin.rpc("record_payment_webhook", {
      p_processor: "clover",
      p_environment: environment,
      p_app_id: null,
      p_merchant_id: null,
      p_object_kind: "VERIFICATION",
      p_object_id: null,
      p_change: null,
      p_occurred_at: new Date().toISOString(),
      p_payload: payload as never,
    });

    // Closed immediately, with the code as the outcome. A handshake is finished
    // the moment it arrives — leaving it 'received' would park it in
    // payment_webhook_events_unsettled, which exists to show work outstanding,
    // and the code is the one thing somebody has to read back.
    const event = (
      handshake.data as unknown as { event_id: string }[] | null
    )?.[0];
    if (event?.event_id) {
      await admin.rpc("close_payment_webhook", {
        p_event_id: event.event_id,
        p_status: "processed",
        p_outcome: `Verification code: ${code}`,
      });
    }
    // Echoed as well as stored — harmless, since whoever can read this response
    // is Clover, and it saves a round trip through the database when testing.
    return NextResponse.json({ received: true, verificationCode: code });
  }

  // ── Everything else must carry the secret ────────────────────────────────
  if (!authenticDelivery(request.headers.get("x-clover-auth"))) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const { appId, deliveries } = parseDeliveries(payload);
  if (deliveries.length === 0) {
    return NextResponse.json({ received: true, handled: 0 });
  }

  let handled = 0;
  for (const delivery of deliveries) {
    const recorded = await admin.rpc("record_payment_webhook", {
      p_processor: "clover",
      p_environment: environment,
      p_app_id: appId,
      p_merchant_id: delivery.merchantId,
      p_object_kind: delivery.objectKind,
      p_object_id: delivery.objectId,
      p_change: delivery.change,
      p_occurred_at: delivery.occurredAt,
      p_payload: payload as never,
    });

    const row = (
      recorded.data as unknown as { event_id: string; is_new: boolean }[] | null
    )?.[0];
    if (!row?.event_id) continue;

    // A retry. The first delivery already decided what this means, and doing it
    // again is how one refund becomes two.
    if (!row.is_new) continue;

    handled += 1;
    const outcome = await act(admin, delivery);
    await admin.rpc("close_payment_webhook", {
      p_event_id: row.event_id,
      p_status: outcome.status,
      p_outcome: outcome.detail,
    });
  }

  return NextResponse.json({ received: true, handled });
}

type Settled = {
  status: "processed" | "ignored" | "failed";
  detail: string;
};

async function act(
  admin: ReturnType<typeof createAdminClient>,
  delivery: CloverDelivery,
): Promise<Settled> {
  const { data: connection } = await admin
    .from("payment_connections")
    .select("facility_id, status")
    .eq("processor", "clover")
    .eq("merchant_id", delivery.merchantId)
    .maybeSingle();

  if (!connection) {
    return {
      status: "ignored",
      detail: "No facility has connected this merchant.",
    };
  }
  const facilityId = connection.facility_id as string;

  switch (delivery.objectKind) {
    // ── Payments ─────────────────────────────────────────────────────────
    case "P": {
      const result = await reconcilePayment(facilityId, delivery.objectId);
      switch (result.kind) {
        case "reversed":
          return { status: "processed", detail: result.detail };
        case "settled":
          return { status: "processed", detail: result.detail };
        case "not_ours":
          return { status: "ignored", detail: result.detail };
        case "unreadable":
          // FAILED, not ignored. Something happened to a payment we know
          // about and we could not find out what — that is work outstanding,
          // and payment_webhook_events_unsettled is the index that finds it.
          return { status: "failed", detail: result.detail };
      }
      break;
    }

    // ── The app itself: installed, uninstalled, subscription changed ──────
    case "A": {
      const check = await verifyConnection(facilityId);
      if (check === "revoked") {
        const { data: changed } = await admin.rpc("revoke_payment_connection", {
          p_facility_id: facilityId,
          p_reason:
            "Clover refused this merchant's token after an app event — the merchant has removed Yipyy.",
        });
        return {
          status: "processed",
          detail: changed
            ? "Merchant no longer grants access; connection revoked."
            : "Merchant no longer grants access; connection was already revoked.",
        };
      }
      if (check === "live") {
        return {
          status: "processed",
          detail: "App event; the merchant still grants access.",
        };
      }
      return {
        status: "failed",
        detail: "Could not reach Clover to check whether access still holds.",
      };
    }

    // ── The merchant's own properties changed ────────────────────────────
    case "M": {
      const result = await refreshMerchantProfile(facilityId);
      switch (result.kind) {
        case "updated":
        case "unchanged":
          return { status: "processed", detail: result.detail };
        case "unreadable":
          // Failed rather than ignored: the merchant told us something moved
          // and we could not find out what. Leaving a stale currency in place
          // silently is precisely the outcome this subscription exists to
          // prevent, so it stays on the list of work outstanding.
          return { status: "failed", detail: result.detail };
      }
      break;
    }

    default:
      // Orders, customers, inventory. Yipyy subscribes to none of these, so if
      // one arrives it is a subscription somebody added in the dashboard and
      // the honest answer is that nothing here knows what to do with it.
      return {
        status: "ignored",
        detail: `Nothing here acts on a "${delivery.objectKind}" object.`,
      };
  }

  return { status: "ignored", detail: "Unhandled delivery." };
}
