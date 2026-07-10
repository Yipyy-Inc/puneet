// ── HQ Network Activity Feed ─────────────────────────────────────────────
// Chronological cross-location event stream for the Command Center. Mock data
// anchored to the current data month (April 2026); `hqActivityNow` is the
// reference "now" the feed renders relative timestamps against.

export type HqActivityType =
  | "booking_confirmed"
  | "booking_transferred"
  | "staff_conflict"
  | "at_capacity"
  | "new_client"
  | "payment_received"
  | "low_inventory"
  | "evaluation_completed";

/** Primary category used by the feed's filter chips (Alerts is a cross-cut of
 *  `actionRequired`, not a category). */
export type HqActivityCategory = "bookings" | "financial" | "staff";

export interface HqActivityEvent {
  id: string;
  type: HqActivityType;
  category: HqActivityCategory;
  locationId: string;
  description: string;
  /** ISO timestamp. */
  timestamp: string;
  /** True for items needing attention — surfaced by the "Alerts" filter. */
  actionRequired: boolean;
}

/** Reference "now" for relative-time rendering (just after the newest event). */
export const hqActivityNow = "2026-04-25T16:45:00";

// Newest first.
export const hqActivityFeed: HqActivityEvent[] = [
  {
    id: "act-01",
    type: "payment_received",
    category: "financial",
    locationId: "loc-dv-main",
    description: "Payment received: $135.00 from Alice Johnson",
    timestamp: "2026-04-25T16:42:00",
    actionRequired: false,
  },
  {
    id: "act-02",
    type: "booking_confirmed",
    category: "bookings",
    locationId: "loc-dv-laval",
    description: "New boarding booking confirmed for Otto (5 nights)",
    timestamp: "2026-04-25T16:30:00",
    actionRequired: false,
  },
  {
    id: "act-03",
    type: "at_capacity",
    category: "bookings",
    locationId: "loc-dv-main",
    description: "Daycare at capacity (40/40) — waitlist now active",
    timestamp: "2026-04-25T16:05:00",
    actionRequired: true,
  },
  {
    id: "act-04",
    type: "new_client",
    category: "bookings",
    locationId: "loc-dv-ouest",
    description: "New client registered: Émilie Lavoie (2 pets)",
    timestamp: "2026-04-25T15:40:00",
    actionRequired: false,
  },
  {
    id: "act-05",
    type: "evaluation_completed",
    category: "bookings",
    locationId: "loc-dv-main",
    description: "Temperament evaluation completed for Mocha — Passed",
    timestamp: "2026-04-25T15:12:00",
    actionRequired: false,
  },
  {
    id: "act-06",
    type: "low_inventory",
    category: "financial",
    locationId: "loc-dv-ouest",
    description: "Low inventory: Royal Canin Adult — 4 bags left",
    timestamp: "2026-04-25T14:50:00",
    actionRequired: true,
  },
  {
    id: "act-07",
    type: "booking_transferred",
    category: "bookings",
    locationId: "loc-dv-main",
    description: "Booking #1042 transferred from NDG to Plateau",
    timestamp: "2026-04-25T14:20:00",
    actionRequired: false,
  },
  {
    id: "act-08",
    type: "staff_conflict",
    category: "staff",
    locationId: "loc-dv-ouest",
    description:
      "Schedule conflict: Jean-François Roy double-booked at NDG & Plateau",
    timestamp: "2026-04-25T13:30:00",
    actionRequired: true,
  },
  {
    id: "act-09",
    type: "payment_received",
    category: "financial",
    locationId: "loc-dv-laval",
    description: "Payment received: $420.00 from Jean-Philippe Tremblay",
    timestamp: "2026-04-25T11:15:00",
    actionRequired: false,
  },
  {
    id: "act-10",
    type: "booking_confirmed",
    category: "bookings",
    locationId: "loc-dv-ouest",
    description: "New grooming booking confirmed for Loki (Bath & Brush)",
    timestamp: "2026-04-25T10:40:00",
    actionRequired: false,
  },
  {
    id: "act-11",
    type: "new_client",
    category: "bookings",
    locationId: "loc-dv-laval",
    description: "New client registered: Sarah Hamilton (1 pet)",
    timestamp: "2026-04-25T09:20:00",
    actionRequired: false,
  },
  {
    id: "act-12",
    type: "evaluation_completed",
    category: "bookings",
    locationId: "loc-dv-laval",
    description: "Temperament evaluation completed for Freya — Needs review",
    timestamp: "2026-04-24T17:30:00",
    actionRequired: false,
  },
];
