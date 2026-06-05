import type { CallLog } from "@/types/communications";
import type { AICallSummary, InquiryTag } from "@/types/calling";

// ============================================================
// Core calling metrics — all derived from the call-log table so
// the Analytics overview stays in sync with the Call Log tab.
// Pure + period/location-agnostic: callers pre-filter the logs,
// these helpers just aggregate the resulting set.
// ============================================================

/** Days of the week and hours, used for the call-volume heatmap. */
export const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const HEATMAP_HOURS = Array.from({ length: 24 }, (_, h) => h);

/** A missed call counts as "resolved" once it is completed or marked no-action. */
function isResolved(c: CallLog): boolean {
  return c.followUpStatus === "completed" || c.followUpStatus === "no_action";
}

export interface CallMetrics {
  total: number;
  missed: number;
  missedRate: number; // 0–100
  voicemail: number;
  voicemailRate: number; // 0–100
  avgQueueWait: number; // seconds (0 when no samples)
  queueWaitSamples: number;
  avgDuration: number; // seconds, over answered calls only
  answeredSamples: number;
  followUpResolved: number;
  followUpTotal: number; // total missed calls
  followUpRate: number; // 0–100
  avgSentiment: number | null; // 0–10, null when no AI summaries in range
  sentimentSamples: number;
  byIvrOption: { tag: InquiryTag; count: number }[]; // inbound, sorted desc
  /** 7×24 grid of call counts: heatmap[dayOfWeek][hour]. */
  heatmap: number[][];
  heatmapMax: number;
}

export function computeCallMetrics(
  logs: CallLog[],
  summaries: AICallSummary[],
): CallMetrics {
  const total = logs.length;
  const missedLogs = logs.filter((c) => c.status === "missed");
  const missed = missedLogs.length;
  const voicemail = logs.filter((c) => c.status === "voicemail").length;

  // Average queue wait — inbound calls that recorded a wait time.
  const queueSamples = logs.filter((c) => typeof c.queueWaitSeconds === "number");
  const avgQueueWait = queueSamples.length
    ? Math.round(
        queueSamples.reduce((s, c) => s + (c.queueWaitSeconds ?? 0), 0) /
          queueSamples.length,
      )
    : 0;

  // Average call duration — genuinely answered (completed) calls only, so a
  // voicemail's recording length doesn't skew the talk-time average.
  const answered = logs.filter((c) => c.status === "completed" && c.duration > 0);
  const avgDuration = answered.length
    ? Math.round(answered.reduce((s, c) => s + c.duration, 0) / answered.length)
    : 0;

  // Follow-up completion — resolved missed calls / total missed.
  const followUpResolved = missedLogs.filter(isResolved).length;

  // Average AI sentiment over calls in range that have a summary.
  const sentimentById = new Map(summaries.map((s) => [s.callId, s.sentimentScore]));
  const sentiments = logs
    .map((c) => sentimentById.get(c.id))
    .filter((v): v is number => typeof v === "number");
  const avgSentiment = sentiments.length
    ? sentiments.reduce((s, v) => s + v, 0) / sentiments.length
    : null;

  // Calls by IVR menu option — inbound calls grouped by the key they pressed.
  const tagCounts = new Map<InquiryTag, number>();
  for (const c of logs) {
    if (c.type === "inbound" && c.inquiryTag) {
      tagCounts.set(c.inquiryTag, (tagCounts.get(c.inquiryTag) ?? 0) + 1);
    }
  }
  const byIvrOption = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // Calls by hour of day — 7×24 grid keyed by local weekday + hour.
  const heatmap: number[][] = HEATMAP_DAYS.map(() => HEATMAP_HOURS.map(() => 0));
  let heatmapMax = 0;
  for (const c of logs) {
    const d = new Date(c.timestamp);
    const day = d.getDay();
    const hour = d.getHours();
    const next = (heatmap[day][hour] += 1);
    if (next > heatmapMax) heatmapMax = next;
  }

  return {
    total,
    missed,
    missedRate: total ? (missed / total) * 100 : 0,
    voicemail,
    voicemailRate: total ? (voicemail / total) * 100 : 0,
    avgQueueWait,
    queueWaitSamples: queueSamples.length,
    avgDuration,
    answeredSamples: answered.length,
    followUpResolved,
    followUpTotal: missed,
    followUpRate: missed ? (followUpResolved / missed) * 100 : 0,
    avgSentiment,
    sentimentSamples: sentiments.length,
    byIvrOption,
    heatmap,
    heatmapMax,
  };
}

// ============================================================
// Outcome breakdown — every call maps to exactly one outcome
// category (derived from callLog.outcome, falling back to status
// for missed/voicemail and "other"). Powers the donut chart.
// ============================================================

export const OUTCOME_KEYS = [
  "booking_created",
  "estimate_sent",
  "info_provided",
  "no_answer",
  "voicemail_left",
  "referred",
  "complaint_logged",
  "other",
] as const;
export type OutcomeKey = (typeof OUTCOME_KEYS)[number];

export function outcomeCategory(c: CallLog): OutcomeKey {
  switch (c.outcome) {
    case "booking_created":
      return "booking_created";
    case "estimate_sent":
      return "estimate_sent";
    case "question_answered":
      return "info_provided";
    case "voicemail_left":
      return "voicemail_left";
    case "transferred_to_staff":
      return "referred";
    case "complaint_logged":
      return "complaint_logged";
  }
  // No explicit outcome — derive from how the call ended.
  if (c.status === "missed") return "no_answer";
  if (c.status === "voicemail") return "voicemail_left";
  return "other";
}

export function computeOutcomeBreakdown(
  logs: CallLog[],
): Record<OutcomeKey, number> {
  const counts = Object.fromEntries(OUTCOME_KEYS.map((k) => [k, 0])) as Record<
    OutcomeKey,
    number
  >;
  for (const c of logs) counts[outcomeCategory(c)] += 1;
  return counts;
}

// ============================================================
// Missed Call Recovery Rate — the headline business metric.
// Of all missed calls, the share that were called back AND
// converted to a booking (revenue recovered from missed calls).
// ============================================================

/** A missed call that was called back and converted to a booking. */
export function isRecoveredMiss(c: CallLog): boolean {
  return (
    c.status === "missed" &&
    c.followUpStatus === "completed" &&
    c.outcome === "booking_created"
  );
}

export interface RecoveryStats {
  totalMissed: number;
  recovered: number;
  rate: number | null; // 0–100, null when there were no missed calls
}

export function computeRecovery(logs: CallLog[]): RecoveryStats {
  const missed = logs.filter((c) => c.status === "missed");
  const recovered = missed.filter(isRecoveredMiss).length;
  return {
    totalMissed: missed.length,
    recovered,
    rate: missed.length ? (recovered / missed.length) * 100 : null,
  };
}

export interface RecoveryWeek {
  weekStart: number; // epoch ms, local Sunday 00:00
  label: string; // e.g. "May 18"
  totalMissed: number;
  recovered: number;
  rate: number | null;
}

/**
 * Recovery rate bucketed by week for the trailing `weeks` weeks ending with the
 * week containing `now`. Weeks with no missed calls have a null rate (gap).
 */
export function computeWeeklyRecovery(
  logs: CallLog[],
  weeks: number,
  now: Date,
): RecoveryWeek[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // Sunday of current week

  const missed = logs.filter((c) => c.status === "missed");
  const buckets: RecoveryWeek[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(start);
    ws.setDate(ws.getDate() - i * 7);
    const wsMs = ws.getTime();
    const weMs = wsMs + 7 * 86_400_000;
    const inWeek = missed.filter((c) => {
      const t = new Date(c.timestamp).getTime();
      return t >= wsMs && t < weMs;
    });
    const recovered = inWeek.filter(isRecoveredMiss).length;
    buckets.push({
      weekStart: wsMs,
      label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      totalMissed: inWeek.length,
      recovered,
      rate: inWeek.length ? (recovered / inWeek.length) * 100 : null,
    });
  }
  return buckets;
}

/** Formats a duration in seconds as m:ss (or "0:00"). */
export function formatMinSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// Per-staff phone performance — grouped by callLog.handledBy.
// Powers the manager/owner staff report (the aggregation point
// for AI sentiment + QA ratings collected elsewhere).
// ============================================================

export interface StaffPerfRow {
  name: string;
  callsHandled: number;
  avgSentiment: number | null; // 0–10
  avgQa: number | null; // 1–5
  followUpResolved: number;
  followUpTotal: number;
  followUpRate: number | null; // 0–100, null when no follow-ups
  avgDuration: number | null; // seconds, completed calls only
}

export function computeStaffPerformance(
  logs: CallLog[],
  summaries: AICallSummary[],
): StaffPerfRow[] {
  const sentimentById = new Map(summaries.map((s) => [s.callId, s.sentimentScore]));
  const acc = new Map<
    string,
    {
      calls: number;
      sentiments: number[];
      qas: number[];
      fuResolved: number;
      fuTotal: number;
      durations: number[];
    }
  >();

  for (const c of logs) {
    if (!c.handledBy) continue;
    const a =
      acc.get(c.handledBy) ??
      { calls: 0, sentiments: [], qas: [], fuResolved: 0, fuTotal: 0, durations: [] };
    a.calls += 1;
    const sentiment = sentimentById.get(c.id);
    if (typeof sentiment === "number") a.sentiments.push(sentiment);
    if (typeof c.qaScore === "number") a.qas.push(c.qaScore);
    if (c.followUpStatus != null) {
      a.fuTotal += 1;
      if (c.followUpStatus === "completed" || c.followUpStatus === "no_action") {
        a.fuResolved += 1;
      }
    }
    if (c.status === "completed" && c.duration > 0) a.durations.push(c.duration);
    acc.set(c.handledBy, a);
  }

  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

  return [...acc.entries()].map(([name, a]) => ({
    name,
    callsHandled: a.calls,
    avgSentiment: a.sentiments.length ? mean(a.sentiments) : null,
    avgQa: a.qas.length ? mean(a.qas) : null,
    followUpResolved: a.fuResolved,
    followUpTotal: a.fuTotal,
    followUpRate: a.fuTotal ? (a.fuResolved / a.fuTotal) * 100 : null,
    avgDuration: a.durations.length ? mean(a.durations) : null,
  }));
}
