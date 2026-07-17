/**
 * Facility in-app notifications (staff).
 * Used for YipyyGo submissions, form submissions, and other facility events.
 */

import { useSyncExternalStore } from "react";

import { facilityConfig } from "@/data/facility-config";

// Types re-exported from @/types/facility (single source of truth)
export type {
  FacilityNotificationType,
  FacilityNotification,
} from "@/types/facility";
import type {
  FacilityNotification,
  FacilityNotificationType,
} from "@/types/facility";
import {
  buildGroomerBookingMessage,
  groomerAppointmentLink,
  type GroomerBookingEvent,
} from "@/lib/grooming-post-booking";

// Helper to create timestamps relative to now
function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

// Seed notifications across all categories (spec Table 31 examples).
const SEED: FacilityNotification[] = [
  // --- Customers ---
  {
    id: "fn-cust-1",
    type: "customer_registered",
    title: "New customer registered",
    message: "Emily Chen created an account and added 2 pets",
    read: false,
    timestamp: ago(5),
    facilityId: 11,
    category: "customers",
    link: "/facility/dashboard/clients",
  },
  {
    id: "fn-cust-2",
    type: "customer_message",
    title: "Customer message",
    message: "Sarah Johnson sent a message about Bella's pickup time",
    read: false,
    timestamp: ago(15),
    facilityId: 11,
    category: "customers",
    link: "/facility/dashboard/messaging",
  },
  // --- Boarding ---
  {
    id: "fn-board-1",
    type: "checkin",
    title: "Boarding check-in",
    message: "Max (Golden Retriever) checked in for 3-night stay",
    read: false,
    timestamp: ago(10),
    facilityId: 11,
    category: "boarding",
    link: "/facility/dashboard/services/boarding",
    meta: { petName: "Max" },
  },
  {
    id: "fn-board-2",
    type: "checkout",
    title: "Boarding departure today",
    message: "Luna's checkout scheduled for 4:00 PM — Suite 3",
    read: true,
    timestamp: ago(60),
    facilityId: 11,
    category: "boarding",
    link: "/facility/dashboard/services/boarding/check-in",
    meta: { petName: "Luna" },
  },
  // (A static "New boarding request" seed lived here; pending booking requests
  //  now come live from useBookingRequestNotifications — spec Table 52.)
  // --- Daycare ---
  {
    id: "fn-day-1",
    type: "checkin",
    title: "Daycare check-in",
    message: "Bella checked in for full-day daycare",
    read: false,
    timestamp: ago(8),
    facilityId: 11,
    category: "daycare",
    link: "/facility/dashboard/services/daycare",
    meta: { petName: "Bella" },
  },
  {
    id: "fn-day-2",
    type: "attendance_alert",
    title: "Daycare at 90% capacity",
    message: "18 of 20 spots filled for today — consider waitlist",
    read: false,
    timestamp: ago(45),
    facilityId: 11,
    category: "daycare",
    link: "/facility/dashboard/services/daycare",
  },
  {
    id: "fn-day-3",
    type: "incident",
    title: "Daycare incident report",
    message: "Minor scrape reported for Rocky during group play",
    read: true,
    timestamp: ago(120),
    facilityId: 11,
    category: "daycare",
    link: "/facility/dashboard/incidents",
    meta: { petName: "Rocky" },
  },
  // --- Grooming ---
  {
    id: "fn-groom-1",
    type: "appointment_confirmed",
    title: "Grooming confirmed",
    message: "Daisy — Full groom at 11:00 AM with Sarah",
    read: false,
    timestamp: ago(20),
    facilityId: 11,
    category: "grooming",
    link: "/facility/dashboard/services/grooming",
    meta: { petName: "Daisy" },
  },
  {
    id: "fn-groom-2",
    type: "appointment_completed",
    title: "Grooming completed",
    message: "Buddy's bath & trim done — ready for pickup",
    read: true,
    timestamp: ago(90),
    facilityId: 11,
    category: "grooming",
    link: "/facility/dashboard",
    meta: { petName: "Buddy" },
  },
  // --- Training ---
  {
    id: "fn-train-1",
    type: "session_update",
    title: "Training session note",
    message: "Rex completed Level 2 obedience — passed all markers",
    read: false,
    timestamp: ago(55),
    facilityId: 11,
    category: "training",
    link: "/facility/dashboard/services/training",
    meta: { petName: "Rex" },
  },
  {
    id: "fn-train-2",
    type: "booking_new",
    title: "Training enrollment",
    message: "Coco enrolled in Puppy Basics (4-week series)",
    read: true,
    timestamp: ago(180),
    facilityId: 11,
    category: "training",
    link: "/facility/dashboard/services/training",
    meta: { petName: "Coco" },
  },
  // --- Forms ---
  {
    id: "fn-form-1",
    type: "form_submission_new",
    title: "New form submission",
    message: "New Client Intake — Emily Chen",
    read: false,
    timestamp: ago(12),
    facilityId: 11,
    category: "forms",
    link: "/facility/dashboard/forms/submissions/sub-1",
    submissionId: "sub-1",
    meta: {
      formName: "New Client Intake",
      formId: "form-1",
      submissionId: "sub-1",
      hasRedFlag: false,
      hasFiles: false,
    },
  },
  {
    id: "fn-form-2",
    type: "form_submission_red_flag",
    title: "Red flag on submission",
    message: "Boarding Intake — aggressive behavior reported for Duke",
    read: false,
    timestamp: ago(25),
    facilityId: 11,
    category: "forms",
    link: "/facility/dashboard/forms/submissions/sub-2",
    submissionId: "sub-2",
    meta: {
      formName: "Boarding Intake",
      formId: "form-2",
      submissionId: "sub-2",
      hasRedFlag: true,
      hasFiles: false,
    },
  },
  {
    id: "fn-form-3",
    type: "form_submission_has_files",
    title: "Submission with attachments",
    message: "Vaccination records uploaded for Milo",
    read: true,
    timestamp: ago(200),
    facilityId: 11,
    category: "forms",
    link: "/facility/dashboard/forms/submissions/sub-3",
    submissionId: "sub-3",
    meta: {
      formName: "Pet Profile",
      formId: "form-3",
      submissionId: "sub-3",
      hasRedFlag: false,
      hasFiles: true,
    },
  },
  // --- YipyyGo ---
  {
    id: "fn-yipyygo-3",
    type: "yipyygo_submitted",
    title: "Express Check-In submitted",
    message: "Max — Bob Smith · Booking #3 · 2024-03-10",
    read: false,
    timestamp: ago(130),
    facilityId: 11,
    category: "yipyygo",
    bookingId: 3,
    link: "/facility/dashboard/bookings/3#yipyygo",
    meta: { petName: "Max", arrivalTime: "2024-03-10 08:00", bookingRef: "#3" },
  },
  {
    id: "fn-yipyygo-4",
    type: "warning",
    title: "Express form needs review",
    message: "Rex — John Doe · Booking #4 · 2024-03-13",
    read: false,
    timestamp: ago(240),
    facilityId: 11,
    category: "yipyygo",
    bookingId: 4,
    link: "/facility/dashboard/bookings/4#yipyygo",
    meta: { petName: "Rex", arrivalTime: "2024-03-13 07:30", bookingRef: "#4" },
  },
  {
    id: "fn-yipyygo-5",
    type: "yipyygo_missing",
    title: "Express Check-In missing",
    message: "Luna — Emma Davis · Booking #5 · arriving tomorrow",
    read: false,
    timestamp: ago(60),
    facilityId: 11,
    category: "yipyygo",
    bookingId: 5,
    link: "/facility/dashboard/bookings/5#yipyygo",
    meta: { petName: "Luna", bookingRef: "#5" },
  },
  // --- Older, already-read items (demonstrate retention/archive, Table 43) ---
  {
    id: "fn-arch-1",
    type: "checkout",
    title: "Boarding departure",
    message: "Cooper (Beagle) checked out after a 2-night stay",
    read: true,
    timestamp: ago(45 * 24 * 60), // ~45 days ago → archived at 7/14/30, kept at 90
    facilityId: 11,
    category: "boarding",
    link: "/facility/dashboard/bookings",
  },
  {
    id: "fn-arch-2",
    type: "customer_registered",
    title: "New customer registered",
    message: "Priya Nair created an account and added 1 pet",
    read: true,
    timestamp: ago(100 * 24 * 60), // ~100 days ago → archived at every window
    facilityId: 11,
    category: "customers",
    link: "/facility/dashboard/clients",
  },
];

// ── Persistent store ────────────────────────────────────────────────────────
// localStorage for durability + a BroadcastChannel for cross-tab sync, with an
// immutable `commit` so `useSyncExternalStore` snapshots stay stable between
// changes. This is the single facility-notification store (the old parallel
// stack was removed).
const STORAGE_KEY = "yipyy-facility-notifications-v2";
const CHANNEL = "yipyy-facility-notifications-v2";

let state: FacilityNotification[] = SEED;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((cb) => cb());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (SSR / quota)
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as FacilityNotification[];
  } catch {
    // ignore malformed
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    load();
    emit();
  };
}

/** Lazily hydrate from localStorage + open the cross-tab channel. No-op on the
 *  server and after the first run. Called from subscribe + every mutation so
 *  the first client interaction picks up persisted state. */
function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  ensureChannel();
}

function commit(next: FacilityNotification[]) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

export function getFacilityNotifications(
  facilityId?: number,
): FacilityNotification[] {
  const list = facilityId
    ? state.filter((n) => n.facilityId == null || n.facilityId === facilityId)
    : [...state];
  return list.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function getUnreadFacilityNotificationCount(
  facilityId?: number,
): number {
  return getFacilityNotifications(facilityId).filter((n) => !n.read).length;
}

export function addFacilityNotification(
  notification: Omit<FacilityNotification, "id" | "read" | "timestamp">,
): FacilityNotification {
  ensureReady();
  const item: FacilityNotification = {
    ...notification,
    // Design Principle 4 — every notification is actionable. If a caller omits
    // a destination, fall back to the notification center so the row is never a
    // dead end (the bell row wraps this in a <Link>).
    link: notification.link ?? "/facility/notifications",
    id: `fn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    read: false,
    timestamp: new Date().toISOString(),
  };
  commit([item, ...state]);
  return item;
}

export function markFacilityNotificationRead(id: string): void {
  ensureReady();
  if (!state.some((n) => n.id === id && !n.read)) return;
  commit(state.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markFacilityNotificationUnread(id: string): void {
  ensureReady();
  if (!state.some((n) => n.id === id && n.read)) return;
  commit(state.map((n) => (n.id === id ? { ...n, read: false } : n)));
}

export function markAllFacilityNotificationsRead(facilityId?: number): void {
  ensureReady();
  const inScope = (n: FacilityNotification) =>
    facilityId ? n.facilityId == null || n.facilityId === facilityId : true;
  if (!state.some((n) => !n.read && inScope(n))) return;
  commit(state.map((n) => (!n.read && inScope(n) ? { ...n, read: true } : n)));
}

export function subscribeToFacilityNotifications(
  callback: () => void,
): () => void {
  ensureReady();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ── useSyncExternalStore surface ─────────────────────────────────────────────
// Returns the raw list with a stable reference between commits; consumers
// filter/sort as needed. getServerSnapshot returns the seed so SSR + the first
// client render agree (hydration-safe), then localStorage loads on subscribe.
function getSnapshot(): FacilityNotification[] {
  return state;
}

function getServerSnapshot(): FacilityNotification[] {
  return SEED;
}

export function useFacilityNotifications(): FacilityNotification[] {
  return useSyncExternalStore(
    subscribeToFacilityNotifications,
    getSnapshot,
    getServerSnapshot,
  );
}

/**
 * Notify the assigned groomer when a booking is created / reassigned /
 * rescheduled / cancelled (spec Tables 74–76). Mocks the in-app channel by
 * pushing to the facility feed; returns the notification so the caller can
 * also fire a toast (SMS/email/push are mocked, not sent). Message content is
 * the Table 75 / 76 payload from {@link buildGroomerBookingMessage}.
 */
export function notifyGroomerOfBooking(params: {
  facilityId: number;
  /** Grooming appointment id (string) — used for the View link. */
  appointmentId: string;
  event: GroomerBookingEvent;
  petName: string;
  petBreed?: string;
  serviceLabel: string;
  /** Human date, e.g. "Mon, Jul 21". */
  date: string;
  time: string;
  ownerName: string;
  ownerPhone: string;
  addOns?: string[];
}): FacilityNotification {
  const message = buildGroomerBookingMessage({
    event: params.event,
    petName: params.petName,
    petBreed: params.petBreed,
    serviceLabel: params.serviceLabel,
    date: params.date,
    time: params.time,
    ownerName: params.ownerName,
    ownerPhone: params.ownerPhone,
    addOns: params.addOns,
    viewLink: groomerAppointmentLink(params.appointmentId),
  });
  const typeByEvent: Record<GroomerBookingEvent, FacilityNotificationType> = {
    created: "booking_new",
    reassigned: "session_update",
    rescheduled: "session_update",
    cancelled: "booking_cancelled",
  };
  const titleByEvent: Record<GroomerBookingEvent, string> = {
    created: "New booking assigned to you",
    reassigned: "Appointment reassigned to you",
    rescheduled: "Appointment rescheduled",
    cancelled: "Appointment cancelled",
  };
  return addFacilityNotification({
    type: typeByEvent[params.event],
    title: titleByEvent[params.event],
    message,
    facilityId: params.facilityId,
    category: "grooming",
    link: groomerAppointmentLink(params.appointmentId),
    meta: { petName: params.petName },
  });
}

/**
 * Push a groomer-facing reminder (spec Tables 81 & 82) to the in-app feed.
 * `kind: "morning"` is the day's first-appointment nudge; `kind: "upcoming"`
 * is the 30-minutes-before pre-visit reminder. The message is built by
 * src/lib/grooming-groomer-reminders.ts; SMS/push are mocked, not sent. The
 * caller also fires a toast off the returned notification.
 */
export function notifyGroomerReminder(params: {
  facilityId: number;
  kind: "morning" | "upcoming";
  message: string;
  petName?: string;
  /** Grooming appointment id — links the "upcoming" reminder to its detail. */
  appointmentId?: string;
}): FacilityNotification {
  return addFacilityNotification({
    type: params.kind === "morning" ? "info" : "session_update",
    title:
      params.kind === "morning"
        ? "Your first appointment today"
        : "Appointment starting soon",
    message: params.message,
    facilityId: params.facilityId,
    category: "grooming",
    link: params.appointmentId
      ? groomerAppointmentLink(params.appointmentId)
      : "/facility/dashboard/services/grooming",
    meta: params.petName ? { petName: params.petName } : undefined,
  });
}

/** Call when a customer submits a YipyyGo form – notifies staff (in-app; optional email via config). */
export function notifyFacilityStaffYipyyGoSubmitted(params: {
  facilityId: number;
  bookingId: number;
  petName: string;
  clientName?: string;
  arrivalTime?: string;
  sendEmail?: boolean;
}): void {
  const { facilityId, bookingId, petName, arrivalTime, sendEmail } = params;
  const bookingRef = `#${bookingId}`;
  addFacilityNotification({
    type: "yipyygo_submitted",
    title: "Express Check-In submitted",
    message: `${petName} – Booking ${bookingRef}${arrivalTime ? ` · Arrival ${arrivalTime}` : ""}`,
    facilityId,
    bookingId,
    category: "yipyygo",
    link: `/facility/dashboard/bookings/${bookingId}#yipyygo`,
    meta: { petName, arrivalTime, bookingRef },
  });
  if (sendEmail) {
    console.log("[YipyyGo] Staff email notification (not sent):", params);
  }
}

/** Notify facility staff when a customer uploads vaccination records for review. */
export function notifyFacilityStaffVaccinationUploaded(params: {
  facilityId: number;
  clientId: number;
  clientName: string;
  petName: string;
  vaccineCount: number;
}): void {
  const { facilityId, clientId, clientName, petName, vaccineCount } = params;
  addFacilityNotification({
    type: "vaccination_uploaded",
    title: "Vaccination records uploaded",
    message: `${clientName} uploaded ${vaccineCount} vaccine record${vaccineCount === 1 ? "" : "s"} for ${petName} — pending review`,
    facilityId,
    category: "customers",
    link: `/facility/dashboard/clients/${clientId}/vaccinations`,
    meta: { petName },
  });
}

const formsNotify = facilityConfig.notifications?.forms?.staff;

/** Notify staff when a form submission is received. Respects config: newSubmission, redFlagAnswers, hasFileUpload. */
export function notifyStaffOnFormSubmission(params: {
  facilityId: number;
  submissionId: string;
  formId: string;
  formName: string;
  hasFiles: boolean;
  hasRedFlag: boolean;
}): void {
  const { facilityId, submissionId, formId, formName, hasFiles, hasRedFlag } =
    params;
  const baseMeta = { submissionId, formId, formName, hasRedFlag, hasFiles };

  if (formsNotify?.newSubmission) {
    addFacilityNotification({
      type: "form_submission_new",
      title: "New form submission",
      message: `${formName} – new submission`,
      facilityId,
      submissionId,
      category: "forms",
      link: `/facility/dashboard/forms/submissions/${submissionId}`,
      meta: { ...baseMeta },
    });
  }
  if (hasRedFlag && formsNotify?.redFlagAnswers) {
    addFacilityNotification({
      type: "form_submission_red_flag",
      title: "Form has red-flag answers",
      message: `${formName} – review submission`,
      facilityId,
      submissionId,
      category: "forms",
      link: `/facility/dashboard/forms/submissions/${submissionId}`,
      meta: { ...baseMeta, hasRedFlag: true },
    });
  }
  if (hasFiles && formsNotify?.hasFileUpload) {
    addFacilityNotification({
      type: "form_submission_has_files",
      title: "Form submission includes file upload",
      message: `${formName} – attachment(s) to review`,
      facilityId,
      submissionId,
      category: "forms",
      link: `/facility/dashboard/forms/submissions/${submissionId}`,
      meta: { ...baseMeta, hasFiles: true },
    });
  }
}
