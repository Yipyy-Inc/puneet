// Types for the grooming waitlist.
//
// THE MOCK ENTRIES ARE GONE. The waitlist lives in Postgres
// (20260806100000); `useGroomingWaitlist` reads it and the seed migration
// populates the demo facility from real clients and pets. The nine fixture
// entries that used to sit here invented seven households — Aman Patel, Marie
// Tremblay and the rest — who exist in no other table, and keeping them would
// have meant a board that mixed real waiting clients with people who cannot be
// called back.
//
// The legacy field pairs below (`date`/`expectedDate`, `notes`/`comment`,
// `preferredStylistName`/`preferredStylistIds`, `preferredTimeWindow`/
// `expectedTime`) are still on the type but NOT in the database: see Decision 1
// of that migration. Nothing read from Postgres fills the legacy half.

export type GroomingWaitlistStatus =
  | "waiting"
  | "offered"
  | "confirmed"
  | "expired"
  | "removed";

/**
 * Expected-date preference for an Intelligent Waitlist entry.
 *   - asap: any open slot from today forward
 *   - specific-date: only the named ISO date
 *   - day-of-week: a recurring weekday preference (0=Sun … 6=Sat)
 *   - range: any open slot within [startDate, endDate] inclusive (Table 96)
 */
export type WaitlistExpectedDate =
  | { kind: "asap" }
  | { kind: "specific-date"; date: string }
  | { kind: "day-of-week"; daysOfWeek: number[] }
  | { kind: "range"; startDate: string; endDate: string };

/**
 * Expected time-of-day preference.
 *   - anytime: any open slot during business hours
 *   - period: morning, afternoon, evening
 *   - exact-time: HH:MM exact start time (±15 min tolerance applied by matcher)
 */
export type WaitlistExpectedTime =
  | { kind: "anytime" }
  | { kind: "period"; period: "morning" | "afternoon" | "evening" }
  | { kind: "exact-time"; time: string };

/** How a waitlist entry was created — informs notification/audit copy. */
export type WaitlistSource =
  | "manual"
  | "calendar-plus"
  | "moved-from-appointment"
  | "online-booking"
  | "intake-form";

export type GroomingWaitlistEntry = {
  id: string;
  /**
   * The ANCHOR date — the first day this entry could be served, derived by the
   * database from {@link expectedDate} in the facility's timezone. The calendar
   * hangs its per-day waitlist count on this; the matcher uses `expectedDate`.
   *
   * NOT the legacy twin of `expectedDate`, despite once being documented as
   * one: a rule and the first date the rule admits are two facts.
   */
  date: string;
  /** Client id when matched to a known household; undefined for new walk-ins. */
  clientId?: number;
  /** Pet id when known. */
  petId?: number;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  serviceName: string;
  /** Legacy single-stylist preference — preserved for older entries. */
  preferredStylistName?: string;
  /** Multi-select stylist preference; empty array means "anyone." */
  preferredStylistIds?: string[];
  /** Legacy 3-way preference; new entries use {@link expectedTime}. */
  preferredTimeWindow?: "morning" | "afternoon" | "anytime";
  /** Structured expected-date preference (asap / specific-date / day-of-week / range). */
  expectedDate?: WaitlistExpectedDate;
  /**
   * ISO dates the client explicitly cannot do — never offered on these days
   * even if they otherwise satisfy {@link expectedDate} (Table 96).
   */
  excludedDates?: string[];
  /** Structured expected-time preference (anytime / period / exact-time). */
  expectedTime?: WaitlistExpectedTime;
  /**
   * ISO date — after this, the entry is treated as expired and dropped from
   * matching. Undefined = no expiry.
   */
  validUntil?: string;
  /**
   * Optional client postal code for mobile-grooming driving-time estimation.
   * Carries through from the booking form when the entry was created from
   * a mobile booking.
   */
  postalCode?: string;
  /** Where this entry came from — informs audit copy and ticket comments. */
  source?: WaitlistSource;
  /**
   * Free-text comment from the client / staff. When the entry converts to
   * an appointment, this is appended as a ticket comment so the context
   * survives the handoff.
   */
  comment?: string;
  addedAt: string;
  /** Legacy notes field; new entries should use {@link comment}. */
  notes?: string;
  /** Workflow status — defaults to "waiting" for legacy entries. */
  status?: GroomingWaitlistStatus;
  /** When the slot offer was sent (sets the confirmation countdown). */
  offeredAt?: string;
  /** Deadline (ISO) for the client to confirm before the offer expires. */
  offeredUntil?: string;
  /** Time window of the offered slot, e.g. "10:00–11:30". */
  offeredSlot?: string;
};
