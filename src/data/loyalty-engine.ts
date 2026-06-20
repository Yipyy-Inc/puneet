import type {
  CustomerLoyaltyAccount,
  FacilityLoyaltyConfig,
} from "@/types/loyalty";
import {
  loyaltyAccounts,
  getLoyaltyAccount,
  getLoyaltyAccountsByFacility,
} from "@/data/loyalty-accounts";
import { loyaltyTransactions } from "@/data/loyalty-transactions";
import { redemptionRecords } from "@/data/loyalty-redemptions";
import { customerBadges } from "@/data/loyalty-badges";
import { getClientById } from "@/data/clients";
import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";
import { facilities } from "@/data/facilities";
import { sendLoyaltyEmail } from "@/data/loyalty-emails";
import {
  processLoyaltyEvent,
  createLoyaltyAccount,
  type EngineResult,
  type LoyaltyEvent,
  type LoyaltyEventInput,
  type LoyaltyNotification,
} from "@/lib/loyalty/engine";
import { generateReferralCode } from "@/lib/loyalty/referral-code";
import { buildWelcomeMessage } from "@/lib/loyalty/welcome-notification";
import { buildTierUpgradeEmail } from "@/lib/loyalty/tier-notification";
import { buildBadgeEarnedEmail } from "@/lib/loyalty/badge-notification";
import { notificationChannels } from "@/lib/loyalty/notification-settings";

export type {
  LoyaltyEvent,
  LoyaltyEventInput,
  EngineResult,
} from "@/lib/loyalty/engine";

/**
 * Commit layer for the loyalty automation engine: bridges the pure engine
 * (src/lib/loyalty/engine.ts) to the mock data arrays. This is the entrypoint
 * the rest of the app calls when a customer event happens — it lazily creates
 * the customer's loyalty account, runs the engine, and persists the result.
 *
 * The engine itself stays pure; all mutation lives here, mirroring the
 * addManualAdjustment pattern in loyalty-transactions.ts.
 */

/** Get the customer's loyalty account, creating a zeroed one on first contact
 *  (accounts are created lazily when a customer first transacts at a facility
 *  whose program is enabled). */
export function getOrCreateLoyaltyAccount(
  facilityId: number,
  customerId: number,
  now: string,
): CustomerLoyaltyAccount {
  const existing = getLoyaltyAccount(facilityId, customerId);
  if (existing) return existing;
  const created = createLoyaltyAccount(facilityId, customerId, now);

  // When the facility's referral program is enabled, replace the engine's
  // deterministic fallback code with a readable, personal [FIRSTNAME]-[RANDOM4]
  // code that is unique within the facility. (Note: the data layer sees the
  // static config, not localStorage admin edits.)
  const config = getFacilityLoyaltyConfig(facilityId);
  const referralEnabled =
    config?.referralProgramSetup?.enabled ??
    config?.referralProgram?.enabled ??
    false;
  if (referralEnabled) {
    created.referralCode = generateReferralCode({
      fullName: getClientById(customerId)?.name,
      existingCodes: getLoyaltyAccountsByFacility(facilityId).map(
        (a) => a.referralCode,
      ),
    });
  }

  loyaltyAccounts.push(created);
  return created;
}

/**
 * Process a customer event end-to-end: run the engine and persist the new
 * account state + transactions. Returns the full EngineResult (tier change,
 * unlocked badges, applied discount, notifications) for callers to surface.
 *
 * No-op (and no account is created) when the facility's program is disabled.
 */
export function recordLoyaltyEvent(
  event: LoyaltyEventInput,
  config: FacilityLoyaltyConfig,
): EngineResult {
  const now = new Date().toISOString();
  const fullEvent: LoyaltyEvent = {
    ...event,
    occurredAt: event.occurredAt ?? now,
  };

  if (!config.enabled) {
    const account =
      getLoyaltyAccount(fullEvent.facilityId, fullEvent.customerId) ??
      createLoyaltyAccount(fullEvent.facilityId, fullEvent.customerId, now);
    return {
      account,
      transactions: [],
      redemptions: [],
      unlockedBadges: [],
      customerBadges: [],
      notifications: [],
    };
  }

  // Capture whether the customer had any prior transaction BEFORE we commit this
  // event's rows — drives the one-time "welcome to the program" notification.
  const hadPriorTransactions = loyaltyTransactions.some(
    (t) =>
      t.facilityId === fullEvent.facilityId &&
      t.customerId === fullEvent.customerId,
  );

  const account = getOrCreateLoyaltyAccount(
    fullEvent.facilityId,
    fullEvent.customerId,
    now,
  );
  const result = processLoyaltyEvent(fullEvent, { config, account, now });

  // Commit in place so existing holders of the array element see the update,
  // then append the new history rows + any reward vouchers earned.
  Object.assign(account, result.account);
  // Fresh activity resets the points-expiry warning so the customer can be
  // warned again after a future inactivity period.
  if (result.transactions.length > 0) {
    account.expiryEmailSentAt = null;
  }
  loyaltyTransactions.push(...result.transactions);
  if (result.redemptions.length > 0) {
    redemptionRecords.push(...result.redemptions);
  }
  if (result.customerBadges.length > 0) {
    customerBadges.push(...result.customerBadges);
  }

  fireWelcomeIfFirst(config, result, hadPriorTransactions, now);
  fireTierUpgradeEmail(config, result, hadPriorTransactions, now);
  fireBadgeEarnedEmails(config, result, now);

  // Honour the facility's notification settings for the PORTAL channel — drop
  // any notification whose type is disabled or set to email-only. (Email sends
  // are gated inside each fire* function.)
  result.notifications = result.notifications.filter(
    (n) => notificationChannels(config.notificationSettings, n.type).portal,
  );

  return result;
}

/**
 * On a customer's FIRST point transaction at a facility, prepend a "welcome to
 * the program" notification (portal) and send the welcome email (mock outbox).
 * The generic points_earned notification is dropped so the same first points
 * aren't announced twice.
 */
function fireWelcomeIfFirst(
  config: FacilityLoyaltyConfig,
  result: EngineResult,
  hadPriorTransactions: boolean,
  now: string,
): void {
  if (hadPriorTransactions) return;
  const channels = notificationChannels(
    config.notificationSettings,
    "program_welcome",
  );
  if (!channels.portal && !channels.email) return; // welcome disabled

  const pointsEarned = result.transactions.reduce(
    (sum, t) => sum + (t.points > 0 ? t.points : 0),
    0,
  );
  if (pointsEarned <= 0) return;

  const { facilityId, customerId } = result.account;
  const tiers = config.tierDefinitions ?? [];
  const tierName =
    tiers.find((t) => t.id === result.account.currentTierId)?.name ?? "valued";
  const client = getClientById(customerId);
  const customTemplate =
    config.notificationSettings?.templates?.program_welcome;
  const message = buildWelcomeMessage(
    {
      programName: config.programName ?? "our loyalty program",
      customerFirstName: client?.name?.split(/\s+/)[0] ?? "there",
      pointsEarned,
      tierName,
      portalLink: "/customer/rewards",
    },
    customTemplate ? { body: customTemplate } : undefined,
  );

  // Only show the welcome on the portal (and suppress the duplicate
  // points_earned) when the portal channel is on for welcome.
  if (channels.portal) {
    const welcome: LoyaltyNotification = {
      type: "program_welcome",
      title: message.subject,
      body: message.body,
      facilityId,
      customerId,
    };
    result.notifications = [
      welcome,
      ...result.notifications.filter((n) => n.type !== "points_earned"),
    ];
  }

  if (channels.email && client?.email) {
    sendLoyaltyEmail({
      facilityId,
      customerId,
      to: client.email,
      subject: message.subject,
      body: message.body,
      template: "loyalty_welcome",
      sentAt: now,
    });
  }
}

/**
 * On a tier upgrade, send the branded tier-upgrade email (a significant event
 * that warrants email). The portal notification is already produced by the
 * engine. Skips the entry-tier-on-first-visit case — the welcome covers that —
 * so the customer isn't double-emailed on first contact.
 */
function fireTierUpgradeEmail(
  config: FacilityLoyaltyConfig,
  result: EngineResult,
  hadPriorTransactions: boolean,
  now: string,
): void {
  const change = result.tierChange;
  if (change?.direction !== "upgrade" || !hadPriorTransactions) return;
  if (
    !notificationChannels(config.notificationSettings, "tier_upgrade").email
  ) {
    return;
  }

  const tier = (config.tierDefinitions ?? []).find((t) => t.id === change.to);
  if (!tier) return;

  const { facilityId, customerId } = result.account;
  const client = getClientById(customerId);
  if (!client?.email) return;

  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name ??
    config.programName ??
    "your facility";
  const email = buildTierUpgradeEmail({
    tier,
    facilityName,
    portalLink: "/customer/bookings",
    customerFirstName: client.name?.split(/\s+/)[0],
  });
  sendLoyaltyEmail({
    facilityId,
    customerId,
    to: client.email,
    subject: email.subject,
    body: email.body,
    template: "tier_upgrade",
    sentAt: now,
  });
}

/**
 * On each badge unlocked this event, send a branded badge-earned email (a
 * significant milestone — emailed even on first contact). The portal
 * notification is already produced by the engine.
 */
function fireBadgeEarnedEmails(
  config: FacilityLoyaltyConfig,
  result: EngineResult,
  now: string,
): void {
  if (result.unlockedBadges.length === 0) return;
  if (
    !notificationChannels(config.notificationSettings, "badge_unlocked").email
  ) {
    return;
  }
  const { facilityId, customerId } = result.account;
  const client = getClientById(customerId);
  if (!client?.email) return;

  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name ??
    config.programName ??
    "your facility";
  const firstName = client.name?.split(/\s+/)[0];

  for (const { badge } of result.unlockedBadges) {
    const email = buildBadgeEarnedEmail({
      badge,
      facilityName,
      portalLink: "/customer/rewards",
      customerFirstName: firstName,
    });
    sendLoyaltyEmail({
      facilityId,
      customerId,
      to: client.email,
      subject: email.subject,
      body: email.body,
      template: "badge_earned",
      sentAt: now,
    });
  }
}
