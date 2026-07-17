import type { FacilityRole } from "@/types/staff";

/**
 * Per-role default notification settings (spec Part 7 / Tables 50–51). When a
 * staff account is created or assigned a role, these seed the member's personal
 * preferences (Part 5) — which they can then customize per-user. An admin can
 * also edit the facility-level defaults (Table 51) via the override store.
 *
 * Keyed by the existing facility role model plus "driver" (Mobile Grooming),
 * which isn't a core FacilityRole but is called out in the spec.
 */
export type NotificationRoleKey = FacilityRole | "driver";

/** Category ids that map to the notification categories used across the app. */
export const NOTIFICATION_CATEGORY_KEYS = [
  "customers",
  "boarding",
  "daycare",
  "grooming",
  "training",
  "tasks",
  "schedule",
  "forms",
  "yipyygo",
] as const;
export type NotificationCategoryKey =
  (typeof NOTIFICATION_CATEGORY_KEYS)[number];

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategoryKey,
  string
> = {
  customers: "Customers",
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  tasks: "Tasks",
  schedule: "Schedule & Shifts",
  forms: "Forms",
  yipyygo: "Express Check-In",
};

export interface RoleNotificationDefault {
  /** Human label for the role profile (Table 50). */
  label: string;
  description: string;
  /** Categories ON by default for this role; everything else starts OFF. */
  enabledCategories: NotificationCategoryKey[];
}

const ALL: NotificationCategoryKey[] = [...NOTIFICATION_CATEGORY_KEYS];

/**
 * Note on the role model: the core FacilityRole enum has no separate "Daycare
 * Staff" / "Boarding Staff" — `kennel_tech` is the care role and covers both, so
 * its defaults enable daycare + boarding. "driver" is an extra profile for
 * Mobile Grooming. Capacity + incident alerts are mandatory (Table 49) and are
 * delivered regardless of these category defaults.
 */
export const NOTIFICATION_ROLE_DEFAULTS: Record<
  NotificationRoleKey,
  RoleNotificationDefault
> = {
  owner: {
    label: "Owner / Admin",
    description: "Full oversight — every category on.",
    enabledCategories: ALL,
  },
  manager: {
    label: "Manager",
    description: "Operational oversight — every category on.",
    enabledCategories: ALL,
  },
  front_desk: {
    label: "Front Desk / Receptionist",
    description:
      "Client-facing ops: customers, check-ins, forms, express, tasks, schedule.",
    enabledCategories: [
      "customers",
      "boarding",
      "daycare",
      "yipyygo",
      "forms",
      "tasks",
      "schedule",
    ],
  },
  groomer: {
    label: "Groomer",
    description: "Grooming bookings/confirmations, express, tasks, schedule.",
    enabledCategories: ["grooming", "yipyygo", "tasks", "schedule"],
  },
  trainer: {
    label: "Trainer",
    description:
      "Training bookings, session notes, enrollment, tasks, schedule.",
    enabledCategories: ["training", "tasks", "schedule"],
  },
  kennel_tech: {
    label: "Daycare / Boarding Staff",
    description:
      "Daycare + boarding check-ins, capacity, incidents, tasks, schedule.",
    enabledCategories: ["daycare", "boarding", "tasks", "schedule"],
  },
  driver: {
    label: "Driver (Mobile Grooming)",
    description:
      "Route updates + assigned grooming appointments, tasks, schedule.",
    enabledCategories: ["grooming", "tasks", "schedule"],
  },
};

/** Resolve the default profile for a role string, falling back to front_desk. */
export function getRoleNotificationDefault(
  role: string,
): RoleNotificationDefault {
  return (
    NOTIFICATION_ROLE_DEFAULTS[role as NotificationRoleKey] ??
    NOTIFICATION_ROLE_DEFAULTS.front_desk
  );
}
