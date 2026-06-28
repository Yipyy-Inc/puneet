// Unified facility notification feed — grouped into the five business domains
// shown in the notification center / bell drawer. Relative time is stored as
// `minutesAgo` (deterministic, no Date in data) so the UI never drifts or
// triggers SSR/React-Compiler issues.

export type NotificationGroup =
  | "bookings"
  | "clients"
  | "financial"
  | "staff"
  | "system";

export interface FacilityNotificationItem {
  id: string;
  group: NotificationGroup;
  subtype: string;
  title: string;
  description: string;
  minutesAgo: number;
  link: string;
  read: boolean;
}

export const NOTIFICATION_GROUPS: { key: NotificationGroup; label: string }[] =
  [
    { key: "bookings", label: "Bookings" },
    { key: "clients", label: "Clients" },
    { key: "financial", label: "Financial" },
    { key: "staff", label: "Staff" },
    { key: "system", label: "System" },
  ];

export const facilityNotificationFeed: FacilityNotificationItem[] = [
  // ---- Bookings ----
  {
    id: "ntf-bk-1",
    group: "bookings",
    subtype: "new",
    title: "New booking",
    description: "Alice Johnson booked Boarding for Buddy (Apr 1–5).",
    minutesAgo: 4,
    link: "/facility/dashboard/bookings",
    read: false,
  },
  {
    id: "ntf-bk-2",
    group: "bookings",
    subtype: "cancellation",
    title: "Booking cancelled",
    description: "Bob Smith cancelled the Daycare appointment for Rex.",
    minutesAgo: 38,
    link: "/facility/dashboard/bookings",
    read: false,
  },
  {
    id: "ntf-bk-3",
    group: "bookings",
    subtype: "modification",
    title: "Booking modified",
    description: "Booking #3 dates changed to Apr 8–10.",
    minutesAgo: 95,
    link: "/facility/dashboard/bookings",
    read: true,
  },

  // ---- Clients ----
  {
    id: "ntf-cl-1",
    group: "clients",
    subtype: "registration",
    title: "New client registered",
    description: "Emily Chen created an account with 2 pets.",
    minutesAgo: 12,
    link: "/facility/dashboard/clients",
    read: false,
  },
  {
    id: "ntf-cl-2",
    group: "clients",
    subtype: "document",
    title: "Document uploaded",
    description: "Vaccination record uploaded for Buddy (Alice Johnson).",
    minutesAgo: 54,
    link: "/facility/dashboard/clients",
    read: false,
  },
  {
    id: "ntf-cl-3",
    group: "clients",
    subtype: "profile",
    title: "Profile updated",
    description: "Jane Smith updated contact details and address.",
    minutesAgo: 210,
    link: "/facility/dashboard/clients",
    read: true,
  },

  // ---- Financial ----
  {
    id: "ntf-fi-1",
    group: "financial",
    subtype: "payment",
    title: "Payment received",
    description: "$50.00 payment received from Alice Johnson.",
    minutesAgo: 7,
    link: "/facility/dashboard/billing",
    read: false,
  },
  {
    id: "ntf-fi-2",
    group: "financial",
    subtype: "invoice_due",
    title: "Invoice due soon",
    description: "Invoice INV-1042 ($135.00) is due in 3 days.",
    minutesAgo: 180,
    link: "/facility/dashboard/billing",
    read: false,
  },
  {
    id: "ntf-fi-3",
    group: "financial",
    subtype: "overdue",
    title: "Invoice overdue",
    description: "Invoice INV-1031 ($220.00) is 5 days overdue.",
    minutesAgo: 1440,
    link: "/facility/dashboard/billing",
    read: false,
  },

  // ---- Staff ----
  {
    id: "ntf-st-1",
    group: "staff",
    subtype: "login",
    title: "Staff signed in",
    description: "Émilie Laurent (Owner) signed in from a new device.",
    minutesAgo: 22,
    link: "/facility/dashboard/staff",
    read: false,
  },
  {
    id: "ntf-st-2",
    group: "staff",
    subtype: "shift",
    title: "Shift changed",
    description: "Marc Tremblay's Friday shift moved to 9:00 AM – 5:00 PM.",
    minutesAgo: 130,
    link: "/facility/dashboard/scheduling",
    read: true,
  },
  {
    id: "ntf-st-3",
    group: "staff",
    subtype: "clock_in",
    title: "Clock-in",
    description: "Sarah Lee clocked in for the morning shift.",
    minutesAgo: 47,
    link: "/facility/dashboard/staff",
    read: false,
  },

  // ---- System ----
  {
    id: "ntf-sy-1",
    group: "system",
    subtype: "module",
    title: "Module updated",
    description: "Staff Scheduling module updated to v2.4.",
    minutesAgo: 320,
    link: "/facility/settings/modules",
    read: true,
  },
  {
    id: "ntf-sy-2",
    group: "system",
    subtype: "announcement",
    title: "Yipyy announcement",
    description: "Scheduled maintenance this Sunday 2–4 AM EST.",
    minutesAgo: 600,
    link: "/facility/dashboard",
    read: false,
  },
];
