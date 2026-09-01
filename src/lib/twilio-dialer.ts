// Client helpers for placing outbound support calls from the platform console.

export interface PlaceCallResult {
  ok: boolean;
  /**
   * Whether a call was genuinely handed to the provider.
   *
   * Separate from `ok` on purpose. The endpoint used to return a fabricated
   * `callSid` and `status: "queued"`, so every caller read `ok: true` and told
   * somebody the call was being placed while nothing dialled. `ok` now means
   * the request was accepted; `placed` means a call exists.
   */
  placed?: boolean;
  to?: string;
  from?: string;
  /** Why nothing was placed, when nothing was. */
  reason?: string;
  error?: string;
}

/** Derive the dialing prefix from the Yipyy support number, e.g.
 *  "+1 (415) 555-0100" → "+1 ". Empty string if no leading country code. */
export function supportDialPrefix(supportNumber: string | undefined): string {
  const m = (supportNumber ?? "").match(/^\s*(\+\d+)/);
  return m ? `${m[1]} ` : "";
}

/**
 * Ask the support desk's outbound endpoint to place a call.
 *
 * Was `/api/twilio/call`, which sat inside the proxy's `api/twilio` auth
 * exclusion and took both legs of the call from an unauthenticated request
 * body. It is now platform-admin only.
 */
export async function placeOutboundCall(params: {
  to: string;
  from: string;
}): Promise<PlaceCallResult> {
  try {
    const res = await fetch("/api/platform/calling/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as PlaceCallResult;
    return { ...data, ok: res.ok && data.ok !== false };
  } catch (e) {
    return {
      ok: false,
      placed: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
