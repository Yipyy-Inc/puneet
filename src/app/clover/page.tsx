import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { facilityStaffOrigin } from "@/lib/app-host";
import { getViewer } from "@/lib/auth/viewer";
import { cloverConfig, defaultCloverEnvironment } from "@/lib/clover/config";
import {
  recordConnection,
  recordConnectionError,
} from "@/lib/clover/connection";
import { connectionStatus } from "@/lib/clover/status";
import { facilityTerminals } from "@/lib/clover/devices";

import { FacilityTerminals } from "./_components/facility-terminals";
import { exchangeCode, readOAuthState } from "@/lib/clover/oauth";
import { fetchMerchantProfile } from "@/lib/clover/merchant";

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

  // Admin ACCESS at THE FACILITY THE STATE NAMES — not a job title, and not
  // "some facility they administer". A hardcoded owner/admin role set was
  // retired everywhere else (ADR 0005): a facility may promote its receptionist
  // to admin access without granting an owner's 168 permissions, and refusing
  // that person HERE is the worst place to do it — they have already approved
  // at Clover, so the merchant said yes and Yipyy then said no.
  const owns = viewer.memberships.some(
    (m) => m.facilityId === state.facilityId && m.accessLevel === "admin",
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

  // A connection being MADE goes to whichever estate new connections go to.
  // Every later call for this merchant reads the environment off the row
  // instead, which is what lets sandbox and production run side by side.
  const environment = defaultCloverEnvironment();

  try {
    const tokens = await exchangeCode(params.code);
    // Asked for now, while we hold a fresh token and know the merchant: the
    // currency, the country and the public key the browser will need. Each can
    // come back null without costing us the connection — a merchant who has
    // already approved must not be left unconnected because an enrichment
    // lookup timed out.
    const profile = await fetchMerchantProfile(
      tokens.accessToken,
      params.merchant_id,
      environment,
    );
    await recordConnection({
      facilityId: state.facilityId,
      merchantId: params.merchant_id,
      tokens,
      connectedBy: viewer.userId,
      environment,
      publicApiKey: profile.publicApiKey,
      currency: profile.currency,
      country: profile.country,
    });
    return {
      kind: "connected",
      merchantId: params.merchant_id,
      environment,
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

  // ── A LAUNCH FROM CLOVER'S OWN DASHBOARD ────────────────────────────────
  //
  // Clover documents that installing from the App Market, or clicking Yipyy in
  // the merchant dashboard, sends the merchant to the registered Site URL with
  // a `merchant_id` and NO authorisation code, and that the app is then the one
  // that must start /oauth/v2/authorize.
  //
  // That arrival used to be indistinguishable from somebody typing the URL: the
  // merchant id was ignored, and this hostname names no facility, so an admin
  // of two businesses was shown "Sign in to manage payments" while signed in.
  //
  // The merchant id decides what to SAY and where to send them. It never
  // decides what gets connected — the facility still comes from the session and
  // is still sealed into the signed state by /connect, which is the whole
  // security property of this flow (see the header of lib/clover/oauth.ts).
  const launchedMerchantId = params.merchant_id?.trim() || null;

  const active = await activeAdminFacility();

  if (active.kind === "none") {
    if (!launchedMerchantId) {
      return <CloverResult outcome={{ kind: "signed-out" }} />;
    }

    // `none` covers two different people — signed out, and signed in with no
    // admin access anywhere — and telling the second to sign in is the same
    // defect this branch exists to fix, one layer down.
    const viewer = await getViewer().catch(() => null);
    return (
      <CloverResult
        outcome={{
          kind: "launch-no-facility",
          merchantId: launchedMerchantId,
          signedIn: viewer?.source === "session",
        }}
      />
    );
  }

  if (active.kind === "ambiguous") {
    // Only answerable on a launch, where we can at least name the merchant they
    // came from. Without one there is nothing to disambiguate WITH, so the old
    // answer stands and their own settings screen renders the choice.
    if (!launchedMerchantId) {
      return <CloverResult outcome={{ kind: "signed-out" }} />;
    }

    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    return (
      <CloverResult
        outcome={{
          kind: "choose-facility",
          merchantId: launchedMerchantId,
          choices: active.choices.map((facility) => {
            const origin = facilityStaffOrigin(facility.slug, appDomain);
            return {
              id: facility.id,
              name: facility.name,
              // Carry the merchant through, so the facility's own address can
              // answer the same question with the same information.
              href: origin
                ? `${origin}/clover?merchant_id=${encodeURIComponent(launchedMerchantId)}`
                : null,
            };
          }),
        }}
      />
    );
  }

  const status = await connectionStatus(active.facility.id);

  if (launchedMerchantId) {
    // Not connected, and they have just come from a merchant account: start the
    // authorise call Clover expects the app to make. One facility, resolved
    // from their own membership — there is nothing to ask them.
    if (!status.connected) {
      redirect("/api/payments/clover/connect");
    }

    // Connected to something else. Worth its own screen: the connected card
    // would otherwise show a merchant id that is not the account they launched
    // from, with nothing explaining why.
    if (status.merchantId && status.merchantId !== launchedMerchantId) {
      return (
        <CloverResult
          outcome={{
            kind: "connected-elsewhere",
            connectedMerchantId: status.merchantId,
            launchedMerchantId,
          }}
        />
      );
    }
  }

  // Only asked once we know there IS a connection — reading devices needs the
  // merchant's token, and a facility that has not connected has none.
  const terminals = status.connected
    ? await facilityTerminals(active.facility.id)
    : ({ kind: "not_connected" } as const);

  return (
    <>
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
      <FacilityTerminals readiness={terminals} />
    </>
  );
}
