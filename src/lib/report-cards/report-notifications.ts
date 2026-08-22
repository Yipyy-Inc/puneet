// ============================================================================
// Report-card notification CONTENT: the email teaser, the SMS, the push.
//
// Builders only. This file used to also export `sendReportCardEmail`,
// `sendReportCardSms`, `sendReportCardPush`, `sendReportCardNotifications` and
// a module-level `outbox` array they pushed onto. Nothing transmitted
// anything; the callers reported "Delivered via email, SMS" on the strength of
// the channel names the fake handed back, and `check:success-claims` passed
// them because a function returning a non-empty list looks like a sender.
//
// They are deleted rather than fixed. A send helper that cannot send is not a
// stub waiting for a transport — it is the thing that makes a missing
// transport invisible. What survives is the part that was always honest: these
// builders shape what a message WOULD say, and the settings screen renders
// them as previews.
//
// When report cards get a real transport, it goes behind an API route with the
// facility's own Twilio subaccount or Resend key, and its outcome is reported
// from what that call returned.
// ============================================================================

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
