import type { LoyaltyNotificationSettings } from "@/types/loyalty";
import type { LoyaltyNotification } from "./engine";

/**
 * Resolve which channels (portal / email) a given loyalty notification should
 * use, from the facility's notification settings. Used by the dispatch layer to
 * honour the per-type enabled toggles + delivery method. When no settings are
 * present, everything is on (the default).
 */

export interface NotificationChannels {
  portal: boolean;
  email: boolean;
}

function methodChannels(method: "email" | "portal" | "both"): NotificationChannels {
  return {
    portal: method === "portal" || method === "both",
    email: method === "email" || method === "both",
  };
}

const ALL_ON: NotificationChannels = { portal: true, email: true };
const OFF: NotificationChannels = { portal: false, email: false };

export function notificationChannels(
  settings: LoyaltyNotificationSettings | undefined,
  type: LoyaltyNotification["type"],
): NotificationChannels {
  if (!settings) return ALL_ON;
  switch (type) {
    case "program_welcome":
      return settings.welcomeEnabled ? methodChannels(settings.welcomeMethod) : OFF;
    case "points_earned":
      // Portal/push only by policy — never email per-transaction.
      return { portal: settings.pointsEarnedEnabled, email: false };
    case "tier_upgrade":
      return settings.tierUpgradeEnabled
        ? methodChannels(settings.tierUpgradeMethod)
        : OFF;
    case "badge_unlocked":
      return {
        portal: settings.badgeEarnedEnabled,
        email: settings.badgeEarnedEnabled,
      };
    case "referral_reward_applied":
      return {
        portal: settings.referralRewardEnabled,
        email: settings.referralRewardEnabled,
      };
  }
}

// ---------------------------------------------------------------------------
// UI metadata — drives the Notifications settings tab.
// ---------------------------------------------------------------------------

export type NotificationSettingKey =
  | "welcome"
  | "pointsEarned"
  | "tierUpgrade"
  | "badgeEarned"
  | "rewardExpiry"
  | "pointsExpiry"
  | "referralReward";

export interface NotificationRowMeta {
  key: NotificationSettingKey;
  /** `${key}Enabled` field on the settings object. */
  enabledField: keyof LoyaltyNotificationSettings;
  /** `${key}Method` field, when the type supports a delivery method. */
  methodField?: keyof LoyaltyNotificationSettings;
  /** Template key (matches LoyaltyNotification.type) for custom-message editing. */
  templateKey?: LoyaltyNotification["type"];
  label: string;
  description: string;
}

export const NOTIFICATION_ROWS: NotificationRowMeta[] = [
  {
    key: "welcome",
    enabledField: "welcomeEnabled",
    methodField: "welcomeMethod",
    templateKey: "program_welcome",
    label: "Welcome to the program",
    description: "Sent the first time a customer earns points.",
  },
  {
    key: "pointsEarned",
    enabledField: "pointsEarnedEnabled",
    label: "Points earned",
    description: "Confirmation after every booking that earns points (portal only).",
  },
  {
    key: "tierUpgrade",
    enabledField: "tierUpgradeEnabled",
    methodField: "tierUpgradeMethod",
    label: "Tier upgrade",
    description: "When a customer reaches a new tier.",
  },
  {
    key: "badgeEarned",
    enabledField: "badgeEarnedEnabled",
    label: "Badge earned",
    description: "When a customer unlocks an achievement badge.",
  },
  {
    key: "rewardExpiry",
    enabledField: "rewardExpiryEnabled",
    label: "Reward expiry warning",
    description: "Reminder before an active reward expires.",
  },
  {
    key: "pointsExpiry",
    enabledField: "pointsExpiryEnabled",
    label: "Points expiry warning",
    description: "Reminder before inactive points expire (if points expiry is on).",
  },
  {
    key: "referralReward",
    enabledField: "referralRewardEnabled",
    label: "Referral reward applied",
    description: "When a referral reward fires for the referrer or referee.",
  },
];
