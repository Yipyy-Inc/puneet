import "server-only";

import { cloverConfig } from "@/lib/clover/config";
import { validAccessToken } from "@/lib/clover/connection";
import type { CloverTipSuggestion } from "@/lib/tips";

// ============================================================================
// Commanding the terminal itself — its printer, its screen, its tip prompt.
//
// Everything here talks to the DEVICE rather than to the payment. Each
// section carries its own reasoning; the rule they share is at the bottom of
// this banner.
//
// Two endpoints of the REST Pay Display API:
//
//   POST /connect/v1/device/printers    empty body, answers with the printers
//   POST /connect/v1/device/print/text  { printDeviceId, text: [...] }
//
// ── /print/text, NOT /print ───────────────────────────────────────────────
//
// The guide prose says "the /v1/device/print endpoints require the printer's
// identifier", and building from that sentence produced /v1/device/print,
// which answers 404 {"message":"Invalid URI"}. The reference gives the literal
// path: /v1/device/print/text (and /v1/device/print/image for the other kind).
//
// It cost a live terminal test to find, because the failure is invisible from
// the outside: the payment succeeds, the response says receiptPrinted false,
// and the only place the 404 appears is the server log.
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
      new URL("/connect/v1/device/print/text", config.apiOrigin),
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

/**
 * Re-exported so callers of `readTipOnDevice` need only this module.
 *
 * The shape is DEFINED in `lib/tips.ts`, which is pure — the facility's tips
 * have to be turned into this shape by a client component and by a server
 * route, and `server-only` here would keep the components out. There was a
 * second copy of this interface until 2026-08-26; it declared `name` required
 * where Clover documents it optional, so a suggestion with no label could not
 * be expressed at all.
 */
export type { CloverTipSuggestion as TipSuggestion } from "@/lib/tips";

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
  tipSuggestions?: CloverTipSuggestion[],
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

// ============================================================================
// Letting the CUSTOMER choose how they get their receipt.
//
// ── WHAT THIS RESTORES ────────────────────────────────────────────────────
//
// Reported from the running app, with photographs of the device: "it does
// usually show options — if I click sale, then make the payment, it shows me
// the options". Correct. Clover's own Sale app ends with Print receipt / Email
// Receipt / Text Receipt, and a semi-integrated sale that just stops feels
// broken beside it.
//
// It is NOT true, as first concluded here, that REST Pay Display cannot do
// this. The guides index does not list it; the API reference does:
//
//   POST /connect/v1/device/receipt-options
//        { deliveryOptions: [{ method }], message? }
//     -> the customer's selection
//
// It needs no paymentId — it asks the question and hands back the answer. WE
// then deliver, which is the useful part: an EMAIL choice returns the address
// the customer typed on the device, so the receipt they get can be ours.
// ============================================================================

export type ReceiptMethod = "NO_RECEIPT" | "PRINT" | "EMAIL" | "SMS";

export interface ReceiptChoice {
  method: ReceiptMethod;
  /** The email address or phone number the customer entered, when they did. */
  additionalData?: string;
}

/**
 * Ask the customer how they want their receipt.
 *
 * @returns their choice, or null if they were not asked — a device that could
 *   not be reached, or a timeout. Null is not "no receipt": the caller should
 *   fall back to printing, because a customer who was never asked has not
 *   declined.
 */
export async function receiptOptionsOnDevice(
  facilityId: string,
  deviceSerial: string,
  methods: ReceiptMethod[] = ["PRINT", "EMAIL", "SMS", "NO_RECEIPT"],
): Promise<ReceiptChoice | null> {
  const active = await validAccessToken(facilityId);
  if (!active) return null;

  const config = cloverConfig(active.environment);
  if (!config) return null;

  try {
    const response = await fetch(
      new URL("/connect/v1/device/receipt-options", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: JSON.stringify({
          deliveryOptions: methods.map((m) => ({ method: m })),
        }),
        // A person choosing, and possibly typing an email address on a small
        // keyboard. The card is already charged, so nothing is held up by this.
        signal: AbortSignal.timeout(120_000),
      },
    );
    if (!response.ok) {
      console.warn(
        `[clover-print] receipt-options -> ${response.status} ${await response
          .text()
          .catch(() => "")}`.slice(0, 300),
      );
      return null;
    }
    const body = (await response.json().catch(() => null)) as {
      deliveryOptions?: ReceiptChoice[];
      response?: ReceiptChoice[] | ReceiptChoice;
    } | null;

    // The reference calls the result a ReceiptOptionsResponse carrying an
    // ARRAY. Read defensively rather than assume a shape: a wrong guess here
    // silently becomes "the customer chose nothing".
    const raw = body?.deliveryOptions ?? body?.response;
    const choice = Array.isArray(raw) ? raw[0] : raw;
    if (!choice?.method) return null;
    return { method: choice.method, additionalData: choice.additionalData };
  } catch (error) {
    console.warn("[clover-print] receipt-options failed:", error);
    return null;
  }
}

/**
 * Have CLOVER deliver its own receipt for a payment.
 *
 * Distinct from `printTextOnDevice`, which prints ours. Clover's is the
 * card-brand-compliant one — the docs are explicit that compliance is the
 * integrator's problem for custom receipts: "You are responsible to ensure the
 * receipts printed by your app comply with all card brand" rules. Ours carries
 * the itemised breakdown the facility asked for and Clover's carries the
 * payment furniture, so a PRINT choice sends both.
 *
 * @param processorPaymentId CLOVER's payment id, not ours.
 */
export async function deliverStandardReceipt(
  facilityId: string,
  deviceSerial: string,
  processorPaymentId: string,
  method: Exclude<ReceiptMethod, "NO_RECEIPT">,
  additionalData?: string,
): Promise<{ delivered: boolean; detail?: string }> {
  const active = await validAccessToken(facilityId);
  if (!active) return { delivered: false, detail: "no clover token" };

  const config = cloverConfig(active.environment);
  if (!config) return { delivered: false, detail: "clover is not configured" };

  try {
    const response = await fetch(
      new URL(
        `/connect/v1/payments/${encodeURIComponent(processorPaymentId)}/receipt`,
        config.apiOrigin,
      ),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: JSON.stringify({
          deliveryOption: {
            method,
            ...(additionalData ? { additionalData } : {}),
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[clover-print] receipt ${method} -> ${response.status} ${detail}`.slice(
          0,
          300,
        ),
      );
      return { delivered: false, detail: `${response.status}` };
    }
    return { delivered: true };
  } catch (error) {
    console.warn(`[clover-print] receipt ${method} failed:`, error);
    return {
      delivered: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

// ============================================================================
// The logo, on the thermal roll.
//
// ── WHY THIS IS A SEPARATE PRINT ──────────────────────────────────────────
//
// `/device/print/text` prints text. There is no field for an image, so a logo
// on a printed receipt is a second call to a second endpoint:
//
//   POST /connect/v1/device/print/image  { printDeviceId, image: <base64 png> }
//
// Sent BEFORE the text so the two come off the roll in the right order.
//
// ── AND WHY IT IS CONVERTED FIRST ─────────────────────────────────────────
//
// Clover's requirement is a base64 PNG, "black and white, no transparency". A
// receipt printer has one ink and no greys: it fires a dot or it does not. Hand
// it a colour or alpha PNG and the result is a black rectangle, or mud.
//
// So the image is flattened onto white, greyscaled, thresholded to pure black
// and white, and resized to the head's width. 384px is the safe figure — it is
// the full width of a 58mm head and half of an 80mm one, so it prints correctly
// on both rather than overflowing on the narrower Flex.
// ============================================================================

/** The printable width in dots. See the banner: safe on 58mm and 80mm alike. */
const LOGO_WIDTH_PX = 320;
/**
 * A logo may not take more roll than this, whatever its aspect ratio.
 *
 * 120 dots is 15mm. At 160 the logo was a fifth of an 89mm receipt, which is a
 * lot of paper for a mark nobody reads twice — "clean minimalist layout" was
 * asked for, and the logo was the largest single thing on it.
 */
const LOGO_MAX_HEIGHT_PX = 120;

/**
 * Fetch a logo and turn it into something a receipt printer can render.
 *
 * @returns the base64 PNG and its final dimensions — the caller needs them to
 *   place it — or null if it could not be fetched or converted. Null is never an
 *   error: a receipt without a logo is still a receipt.
 */
export async function logoAsPrintablePng(
  logoUrl: string,
): Promise<{ image: string; width: number; height: number } | null> {
  try {
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const source = Buffer.from(await response.arrayBuffer());

    // Imported here rather than at module scope: sharp is a native binary, and
    // this route must not fail to load on a runtime where it is unavailable.
    const { default: sharp } = await import("sharp");
    // TRIM FIRST. The logo uploaded on 2026-08-19 was 1024x1024 with the art in
    // the middle and transparent padding all round, so resizing it to 384 wide
    // produced a 384x384 square that was 96.7% white — about 48mm of blank roll
    // above the receipt, which is exactly what came out of the printer.
    const trimmed = await sharp(source)
      .trim({ threshold: 10 })
      .toBuffer()
      .catch(() => source);

    const png = await sharp(trimmed)
      .resize({
        width: LOGO_WIDTH_PX,
        // Capped, so a tall logo cannot push the bill off the bottom of a short
        // roll — the receipt is the thing the customer needs.
        height: LOGO_MAX_HEIGHT_PX,
        // Never enlarge: a 64px favicon blown up to 384 prints as a smear.
        withoutEnlargement: true,
        fit: "inside",
      })
      // Transparency becomes WHITE, not black. Most logos are dark art on a
      // transparent ground, and flattening the other way prints a solid block.
      .flatten({ background: "#ffffff" })
      .greyscale()
      // One ink, no greys. 190 rather than 128 because logos are typically
      // dark-on-light and a middling threshold eats thin strokes.
      .threshold(190)
      .png({ colours: 2 })
      .toBuffer();

    const meta = await sharp(png).metadata();

    // A logo that thresholds to almost nothing is a light mark meant for a dark
    // background, and a thermal head has no white ink. Printing it would feed
    // blank paper, so it is skipped — the same failure that put 48mm of nothing
    // above the last receipt, for the other reason.
    const raw = await sharp(png).greyscale().raw().toBuffer();
    let dark = 0;
    for (const value of raw) if (value < 128) dark += 1;
    if (dark / Math.max(1, raw.length) < 0.01) {
      console.warn("[clover-print] logo is blank once thresholded — skipping");
      return null;
    }

    return {
      image: png.toString("base64"),
      width: meta.width ?? LOGO_WIDTH_PX,
      height: meta.height ?? LOGO_MAX_HEIGHT_PX,
    };
  } catch (error) {
    console.warn("[clover-print] logo not printable:", error);
    return null;
  }
}

/**
 * Print a prepared image on the device.
 *
 * Cosmetic, like everything else in this file: returns rather than throws, and
 * the caller carries on whether this worked or not.
 */
export async function printImageOnDevice(
  facilityId: string,
  deviceSerial: string,
  /** Base64 PNG, already black and white. */
  image: string,
  printDeviceId?: string,
): Promise<{ printed: boolean; detail?: string }> {
  const active = await validAccessToken(facilityId);
  if (!active) return { printed: false, detail: "no clover token" };

  const config = cloverConfig(active.environment);
  if (!config) return { printed: false, detail: "clover is not configured" };

  let printerId = printDeviceId;
  if (!printerId) {
    const printers = await devicePrinters(facilityId, deviceSerial);
    printerId = printers[0]?.id;
  }
  if (!printerId) return { printed: false, detail: "no printer on the device" };

  try {
    const response = await fetch(
      new URL("/connect/v1/device/print/image", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: JSON.stringify({ printDeviceId: printerId, image }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[clover-print] print image -> ${response.status} ${detail}`.slice(
          0,
          300,
        ),
      );
      return { printed: false, detail: `${response.status}` };
    }
    return { printed: true };
  } catch (error) {
    console.warn("[clover-print] print image failed:", error);
    return {
      printed: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

// ============================================================================
// Stopping the device asking.
//
// ── THE GAP THIS CLOSES ───────────────────────────────────────────────────
//
// A payment request holds the device until somebody presents a card or it gives
// up. Our own request abandons after 150 seconds; THE DEVICE DOES NOT. So a
// customer who decides to pay cash, or a total rung wrong, left the terminal
// prompting with nothing in Yipyy able to clear it — the counter's only option
// was to walk over and press the device.
//
// Clover names this case exactly: halting a payment flow when the customer
// switches payment method or wants to add items.
//
// ── IT STOPS A PROMPT, IT DOES NOT UNDO A PAYMENT ─────────────────────────
//
// If the card was already approved, cancelling the prompt changes nothing about
// the money — and the caller must never tell somebody a payment was cancelled
// on that basis. What finds a payment taken in that race is reconciliation,
// which matches on the externalPaymentId the sale carried.
// ============================================================================

/**
 * Cancel whatever the device is currently asking for.
 *
 * The device returns to its welcome screen. Never throws: a cancel that fails
 * must not become a second problem on top of the one being cancelled.
 */
export async function cancelOnDevice(
  facilityId: string,
  deviceSerial: string,
): Promise<{ cancelled: boolean; detail?: string }> {
  const active = await validAccessToken(facilityId);
  if (!active) return { cancelled: false, detail: "no clover token" };

  const config = cloverConfig(active.environment);
  if (!config) return { cancelled: false, detail: "clover is not configured" };

  try {
    const response = await fetch(
      new URL("/connect/v1/device/cancel", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        // Documented as an empty POST. The device answers with an empty object.
        body: "{}",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[clover-print] cancel -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { cancelled: false, detail: `${response.status}` };
    }
    return { cancelled: true };
  } catch (error) {
    console.warn("[clover-print] cancel failed:", error);
    return { cancelled: false, detail: "unreachable" };
  }
}

// ============================================================================
// The cash drawer.
//
// A drawer is attached to the DEVICE, not to Yipyy, so opening one is a device
// command like printing is. A facility with no drawer gets an empty list and a
// button that says so — rather than one that fails when pressed, which is the
// same defect as a button that claims to have worked.
// ============================================================================

export interface CashDrawer {
  id: string;
  name: string | null;
  number: number | null;
}

/** The drawers this device can see. Empty when none is attached. */
export async function cashDrawers(
  facilityId: string,
  deviceSerial: string,
): Promise<CashDrawer[]> {
  const active = await validAccessToken(facilityId);
  if (!active) return [];

  const config = cloverConfig(active.environment);
  if (!config) return [];

  try {
    const response = await fetch(
      new URL("/connect/v1/device/cash-drawers", config.apiOrigin),
      {
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) return [];
    const body = (await response.json().catch(() => null)) as {
      drawers?: { id?: string; name?: string; number?: number }[];
    } | null;
    return (body?.drawers ?? [])
      .filter((drawer): drawer is { id: string } => Boolean(drawer.id))
      .map((drawer) => ({
        id: drawer.id,
        name: (drawer as { name?: string }).name ?? null,
        number: (drawer as { number?: number }).number ?? null,
      }));
  } catch (error) {
    console.warn("[clover-print] cash-drawers failed:", error);
    return [];
  }
}

/**
 * Open a cash drawer.
 *
 * @param cashDrawerId which drawer. Omitted, Clover opens the FIRST one it
 *   finds — the sane default for a counter with one drawer, and the reason this
 *   does not force a caller to list them first.
 */
export async function openCashDrawer(
  facilityId: string,
  deviceSerial: string,
  options: { cashDrawerId?: string | null; reason?: string } = {},
): Promise<{ opened: boolean; detail?: string }> {
  const active = await validAccessToken(facilityId);
  if (!active) return { opened: false, detail: "no clover token" };

  const config = cloverConfig(active.environment);
  if (!config) return { opened: false, detail: "clover is not configured" };

  try {
    const response = await fetch(
      new URL("/connect/v1/device/cash-drawer/open", config.apiOrigin),
      {
        method: "POST",
        headers: headers(active.accessToken, active.merchantId, deviceSerial),
        body: JSON.stringify(
          options.cashDrawerId
            ? {
                cashDrawerId: options.cashDrawerId,
                ...(options.reason ? { reason: options.reason } : {}),
              }
            : {},
        ),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[clover-print] cash-drawer/open -> ${response.status} ${detail}`.slice(
          0,
          300,
        ),
      );
      // 404 is the honest case: this device has no drawer attached. Passed back
      // so a screen can say that rather than "something went wrong".
      return {
        opened: false,
        detail: response.status === 404 ? "no drawer" : `${response.status}`,
      };
    }
    return { opened: true };
  } catch (error) {
    console.warn("[clover-print] cash-drawer/open failed:", error);
    return { opened: false, detail: "unreachable" };
  }
}
