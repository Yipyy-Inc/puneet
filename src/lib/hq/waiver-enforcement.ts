import type { HQSettings } from "@/types/location";

/**
 * Decide whether a waiver signed for one client at one location is still
 * valid at a different location given current HQ settings.
 *
 * Returns true if the client can SKIP re-signing.
 */

export interface WaiverSignature {
  /** Version of the waiver they signed */
  waiverVersion: string;
  /** Where it was signed */
  locationId: string;
  /** When it was signed */
  signedAt: string;
}

export interface WaiverContext {
  currentVersion: string;
  attemptingLocationId: string;
  signature: WaiverSignature | null;
  settings: Pick<HQSettings, "sharedWaivers">;
}

export interface WaiverCheckResult {
  needsSigning: boolean;
  reason: string | null;
}

export function checkWaiverNeedsSigning(
  ctx: WaiverContext,
): WaiverCheckResult {
  if (!ctx.signature) {
    return {
      needsSigning: true,
      reason: "Customer has not signed this waiver yet.",
    };
  }
  if (ctx.signature.waiverVersion !== ctx.currentVersion) {
    return {
      needsSigning: true,
      reason: `Customer signed an older waiver version (${ctx.signature.waiverVersion}). Current version is ${ctx.currentVersion}.`,
    };
  }
  if (ctx.signature.locationId === ctx.attemptingLocationId) {
    return { needsSigning: false, reason: null };
  }
  if (ctx.settings.sharedWaivers) {
    return {
      needsSigning: false,
      reason: `Already signed at another location — shared waivers enabled.`,
    };
  }
  return {
    needsSigning: true,
    reason:
      "Waiver was signed at a different location and shared waivers are disabled in HQ Settings.",
  };
}
