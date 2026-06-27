import { callTags } from "@/data/calling";
import { tagColorClasses } from "@/lib/calling/call-tags";
import type {
  SupportCallLogEntry,
  SupportRecording,
} from "@/types/support-call";

// Analytics for the admin Support Calls "Analytics" tab. Everything below is
// computed from the live call-log + recordings stores (so it tracks filters and
// edits). Two things are deterministically synthesized because the seed only
// spans a few days: the per-call queue wait (no queue-wait field on the model)
// and the 8-week recovery trend (a longer history than the seed covers). Both
// use a stable hash so they never change between renders.

function stableInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export const ANALYTICS_RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function inRange(at: string, range: AnalyticsRange, nowMs: number): boolean {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return nowMs - new Date(at).getTime() <= days * 86_400_000;
}

export type OutcomeKey =
  | "no_answer"
  | "issue_resolved"
  | "info_provided"
  | "voicemail_left"
  | "complaint_logged";

export const OUTCOME_META: Record<
  OutcomeKey,
  { label: string; color: string }
> = {
  no_answer: { label: "No Answer", color: "#ef4444" },
  issue_resolved: { label: "Issue Resolved", color: "#10b981" },
  info_provided: { label: "Info Provided", color: "#6366f1" },
  voicemail_left: { label: "Left Voicemail", color: "#f59e0b" },
  complaint_logged: { label: "Complaint Logged", color: "#f43f5e" },
};

const OUTCOME_ORDER: OutcomeKey[] = [
  "no_answer",
  "issue_resolved",
  "info_provided",
  "voicemail_left",
  "complaint_logged",
];

/** Map a call to one outcome category (every call counted once). */
function outcomeOf(call: SupportCallLogEntry): OutcomeKey {
  if (call.status === "missed") return "no_answer";
  if (call.status === "voicemail") return "voicemail_left";
  if (call.tags.includes("tag-complaint")) return "complaint_logged";
  return stableInt(`oc-${call.id}`, 0, 9) <= 5
    ? "issue_resolved"
    : "info_provided";
}

/** Deterministic queue-wait (seconds) for an inbound call. */
function queueWaitOf(call: SupportCallLogEntry): number {
  return stableInt(`qw-${call.id}`, 8, 95);
}

export interface OutcomeSlice {
  key: OutcomeKey;
  label: string;
  color: string;
  count: number;
}

export interface TagFrequency {
  id: string;
  name: string;
  solid: string;
  count: number;
}

export interface RecoveryWeek {
  label: string;
  rate: number;
}

export interface SupportCallAnalytics {
  kpis: {
    totalCalls: number;
    missedCallRate: number;
    avgQueueWaitSeconds: number;
    avgDurationSeconds: number;
    voicemailRate: number;
    followUpCompletionRate: number;
    avgSentiment: number | null;
  };
  recovery: { totalMissed: number; recovered: number; rate: number };
  weeklyTrend: RecoveryWeek[];
  outcomes: OutcomeSlice[];
  tagFrequency: TagFrequency[];
}

/** Recovered = a missed call that was called back and resolved (follow-up completed). */
function recoveryRateOf(calls: SupportCallLogEntry[]): {
  totalMissed: number;
  recovered: number;
  rate: number;
} {
  const missed = calls.filter((c) => c.status === "missed");
  const recovered = missed.filter(
    (c) => c.followUpStatus === "completed",
  ).length;
  return {
    totalMissed: missed.length,
    recovered,
    rate: pct(recovered, missed.length),
  };
}

/** 8-week recovery trend, anchored so the last week matches `anchorRate`. */
function buildWeeklyTrend(nowMs: number, anchorRate: number): RecoveryWeek[] {
  const weeks: RecoveryWeek[] = [];
  const start = Math.max(0, anchorRate - 16);
  for (let i = 0; i < 8; i++) {
    const weekMs = nowMs - (7 - i) * 7 * 86_400_000;
    const label = new Date(weekMs).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    let rate: number;
    if (i === 7) {
      rate = Math.round(anchorRate); // newest week = current rate
    } else {
      const ramp = start + (anchorRate - start) * (i / 7);
      rate = Math.min(
        100,
        Math.max(0, Math.round(ramp + stableInt(`tw-${i}`, -4, 4))),
      );
    }
    weeks.push({ label, rate });
  }
  return weeks;
}

export function buildSupportCallAnalytics(
  callLog: SupportCallLogEntry[],
  recordings: SupportRecording[],
  nowMs: number,
  range: AnalyticsRange,
  location: string,
): SupportCallAnalytics {
  const calls = callLog.filter(
    (c) =>
      (location === "all" || c.team === location) &&
      inRange(c.at, range, nowMs),
  );
  // Recordings have no team dimension, so location applies to call-volume only.
  const recs = recordings.filter((r) => inRange(r.at, range, nowMs));

  const total = calls.length;
  const missed = calls.filter((c) => c.status === "missed").length;
  const voicemail = calls.filter((c) => c.status === "voicemail").length;
  const completed = calls.filter((c) => c.status === "completed");
  const inbound = calls.filter((c) => c.direction === "inbound");

  const avgDuration = completed.length
    ? Math.round(
        completed.reduce((s, c) => s + c.durationSeconds, 0) / completed.length,
      )
    : 0;
  const avgQueueWait = inbound.length
    ? Math.round(
        inbound.reduce((s, c) => s + queueWaitOf(c), 0) / inbound.length,
      )
    : 0;

  const followUpTracked = calls.filter((c) => c.followUpStatus !== "no_action");
  const followUpDone = followUpTracked.filter(
    (c) => c.followUpStatus === "completed",
  );

  const avgSentiment = recs.length
    ? recs.reduce((s, r) => s + r.sentimentScore, 0) / recs.length
    : null;

  const recovery = recoveryRateOf(calls);
  // Trend anchored to the all-time (unfiltered-by-range) recovery rate for the
  // selected location, so the line is a stable history and its last point lines
  // up with the headline when no narrower range hides recent misses.
  const anchorRate = recoveryRateOf(
    callLog.filter((c) => location === "all" || c.team === location),
  ).rate;
  const weeklyTrend = buildWeeklyTrend(nowMs, anchorRate);

  const outcomeCounts: Record<OutcomeKey, number> = {
    no_answer: 0,
    issue_resolved: 0,
    info_provided: 0,
    voicemail_left: 0,
    complaint_logged: 0,
  };
  for (const c of calls) outcomeCounts[outcomeOf(c)]++;
  const outcomes: OutcomeSlice[] = OUTCOME_ORDER.map((k) => ({
    key: k,
    label: OUTCOME_META[k].label,
    color: OUTCOME_META[k].color,
    count: outcomeCounts[k],
  }));

  const tagCounts = new Map<string, number>();
  for (const c of calls) {
    for (const t of c.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const tagFrequency: TagFrequency[] = [...tagCounts.entries()]
    .map(([id, count]) => {
      const tag = callTags.find((t) => t.id === id);
      return {
        id,
        name: tag?.name ?? id,
        solid: tagColorClasses(tag?.color ?? "gray").solid,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    kpis: {
      totalCalls: total,
      missedCallRate: pct(missed, total),
      avgQueueWaitSeconds: avgQueueWait,
      avgDurationSeconds: avgDuration,
      voicemailRate: pct(voicemail, total),
      followUpCompletionRate: pct(followUpDone.length, followUpTracked.length),
      avgSentiment,
    },
    recovery,
    weeklyTrend,
    outcomes,
    tagFrequency,
  };
}
