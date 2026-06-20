// ============================================================================
// Reputation Booster — Step 2: Micro-Survey link + cross-route request store
// ----------------------------------------------------------------------------
// The outreach (Step 1) contains a unique trackable link of the form
// `/review/<token>` where the token is the request id. The public survey page
// and the facility dashboard run on different routes, so request state is read
// from / written to localStorage:
//   • the runtime queue (requests created by real checkouts), and
//   • a ratings overlay (ratings captured on the survey page).
// Static mock requests live in `data/reputation.ts`; the overlay lets them
// receive ratings too, so the dashboard reflects survey responses live.
// ============================================================================

import {
  reputationRequests as baseRequests,
  reputationSettings as baseSettings,
} from "@/data/reputation";
import { clients } from "@/data/clients";
import type {
  ReputationRequest,
  ReputationRating,
  ReputationSettings,
  ReputationPublicPlatform,
} from "@/types/reputation";

export const REPUTATION_QUEUE_KEY = "reputation-runtime-requests";
export const REPUTATION_RATINGS_KEY = "reputation-ratings";
export const REPUTATION_SETTINGS_KEY = "reputation-settings";

/** Read effective settings (mock defaults + saved overrides) outside the provider. */
export function loadReputationSettings(): ReputationSettings {
  if (typeof window === "undefined") return baseSettings;
  const stored = window.localStorage.getItem(REPUTATION_SETTINGS_KEY);
  if (!stored) return baseSettings;
  try {
    const parsed = JSON.parse(stored) as Partial<ReputationSettings>;
    return { ...baseSettings, ...parsed };
  } catch {
    return baseSettings;
  }
}

/** Build the unique, shortened trackable survey link for a request. */
export function buildReviewPath(token: string): string {
  return `/review/${encodeURIComponent(token)}`;
}

/** Survey link that carries the target language so the landing page inherits it. */
export function buildReviewLink(token: string, locale?: string): string {
  const base = buildReviewPath(token);
  return locale ? `${base}?lang=${encodeURIComponent(locale)}` : base;
}

/** The client's explicitly-set language locale (e.g. "fr"), or undefined. */
export function clientLocale(clientId: number): string | undefined {
  const v = clients.find((c) => c.id === clientId)?.preferredLanguage;
  return v && v.trim() ? v : undefined;
}

/**
 * Profile-based localization routing:
 * - Alpha: explicit preference matching a facility locale → that single block.
 * - Beta:  no preference + bilingual facility → stack all locales together.
 * - else:  the default locale (or nothing when localization is off).
 */
export function resolveOutreachLocale(
  settings: ReputationSettings,
  clientId: number,
  explicit?: string,
): { locale?: string; stackLocales?: string[] } {
  const loc = settings.localization;
  if (!loc?.enabled) return {};
  const locales = loc.locales.length > 0 ? loc.locales : ["en"];
  const pref = explicit ?? clientLocale(clientId);
  if (pref && locales.includes(pref)) return { locale: pref }; // Alpha
  if (locales.length >= 2) return { stackLocales: locales }; // Beta
  return { locale: locales[0] };
}

/**
 * Resolve who an escalation for a given service routes to: the service-specific
 * route, else the "default" route, else the facility manager.
 */
export function resolveEscalationAssignees(
  settings: ReputationSettings,
  service: string,
): { id: string; name: string }[] {
  const routes = settings.escalationRoutes ?? [];
  const match =
    routes.find((r) => r.service === service) ??
    routes.find((r) => r.service === "default");
  if (match && match.staffIds.length > 0) {
    return match.staffIds.map((id, i) => ({
      id,
      name: match.staffNames[i] ?? id,
    }));
  }
  return [{ id: "staff-006", name: "Manager One" }];
}

export const ALL_PLATFORMS: ReputationPublicPlatform[] = [
  "google",
  "facebook",
  "yelp",
  "nextdoor",
  "tripadvisor",
];

const DEFAULT_ADDED: ReputationPublicPlatform[] = [
  "google",
  "facebook",
  "yelp",
];

/** Display metadata for every supported public channel. */
export const PLATFORM_META: Record<
  ReputationPublicPlatform,
  { label: string; badge: string; badgeCls: string; placeholder: string }
> = {
  google: {
    label: "Google Business",
    badge: "G",
    badgeCls: "bg-blue-50 text-blue-600",
    placeholder: "Paste your Google Maps link or g.page/r/…/review",
  },
  facebook: {
    label: "Facebook Pages",
    badge: "f",
    badgeCls: "bg-indigo-50 text-indigo-600",
    placeholder: "https://facebook.com/yourpage/reviews",
  },
  yelp: {
    label: "Yelp",
    badge: "Y",
    badgeCls: "bg-red-50 text-red-600",
    placeholder: "https://yelp.com/biz/your-business",
  },
  nextdoor: {
    label: "Nextdoor",
    badge: "N",
    badgeCls: "bg-green-50 text-green-700",
    placeholder: "https://nextdoor.com/pages/your-business",
  },
  tripadvisor: {
    label: "TripAdvisor",
    badge: "T",
    badgeCls: "bg-emerald-50 text-emerald-700",
    placeholder: "https://tripadvisor.com/your-business",
  },
};

/** The facility's added channels, in priority order. */
export function orderedPlatforms(
  settings: ReputationSettings,
): ReputationPublicPlatform[] {
  const order = settings.platformOrder ?? DEFAULT_ADDED;
  // Drop any unknown/removed ids defensively.
  return order.filter((p) => ALL_PLATFORMS.includes(p));
}

/** Supported channels the facility hasn't added yet (for "Add Platform"). */
export function availablePlatforms(
  settings: ReputationSettings,
): ReputationPublicPlatform[] {
  const added = new Set(orderedPlatforms(settings));
  return ALL_PLATFORMS.filter((p) => !added.has(p));
}

/** Enabled-with-URL public platforms, in the facility's priority order. */
export function orderedEnabledPlatforms(
  settings: ReputationSettings,
): ReputationPublicPlatform[] {
  return orderedPlatforms(settings).filter(
    (p) =>
      settings.reviewPlatforms[p].enabled && settings.reviewPlatforms[p].url,
  );
}

/** Normalized display weight (%) per enabled platform, summing to 100. */
export function platformWeightPercents(
  settings: ReputationSettings,
): Record<string, number> {
  const enabled = orderedEnabledPlatforms(settings);
  const total = enabled.reduce(
    (s, p) => s + Math.max(0, settings.reviewPlatforms[p].weight ?? 0),
    0,
  );
  const out: Record<string, number> = {};
  for (const p of enabled) {
    const w = Math.max(0, settings.reviewPlatforms[p].weight ?? 0);
    out[p] = total > 0 ? Math.round((w / total) * 100) : 0;
  }
  return out;
}

/**
 * Presentation order of enabled public channels for one reviewer. With channel
 * weighting on, this is a weighted shuffle by each platform's `weight` (so the
 * featured/top channel appears ~proportionally to its weight — e.g. Google 60%
 * / Yelp 40%). Otherwise it's the fixed configured order.
 */
export function weightedPlatformOrder(
  settings: ReputationSettings,
  rand: () => number = Math.random,
): ReputationPublicPlatform[] {
  const enabled = orderedEnabledPlatforms(settings);
  if (!settings.channelWeighting || enabled.length <= 1) return enabled;

  const remaining = enabled.map((p) => ({
    p,
    w: Math.max(0, settings.reviewPlatforms[p].weight ?? 0),
  }));
  const result: ReputationPublicPlatform[] = [];

  while (remaining.length > 0) {
    const total = remaining.reduce((s, x) => s + x.w, 0);
    if (total <= 0) {
      // All remaining have zero weight — keep them in configured order.
      result.push(...remaining.map((x) => x.p));
      break;
    }
    let r = rand() * total;
    let idx = 0;
    for (; idx < remaining.length; idx++) {
      r -= remaining[idx].w;
      if (r <= 0) break;
    }
    if (idx >= remaining.length) idx = remaining.length - 1;
    result.push(remaining[idx].p);
    remaining.splice(idx, 1);
  }
  return result;
}

/**
 * Google Link Optimization — turn a standard Google Maps / business link into a
 * high-conversion direct "write a review" deep link so clients land straight on
 * the review input box. Extracts a Place ID from common URL shapes; returns the
 * original link (optimized:false) when no Place ID can be found.
 */
export function toGoogleReviewLink(input: string): {
  url: string;
  optimized: boolean;
} {
  const raw = input.trim();
  if (!raw) return { url: raw, optimized: false };

  // Already a direct review deep link.
  if (/writereview\?placeid=/i.test(raw)) return { url: raw, optimized: true };

  const patterns = [
    /[?&]placeid=([^&\s]+)/i,
    /place_id[=:]([^&\s/]+)/i,
    /(ChI[A-Za-z0-9_-]{10,})/, // Google Place ID token
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) {
      return {
        url: `https://search.google.com/local/writereview?placeid=${m[1]}`,
        optimized: true,
      };
    }
  }
  return { url: raw, optimized: false };
}

// ─── Runtime queue ───────────────────────────────────────────────────────────

export function loadQueue(): ReputationRequest[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(REPUTATION_QUEUE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ReputationRequest[];
  } catch {
    return [];
  }
}

export function saveQueue(next: ReputationRequest[]): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REPUTATION_QUEUE_KEY, JSON.stringify(next));
  }
}

// ─── Ratings overlay ─────────────────────────────────────────────────────────

export interface RatingOverlay {
  rating: ReputationRating;
  ratedAt: string;
  /** Internal feedback captured for low ratings (Step 3B intercept). */
  feedbackText?: string;
  /** Negative/neutral review routed to the internal escalation ledger. */
  escalated?: boolean;
  escalatedAt?: string;
  /** Manager resolved the escalation ticket. */
  resolved?: boolean;
  resolvedAt?: string;
  /** Apology store credit granted by a manager. */
  apologyCredit?: number;
  /** When the one-time happy-but-no-click nudge was sent. */
  happyReminderSentAt?: string;
  /** Public comment written by a happy client (Step 3A positive flow). */
  clientComment?: string;
  /** The client clicked through to a public review platform. */
  publicLinkClicked?: boolean;
  publicLinkClickedAt?: string;
  publicPlatform?: ReputationPublicPlatform;
  /** A public review push was initiated (status → public_push_sent). */
  pushedToPublic?: boolean;
  source: "micro_survey";
}

export function loadRatingOverlays(): Record<string, RatingOverlay> {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(REPUTATION_RATINGS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, RatingOverlay>;
  } catch {
    return {};
  }
}

export function saveRatingOverlay(token: string, overlay: RatingOverlay): void {
  if (typeof window === "undefined") return;
  const all = loadRatingOverlays();
  all[token] = overlay;
  window.localStorage.setItem(REPUTATION_RATINGS_KEY, JSON.stringify(all));
}

/** Merge a partial patch into an existing overlay (used by manager actions). */
export function updateRatingOverlay(
  token: string,
  patch: Partial<RatingOverlay>,
): void {
  if (typeof window === "undefined") return;
  const all = loadRatingOverlays();
  const existing = all[token];
  all[token] = {
    ...(existing ?? { source: "micro_survey" }),
    ...patch,
  } as RatingOverlay;
  window.localStorage.setItem(REPUTATION_RATINGS_KEY, JSON.stringify(all));
}

/**
 * Apply overlay state to a request for display. Rating/escalation capture only
 * applies when the request isn't already rated at source; resolution and
 * apology credit apply regardless (managers can resolve mock escalations too).
 */
export function applyOverlay(
  request: ReputationRequest,
  overlay?: RatingOverlay,
): ReputationRequest {
  if (!overlay) return request;

  let r = request;
  const auditLog = [...request.auditLog];

  // ── Rating capture (only if not rated at source) ──
  if (request.rating == null && overlay.rating != null) {
    auditLog.push({
      id: `${request.id}-survey`,
      timestamp: overlay.ratedAt,
      action: `Rating received: ${overlay.rating} star${overlay.rating > 1 ? "s" : ""} (via micro-survey)`,
    });

    if (overlay.escalated) {
      auditLog.push({
        id: `${request.id}-escalate`,
        timestamp: overlay.escalatedAt ?? overlay.ratedAt,
        action: "Negative feedback — routed to internal escalation ledger",
      });
      auditLog.push({
        id: `${request.id}-alert`,
        timestamp: overlay.escalatedAt ?? overlay.ratedAt,
        action: "Manager alerted — SMS, high-priority email & bell dispatched",
      });
    } else if (overlay.pushedToPublic && overlay.publicPlatform) {
      auditLog.push({
        id: `${request.id}-push`,
        timestamp: overlay.publicLinkClickedAt ?? overlay.ratedAt,
        action: `Public review push — client sent to ${overlay.publicPlatform}`,
      });
    }

    r = {
      ...r,
      rating: overlay.rating,
      ratedAt: overlay.ratedAt,
      feedbackText: overlay.feedbackText ?? r.feedbackText,
      clientComment: overlay.clientComment ?? r.clientComment,
      escalatedToManager: overlay.escalated || r.escalatedToManager,
      taskCreated: overlay.escalated || r.taskCreated,
      publicLinkClicked: overlay.publicLinkClicked ?? r.publicLinkClicked,
      publicLinkClickedAt: overlay.publicLinkClickedAt ?? r.publicLinkClickedAt,
      publicPlatform: overlay.publicPlatform ?? r.publicPlatform,
      // An escalated (negative) review is never a public testimonial, even if the
      // client also chose to post publicly.
      isApprovedForPublicDisplay:
        (overlay.pushedToPublic && !overlay.escalated) ||
        r.isApprovedForPublicDisplay,
      status: overlay.escalated
        ? "escalated"
        : overlay.pushedToPublic
          ? "public_push_sent"
          : "rating_received",
    };
  }

  // ── Apology credit (applies regardless of source rating) ──
  if (overlay.apologyCredit != null) {
    auditLog.push({
      id: `${request.id}-credit`,
      timestamp: overlay.resolvedAt ?? overlay.ratedAt,
      action: `Apology store credit issued: $${overlay.apologyCredit}`,
    });
    r = { ...r, apologyCreditAmount: overlay.apologyCredit };
  }

  // ── Happy-but-silent nudge (applies regardless of source rating) ──
  if (overlay.happyReminderSentAt && !r.happyReminderSentAt) {
    auditLog.push({
      id: `${request.id}-nudge`,
      timestamp: overlay.happyReminderSentAt,
      action: "Reminder sent — gentle nudge to share their review publicly",
    });
    r = { ...r, happyReminderSentAt: overlay.happyReminderSentAt };
  }

  // ── Resolution (applies regardless of source rating) ──
  if (overlay.resolved) {
    auditLog.push({
      id: `${request.id}-resolved`,
      timestamp: overlay.resolvedAt ?? overlay.ratedAt,
      action: "Escalation ticket resolved by manager",
    });
    r = { ...r, status: "closed", resolvedAt: overlay.resolvedAt };
  }

  return r === request ? request : { ...r, auditLog };
}

// ─── Lookup ──────────────────────────────────────────────────────────────────

/** Resolve a request by token across the runtime queue and the mock ledger. */
export function findRequestByToken(token: string): ReputationRequest | null {
  const overlays = loadRatingOverlays();
  const all = [...loadQueue(), ...baseRequests];
  const found = all.find((r) => r.id === token);
  if (!found) return null;
  return applyOverlay(found, overlays[token]);
}
