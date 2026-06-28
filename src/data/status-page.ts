// Public status-page data — platform service health, 90-day uptime history, and
// incident reports. Fully deterministic (anchored to a fixed reference date + a
// tiny PRNG), so the public page renders identically on server and client with
// no Date.now() drift. Distinct from the pet/facility incident model in
// src/data/incidents.ts — these are PLATFORM/service incidents.

import { buildEnhancedAnnouncements } from "./enhanced-announcements";
import type { EnhancedAnnouncement } from "@/types/announcement";

export type ComponentStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance";

export type IncidentImpact = "minor" | "major" | "critical" | "maintenance";

export type IncidentStatus =
  | "investigating"
  | "identified"
  | "monitoring"
  | "resolved";

export interface StatusComponent {
  id: string;
  name: string;
  description: string;
}

export interface IncidentUpdate {
  status: IncidentStatus;
  at: string; // ISO datetime
  message: string;
}

export interface PlatformIncident {
  id: string;
  title: string;
  impact: IncidentImpact;
  affected: string[]; // component ids
  startedAt: string; // ISO datetime
  resolvedAt: string | null;
  updates: IncidentUpdate[]; // chronological, oldest first
}

export interface DayUptime {
  date: string; // YYYY-MM-DD
  uptime: number; // 0..100
  status: ComponentStatus;
}

/** Fixed "today" so the 90-day window + relative times are deterministic. */
export const REFERENCE_DATE = "2026-06-24";
export const REFERENCE_MS = Date.parse(`${REFERENCE_DATE}T12:00:00Z`);
const HISTORY_DAYS = 90;

export const STATUS_COMPONENTS: StatusComponent[] = [
  {
    id: "api",
    name: "API Availability",
    description: "Core platform API and third-party integrations",
  },
  {
    id: "booking",
    name: "Booking System",
    description: "Online booking, scheduling, and calendars",
  },
  {
    id: "payments",
    name: "Payment Processing",
    description: "Card payments, invoices, and payouts",
  },
  {
    id: "messaging",
    name: "Messaging",
    description: "Email, SMS, and in-app messages",
  },
  {
    id: "calling",
    name: "Calling",
    description: "Inbound & outbound voice and voicemail",
  },
  {
    id: "portal",
    name: "Customer Portal",
    description: "Pet-owner booking and account portal",
  },
];

// Incidents that fall inside the 90-day window (2026-03-26 .. 2026-06-24).
export const platformIncidents: PlatformIncident[] = [
  {
    id: "inc-2026-0624",
    title: "Elevated email delivery latency",
    impact: "minor",
    affected: ["messaging"],
    startedAt: "2026-06-24T09:12:00Z",
    resolvedAt: null,
    updates: [
      {
        status: "investigating",
        at: "2026-06-24T09:12:00Z",
        message:
          "We're investigating reports of delayed email notifications. SMS and in-app messages are unaffected.",
      },
      {
        status: "identified",
        at: "2026-06-24T09:40:00Z",
        message:
          "The delay is a backlog at our email delivery provider. Queued messages will be delivered, not lost.",
      },
      {
        status: "monitoring",
        at: "2026-06-24T10:15:00Z",
        message:
          "The backlog is clearing and delivery times are recovering. We're monitoring the queue.",
      },
    ],
  },
  {
    id: "inc-2026-0609",
    title: "Intermittent timeouts in the booking calendar",
    impact: "major",
    affected: ["booking", "api"],
    startedAt: "2026-06-09T14:02:00Z",
    resolvedAt: "2026-06-09T15:48:00Z",
    updates: [
      {
        status: "investigating",
        at: "2026-06-09T14:02:00Z",
        message:
          "Some facilities are seeing timeouts when opening the booking calendar. We're investigating.",
      },
      {
        status: "identified",
        at: "2026-06-09T14:35:00Z",
        message:
          "A database connection pool was saturated by a slow query. We've capped the query and added capacity.",
      },
      {
        status: "monitoring",
        at: "2026-06-09T15:05:00Z",
        message:
          "Timeouts have stopped. We're monitoring to confirm stability.",
      },
      {
        status: "resolved",
        at: "2026-06-09T15:48:00Z",
        message:
          "The booking calendar is fully operational. A permanent fix for the slow report query is rolling out.",
      },
    ],
  },
  {
    id: "inc-2026-0518",
    title: "Scheduled maintenance: database upgrade",
    impact: "maintenance",
    affected: ["api", "booking", "payments", "portal"],
    startedAt: "2026-05-18T06:00:00Z",
    resolvedAt: "2026-05-18T07:10:00Z",
    updates: [
      {
        status: "investigating",
        at: "2026-05-18T06:00:00Z",
        message:
          "Scheduled maintenance has begun. The platform may be briefly unavailable while we upgrade our database.",
      },
      {
        status: "monitoring",
        at: "2026-05-18T06:50:00Z",
        message:
          "The upgrade is complete and services are coming back online. We're verifying everything is healthy.",
      },
      {
        status: "resolved",
        at: "2026-05-18T07:10:00Z",
        message: "Maintenance is complete. All systems are operational.",
      },
    ],
  },
  {
    id: "inc-2026-0430",
    title: "Delayed card payment confirmations",
    impact: "minor",
    affected: ["payments"],
    startedAt: "2026-04-30T17:20:00Z",
    resolvedAt: "2026-04-30T18:05:00Z",
    updates: [
      {
        status: "investigating",
        at: "2026-04-30T17:20:00Z",
        message:
          "Payment confirmations are taking longer than usual to appear. Payments are still being processed.",
      },
      {
        status: "monitoring",
        at: "2026-04-30T17:45:00Z",
        message:
          "Our payment processor reported elevated latency that is now recovering.",
      },
      {
        status: "resolved",
        at: "2026-04-30T18:05:00Z",
        message: "Payment confirmations are back to normal speed.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: ComponentStatus[] = [
  "operational",
  "maintenance",
  "degraded",
  "partial_outage",
  "major_outage",
];

function impactToStatus(impact: IncidentImpact): ComponentStatus {
  switch (impact) {
    case "critical":
      return "major_outage";
    case "major":
      return "partial_outage";
    case "maintenance":
      return "maintenance";
    default:
      return "degraded";
  }
}

function impactUptime(impact: IncidentImpact): number {
  switch (impact) {
    case "critical":
      return 80;
    case "major":
      return 95;
    case "maintenance":
      return 99; // planned + brief
    default:
      return 98;
  }
}

function worse(a: ComponentStatus, b: ComponentStatus): ComponentStatus {
  return SEVERITY_ORDER.indexOf(b) > SEVERITY_ORDER.indexOf(a) ? b : a;
}

export function activeIncidents(): PlatformIncident[] {
  return platformIncidents.filter((i) => i.resolvedAt === null);
}

export function resolvedIncidents(): PlatformIncident[] {
  return platformIncidents
    .filter((i) => i.resolvedAt !== null)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

/** Current status of a component: worst active incident affecting it, else operational. */
export function componentStatus(componentId: string): ComponentStatus {
  let status: ComponentStatus = "operational";
  for (const inc of activeIncidents()) {
    if (inc.affected.includes(componentId)) {
      status = worse(status, impactToStatus(inc.impact));
    }
  }
  return status;
}

export function overallStatus(): ComponentStatus {
  let status: ComponentStatus = "operational";
  for (const c of STATUS_COMPONENTS) {
    status = worse(status, componentStatus(c.id));
  }
  return status;
}

// ---------------------------------------------------------------------------
// 90-day uptime history (deterministic)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function isoDateMinus(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function componentHistory(componentId: string): DayUptime[] {
  const rand = mulberry32(fnv(componentId));
  const relevant = platformIncidents.filter((i) =>
    i.affected.includes(componentId),
  );
  const out: DayUptime[] = [];
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const date = isoDateMinus(REFERENCE_DATE, i);
    let uptime = 100;
    let status: ComponentStatus = "operational";
    for (const inc of relevant) {
      const startDay = inc.startedAt.slice(0, 10);
      const endDay = (inc.resolvedAt ?? `${REFERENCE_DATE}T`).slice(0, 10);
      if (date >= startDay && date <= endDay) {
        const u = impactUptime(inc.impact);
        if (u < uptime) {
          uptime = u;
          status = impactToStatus(inc.impact);
        }
      }
    }
    // Faint, realistic dips on otherwise-green days (stays "operational").
    const blip = rand();
    if (status === "operational" && blip > 0.94) {
      uptime = Math.round((99.7 + rand() * 0.25) * 100) / 100;
    }
    out.push({ date, uptime: Math.round(uptime * 100) / 100, status });
  }
  return out;
}

export function uptimePercent(componentId: string): number {
  const h = componentHistory(componentId);
  const avg = h.reduce((s, d) => s + d.uptime, 0) / h.length;
  return Math.round(avg * 100) / 100;
}

// ---------------------------------------------------------------------------
// Maintenance windows (sourced from Yipyy System Announcements)
// ---------------------------------------------------------------------------

const MAINTENANCE_RE =
  /maintenance|downtime|service window|scheduled\s+(?:maintenance|upgrade)/i;

/**
 * Published Yipyy announcements that describe a maintenance window — surfaced on
 * the public status page so a single announcement reaches facilities here too.
 */
export function getMaintenanceAnnouncements(
  nowMs: number,
): EnhancedAnnouncement[] {
  return buildEnhancedAnnouncements(nowMs).filter(
    (a) =>
      a.status === "Published" &&
      (MAINTENANCE_RE.test(a.title) || MAINTENANCE_RE.test(a.body)),
  );
}
