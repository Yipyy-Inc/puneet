// Report-card customer notifications (Table 63/64): email teaser, SMS, and push.
// Mock-only — template data builders + an in-memory outbox with send helpers.

export interface ReportCardNotificationData {
  reportId: string;
  petName: string;
  ownerName: string;
  facilityName: string;
  serviceType: string;
  mood: string;
  moodEmoji: string;
  /** One-line AI summary excerpt (~120 chars). */
  summaryExcerpt: string;
  /** Up to 3 thumbnail photo URLs for the email teaser. */
  photos: string[];
  /** Deep link to the specific in-portal report (login-then-redirect if needed). */
  portalUrl: string;
}

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  excited: "🤩",
  content: "😌",
  calm: "😌",
  playful: "😃",
  energetic: "⚡",
  shy: "🥺",
  tired: "😴",
  anxious: "😟",
};

export function moodEmojiFor(mood: string): string {
  return MOOD_EMOJI[mood.toLowerCase()] ?? "🐾";
}

/** In-portal report deep link. The customer portal handles login-then-redirect
 *  for unauthenticated visitors via the login page's `redirect` param. */
export function reportPortalLink(reportId: string): string {
  return `/customer/report-cards?report=${encodeURIComponent(reportId)}`;
}

/** Login-then-redirect variant for use in external channels (email/SMS/push). */
export function reportDeepLink(reportId: string): string {
  return `/customer/auth/login?redirect=${encodeURIComponent(
    reportPortalLink(reportId),
  )}`;
}

function excerpt(text: string, maxLen = 120): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

export function buildReportCardNotificationData(input: {
  reportId: string;
  petName: string;
  ownerName: string;
  facilityName: string;
  serviceType: string;
  mood: string;
  photos: string[];
  summaryText: string;
}): ReportCardNotificationData {
  return {
    reportId: input.reportId,
    petName: input.petName,
    ownerName: input.ownerName,
    facilityName: input.facilityName,
    serviceType: input.serviceType,
    mood: input.mood,
    moodEmoji: moodEmojiFor(input.mood),
    summaryExcerpt: excerpt(input.summaryText),
    photos: input.photos.slice(0, 3),
    portalUrl: reportDeepLink(input.reportId),
  };
}

/* ── Channel copy builders (single source for previews + sends) ───────────── */

export function reportCardSmsBody(d: ReportCardNotificationData): string {
  return `${d.facilityName}: ${d.petName}'s ${d.serviceType} report is ready! 🐾 View it here: ${d.portalUrl}`;
}

export function reportCardPushTitle(d: ReportCardNotificationData): string {
  return `${d.moodEmoji} New report card for ${d.petName}`;
}

export function reportCardPushBody(d: ReportCardNotificationData): string {
  return d.summaryExcerpt;
}

export function reportCardEmailSubject(d: ReportCardNotificationData): string {
  return `${d.petName}'s ${d.serviceType} report is ready! ${d.moodEmoji}`;
}

/* ── Mocked outbox ────────────────────────────────────────────────────────── */

export type ReportCardChannel = "email" | "sms" | "push";

export interface SentReportCardNotification {
  channel: ReportCardChannel;
  reportId: string;
  to: string;
  at: string;
}

const outbox: SentReportCardNotification[] = [];

export function getReportCardOutbox(): readonly SentReportCardNotification[] {
  return outbox;
}

function record(
  channel: ReportCardChannel,
  d: ReportCardNotificationData,
): void {
  outbox.push({
    channel,
    reportId: d.reportId,
    to: d.ownerName,
    at: new Date().toISOString(),
  });
}

export function sendReportCardEmail(d: ReportCardNotificationData): void {
  record("email", d);
}
export function sendReportCardSms(d: ReportCardNotificationData): void {
  record("sms", d);
}
export function sendReportCardPush(d: ReportCardNotificationData): void {
  record("push", d);
}

/** Fires the mocked sends for each enabled channel; returns the human labels. */
export function sendReportCardNotifications(
  d: ReportCardNotificationData,
  channels: { email?: boolean; sms?: boolean; push?: boolean },
): string[] {
  const sent: string[] = [];
  if (channels.email) {
    sendReportCardEmail(d);
    sent.push("email");
  }
  if (channels.sms) {
    sendReportCardSms(d);
    sent.push("SMS");
  }
  if (channels.push) {
    sendReportCardPush(d);
    sent.push("push");
  }
  return sent;
}
