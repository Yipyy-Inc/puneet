import type { HQSettings } from "@/types/location";

/**
 * Centralized redemption rules — every loyalty / gift-card redemption
 * flow should call into here so the cross-location toggles in HQ Settings
 * actually take effect.
 */

export interface RedemptionContext {
  /** Where the redemption is being attempted */
  redemptionLocationId: string;
  /** Where the points were earned / gift card was purchased */
  originLocationId: string;
  /** HQ settings */
  settings: Pick<HQSettings, "crossLocationLoyalty" | "crossLocationGiftCards">;
}

export interface RedemptionResult {
  allowed: boolean;
  reason: string | null;
}

/**
 * Can a customer redeem loyalty points earned at `originLocationId`
 * at `redemptionLocationId`?
 */
export function canRedeemLoyalty(ctx: RedemptionContext): RedemptionResult {
  if (ctx.originLocationId === ctx.redemptionLocationId) {
    return { allowed: true, reason: null };
  }
  if (ctx.settings.crossLocationLoyalty) {
    return { allowed: true, reason: "Cross-location loyalty enabled" };
  }
  return {
    allowed: false,
    reason:
      "Loyalty points can only be redeemed at the location where they were earned. Enable cross-location loyalty in HQ Settings to allow this.",
  };
}

/**
 * Can a gift card purchased at `originLocationId` be redeemed at
 * `redemptionLocationId`?
 */
export function canRedeemGiftCard(ctx: RedemptionContext): RedemptionResult {
  if (ctx.originLocationId === ctx.redemptionLocationId) {
    return { allowed: true, reason: null };
  }
  if (ctx.settings.crossLocationGiftCards) {
    return { allowed: true, reason: "Cross-location gift cards enabled" };
  }
  return {
    allowed: false,
    reason:
      "This gift card was purchased at a different location. Enable cross-location gift cards in HQ Settings to allow this.",
  };
}
