import "server-only";

import { cloverConfig } from "@/lib/clover/config";
import { validAccessToken } from "@/lib/clover/connection";

// ============================================================================
// Printing on the terminal's own roll.
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
