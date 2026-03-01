/**
 * Facility in-app notifications (staff).
 * Used for YipyyGo submissions and other facility events.
 */

export type FacilityNotificationType = "yipyygo_submitted" | "info" | "warning";

export interface FacilityNotification {
  id: string;
  type: FacilityNotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string; // ISO
  /** For YipyyGo: link to booking review */
  bookingId?: number;
  facilityId?: number;
  /** Optional: pet name, arrival time for display */
  meta?: { petName?: string; arrivalTime?: string; bookingRef?: string };
}

// Seed example notifications so staff see YipyyGo submissions on the dashboard
let notifications: FacilityNotification[] = [
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
    meta: { petName: "Luna", arrivalTime: "2024-03-13 07:30", bookingRef: "#4" },
  },
];
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

export function getFacilityNotifications(facilityId?: number): FacilityNotification[] {
  const list = facilityId
    ? notifications.filter((n) => n.facilityId == null || n.facilityId === facilityId)
    : [...notifications];
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getUnreadFacilityNotificationCount(facilityId?: number): number {
  return getFacilityNotifications(facilityId).filter((n) => !n.read).length;
}

export function addFacilityNotification(notification: Omit<FacilityNotification, "id" | "read" | "timestamp">): FacilityNotification {
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
  const scope = facilityId ? (n: FacilityNotification) => (n.facilityId == null || n.facilityId === facilityId) : () => true;
  notifications.forEach((n) => {
    if (scope(n)) n.read = true;
  });
  notifyListeners();
}

export function subscribeToFacilityNotifications(callback: () => void): () => void {
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
  const { facilityId, bookingId, petName, clientName, arrivalTime, sendEmail } = params;
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
