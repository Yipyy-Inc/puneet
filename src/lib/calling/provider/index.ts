import "server-only";

import { platformTwilio } from "@/lib/twilio/config";

import { twilioProvider } from "./twilio";
import type { CallingProvider, ProviderCredentials } from "./types";

// ============================================================================
// Which provider this deployment has, and whose credentials to use.
//
// Two questions, deliberately separate. `callingProvider()` answers "is there a
// carrier at all"; the credentials are passed per call, because sending as
// Yipyy and sending as a facility's own subaccount are the same request with a
// different account — and the second one arrives with provisioning.
// ============================================================================

export type { CallingProvider, ProviderCredentials } from "./types";
export type {
  AvailableNumber,
  PurchasedNumber,
  SearchNumbersInput,
  SendSmsInput,
  SendSmsResult,
  Subaccount,
  VerifyResult,
} from "./types";

/** The configured provider, or null when this deployment has no telephony. */
export function callingProvider(): CallingProvider | null {
  return platformTwilio() ? twilioProvider : null;
}

/**
 * Yipyy's own credentials.
 *
 * Named `platform` rather than `default` on purpose: it is the account that
 * pays, and a call site reaching for it should have decided that consciously
 * rather than fallen into it. A facility with its own subaccount passes its own.
 */
export function platformCredentials(): ProviderCredentials | null {
  return platformTwilio();
}
