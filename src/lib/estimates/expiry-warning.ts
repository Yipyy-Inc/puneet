import {
  estimateSettingsSchema,
  type EstimateSettings,
} from "@/lib/settings/estimates";

// ============================================================================
// Whether an open estimate is owed its expiry warning. Pure, so the window and
// the key are unit-tested; lib/estimates/expiry-warning-tick.ts queues it.
//
// ── ONLY A FACILITY THAT SAVED THE SWITCH ─────────────────────────────────
//
// `expiryWarningEnabled` defaults to TRUE in DEFAULT_ESTIMATE_SETTINGS, which
// is right for the screen — it shows a sensible starting point — and wrong for
// a sender. A facility that never opened estimate settings did not decide to
// email its customers. So only a STORED row turns warnings on; no row is off.
//
// ── ONCE PER EXPIRY ───────────────────────────────────────────────────────
//
// Due from `expiryWarningHoursBefore` ahead of `expires_at` until it passes.
// The key names the estimate and its expiry, so a re-sent estimate with a new
// expiry is warned again, and a tick every five minutes warns once.
// ============================================================================

/** The facility's stored estimate settings, or null when it has none. */
export function storedEstimateSettings(
  value: unknown,
): EstimateSettings | null {
  const parsed = estimateSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function expiryWarningDue(
  estimate: { status: string; expiresAt: string | null },
  settings: EstimateSettings | null,
  now: Date,
): boolean {
  if (!settings?.expiryWarningEnabled) return false;
  if (estimate.status !== "sent" || !estimate.expiresAt) return false;
  const expires = Date.parse(estimate.expiresAt);
  if (Number.isNaN(expires)) return false;
  const hours = Math.max(1, settings.expiryWarningHoursBefore);
  const opens = expires - hours * 3_600_000;
  return now.getTime() >= opens && now.getTime() < expires;
}

export function expiryWarningKey(
  estimateId: string,
  expiresAt: string,
): string {
  return `estimate_expiry_warning:${estimateId}:${Math.floor(Date.parse(expiresAt) / 1000)}`;
}
