import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
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
//
// ── CLOVER OWNS THE LIST; facility_terminals ONLY NAMES IT ────────────────
//
// A facility can have several, and Clover gives nothing to tell them apart —
// the real Flex 4 arrives as name: null, productName: "Flex 4", serial
// "C046UG51931348". Three of those are indistinguishable, and picking wrong
// sends a customer's card request to a device in another room.
//
// So labels live in our own table, joined on the serial. The list itself stays
// Clover's: a device bought, activated or returned changes there and nowhere
// else. A serial with no row is still a usable terminal that simply has not
// been named — which is what stops a facility's second Flex being unusable
// until somebody remembers to add a row.
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
  /** What the facility calls it. Null until somebody names it. */
  label: string | null;
  /** The one a counter reaches for without choosing. */
  isDefault: boolean;
  /** Retired by the facility — kept out of pickers, keeps its payments. */
  isActive: boolean;
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

  // Labels, keyed by serial. Read with the ADMIN client because this is called
  // from server components and from the money path, and a customer paying their
  // own booking is not a facility member — the same reason chargeableConnection
  // does not go through RLS. Nothing sensitive is being read: it is a name.
  const labels = new Map<
    string,
    { label: string; isDefault: boolean; isActive: boolean }
  >();
  if (hasServiceRoleKey()) {
    const { data: named } = await createAdminClient()
      .from("facility_terminals")
      .select("serial, label, is_default, is_active")
      .eq("facility_id", facilityId);
    for (const row of named ?? []) {
      labels.set(row.serial as string, {
        label: row.label as string,
        isDefault: row.is_default === true,
        isActive: row.is_active !== false,
      });
    }
  }

  return {
    kind: "terminals",
    terminals: elements.map((device) => {
      const named = device.serial ? labels.get(device.serial) : undefined;
      return {
        id: device.id ?? "",
        // productName first: "Flex 4" is what a person calls it, "Clover_C406"
        // is what support will ask for, and both are shown.
        name: device.productName ?? device.name ?? null,
        serial: device.serial ?? null,
        model: device.model ?? device.deviceTypeName ?? null,
        support: classify(device),
        label: named?.label ?? null,
        isDefault: named?.isDefault ?? false,
        // Unnamed devices are ACTIVE. A facility that has not opened the
        // settings screen still has working terminals.
        isActive: named?.isActive ?? true,
      };
    }),
  };
}
