import "server-only";

import {
  NO_REBOOK_CONFIG,
  rebookConfigSchema,
  type RebookConfig,
} from "@/lib/settings/rebook";
import type { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";

// ============================================================================
// The two things every rebook route needs to agree about.
//
// Both routes decide who may be messaged and how overdue somebody is. Two
// readers of the same jsonb, and two ways of working out what day it is, are
// two chances to disagree — and the disagreement would be a list that offers a
// Send the send route then refuses.
// ============================================================================

type Db = Awaited<ReturnType<typeof createServerClient>>;

export async function readRebookConfig(
  supabase: Db,
  facilityId: string,
): Promise<{ config: RebookConfig; configured: boolean }> {
  const { data } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "rebook_config")
    .maybeSingle();

  const stored = (data as { value: unknown } | null)?.value;
  if (stored === undefined || stored === null) {
    return { config: NO_REBOOK_CONFIG, configured: false };
  }

  const parsed = rebookConfigSchema.safeParse(stored);
  // A stored value that no longer parses is treated as unconfigured rather
  // than merged with the default. Half a facility's numbers and half the app's
  // is a third thing nobody chose, and it would decide who gets messaged.
  if (!parsed.success) return { config: NO_REBOOK_CONFIG, configured: false };
  return { config: parsed.data, configured: true };
}

/**
 * The facility's own date, as `lapsed_clients` wants it.
 *
 * `current_date` inside the function would be UTC: at 20:00 in Montreal that is
 * already tomorrow, so for four hours every evening everybody would read one
 * day further overdue. Same lesson as the night-shift window, and
 * `wallClockParts` is the one conversion this repo has.
 */
export async function facilityToday(
  supabase: Db,
  facilityId: string,
): Promise<string> {
  const { data } = await supabase
    .from("facilities")
    .select("timezone")
    .eq("id", facilityId)
    .maybeSingle();
  const zone =
    (data as { timezone: string | null } | null)?.timezone ?? DEFAULT_TIMEZONE;
  return wallClockParts(new Date().toISOString(), zone).date;
}
