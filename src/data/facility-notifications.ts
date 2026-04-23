/**
 * Facility in-app notifications (staff).
 * Used for YipyyGo submissions, form submissions, and other facility events.
 */

import { facilityConfig } from "@/data/facility-config";

// Types re-exported from @/types/facility (single source of truth)
export type {
  FacilityNotificationType,
  FacilityNotification,
} from "@/types/facility";
import type { FacilityNotification } from "@/types/facility";

// Helper to create timestamps relative to now
function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

// Seed notifications across all categories
const notifications: FacilityNotification[] = [
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
  {
    id: "fn-board-3",
    type: "booking_new",
    title: "New boarding request",
    message: "Charlie (Labrador) — 5 nights starting Mar 30",
    read: false,
    timestamp: ago(30),
    facilityId: 11,
    category: "boarding",
    link: "/facility/dashboard/bookings",
    meta: { petName: "Charlie" },
  },
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
    link: "/facility/dashboard/services/grooming/check-out",
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
    link: "/facility/dashboard/forms/submissions",
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
    link: "/facility/dashboard/forms/submissions",
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
    link: "/facility/dashboard/forms/submissions",
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
    title: "YipyyGo form submitted",
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
    title: "YipyyGo form needs review",
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
    type: "warning",
    title: "YipyyGo pre-check missing",
    message: "Luna — Emma Davis · Booking #5 · arriving tomorrow",
    read: false,
    timestamp: ago(60),
    facilityId: 11,
    category: "yipyygo",
    bookingId: 5,
    link: "/facility/dashboard/bookings/5#yipyygo",
    meta: { petName: "Luna", bookingRef: "#5" },
  },
];

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

export function getFacilityNotifications(
  facilityId?: number,
): FacilityNotification[] {
  const list = facilityId
    ? notifications.filter(
        (n) => n.facilityId == null || n.facilityId === facilityId,
      )
    : [...notifications];
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
  const item: FacilityNotification = {
    ...notification,
    id: `fn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    read: false,
    timestamp: new Date().toISOString(),
  };
  notifications.unshift(item);
  notifyListeners();
  return item;
}

export function markFacilityNotificationRead(id: string): void {
  const n = notifications.find((x) => x.id === id);
  if (n) {
    n.read = true;
    notifyListeners();
  }
}

export function markAllFacilityNotificationsRead(facilityId?: number): void {
  const scope = facilityId
    ? (n: FacilityNotification) =>
        n.facilityId == null || n.facilityId === facilityId
    : () => true;
  notifications.forEach((n) => {
    if (scope(n)) n.read = true;
  });
  notifyListeners();
}

export function subscribeToFacilityNotifications(
  callback: () => void,
): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
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
    title: "YipyyGo form submitted",
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
