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

// Seed example notifications so staff see YipyyGo submissions on the dashboard
const notifications: FacilityNotification[] = [
  {
    id: "fn-yipyygo-3",
    type: "yipyygo_submitted",
    title: "YipyyGo form submitted",
    message: "Max – Booking #3 · Arrival 2024-03-10 08:00",
    read: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    facilityId: 11,
    bookingId: 3,
    meta: { petName: "Max", arrivalTime: "2024-03-10 08:00", bookingRef: "#3" },
  },
  {
    id: "fn-yipyygo-4",
    type: "yipyygo_submitted",
    title: "YipyyGo form submitted",
    message: "Luna – Booking #4 · Arrival 2024-03-13 07:30",
    read: false,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    facilityId: 11,
    bookingId: 4,
    meta: {
      petName: "Luna",
      arrivalTime: "2024-03-13 07:30",
      bookingRef: "#4",
    },
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
  const { facilityId, bookingId, petName, clientName, arrivalTime, sendEmail } =
    params;
  const bookingRef = `#${bookingId}`;
  addFacilityNotification({
    type: "yipyygo_submitted",
    title: "YipyyGo form submitted",
    message: `${petName} – Booking ${bookingRef}${arrivalTime ? ` · Arrival ${arrivalTime}` : ""}`,
    facilityId,
    bookingId,
    meta: { petName, arrivalTime, bookingRef },
  });
  if (sendEmail) {
    // TODO: integrate with email service; for now just log
    console.log("[YipyyGo] Staff email notification (not sent):", {
      facilityId,
      bookingId,
      petName,
      clientName,
      arrivalTime,
    });
  }
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
      meta: { ...baseMeta, hasFiles: true },
    });
  }
}
