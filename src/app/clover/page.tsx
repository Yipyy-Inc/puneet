import type { Metadata } from "next";

import { getViewer } from "@/lib/auth/viewer";
import { cloverConfig } from "@/lib/clover/config";
import {
  connectionStatus,
  recordConnection,
  recordConnectionError,
} from "@/lib/clover/connection";
import { exchangeCode, readOAuthState } from "@/lib/clover/oauth";

import { CloverResult, type CloverOutcome } from "./_components/clover-result";

export const metadata: Metadata = { title: "Clover — Yipyy" };
export const dynamic = "force-dynamic";

// ============================================================================
// Where Clover sends the merchant back.
//
// ── WHY THIS IS A PAGE AND NOT AN API ROUTE ───────────────────────────────
//
// Clover has ONE registered Site URL per app, and it uses it for two different
// things: the OAuth return, and where a merchant lands when they launch Yipyy
// from their own Clover dashboard. An API route would answer the second with
// raw JSON. So this handles both — `code` present means finish connecting,
// absent means show them where they stand.
//
// ── THE CODE IS SINGLE-USE, AND A REFRESH IS NOT AN ERROR ─────────────────
//
// A merchant who reloads this URL re-sends a code Clover has already consumed,
// and the exchange fails. That is not a failure worth showing: the connection
// succeeded a moment ago. So a failed exchange re-reads the connection, and if
// the facility is already connected it says so rather than reporting an error
// for a state that is actually fine.
//
// ── THE SESSION IS CHECKED AGAINST THE STATE ──────────────────────────────
//
// The signed state already proves which facility began the flow. Checking that
// the signed-in viewer is an owner of THAT facility is a second, independent
// question — it catches a state completed in someone else's browser, which
// signing alone does not.
// ============================================================================

const OWNER_ROLES = new Set(["owner", "admin"]);

interface SearchParams {
  code?: string;
  state?: string;
  merchant_id?: string;
  client_id?: string;
  error?: string;
  error_description?: string;
}

async function completeConnection(
  params: SearchParams,
): Promise<CloverOutcome> {
  // Clover declined or the merchant pressed cancel.
  if (params.error) {
    return {
      kind: "failed",
      title: "Clover did not complete the connection",
      detail:
        params.error_description ??
        "The merchant cancelled, or Clover refused the request.",
    };
  }

  const state = readOAuthState(params.state);
  if ("error" in state) {
    return {
      kind: "failed",
      title: "That link cannot be trusted",
      detail:
        state.error === "expired"
          ? "The connection link expired. Start again from your payment settings — it only lasts ten minutes."
          : "The returned link was altered or was not issued by us. Start again from your payment settings.",
    };
  }

  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return {
      kind: "failed",
      title: "You are not signed in",
      detail:
        "Sign in and start the connection again from your payment settings. Nothing was changed.",
    };
  }

  const owns = viewer.memberships.some(
    (m) => m.facilityId === state.facilityId && OWNER_ROLES.has(m.role),
  );
  if (!owns) {
    return {
      kind: "failed",
      title: "This connection was started by someone else",
      detail:
        "You are signed in as a different account from the one that began it. Nothing was changed.",
    };
  }

  if (!params.code || !params.merchant_id) {
    return {
      kind: "failed",
      title: "Clover did not return a merchant",
      detail:
        "The response was missing the authorisation code or the merchant id.",
    };
  }

  try {
    const tokens = await exchangeCode(params.code);
    await recordConnection({
      facilityId: state.facilityId,
      merchantId: params.merchant_id,
      tokens,
      connectedBy: viewer.userId,
    });
    return {
      kind: "connected",
      merchantId: params.merchant_id,
      environment: cloverConfig()?.environment ?? "sandbox",
    };
  } catch (error) {
    // A reload re-sends a spent code. If we are already connected, that is
    // what happened, and reporting a failure would be false.
    const existing = await connectionStatus(state.facilityId);
    if (existing.connected && existing.merchantId === params.merchant_id) {
      return {
        kind: "connected",
        merchantId: existing.merchantId,
        environment: existing.environment ?? "sandbox",
      };
    }

    const detail =
      error instanceof Error ? error.message : "The token exchange failed.";
    await recordConnectionError(state.facilityId, detail);
    return {
      kind: "failed",
      title: "Clover would not complete the exchange",
      detail,
    };
  }
}

export default async function CloverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!cloverConfig()) {
    return (
      <CloverResult
        outcome={{
          kind: "unconfigured",
        }}
      />
    );
  }

  // A return leg: Clover always sends `state` back, so its presence is what
  // distinguishes "returning from consent" from "launched the app".
  if (params.state || params.code || params.error) {
    return <CloverResult outcome={await completeConnection(params)} />;
  }

  // A launch, or somebody typing the URL. Say where they stand.
  const viewer = await getViewer().catch(() => null);
  const membership = viewer?.memberships.find((m) => OWNER_ROLES.has(m.role));

  if (!membership) {
    return <CloverResult outcome={{ kind: "signed-out" }} />;
  }

  const status = await connectionStatus(membership.facilityId);
  return (
    <CloverResult
      outcome={
        status.connected
          ? {
              kind: "connected",
              merchantId: status.merchantId ?? "—",
              environment: status.environment ?? "sandbox",
            }
          : { kind: "not-connected", lastError: status.lastError }
      }
    />
  );
}
