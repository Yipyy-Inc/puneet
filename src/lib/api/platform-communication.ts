"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

// ============================================================================
// The deployment's telephony, read from the server.
//
// No fallback and no seeded default. This replaced a client-side store that
// started life with `connected: true` and placeholder credentials, so every
// calling screen rendered a working phone system on a deployment that had never
// been given a Twilio account. An answer invented in the browser is worse than
// no answer: "connected" meant "somebody wrote a plausible object".
// ============================================================================

export interface TwilioWebhookUrls {
  inboundVoice: string;
  outboundDial: string;
  statusCallback: string;
  recording: string;
}

export interface PlatformCommunicationStatus {
  /** Both an Account SID and an Auth Token resolve on the server. */
  configured: boolean;
  /** The parent Account SID. An identifier, not a credential. */
  accountSid: string | null;
  /** The number Yipyy sends from when no facility is involved. */
  sendingNumber: string | null;
  webhooks: TwilioWebhookUrls;
  /** False on http:// — Twilio will not POST there, so nothing arrives. */
  webhooksReachable: boolean;
  /** How many facility subaccounts exist, by state. */
  facilityLines: {
    connected: number;
    suspended: number;
    inError: number;
    pending: number;
  };
}

export interface TwilioVerification {
  ok: boolean;
  error?: string;
  friendlyName?: string | null;
  accountStatus?: string | null;
  accountType?: string | null;
}

export const platformCommunicationQueries = {
  status: () => ({
    queryKey: ["platform-communication", "status"] as const,
    queryFn: async (): Promise<PlatformCommunicationStatus> => {
      const response = await fetch("/api/platform/communication");
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as PlatformCommunicationStatus;
    },
  }),
};

/**
 * An authenticated round-trip to Twilio. Fails exactly when a real request
 * would fail, which the boolean it replaced never did.
 */
export function useVerifyTwilio() {
  return useMutation({
    mutationFn: async (): Promise<TwilioVerification> => {
      const response = await fetch("/api/platform/communication", {
        method: "POST",
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      return (await response.json()) as TwilioVerification;
    },
  });
}

/**
 * What the calling screens need: can this deployment place a call, and from
 * what number.
 *
 * `connected` requires BOTH halves. The store this replaced kept them apart, so
 * a screen could report Twilio connected while holding no number to dial from —
 * and every call it offered to place would have been rejected for a missing
 * `from`.
 *
 * `pending` is separate so a screen cannot render "Twilio not configured" at a
 * person while the request that would say otherwise is still open.
 */
export function usePlatformTelephony(): {
  connected: boolean;
  sendingNumber: string | null;
  pending: boolean;
} {
  const { data, isPending } = useQuery(platformCommunicationQueries.status());
  return {
    connected: Boolean(data?.configured && data.sendingNumber),
    sendingNumber: data?.sendingNumber ?? null,
    pending: isPending,
  };
}
