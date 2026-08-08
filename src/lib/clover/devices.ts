import "server-only";

import { cloverConfig } from "./config";
import { chargeableConnection, validAccessToken } from "./connection";
import { cloverGet } from "./request";

// ============================================================================
// The hardware a facility already owns.
//
// A terminal is not something Yipyy provisions. The facility buys a Clover
// device, it arrives bound to the merchant account they have already connected
// to us, and from that moment it is visible on their own merchant record. So
// "set up your terminal" is not a setup flow at all — it is a LIST, and the
// only question is which of their devices this facility takes payments on.
//
// ── WHETHER IT WILL ANSWER IS A SEPARATE QUESTION ─────────────────────────
//
// This lists what the merchant OWNS. Whether Cloud Pay Display is running on a
// given device is `deviceState()` in ./terminal.ts, which costs a round trip to
// the hardware and up to fifteen seconds when the app is closed — too slow to
// put in a page load, and asked on demand instead.
//
// ── ONLY THREE MODELS CAN DO THIS ─────────────────────────────────────────
//
// Cloud Pay Display runs on Clover Flex, Mini and Compact. A Station or Duo
// needs a pay-display app that connects over the local network, which a hosted
// application is not on. That is a purchasing decision, so it is surfaced
// against the device rather than discovered when a payment fails.
// ============================================================================

/** Models Cloud Pay Display supports — the only ones a hosted app can drive. */
const CLOUD_CAPABLE = ["flex", "mini", "compact"];

export type TerminalSupport = "supported" | "unsupported" | "unknown";

export interface Terminal {
  id: string;
  name: string | null;
  serial: string | null;
  /** Clover's own model string, shown verbatim — it is what support will ask for. */
  model: string | null;
  support: TerminalSupport;
}

export type TerminalReadiness =
  | { kind: "not_connected" }
  | { kind: "unreadable"; detail: string }
  | { kind: "no_terminals" }
  | { kind: "terminals"; terminals: Terminal[] };

interface CloverDevice {
  id?: string;
  name?: string;
  serial?: string;
  model?: string;
  deviceTypeName?: string;
  productName?: string;
}

/**
 * Classified from EVERY name Clover gives a device, because no single one is
 * reliable. A real Flex 4 comes back as:
 *
 *   model: "Clover_C406"   deviceTypeName: "FIGTREE"   productName: "Flex 4"
 *
 * Reading `model` alone — which this did — recognises none of that and reported
 * a perfectly supported terminal as "unknown". `productName` is the humane one,
 * but it is not guaranteed present, so all three are searched.
 *
 * A string nobody recognises stays "unknown", never "unsupported". Telling a
 * facility their hardware will not work is a claim worth being sure of.
 */
function classify(device: CloverDevice): TerminalSupport {
  const haystack = [device.productName, device.model, device.deviceTypeName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return "unknown";
  if (CLOUD_CAPABLE.some((name) => haystack.includes(name))) return "supported";
  if (haystack.includes("station") || haystack.includes("duo")) {
    return "unsupported";
  }
  return "unknown";
}

/** Every Clover device on this facility's merchant account. */
export async function facilityTerminals(
  facilityId: string,
): Promise<TerminalReadiness> {
  const connection = await chargeableConnection(facilityId);
  if (!connection) return { kind: "not_connected" };

  // The estate this merchant actually lives on.
  const config = cloverConfig(connection.environment);
  if (!config) return { kind: "not_connected" };

  const active = await validAccessToken(facilityId);
  if (!active) {
    return {
      kind: "unreadable",
      detail: "The connection to Clover could not be used.",
    };
  }

  const read = await cloverGet<{ elements?: CloverDevice[] }>(
    config.apiOrigin,
    `/v3/merchants/${active.merchantId}/devices`,
    active.accessToken,
    active.merchantId,
  );

  if (!read.data) {
    return {
      kind: "unreadable",
      detail: read.refused
        ? "Clover refused this merchant's token. The facility may need to reconnect."
        : `Clover answered ${read.status || "nothing"} when asked for this merchant's devices.`,
    };
  }

  const elements = read.data.elements ?? [];
  if (elements.length === 0) return { kind: "no_terminals" };

  return {
    kind: "terminals",
    terminals: elements.map((device) => ({
      id: device.id ?? "",
      // productName first: "Flex 4" is what a person calls it, "Clover_C406"
      // is what support will ask for, and both are shown.
      name: device.productName ?? device.name ?? null,
      serial: device.serial ?? null,
      model: device.model ?? device.deviceTypeName ?? null,
      support: classify(device),
    })),
  };
}
