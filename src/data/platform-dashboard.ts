// Builders for the platform admin command center (/dashboard).
//
// These derive the dashboard view models from the real mock entities
// (facilities, subscriptions, support tickets, invoices, requests,
// infrastructure health). Counts and money are always computed from real
// data — never hardcoded.
//
// NOTE ON TIME: the underlying mock dates are stale (invoices/SLAs from 2024,
// trials/logs from 2025), so any "urgency" dimension (activity-feed
// timestamps, days-overdue, hours-over-SLA, last-login) is synthesized
// `now`-relative and DETERMINISTICALLY (a stable hash of the real entity id).
// Identities, counts and amounts remain 100% real. When a real backend with
// fresh timestamps arrives, swap the `stableInt(...)` calls for the real
// date math and the rest of the dashboard is unchanged.

import { facilities } from "@/data/facilities";
import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { supportTickets } from "@/data/support-tickets";
import { invoices } from "@/data/payments";
import { facilityRequests } from "@/data/facility-requests";
import {
  serviceUptimes,
  serverStatuses,
  systemAlerts,
  healthDashboardStats,
} from "@/data/system-health";
import { getSuspensionFlags } from "@/data/dunning";
import type {
  BusinessHealth,
  NeedsAttention,
  OverdueInvoiceItem,
  PlatformEvent,
  PlatformEventTone,
  SlaBreachedTicketItem,
  SuspensionFlagItem,
  AtRiskFacilityItem,
} from "@/types/platform-dashboard";

const DAY = 86_400_000;
const MINUTE = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic 32-bit hash of a string seed. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Stable integer in [min, max] derived from a seed (no randomness). */
function stableInt(seed: string, min: number, max: number): number {
  const span = max - min + 1;
  return min + (hashSeed(seed) % span);
}

/** Normalize a billing total to a monthly amount. */
function monthlyAmount(totalCost: number, cycle: string): number {
  if (cycle === "quarterly") return totalCost / 3;
  if (cycle === "yearly") return totalCost / 12;
  return totalCost; // monthly (and any other cadence) treated as monthly
}

const facilityNameById = new Map<number, string>(
  facilities.map((f) => [f.id, f.name]),
);

function nameFor(id: number): string {
  return facilityNameById.get(id) ?? `Facility #${id}`;
}

function daysSince(now: Date, iso: string): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);
}

const OPEN_TICKET_STATUSES = ["Open", "In Progress", "Escalated"];

function isSlaBreached(ticket: (typeof supportTickets)[number]): boolean {
  // Only open tickets can be actively breaching — a resolved/closed ticket that
  // was once escalated is not "needs attention". Use real signals for the
  // breach decision (resolution due dates are stale, so we don't compare them
  // against the live clock here).
  if (!OPEN_TICKET_STATUSES.includes(ticket.status)) return false;
  const sla = ticket.sla;
  return (
    (sla?.breachCount ?? 0) > 0 ||
    sla?.isEscalated === true ||
    ticket.status === "Escalated"
  );
}

// ---------------------------------------------------------------------------
// Zone 1 — Business Health
// ---------------------------------------------------------------------------

export function buildBusinessHealth(now: Date): BusinessHealth {
  // Active OR Trial facilities (facility status active, or a trial subscription).
  const trialFacilityIds = new Set(
    facilitySubscriptions
      .filter((s) => s.status === "trial")
      .map((s) => s.facilityId),
  );
  const activeOrTrial = facilities.filter(
    (f) => f.status === "active" || trialFacilityIds.has(f.id),
  );
  const facilitiesDelta = activeOrTrial.filter(
    (f) => f.dayJoined && daysSince(now, f.dayJoined) <= 30,
  ).length;

  // MRR — sum of active subscriptions normalized to monthly.
  const activeSubs = facilitySubscriptions.filter((s) => s.status === "active");
  const mrrAmount = Math.round(
    activeSubs.reduce(
      (sum, s) => sum + monthlyAmount(s.billing.totalCost, s.billingCycle),
      0,
    ),
  );
  const mrrDelta = Math.round(
    activeSubs
      .filter((s) => s.startDate && daysSince(now, s.startDate) <= 30)
      .reduce(
        (sum, s) => sum + monthlyAmount(s.billing.totalCost, s.billingCycle),
        0,
      ),
  );

  // Open support tickets + SLA breaches.
  const openTickets = supportTickets.filter((t) =>
    OPEN_TICKET_STATUSES.includes(t.status),
  );
  const slaBreached = openTickets.filter(isSlaBreached).length;

  // Trials expiring within 7 days (trial_end_date <= today + 7).
  const horizon = new Date(now.getTime() + 7 * DAY);
  const trialSubs = facilitySubscriptions.filter((s) => s.status === "trial");
  const expiringTrials = trialSubs.filter((s) => {
    const end = new Date(s.trialEndDate ?? s.endDate);
    return end <= horizon;
  });
  const soonestTrial = [...expiringTrials].sort(
    (a, b) =>
      new Date(a.trialEndDate ?? a.endDate).getTime() -
      new Date(b.trialEndDate ?? b.endDate).getTime(),
  )[0];

  // Platform health from infrastructure checks.
  const degradedServices = serviceUptimes.filter(
    (s) => s.status !== "Operational",
  ).length;
  const anyDown =
    serviceUptimes.some(
      (s) => s.status === "Major Outage" || s.status === "Partial Outage",
    ) || serverStatuses.some((s) => s.status === "Offline");
  const anyDegraded =
    degradedServices > 0 ||
    serverStatuses.some(
      (s) => s.status === "Degraded" || s.status === "Maintenance",
    ) ||
    healthDashboardStats.activeIncidents > 0 ||
    healthDashboardStats.overallHealth < 100;

  return {
    activeFacilities: {
      count: activeOrTrial.length,
      delta: facilitiesDelta,
    },
    mrr: {
      amount: mrrAmount,
      delta: mrrDelta,
    },
    openTickets: {
      count: openTickets.length,
      open: openTickets.filter((t) => t.status === "Open").length,
      inProgress: openTickets.filter((t) => t.status === "In Progress").length,
      escalated: openTickets.filter((t) => t.status === "Escalated").length,
      slaBreached,
    },
    trialsExpiring: {
      count: expiringTrials.length,
      soonestLabel: soonestTrial ? soonestTrial.facilityName : null,
    },
    platformHealth: {
      percent: healthDashboardStats.overallHealth,
      status: anyDown ? "down" : anyDegraded ? "degraded" : "operational",
      serversOnline: healthDashboardStats.serversOnline,
      totalServers: healthDashboardStats.totalServers,
      degradedServices,
    },
  };
}

// ---------------------------------------------------------------------------
// Zone 2 — Needs Attention
// ---------------------------------------------------------------------------

// Most urgency here (days overdue, hours over SLA, last-login) is synthesized
// deterministically rather than derived from the stale clock. The suspension
// flags come from the dunning engine, which is keyed off `now`.
export function buildNeedsAttention(now: Date): NeedsAttention {
  const overdueInvoices: OverdueInvoiceItem[] = invoices
    .filter((i) => i.status === "overdue")
    .map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      facilityId: i.facilityId,
      facilityName: nameFor(i.facilityId),
      amount: i.amountDue ?? i.total,
      daysOverdue: stableInt(`overdue-${i.id}`, 3, 45),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Facilities flagged for suspension by the Day-14 dunning step.
  const suspensionFlags: SuspensionFlagItem[] = getSuspensionFlags(now)
    .map((f) => ({
      facilityId: f.facilityId,
      facilityName: f.facilityName,
      invoiceNumber: f.invoiceNumber,
      amount: f.amount,
      daysPastDue: f.daysPastDue,
    }))
    .sort((a, b) => b.daysPastDue - a.daysPastDue);

  const pendingRequests = facilityRequests
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      facilityName: r.facilityName,
      requestType: r.requestType,
      when: r.time,
    }));

  const slaBreachedTickets: SlaBreachedTicketItem[] = supportTickets
    .filter(isSlaBreached)
    .map((t) => ({
      id: t.id,
      facility: t.facility,
      priority: t.priority,
      title: t.title,
      hoursOver: stableInt(`sla-${t.id}`, 1, 36),
    }))
    .sort((a, b) => b.hoursOver - a.hoursOver);

  // Facilities at risk: overdue invoice, or booking volume < 50% of last month,
  // or no admin login in > 14 days.
  const overdueFacilityIds = new Set(overdueInvoices.map((i) => i.facilityId));
  const atRiskFacilities: AtRiskFacilityItem[] = [];
  for (const f of facilities) {
    if (f.status !== "active") continue;

    const reasons: string[] = [];
    let severity: AtRiskFacilityItem["severity"] = "warning";

    if (overdueFacilityIds.has(f.id)) {
      reasons.push("Has an overdue invoice");
      severity = "critical";
    }
    const volumePct = stableInt(`vol-${f.id}`, 20, 130); // this month vs last
    if (volumePct < 50) {
      reasons.push(`Bookings at ${volumePct}% of last month`);
      severity = "critical";
    }
    const lastLoginDays = stableInt(`login-${f.id}`, 2, 30);
    if (lastLoginDays > 14) {
      reasons.push(`No admin login in ${lastLoginDays} days`);
    }

    if (reasons.length > 0) {
      atRiskFacilities.push({
        facilityId: f.id,
        facilityName: f.name,
        reason: reasons[0],
        severity,
      });
    }
  }
  atRiskFacilities.sort(
    (a, b) =>
      (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1),
  );

  return {
    overdueInvoices,
    suspensionFlags,
    pendingRequests,
    slaBreachedTickets,
    atRiskFacilities: atRiskFacilities.slice(0, 6),
  };
}

// ---------------------------------------------------------------------------
// Zone 3 — Activity feed (significant platform events, last 24h)
// ---------------------------------------------------------------------------

type RawEvent = Omit<PlatformEvent, "id" | "timestamp">;

export function buildPlatformEvents(now: Date): PlatformEvent[] {
  const raw: RawEvent[] = [];

  // Facility: pending requests.
  for (const r of facilityRequests.filter((r) => r.status === "pending")) {
    raw.push({
      category: "facility",
      tone: "indigo",
      description: `${r.facilityName} submitted a ${r.requestType} request`,
      facilityName: r.facilityName,
    });
  }

  // Billing: trials started + active renewals.
  for (const s of facilitySubscriptions.filter((s) => s.status === "trial")) {
    raw.push({
      category: "billing",
      tone: "amber",
      description: `${s.facilityName} started a ${s.tierName} trial`,
      facilityId: s.facilityId,
      facilityName: s.facilityName,
    });
  }
  for (const s of facilitySubscriptions
    .filter((s) => s.status === "active")
    .slice(0, 3)) {
    raw.push({
      category: "billing",
      tone: "emerald",
      description: `${s.facilityName} renewed their ${s.tierName} subscription`,
      facilityId: s.facilityId,
      facilityName: s.facilityName,
    });
  }

  // Billing: invoices.
  for (const i of invoices.filter((i) => i.status === "overdue")) {
    raw.push({
      category: "billing",
      tone: "rose",
      description: `Invoice ${i.invoiceNumber} for ${nameFor(i.facilityId)} is overdue`,
      facilityId: i.facilityId,
      facilityName: nameFor(i.facilityId),
    });
  }
  for (const i of invoices.filter((i) => i.status === "paid").slice(0, 2)) {
    raw.push({
      category: "billing",
      tone: "emerald",
      description: `${nameFor(i.facilityId)} paid invoice ${i.invoiceNumber}`,
      facilityId: i.facilityId,
      facilityName: nameFor(i.facilityId),
    });
  }

  // Support: escalations + recent tickets.
  for (const t of supportTickets.filter((t) => isSlaBreached(t))) {
    raw.push({
      category: "support",
      tone: "rose",
      description: `Ticket ${t.id} escalated — ${t.title}`,
      facilityName: t.facility,
    });
  }
  for (const t of supportTickets
    .filter((t) => t.status === "Open" || t.status === "In Progress")
    .slice(0, 3)) {
    raw.push({
      category: "support",
      tone: "amber",
      description: `New ${t.priority.toLowerCase()} ticket from ${t.facility}: ${t.title}`,
      facilityName: t.facility,
    });
  }

  // System: alerts + degraded services.
  for (const a of systemAlerts.slice(0, 3)) {
    const tone: PlatformEventTone =
      a.severity === "Critical" || a.severity === "High" ? "rose" : "amber";
    raw.push({
      category: "system",
      tone,
      description: a.title,
    });
  }
  for (const s of serviceUptimes.filter((s) => s.status !== "Operational")) {
    raw.push({
      category: "system",
      tone: "amber",
      description: `${s.serviceName} performance degraded`,
    });
  }

  // Stamp each event with a stable now-relative timestamp spread across 24h,
  // newest first, and keep the most recent 15.
  return raw
    .map((e, index) => ({
      ...e,
      id: `evt-${index}`,
      timestamp: new Date(
        now.getTime() - (8 + index * 78) * MINUTE,
      ).toISOString(),
    }))
    .filter((e) => now.getTime() - new Date(e.timestamp).getTime() <= DAY)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 15);
}
