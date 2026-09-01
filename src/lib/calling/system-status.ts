import "server-only";

import { platformTwilio, webhooksAreReachable } from "@/lib/twilio/config";

// ============================================================================
// Whether the phone system actually works, answered rather than asserted.
//
// The Calling module had two green cards — "System Status / Online / All
// systems operational" in the KPI strip and "System Online / All lines
// available" on the Live tab — and both were literal JSX. They said the same
// thing on a deployment with no telephony credentials at all, which is the
// state every developer machine and every preview build is in.
//
// This is the second time this exact defect has been fixed here. The first was
// `src/hooks/use-twilio-config.ts`, which held credentials in browser module
// state and seeded `connected: true`, so the support desk rendered as a live
// phone system with no provider behind it. That fix produced
// `platformTwilio()` — "unset here means unset" — and never reached these two
// cards, because they were not gated on anything at all. Nothing to fix meant
// nothing to find.
//
// So the determination lives in one place now, and both the facility tile and
// the platform status page read it.
//
// ── WHAT THIS CAN AND CANNOT KNOW ─────────────────────────────────────────
//
// It reports the deployment's telephony capability: whether a provider is
// configured, and whether inbound webhooks can physically reach us. It does
// NOT know whether a given facility has its own number — `communication_numbers`
// exists but nothing provisions into it yet (Phase 2). So the honest ceiling
// today is "the platform can place and receive calls", and the copy says that
// rather than implying a line this facility owns.
// ============================================================================

export type CallingSystemState = "operational" | "degraded" | "not_configured";

export interface CallingSystemStatus {
  state: CallingSystemState;
  /** The two-or-three word verdict, e.g. "Online". */
  headline: string;
  /** A few words, for the KPI tile — its three siblings carry hints this long. */
  hint: string;
  /** One sentence saying what is and is not working, for the wide Live card. */
  detail: string;
}

export function callingSystemStatus(): CallingSystemStatus {
  if (!platformTwilio()) {
    return {
      state: "not_configured",
      headline: "Not connected",
      hint: "No provider configured",
      detail:
        "No phone provider is configured — calls cannot be placed or received",
    };
  }

  // Configured, but a provider will not POST to http://localhost and requires
  // HTTPS. Outbound works perfectly on such a deployment and inbound silently
  // never arrives — the single most confusing telephony failure there is, and
  // worth naming on the card rather than reporting as "Online".
  if (!webhooksAreReachable()) {
    return {
      state: "degraded",
      headline: "Outbound only",
      hint: "Inbound calls not arriving",
      detail:
        "Inbound calls cannot reach this deployment — webhooks need a public HTTPS origin",
    };
  }

  return {
    state: "operational",
    headline: "Online",
    hint: "Provider connected",
    detail: "Provider connected · inbound calls can reach this deployment",
  };
}
