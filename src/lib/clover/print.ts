import "server-only";

import { cloverConfig } from "@/lib/clover/config";
import { validAccessToken } from "@/lib/clover/connection";

// ============================================================================
// Commanding the terminal itself — its printer, its screen, its tip prompt.
//
// Everything here talks to the DEVICE rather than to the payment. Each
// section carries its own reasoning; the rule they share is at the bottom of
// this banner.
//
// Two endpoints of the REST Pay Display API:
//
//   POST /connect/v1/device/printers   empty body, answers with the printers
//   POST /connect/v1/device/print      { printDeviceId, text: [...] }
//
// ── NOTHING HERE MAY AFFECT A PAYMENT ─────────────────────────────────────
//
// Every function returns rather than throws, and the caller is expected to
// ignore a failure. A sale that succeeded and a receipt that did not print are
// a customer with a card charged and no paper — which is a nuisance. A sale
// reported as failed because the printer was out of paper is a customer charged
// twice, which is not.
//
// So: short timeouts, no retries, and the outcome is a boolean the caller may
// discard.
// ============================================================================

interface Printer {
  id: string;
  name?: string;
  type?: string;
}

function headers(
  accessToken: string,
  merchantId: string,
  serial: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Clover-Merchant-Id": merchantId,
    // The SERIAL. Named "Device-Id", is not the device id — same trap as the
    // payment call, and getting it wrong here is a 4xx rather than a wrong
    // printer.
    "X-Clover-Device-Id": serial,
    "X-POS-Id": "Yipyy",
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/**
 * The device's printers, or an empty list.
 *
 * The built-in roll is what we want; a merchant with an attached kitchen
 * printer would list more than one, and the first is the device's own.
 */
export async function devicePrinters(
  facilityId: string,
  deviceSerial: string,
): Promise<Printer[]> {
  const active = await validAccessToken(facilityId);
  if (!active) return [];

  const config = cloverConfig(active.environment);
  if (!config) return [];

  try {
    const response = await fetch(
      new URL("/connect/v1/device/printers", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: "{}",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      console.warn(
        `[clover-print] printers -> ${response.status} ${await response
          .text()
          .catch(() => "")}`.slice(0, 300),
      );
      return [];
    }
    const body = (await response.json().catch(() => null)) as
      | { printers?: Printer[] }
      | Printer[]
      | null;
    if (Array.isArray(body)) return body;
    return body?.printers ?? [];
  } catch (error) {
    console.warn("[clover-print] printers failed:", error);
    return [];
  }
}

/**
 * Print lines of text on the device.
 *
 * @returns whether the device accepted it — NOT whether paper came out, which
 *   nothing over HTTP can tell us.
 */
export async function printTextOnDevice(
  facilityId: string,
  deviceSerial: string,
  text: string[],
  printDeviceId?: string,
): Promise<{ printed: boolean; detail?: string }> {
  if (text.length === 0) return { printed: false, detail: "nothing to print" };

  const active = await validAccessToken(facilityId);
  if (!active) return { printed: false, detail: "no clover token" };

  const config = cloverConfig(active.environment);
  if (!config) return { printed: false, detail: "clover is not configured" };

  // The printer id is required. Asking for it costs one round trip and is the
  // only way to learn it — there is no "default printer" the API accepts.
  let printerId = printDeviceId;
  if (!printerId) {
    const printers = await devicePrinters(facilityId, deviceSerial);
    printerId = printers[0]?.id;
  }
  if (!printerId) return { printed: false, detail: "no printer on the device" };

  try {
    const response = await fetch(
      new URL("/connect/v1/device/print", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: JSON.stringify({ printDeviceId: printerId, text }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[clover-print] print -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { printed: false, detail: `${response.status}` };
    }
    return { printed: true };
  } catch (error) {
    console.warn("[clover-print] print failed:", error);
    return {
      printed: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

// ============================================================================
// Ending the transaction on the device's SCREEN.
//
// ── THE SPINNER IS NOT A HANG ─────────────────────────────────────────────
//
// Reported from the running app: after an approved sale "the clover terminal
// screen keeps loading". That is documented behaviour, not a fault. Clover:
// "End your customer transactions with a call to the Welcome or Thank You
// screen; otherwise, the spinning icon remains on the screen until another
// action is taken."
//
// REST Pay Display hands the device to the POS for the whole transaction and
// hands it back only when told. We took the money and never told it, so every
// sale left the terminal spinning until somebody reset it.
//
//   POST /connect/v1/device/thank-you   empty body — the sale completed
//   POST /connect/v1/device/welcome     empty body — it did not
//
// ── SAME RULE AS THE PRINTER ──────────────────────────────────────────────
//
// Cosmetic, and therefore never allowed to affect a payment: returns rather
// than throws, short timeout, no retries. A stuck screen is a nuisance; a sale
// reported as failed because a screen call timed out is a double charge.
// ============================================================================

/**
 * Return the device to a resting screen.
 *
 * @param kind `thank-you` after an approved sale, `welcome` after a decline,
 *   a cancellation or anything else that ends the attempt — a customer who
 *   just cancelled should not be thanked.
 * @returns whether the device accepted the command. Safe to ignore.
 */
export async function endTransactionScreen(
  facilityId: string,
  deviceSerial: string,
  kind: "thank-you" | "welcome",
): Promise<{ shown: boolean; detail?: string }> {
  const active = await validAccessToken(facilityId);
  if (!active) return { shown: false, detail: "no clover token" };

  const config = cloverConfig(active.environment);
  if (!config) return { shown: false, detail: "clover is not configured" };

  try {
    const response = await fetch(
      new URL(`/connect/v1/device/${kind}`, config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: "{}",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[clover-print] ${kind} -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { shown: false, detail: `${response.status}` };
    }
    return { shown: true };
  } catch (error) {
    console.warn(`[clover-print] ${kind} failed:`, error);
    return {
      shown: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

// ============================================================================
// Asking the CUSTOMER for a tip, on the device.
//
// ── WHY THE TIP MOVED OFF OUR SCREEN ──────────────────────────────────────
//
// Reported from the running app: "if we are taking payment from the terminal,
// it should show option to add tip on the terminal as well". Correct, and not
// only for convenience — a tip chosen by staff on a back-office screen and
// typed in on the customer's behalf is a different thing from a tip the payer
// selected themselves, and card-brand rules care about the difference.
//
// ── WHY NOT tipMode ───────────────────────────────────────────────────────
//
// The Clover SDKs take `TipMode.ON_SCREEN_BEFORE_PAYMENT` on the sale itself.
// REST Pay Display does not: its documented flows are a sale WITHOUT tipping,
// an auth with `/v1/payments/{id}/tip-adjust` afterwards, or this — ask the
// device first, then charge the total.
//
// That distinction matters here specifically. Tip-adjust needs a
// PRE-AUTHORISATION, and Canadian merchants cannot take those (it is the same
// constraint that forces `final: true` on the sale). So read-tip-then-charge is
// not a preference, it is the only on-screen tip flow open to this merchant.
//
//   POST /connect/v1/device/read-tip   { baseAmount }  ->  { response: <cents> }
//
// ── AND IT RUNS BEFORE ANY MONEY MOVES ────────────────────────────────────
//
// Unlike the printer and the screen, a failure here happens BEFORE the card is
// presented, so it cannot strand a payment. It still must not block the sale: a
// counter that cannot take money because a tip prompt timed out is worse than a
// counter that takes money without a tip. The caller treats null as "no tip".
// ============================================================================

export interface TipSuggestion {
  name: string;
  /** A flat amount in cents. Mutually exclusive with `percentage`. */
  amount?: number;
  /** A whole percentage of `baseAmount`. Mutually exclusive with `amount`. */
  percentage?: number;
}

/**
 * Show the tip screen and wait for the customer.
 *
 * @param baseAmountCents what the tip is calculated ON — the subtotal, not the
 *   total. Clover displays it as "Tip based on".
 * @returns the chosen tip in CENTS, or null if the customer declined, walked
 *   away, or the device could not be asked. Null is never an error to the
 *   caller: it means charge the base amount.
 */
export async function readTipOnDevice(
  facilityId: string,
  deviceSerial: string,
  baseAmountCents: number,
  tipSuggestions?: TipSuggestion[],
): Promise<number | null> {
  if (baseAmountCents <= 0) return null;

  const active = await validAccessToken(facilityId);
  if (!active) return null;

  const config = cloverConfig(active.environment);
  if (!config) return null;

  try {
    const response = await fetch(
      new URL("/connect/v1/device/read-tip", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: JSON.stringify({
          baseAmount: Math.round(baseAmountCents),
          ...(tipSuggestions?.length ? { tipSuggestions } : {}),
        }),
        // A person reading four options and pressing one. Shorter than the
        // payment timeout because nobody is holding a card yet.
        signal: AbortSignal.timeout(90_000),
      },
    );
    if (!response.ok) {
      console.warn(
        `[clover-print] read-tip -> ${response.status} ${await response
          .text()
          .catch(() => "")}`.slice(0, 300),
      );
      return null;
    }
    const body = (await response.json().catch(() => null)) as {
      response?: number;
    } | null;
    const tip = Number(body?.response ?? 0);
    // A negative or absurd tip is a malformed answer, not a generous customer.
    if (!Number.isFinite(tip) || tip <= 0) return null;
    return Math.min(Math.round(tip), 100_000);
  } catch (error) {
    console.warn("[clover-print] read-tip failed:", error);
    return null;
  }
}
