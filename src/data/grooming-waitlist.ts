// Mock waitlist entries for the grooming calendar. Dates cluster around the
// current week so the indicators are visible without depending on real time.

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
 */
export type WaitlistExpectedDate =
  | { kind: "asap" }
  | { kind: "specific-date"; date: string }
  | { kind: "day-of-week"; daysOfWeek: number[] };

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
   * Legacy "date" field — first preferred date as a flat ISO string. Kept for
   * back-compat with the calendar indicators; new entries should also fill
   * `expectedDate` for matcher accuracy.
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
  /** Structured expected-date preference (asap / specific-date / day-of-week). */
  expectedDate?: WaitlistExpectedDate;
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

export const groomingWaitlist: GroomingWaitlistEntry[] = [
  {
    id: "wl-01",
    date: "2026-05-14",
    petName: "Mochi",
    petBreed: "Shih Tzu",
    ownerName: "Aman Patel",
    ownerPhone: "(514) 555-0142",
    ownerEmail: "aman.patel@example.com",
    serviceName: "Full Groom",
    preferredStylistName: "Sarah Chen",
    preferredTimeWindow: "morning",
    addedAt: "2026-05-12T09:30:00Z",
    notes: "Anxious in the dryer — please use low setting.",
  },
  {
    id: "wl-02",
    date: "2026-05-14",
    petName: "Biscuit",
    petBreed: "Golden Retriever",
    ownerName: "Marie Tremblay",
    ownerPhone: "(514) 555-0188",
    serviceName: "Bath & Brush",
    preferredTimeWindow: "afternoon",
    addedAt: "2026-05-13T14:10:00Z",
  },
  {
    id: "wl-03",
    date: "2026-05-15",
    petName: "Pixel",
    petBreed: "Poodle Mix",
    ownerName: "Jordan Lee",
    ownerPhone: "(514) 555-0201",
    ownerEmail: "jordan@example.com",
    serviceName: "Full Groom",
    preferredTimeWindow: "anytime",
    addedAt: "2026-05-13T17:45:00Z",
  },
  {
    id: "wl-04",
    date: "2026-05-16",
    petName: "Tofu",
    petBreed: "French Bulldog",
    ownerName: "Sasha Petrov",
    ownerPhone: "(514) 555-0299",
    serviceName: "Nail Trim",
    preferredTimeWindow: "morning",
    addedAt: "2026-05-13T11:00:00Z",
    notes: "Walk-in OK if a cancellation opens.",
  },
  {
    id: "wl-05",
    date: "2026-05-19",
    petName: "Cleo",
    petBreed: "Maltese",
    ownerName: "Pierre Dupont",
    ownerPhone: "(514) 555-0317",
    serviceName: "Full Groom",
    preferredStylistName: "Marcus Reyes",
    preferredTimeWindow: "afternoon",
    addedAt: "2026-05-14T08:20:00Z",
  },
  {
    id: "wl-06",
    date: "2026-05-21",
    petName: "Rocky",
    petBreed: "Labrador",
    ownerName: "Nadia Hassan",
    ownerPhone: "(514) 555-0354",
    serviceName: "De-shedding Treatment",
    preferredTimeWindow: "anytime",
    addedAt: "2026-05-14T10:50:00Z",
  },
  {
    id: "wl-07",
    date: "2026-05-21",
    petName: "Toby",
    petBreed: "Bichon",
    ownerName: "Léa Martin",
    ownerPhone: "(514) 555-0398",
    ownerEmail: "lea.m@example.com",
    serviceName: "Full Groom",
    preferredStylistName: "Sarah Chen",
    preferredTimeWindow: "morning",
    addedAt: "2026-05-14T12:15:00Z",
    notes: "Repeat client — same trim as last visit.",
  },
  // New-shape entries exercising every expectedDate / expectedTime variant.
  {
    id: "wl-08",
    date: new Date().toISOString().split("T")[0],
    petName: "Daisy",
    petBreed: "Cavapoo",
    ownerName: "Mrs. Johnson",
    ownerPhone: "(514) 555-0421",
    ownerEmail: "johnson@example.com",
    serviceName: "Full Groom",
    preferredStylistIds: [],
    expectedDate: { kind: "asap" },
    expectedTime: { kind: "period", period: "afternoon" },
    validUntil: new Date(Date.now() + 14 * 86400_000)
      .toISOString()
      .split("T")[0],
    postalCode: "H2P 1A3",
    source: "calendar-plus",
    comment: "Going on vacation next week — would love to slot in ASAP.",
    addedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    status: "waiting",
  },
  {
    id: "wl-09",
    date: new Date(Date.now() + 2 * 86400_000).toISOString().split("T")[0],
    petName: "Pepper",
    petBreed: "Schnauzer",
    ownerName: "Hassan Family",
    ownerPhone: "(514) 555-0512",
    serviceName: "Bath & Brush",
    preferredStylistIds: ["stylist-002"],
    expectedDate: {
      kind: "day-of-week",
      daysOfWeek: [2, 4], // Tue, Thu
    },
    expectedTime: { kind: "exact-time", time: "11:00" },
    validUntil: new Date(Date.now() + 30 * 86400_000)
      .toISOString()
      .split("T")[0],
    source: "moved-from-appointment",
    comment:
      "Originally booked for last Friday, rescheduling — only Tue/Thu work.",
    addedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    status: "waiting",
  },
];
