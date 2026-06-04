import type { Notification } from "@/components/customer/CustomerNotifications";
import type { LoyaltyNotification } from "@/lib/loyalty/engine";

// ============================================================================
// Customer notification store — single source of truth for the customer
// notification bell. Both the static reminders/receipts and the live loyalty
// notifications (tier upgrades, badge unlocks, program launches) flow through
// here, so anything that pushes a notification re-renders the bell.
//
// Mock client-side store mirroring care-log-store. Swap getSnapshot/push for a
// real API later; the subscribe contract stays the same.
// ============================================================================

type Listener = () => void;

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "reminder",
    title: "Upcoming Grooming Appointment",
    message: "Your grooming appointment for Max is tomorrow at 2:00 PM",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    link: "/customer/bookings",
    category: "Reminders",
  },
  {
    id: "2",
    type: "receipt",
    title: "Payment Receipt",
    message: "Receipt for your daycare booking on March 15, 2024",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    link: "/customer/billing",
    category: "Payments",
  },
  {
    id: "3",
    type: "report_card",
    title: "Report Card Available",
    message: "Max's daycare report card for March 14 is now available",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    link: "/customer/report-cards",
    category: "Reports",
  },
  {
    id: "4",
    type: "vaccination",
    title: "Vaccination Expiring Soon",
    message: "Max's Rabies vaccination expires in 30 days",
    read: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    link: "/customer/pets",
    category: "Health",
  },
  {
    id: "5",
    type: "booking_update",
    title: "Booking Confirmed",
    message: "Your boarding request for March 20-25 has been confirmed",
    read: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    link: "/customer/bookings",
    category: "Bookings",
  },
];

let notifications: Notification[] = [...SEED_NOTIFICATIONS];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

let loyaltyEventSeq = 0;

/** Map an engine notification (tier upgrade / badge unlock) onto a bell row. */
function fromLoyalty(note: LoyaltyNotification, now: string): Notification {
  loyaltyEventSeq += 1;
  return {
    id: `notif-loyalty-evt-${note.facilityId}-${note.customerId}-${loyaltyEventSeq}`,
    type: "reminder",
    title: note.title,
    message: note.body,
    read: false,
    createdAt: now,
    link: "/customer/rewards",
    category: "Rewards",
  };
}

export const customerNotificationsStore = {
  getSnapshot(): Notification[] {
    return notifications;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  markRead(id: string): void {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    emit();
  },

  markAllRead(): void {
    notifications = notifications.map((n) => (n.read ? n : { ...n, read: true }));
    emit();
  },

  push(notification: Notification): void {
    notifications = [notification, ...notifications];
    emit();
  },

  /**
   * Feed loyalty-engine notifications (tier upgrades, badge unlocks) into the
   * bell. Newest first. A timestamp is stamped here so the engine/hook stays
   * clock-free.
   */
  pushLoyaltyNotifications(notes: LoyaltyNotification[]): void {
    if (notes.length === 0) return;
    const now = new Date().toISOString();
    const rows = notes.map((n) => fromLoyalty(n, now));
    notifications = [...rows, ...notifications];
    emit();
  },

  /**
   * Replace a facility's loyalty *launch* notifications (idempotent by facility
   * id) — re-publishing refreshes rather than duplicating them.
   */
  setFacilityLaunchNotifications(
    facilityId: number,
    rows: Notification[],
  ): void {
    const prefix = `notif-loyalty-${facilityId}-`;
    notifications = [
      ...rows,
      ...notifications.filter((n) => !n.id.startsWith(prefix)),
    ];
    emit();
  },
};
