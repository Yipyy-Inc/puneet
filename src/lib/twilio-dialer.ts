// Client helpers for placing outbound support calls through Twilio (Task 19).

export interface PlaceCallResult {
  ok: boolean;
  callSid?: string;
  to?: string;
  from?: string;
  status?: string;
  /** The TwiML webhook URL Twilio is pointed at for the dialed leg. */
  dialUrl?: string;
  error?: string;
}

/** Derive the dialing prefix from the Yipyy support number, e.g.
 *  "+1 (415) 555-0100" → "+1 ". Empty string if no leading country code. */
export function supportDialPrefix(supportNumber: string | undefined): string {
  const m = (supportNumber ?? "").match(/^\s*(\+\d+)/);
  return m ? `${m[1]} ` : "";
}

/** Digits only — used to validate a destination before dialing. */
export function dialDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Place an outbound call from the Yipyy support number to `to`. Initiates the
 *  call via the /api/twilio/call route (the Twilio REST calls.create integration
 *  point), which in turn points Twilio at the /api/twilio/dial TwiML webhook. */
export async function placeOutboundCall(params: {
  to: string;
  from: string;
}): Promise<PlaceCallResult> {
  try {
    const res = await fetch("/api/twilio/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = (await res.json()) as PlaceCallResult;
    return { ...data, ok: res.ok && data.ok !== false };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
