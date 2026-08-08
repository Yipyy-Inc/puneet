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
// ── WHAT CANNOT BE ANSWERED FROM HERE, AND IS NOT PRETENDED ───────────────
//
// Whether Cloud Pay Display is installed and RUNNING on a given device is a
// different question, and it needs the REST Pay Display API — which is gated on
// a Remote Application ID configured against the Clover app itself. Until that
// exists, `/connect/v1/*` answers:
//
//   401 "Authentication successful, but no Remote Application ID has been
//        configured for Application <appId>"
//
// So readiness here reports what it genuinely knows — connected, device
// present, model supported — and says the last step is unverified rather than
// showing a green tick nobody checked.
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
 * Classified from Clover's own naming, which is not a documented enum — so a
 * string nobody recognises is "unknown", not "unsupported". Telling a facility
 * their terminal will not work is a claim worth being sure of.
 */
function classify(model: string | null): TerminalSupport {
  if (!model) return "unknown";
  const lower = model.toLowerCase();
  if (CLOUD_CAPABLE.some((name) => lower.includes(name))) return "supported";
  if (lower.includes("station") || lower.includes("duo")) return "unsupported";
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
    terminals: elements.map((device) => {
      const model =
        device.model ?? device.deviceTypeName ?? device.productName ?? null;
      return {
        id: device.id ?? "",
        name: device.name ?? null,
        serial: device.serial ?? null,
        model,
        support: classify(model),
      };
    }),
  };
}
