import { REFERENCE_DATE } from "@/data/churn";
import { buildSupportCallLog } from "@/data/support-call-log";
import {
  getSlaPerformance,
  supportAgents,
  supportTickets,
} from "@/data/support-tickets";
import { supportConversations } from "@/data/support-conversations";
import { buildSupportCallAnalytics } from "@/lib/support-call-analytics";

// Builder for the Support Analytics Report (/dashboard/reports/support).
// Unifies the three support channels — tickets, chat, calls.
//
// REAL (computed from the seed data layer): the five headline KPIs (avg first
// response + resolution + SLA compliance from getSlaPerformance(); chat response
// time from supportConversations; call answer rate from buildSupportCallAnalytics),
// the call metrics block (missed-call rate, avg duration, recovery rate + 8-week
// recovery trend, all via buildSupportCallAnalytics), the agent roster + their
// active workload, and the ticket priority/category MIX.
//
// DERIVED (deterministic, never random — stable hash anchored to REFERENCE_DATE):
// the weekly ticket-volume series, the resolution-time trend, the 30-day chat
// volume, the scaled top-category counts, and the per-agent breakdown — the seed
// is only a handful of records and agent identity is not unified across the three
// channels, so these are synthesized stably from the real aggregates/roster.

const DAY = 86_400_000;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}
function stableInt(seed: string, min: number, max: number): number {
  return min + (hashSeed(seed) % (max - min + 1));
}
const round1 = (n: number) => Math.round(n * 10) / 10;

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- types -----------------------------------------------------------------

export interface SupportKpis {
  avgFirstResponseHrs: number;
  avgResolutionHrs: number;
  slaComplianceRate: number;
  chatResponseMin: number;
  callAnswerRate: number;
}

export interface TicketVolumeWeek {
  week: string;
  Low: number;
  Medium: number;
  High: number;
  Urgent: number;
}

export interface ResolutionPoint {
  week: string;
  hours: number;
}

export interface ChatVolumePoint {
  day: string;
  messages: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface CallMetrics {
  missedCallRate: number;
  avgDurationSeconds: number;
  recoveryRate: number;
  recoveryTrend: { label: string; rate: number }[];
}

export interface AgentPerfRow {
  name: string;
  role: string;
  ticketsResolved: number;
  avgResolutionHrs: number;
  slaCompliance: number;
  chatMessages: number;
  callsTaken: number;
}

export interface SupportReport {
  kpis: SupportKpis;
  ticketVolume: TicketVolumeWeek[];
  resolutionTrend: ResolutionPoint[];
  chatVolume: ChatVolumePoint[];
  topCategories: CategoryCount[];
  callMetrics: CallMetrics;
  agents: AgentPerfRow[];
}

// --- chat response time (REAL) ---------------------------------------------

function avgChatResponseMinutes(): number {
  const deltas: number[] = [];
  for (const conv of supportConversations) {
    const msgs = conv.messages;
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].sender !== "facility") continue;
      const reply = msgs
        .slice(i + 1)
        .find((m) => m.sender === "agent" && !m.isInternalNote);
      if (reply) {
        const d =
          (new Date(reply.at).getTime() - new Date(msgs[i].at).getTime()) /
          60_000;
        if (d >= 0) deltas.push(d);
        break; // first facility→agent response in this conversation
      }
    }
  }
  return deltas.length
    ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
    : 0;
}

// --- entry point -----------------------------------------------------------

export function getSupportReport(): SupportReport {
  const refMs = new Date(REFERENCE_DATE).getTime();
  const sla = getSlaPerformance();

  // Real call analytics (deterministic via REFERENCE_DATE anchor).
  const calls = buildSupportCallLog(refMs);
  const ca = buildSupportCallAnalytics(calls, [], refMs, "all", "all");

  const kpis: SupportKpis = {
    avgFirstResponseHrs: round1(sla.avgResponseMinutes / 60),
    avgResolutionHrs: sla.avgResolutionHours,
    slaComplianceRate: Math.round(
      ((sla.firstResponseMet + sla.resolutionMet) /
        Math.max(1, sla.firstResponseTotal + sla.resolutionTotal)) *
        100,
    ),
    chatResponseMin: avgChatResponseMinutes(),
    callAnswerRate: round1(100 - ca.kpis.missedCallRate),
  };

  // Real ticket priority + category mix.
  const total = supportTickets.length || 1;
  const pri = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
  const catCounts = new Map<string, number>();
  for (const t of supportTickets) {
    pri[t.priority] += 1;
    catCounts.set(t.category, (catCounts.get(t.category) ?? 0) + 1);
  }
  const prop = {
    Low: pri.Low / total,
    Medium: pri.Medium / total,
    High: pri.High / total,
    Urgent: pri.Urgent / total,
  };

  // Weekly ticket volume by priority (10 weeks, deterministic, real mix).
  const ticketVolume: TicketVolumeWeek[] = [];
  let periodTotal = 0;
  for (let i = 0; i < 10; i++) {
    const d = new Date(refMs - (9 - i) * 7 * DAY);
    const week = shortDate(d);
    const base = Math.round(stableInt(`tv-${i}`, 24, 42) * (0.9 + i * 0.02));
    const Low = Math.max(1, Math.round(base * prop.Low));
    const Medium = Math.max(1, Math.round(base * prop.Medium));
    const High = Math.max(1, Math.round(base * prop.High));
    const Urgent = Math.max(0, Math.round(base * prop.Urgent));
    ticketVolume.push({ week, Low, Medium, High, Urgent });
    periodTotal += Low + Medium + High + Urgent;
  }

  // Resolution-time trend (10 weeks, improving toward the real avg).
  const anchorRes = sla.avgResolutionHours || 3.3;
  const resolutionTrend: ResolutionPoint[] = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(refMs - (9 - i) * 7 * DAY);
    const decline = 1.55 - i * 0.06; // earlier weeks slower, improving over time
    const hours = round1(
      Math.max(0.5, anchorRes * decline + stableInt(`rt-${i}`, -6, 6) / 10),
    );
    resolutionTrend.push({ week: shortDate(d), hours });
  }

  // Chat volume, messages/day over 30 days (weekday pattern).
  const chatVolume: ChatVolumePoint[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(refMs - (29 - i) * DAY);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = stableInt(`cv-${i}`, 55, 130);
    const messages = Math.round(base * (weekend ? 0.45 : 1) * (1 + i * 0.004));
    chatVolume.push({ day: shortDate(d), messages });
  }

  // Top issue categories — real ticket-category mix scaled to the period volume.
  const topCategories: CategoryCount[] = [...catCounts.entries()]
    .map(([category, count]) => ({
      category,
      count: Math.round(periodTotal * (count / total)),
    }))
    .sort((a, b) => b.count - a.count);

  const callMetrics: CallMetrics = {
    missedCallRate: round1(ca.kpis.missedCallRate),
    avgDurationSeconds: ca.kpis.avgDurationSeconds,
    recoveryRate: round1(ca.recovery.rate),
    recoveryTrend: ca.weeklyTrend,
  };

  // Per-agent performance — derived from the real roster + active workload,
  // anchored to the real platform averages (identity isn't unified across
  // tickets/chat/calls in the seed).
  const agents: AgentPerfRow[] = supportAgents
    .map((a) => ({
      name: a.name,
      role: a.role,
      ticketsResolved: a.activeTickets * 6 + stableInt(`tr-${a.id}`, 6, 30),
      avgResolutionHrs: round1(
        Math.max(0.8, anchorRes + stableInt(`art-${a.id}`, -10, 16) / 10),
      ),
      slaCompliance: stableInt(`slac-${a.id}`, 82, 99),
      chatMessages: stableInt(`cm-${a.id}`, 40, 240),
      callsTaken: stableInt(`ct-${a.id}`, 14, 72),
    }))
    .sort((x, y) => y.ticketsResolved - x.ticketsResolved);

  return {
    kpis,
    ticketVolume,
    resolutionTrend,
    chatVolume,
    topCategories,
    callMetrics,
    agents,
  };
}
