// ============================================================================
// Rebook reminders — the clients who have not come back.
//
// `src/data/rebook-reminders.ts` still holds the Queue and History fixtures and
// the per-client Service Preferences shapes. This file is the REAL half: what
// `public.lapsed_clients()` answers, and what the Lapsed tab acts on.
//
// The two must not be merged until the other half is converted too. A single
// module exporting both would make it impossible to tell, at an import, whether
// a screen is reading Postgres or five invented people — which is the mistake
// this codebase has paid for most.
// ============================================================================

/** One client who is overdue for one service. */
export interface LapsedClient {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  /** `bookings.service`: 'grooming', 'boarding', or a custom slug. */
  service: string;
  lastVisitAt: string;
  /** The visit this is about — what a reminder quotes and Book now prefills. */
  lastBookingId: string | null;
  daysSince: number;
  /** The facility's own expected interval for this service, in days. */
  expectedDays: number;
  daysOverdue: number;
  /** Counted off the outbox, not stored. Includes queued and sent. */
  remindersSent: number;
  petName: string | null;
}

export interface LapsedPayload {
  clients: LapsedClient[];
  /**
   * False means nobody has configured the frequencies: the list was computed
   * from the app's assumed intervals. The tab says so rather than presenting
   * an assumption as the facility's own number.
   */
  configured: boolean;
  /**
   * Services whose reminders the facility has switched on. A client for a
   * service that is off is still LISTED — staff want to see them — but cannot
   * be messaged, and the card says which.
   */
  remindersEnabledFor: string[];
  /** False when this deployment has no email credentials at all. */
  emailConfigured: boolean;
  smsConfigured: boolean;
}

/** One client+service pairing, the unit every action here operates on. */
export interface LapsedTarget {
  clientId: string;
  service: string;
}

export interface RemindResult {
  /** Messages actually written to the outbox. */
  queued: number;
  /**
   * Already sent today — the unique idempotency key refused the insert. Not a
   * failure, and reported separately so a second click reads as "nothing more
   * to do" rather than as success on a message that did not exist.
   */
  duplicates: number;
  /** Refused before the outbox, with a reason per target. */
  skipped: { clientId: string; service: string; reason: string }[];
}

export interface DismissResult {
  clientId: string;
  service: string;
}

/**
 * Somebody approaching their expected return date — the Queue.
 *
 * The same row shape as a lapsed client, because it is the same row: one
 * `rebook_pipeline` call answers both, and `daysOverdue` being negative is the
 * only thing that makes this one "upcoming" rather than "overdue". Splitting
 * them into two types would invite two definitions of who is excluded.
 */
export interface RebookDue extends LapsedClient {
  /** last visit + the facility's expected interval. */
  dueOn: string;
  /** How far ahead of `dueOn` this facility writes. */
  leadDays: number;
  /** `dueOn - leadDays`. The date staff are actually looking at. */
  scheduledSendOn: string;
}

export interface QueuePayload {
  clients: RebookDue[];
  configured: boolean;
  remindersEnabledFor: string[];
  /** The window that was asked for, echoed so the screen cannot mislabel it. */
  daysAhead: number;
}

/** One rebook reminder that was attempted, read off the outbox. */
export interface RebookHistoryEntry {
  sendId: string;
  clientId: string | null;
  clientName: string | null;
  service: string;
  channel: string;
  /** 'queued' | 'sending' | 'sent' | 'failed' | 'skipped' | 'cancelled'. */
  status: string;
  skipReason: string | null;
  toAddress: string;
  createdAt: string;
  sentAt: string | null;
  /**
   * When they booked again afterwards, or null.
   *
   * Derived by a lateral join at read time, never stored — so it cannot be
   * stale, and it cannot claim a rebook that was later cancelled.
   */
  rebookedAt: string | null;
  /**
   * What that booking was worth. `total_cost`, so it counts the same whether
   * or not the customer has paid yet — the reminder brought the booking back
   * either way.
   */
  rebookedTotal: number | null;
}

export interface RebookHistoryPayload {
  entries: RebookHistoryEntry[];
  /**
   * Counted from the entries themselves rather than kept alongside them.
   * A stored counter is free to disagree with the log it counts.
   */
  stats: {
    sent: number;
    waiting: number;
    skipped: number;
    failed: number;
    rebooked: number;
    /** Summed from the rebooked entries below, never stored. */
    recoveredRevenue: number;
  };
}

/** How long a dismissal lasts, in words — the tab explains this once. */
export const DISMISSAL_EXPLANATION =
  "Dismissing hides this client until their next visit. If they come back and lapse again, they reappear on their own.";

// ============================================================================
// One client's own rebook settings — the client file's Service Preferences.
// ============================================================================

/** How one service works for one client. */
export interface ClientServiceRebook {
  service: string;
  /** The facility's interval, or null if the service is not configured. */
  defaultDays: number | null;
  /** What somebody set for this client, or null. */
  overrideDays: number | null;
  /** What the pipeline will actually use. */
  effectiveDays: number | null;
  source: "default" | "override";
  /** False when the facility has asked not to chase them for this service. */
  remindersEnabled: boolean;
  reason: string | null;
  completedVisits: number;
  /**
   * The average gap between their real completed visits, or null under two.
   *
   * Derived on every read, never stored: it is the EVIDENCE for or against the
   * interval, and a stored copy would be wrong the day after the next visit.
   */
  observedDays: number | null;
}

export interface ClientRebookPreferences {
  /** The master switch: false means no rebook reminders at all for them. */
  remindersEnabled: boolean;
  optOutReason: string | null;
  services: ClientServiceRebook[];
}
