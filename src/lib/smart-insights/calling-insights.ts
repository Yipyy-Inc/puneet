import { callLogs } from "@/data/communications-hub";
import { aiCallSummaries, defaultCallingSettings } from "@/data/calling";
import type { Insight, MetricChip } from "@/types/smart-insights";

// ============================================================
// Calling → Smart Insights engine. Derives owner/manager
// recommendations from the calling analytics data (call log,
// AI summaries, transcriptions). Five insight types:
//   MISSED_CALL_SPIKE, SENTIMENT_DROP, PEAK_HOUR_GAP,
//   KEYWORD_TREND, UPSELL_UNTAKEN.
// Stable across clock drift: week windows anchor to the most
// recent call timestamp, not the live clock.
// ============================================================

const LOC = { id: "loc-dv-main", name: "Doggieville – Plateau" };
const GENERATED_AT = "2026-06-04T07:05:00.000Z"; // nightly run

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}
/** "5–7 PM" style 2-hour window starting at h. */
function hourWindow(h: number): string {
  const end = (h + 2) % 24;
  const period = (x: number) => (x < 12 ? "AM" : "PM");
  const h12 = (x: number) => (x % 12 === 0 ? 12 : x % 12);
  return period(h) === period(end)
    ? `${h12(h)}–${h12(end)} ${period(h)}`
    : `${h12(h)} ${period(h)}–${h12(end)} ${period(end)}`;
}

const summaryByCall = new Map(aiCallSummaries.map((s) => [s.callId, s]));

// Keyword stems we care about, mapped to a display label.
const KEYWORD_TERMS: { stems: string[]; label: string }[] = [
  { stems: ["boarding", "board our", "board your", "to board"], label: "boarding" },
  { stems: ["grooming"], label: "grooming" },
  { stems: ["medication", "twice daily", "twice a day", "apoquel"], label: "medication schedules" },
  { stems: ["vaccin"], label: "vaccination records" },
  { stems: ["cancel", "reschedul"], label: "rescheduling" },
  { stems: ["training", "obedience"], label: "training classes" },
];

export function generateCallingInsights(facilityId: number): Insight[] {
  if (callLogs.length === 0) return [];

  const times = callLogs.map((c) => new Date(c.timestamp).getTime());
  const now = Math.max(...times);
  const WEEK = 7 * 86_400_000;
  const inRange = (from: number, to: number) =>
    callLogs.filter((c) => {
      const t = new Date(c.timestamp).getTime();
      return t > from && t <= to;
    });
  const thisWeek = inRange(now - WEEK, now);
  const priorWeek = inRange(now - 2 * WEEK, now - WEEK);

  const insights: Insight[] = [];

  const base = {
    facilityId,
    locationId: LOC.id,
    locationName: LOC.name,
    generatedAt: GENERATED_AT,
    cadence: "nightly" as const,
    status: "active" as const,
  };

  // ── Busiest call hour (across all calls) ──
  const hourCounts = new Array(24).fill(0);
  for (const c of callLogs) hourCounts[new Date(c.timestamp).getHours()] += 1;
  let busiestHour = 0;
  for (let h = 1; h < 24; h++) if (hourCounts[h] > hourCounts[busiestHour]) busiestHour = h;

  // ── 1) MISSED_CALL_SPIKE ──
  const missedRate = (set: typeof callLogs) =>
    set.length ? set.filter((c) => c.status === "missed").length / set.length : 0;
  const twRate = missedRate(thisWeek);
  const pwRate = missedRate(priorWeek);
  const relChange = pwRate > 0 ? (twRate - pwRate) / pwRate : twRate > 0 ? 1 : 0;
  if (relChange > 0.25) {
    const pct = Math.round(relChange * 100);
    insights.push({
      ...base,
      insightId: "ins-call-missed-spike",
      category: "operations",
      priority: "high",
      trend: "up",
      actionType: "call_missed_spike",
      title: `Missed Calls Up ${pct}% This Week`,
      description: `Missed-call rate rose to ${Math.round(twRate * 100)}% this week from ${Math.round(pwRate * 100)}% last week — a ${pct}% relative increase. Volume peaks around ${hourLabel(busiestHour)}.`,
      impactText:
        "Every missed call is a potential booking lost to a competitor. Callers rarely leave a voicemail and seldom call back.",
      recommendationText: `Add staff phone coverage around ${hourLabel(busiestHour)} — your busiest hour — to catch the surge.`,
      metrics: [
        { label: "This week", value: `${Math.round(twRate * 100)}%` },
        { label: "Last week", value: `${Math.round(pwRate * 100)}%` },
        { label: "Change", value: `+${pct}%` },
        { label: "Busiest hour", value: hourLabel(busiestHour) },
      ],
    });
  }

  // ── 2) SENTIMENT_DROP (per staff member) ──
  const staffSent: Record<string, number[]> = {};
  for (const c of callLogs) {
    if (!c.handledBy || c.handledBy === "AI Assistant") continue;
    const s = summaryByCall.get(c.id);
    if (s) (staffSent[c.handledBy] ??= []).push(s.sentimentScore);
  }
  const allScores = aiCallSummaries.map((s) => s.sentimentScore);
  const teamAvg = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 0;
  let worst: { name: string; avg: number } | null = null;
  for (const [name, scores] of Object.entries(staffSent)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (!worst || avg < worst.avg) worst = { name, avg };
  }
  if (worst && teamAvg - worst.avg > 1) {
    insights.push({
      ...base,
      insightId: `ins-call-sentiment-drop-${worst.name.replace(/\W+/g, "-").toLowerCase()}`,
      category: "staff",
      priority: "medium",
      trend: "down",
      actionType: "call_sentiment_drop",
      title: `Call Sentiment Dropped for ${worst.name}`,
      description: `${worst.name}'s recent calls average ${worst.avg.toFixed(1)}/10 AI sentiment — ${(teamAvg - worst.avg).toFixed(1)} points below the team average of ${teamAvg.toFixed(1)}.`,
      impactText:
        "A sustained sentiment dip can signal a training gap, a difficult account, or burnout — and quietly erodes retention.",
      recommendationText: `Review ${worst.name}'s recent recorded calls and book a quick coaching session.`,
      metrics: [
        { label: "Staff member", value: worst.name },
        { label: "Avg sentiment", value: `${worst.avg.toFixed(1)}/10` },
        { label: "Team avg", value: `${teamAvg.toFixed(1)}/10` },
        { label: "Gap", value: `-${(teamAvg - worst.avg).toFixed(1)}` },
      ],
    });
  }

  // ── 3) PEAK_HOUR_GAP (call volume during unstaffed/after hours) ──
  const isAfterHours = (c: (typeof callLogs)[number]) => {
    const d = new Date(c.timestamp);
    const day = defaultCallingSettings.businessHours[DAY_KEYS[d.getDay()]];
    if (!day || !day.enabled) return true;
    const mins = d.getHours() * 60 + d.getMinutes();
    const [oh, om] = day.open.split(":").map(Number);
    const [ch, cm] = day.close.split(":").map(Number);
    return mins < oh * 60 + om || mins >= ch * 60 + cm;
  };
  const afterHours = callLogs.filter(isAfterHours);
  if (afterHours.length >= 1) {
    // Busiest (weekday, hour) bucket among after-hours calls.
    const buckets: Record<string, { day: number; hour: number; n: number }> = {};
    for (const c of afterHours) {
      const d = new Date(c.timestamp);
      const key = `${d.getDay()}-${d.getHours()}`;
      (buckets[key] ??= { day: d.getDay(), hour: d.getHours(), n: 0 }).n += 1;
    }
    const top = Object.values(buckets).sort((a, b) => b.n - a.n)[0];
    const dayCount = afterHours.filter(
      (c) => new Date(c.timestamp).getDay() === top.day,
    ).length;
    insights.push({
      ...base,
      insightId: "ins-call-peak-hour-gap",
      category: "operations",
      priority: "high",
      trend: "up",
      actionType: "call_peak_hour_gap",
      title: "Calls Arriving Outside Staffed Hours",
      description: `You received ${dayCount} call${dayCount === 1 ? "" : "s"} on ${WEEKDAYS[top.day]} around ${hourWindow(top.hour)} — outside your scheduled phone coverage.`,
      impactText:
        "After-hours callers reach voicemail or nobody at all. These are warm leads slipping through when no one is on the phones.",
      recommendationText: `Extend phone coverage (or enable overflow forwarding) on ${WEEKDAYS[top.day]} into the ${hourWindow(top.hour)} window.`,
      metrics: [
        { label: "After-hours calls", value: afterHours.length },
        { label: "Peak day", value: WEEKDAYS[top.day] },
        { label: "Window", value: hourWindow(top.hour) },
        { label: "On that day", value: dayCount },
      ],
    });
  }

  // ── 4) KEYWORD_TREND (NLP over transcriptions) ──
  // Transcriptions are sparse, so scan all transcribed calls (not just the
  // 7-day window) to detect a repeated topic across recent conversations.
  const scanPool = callLogs.filter((c) => c.transcription);
  let topTerm: { label: string; ids: string[] } | null = null;
  for (const term of KEYWORD_TERMS) {
    const ids = scanPool
      .filter((c) => {
        const t = c.transcription!.toLowerCase();
        return term.stems.some((s) => t.includes(s));
      })
      .map((c) => c.id);
    if (ids.length >= 2 && (!topTerm || ids.length > topTerm.ids.length)) {
      topTerm = { label: term.label, ids };
    }
  }
  if (topTerm) {
    const n = topTerm.ids.length;
    insights.push({
      ...base,
      insightId: "ins-call-keyword-trend",
      category: "operations",
      priority: "medium",
      trend: "up",
      actionType: "call_keyword_trend",
      title: `Repeated Topic in Calls — "${topTerm.label}"`,
      description: `${n} recent callers mentioned ${topTerm.label} in their conversation — a cluster worth getting ahead of.`,
      impactText:
        "Repeated questions about the same topic often precede a demand surge or a recurring gap in what's communicated upfront.",
      recommendationText: `Check ${topTerm.label} capacity and availability, and make sure the answer is easy to find before callers have to ask.`,
      metrics: [
        { label: "Keyword", value: topTerm.label },
        { label: "Callers", value: n },
        { label: "Window", value: "Recent calls" },
        { label: "Source", value: "Transcriptions" },
      ],
    });
  }

  // ── 5) UPSELL_UNTAKEN (AI flagged an upsell, no booking) ──
  let upsellCalls = 0;
  let upsellOpps = 0;
  let sampleUpsell: string | undefined;
  for (const c of callLogs) {
    const s = summaryByCall.get(c.id);
    if (s && s.upsellOpportunities.length > 0 && c.outcome !== "booking_created") {
      upsellCalls += 1;
      upsellOpps += s.upsellOpportunities.length;
      sampleUpsell ??= s.upsellOpportunities[0];
    }
  }
  if (upsellCalls > 0) {
    insights.push({
      ...base,
      insightId: "ins-call-upsell-untaken",
      category: "revenue",
      priority: "medium",
      trend: "up",
      actionType: "call_upsell_untaken",
      title: "Upsell Opportunities Left on the Table",
      description: `The AI flagged ${upsellOpps} upsell opportunit${upsellOpps === 1 ? "y" : "ies"} across ${upsellCalls} call${upsellCalls === 1 ? "" : "s"}${sampleUpsell ? ` (e.g. ${sampleUpsell})` : ""}, but none converted to a booking.`,
      impactText:
        "Add-on services flagged during the call were never offered or closed — recoverable revenue walking out the door.",
      recommendationText:
        "Review these calls and follow up with a tailored offer; add a prompt so staff pitch the add-on while on the line.",
      metrics: [
        { label: "Opportunities", value: upsellOpps },
        { label: "Calls", value: upsellCalls },
        { label: "Converted", value: 0 },
        ...(sampleUpsell ? [{ label: "Example", value: sampleUpsell } as MetricChip] : []),
      ],
    });
  }

  return insights;
}
