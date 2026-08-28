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

/** How long a dismissal lasts, in words — the tab explains this once. */
export const DISMISSAL_EXPLANATION =
  "Dismissing hides this client until their next visit. If they come back and lapse again, they reappear on their own.";
