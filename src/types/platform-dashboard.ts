// View-model types for the platform admin command center (/dashboard).
// Kept separate from the data/builders per the build-performance rules
// ("never export types and mock data from the same file").

export type PlatformHealthStatus = "operational" | "degraded" | "down";

/** Zone 1 — Business Health tiles. All values are computed from real entities. */
export interface BusinessHealth {
  activeFacilities: {
    /** Facilities whose status is Active OR whose subscription is on Trial. */
    count: number;
    /** Net-new active/trial facilities in the trailing 30 days (signed). */
    delta: number;
  };
  mrr: {
    /** Sum of active subscriptions normalized to a monthly amount (USD). */
    amount: number;
    /** New monthly recurring revenue added in the trailing 30 days (USD). */
    delta: number;
  };
  openTickets: {
    count: number;
    open: number;
    inProgress: number;
    escalated: number;
    /** Tickets that have breached or escalated their SLA. */
    slaBreached: number;
  };
  trialsExpiring: {
    /** Trial subscriptions whose trial end date is on or before today + 7 days. */
    count: number;
    soonestLabel: string | null;
  };
  platformHealth: {
    /** Overall infrastructure health percentage (0–100). */
    percent: number;
    status: PlatformHealthStatus;
    serversOnline: number;
    totalServers: number;
    degradedServices: number;
  };
}

/** Zone 2 — Needs Attention. */
export interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  facilityId: number;
  facilityName: string;
  amount: number;
  daysOverdue: number;
}

export interface PendingRequestItem {
  id: number;
  facilityName: string;
  requestType: string;
  /** Human-readable relative time, e.g. "10 minutes ago". */
  when: string;
}

export interface SlaBreachedTicketItem {
  id: string;
  facility: string;
  priority: string;
  title: string;
  hoursOver: number;
}

export type RiskSeverity = "warning" | "critical";

export interface AtRiskFacilityItem {
  facilityId: number;
  facilityName: string;
  reason: string;
  severity: RiskSeverity;
}

/** A facility flagged for suspension by the Day-14 dunning step. */
export interface SuspensionFlagItem {
  facilityId: number;
  facilityName: string;
  invoiceNumber: string;
  amount: number;
  daysPastDue: number;
}

export interface NeedsAttention {
  overdueInvoices: OverdueInvoiceItem[];
  suspensionFlags: SuspensionFlagItem[];
  pendingRequests: PendingRequestItem[];
  slaBreachedTickets: SlaBreachedTicketItem[];
  atRiskFacilities: AtRiskFacilityItem[];
}

/** Zone 3 — Activity feed. */
export type PlatformEventCategory =
  | "facility"
  | "billing"
  | "support"
  | "system";

export type PlatformEventTone =
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "slate";

export interface PlatformEvent {
  id: string;
  category: PlatformEventCategory;
  tone: PlatformEventTone;
  /** Plain-English description of what happened. */
  description: string;
  facilityId?: number;
  facilityName?: string;
  /** ISO timestamp (synthesized now-relative so the feed is always fresh). */
  timestamp: string;
}

/** Lightweight facility row used by the global Find Facility search. */
export interface FacilityListItem {
  id: number;
  name: string;
  status: string;
  plan: string;
}
