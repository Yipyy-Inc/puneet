import { NextResponse } from "next/server";

import { callingProvider } from "@/lib/calling/provider";
import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import {
  platformSendingNumber,
  platformTwilio,
  twilioWebhookUrls,
  webhooksAreReachable,
} from "@/lib/twilio/config";

// ============================================================================
// What telephony this deployment actually has.
//
// ── GET REPORTS; IT DOES NOT HAND OVER THE TOKEN ───────────────────────────
//
// The auth token is the credential that sends messages billed to Yipyy and
// reads every recording on the account. It never leaves the server, not even
// masked — masking is a decision made after the secret has already been sent,
// and a screen that was never given it cannot leak it.
//
// The Account SID does travel, because it is an identifier rather than a
// credential: it is in the path of every Twilio request and on the front page
// of their console. It earns its place on screen by answering the question a
// platform admin actually has when something is wrong — WHICH Twilio account is
// this deployment pointed at.
//
// ── AND THERE IS NO PATCH ──────────────────────────────────────────────────
//
// Credentials are set where the app is deployed. This replaced a form that
// accepted an Account SID and an Auth Token and wrote them to module state in
// the browser, alongside a Save button that toasted "Twilio configuration
// saved" and saved nothing. A form that appears to edit an environment variable
// describes an operation that cannot happen, which is the defect being removed
// here rather than one to reintroduce.
//
// ── POST IS A REAL CALL TO TWILIO ──────────────────────────────────────────
//
// The old "Test Connection" returned true when both fields were non-empty. That
// is not a test of anything; it passes against a token that was revoked months
// ago. This one authenticates against Twilio's own account endpoint, so it
// fails exactly when a real request would fail — wrong token, suspended
// account, no network.
// ============================================================================

export const dynamic = "force-dynamic";

async function requirePlatformAdmin() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may read this." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET() {
  const refusal = await requirePlatformAdmin();
  if (refusal) return refusal;

  const parent = platformTwilio();
  const supabase = await createServerClient();

  // How many facilities have a line of their own, and how many are broken. A
  // facility in `error` cannot send a pickup notification right now, and that
  // is the number worth surfacing before its customers notice.
  const { data: connections } = await supabase
    .from("communication_connections")
    .select("status")
    .eq("provider", "twilio");

  const rows = connections ?? [];

  return NextResponse.json({
    configured: parent !== null,
    // Null rather than a placeholder when unset: "not configured" and "pointed
    // at an account whose SID we are hiding" are different states.
    accountSid: parent?.accountSid ?? null,
    sendingNumber: platformSendingNumber(),
    webhooks: twilioWebhookUrls(),
    // Twilio will not POST to http://localhost and requires HTTPS. A local
    // deployment sends fine and receives nothing, which otherwise reads as a
    // broken number rather than as an address Twilio cannot reach.
    webhooksReachable: webhooksAreReachable(),
    facilityLines: {
      connected: rows.filter((r) => r.status === "connected").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
      inError: rows.filter((r) => r.status === "error").length,
      pending: rows.filter((r) => r.status === "pending").length,
    },
  });
}

export async function POST() {
  const refusal = await requirePlatformAdmin();
  if (refusal) return refusal;

  const parent = platformTwilio();
  if (!parent) {
    return NextResponse.json({
      ok: false,
      error:
        "No Twilio credentials on this deployment. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
    });
  }

  // Through the adapter, which owns the URL, the auth header and the deadline.
  // This route built its own; so did two senders and, shortly, provisioning.
  //
  // It is the one caller that shows the CARRIER'S own words rather than our
  // error map, and deliberately: a platform admin needs to tell a bad token
  // from a suspended account from a SID that does not exist, three states our
  // map collapses into one sentence for a receptionist.
  const provider = callingProvider();
  if (!provider) {
    return NextResponse.json({
      ok: false,
      error: "No phone provider is configured on this deployment.",
    });
  }

  const result = await provider.verifyCredentials(parent);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  return NextResponse.json({
    ok: true,
    friendlyName: result.friendlyName || null,
    // The carrier's own: active, suspended, closed. A suspended account
    // authenticates successfully and sends nothing, so an "ok" that ignored
    // this would be the old fake test with extra steps.
    accountStatus: result.status || null,
  });
}
