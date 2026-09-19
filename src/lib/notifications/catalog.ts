import { z } from "zod";

// ============================================================================
// What a staff notification can be about, who may receive it, and who gets it
// unless they say otherwise.
//
// ── WHY ONE FILE ──────────────────────────────────────────────────────────
//
// The bell, the notification centre, the role-defaults screen and each
// person's own preferences were four browser-only stores (localStorage and a
// seeded array), keyed on six roles the database does not have. Nothing a
// facility set reached anybody, and every viewer saw the same invented feed.
//
// This is the single description all of them now read: the server helper that
// records a notification (lib/notifications/notify-staff.ts), the screens that
// configure defaults and preferences, and the centre that lists them. The
// database function does the fan-out, but it is told the category, the
// permission and whether the notice is mandatory FROM here, so there is one
// list to change.
//
// ── ROLES ARE THE DATABASE'S ──────────────────────────────────────────────
//
// `public.facility_staff_role`, all thirteen. A person's personal preferences
// override their role's default; a role default decides nothing the person's
// permissions do not already allow — a groomer with booking notices switched on
// but no `view_bookings` hears nothing about bookings.
// ============================================================================

export const NOTIFICATION_CATEGORIES = [
  "bookings",
  "forms",
  "schedule",
  "incidents",
  "estimates",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const STAFF_ROLES = [
  "owner",
  "admin",
  "manager",
  "supervisor",
  "reception",
  "groomer",
  "trainer",
  "caretaker",
  "daycare_attendant",
  "boarding_attendant",
  "retail",
  "accountant",
  "sanitation",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface NotificationKindSpec {
  category: NotificationCategory;
  /**
   * The permission a recipient must hold. Null for a notice addressed to one
   * person — a decision on THEIR request — which is theirs whatever they may
   * otherwise see.
   */
  permission: string | null;
  /** Always delivered in-app; a preference cannot mute it. Email still opt-in. */
  mandatory: boolean;
  urgent: boolean;
}

export const NOTIFICATION_KINDS = {
  booking_request: {
    category: "bookings",
    permission: "view_bookings",
    mandatory: false,
    urgent: false,
  },
  booking_online: {
    category: "bookings",
    permission: "view_bookings",
    mandatory: false,
    urgent: false,
  },
  booking_cancelled: {
    category: "bookings",
    permission: "view_bookings",
    mandatory: false,
    urgent: false,
  },
  /** A customer left a note on their booking (add_owner_booking_note). */
  booking_customer_note: {
    category: "bookings",
    permission: "view_bookings",
    mandatory: false,
    urgent: false,
  },
  /**
   * A customer asked to change their booking's dates. They cannot move it
   * themselves; somebody has to, so it reaches whoever may edit bookings.
   */
  booking_change_requested: {
    category: "bookings",
    permission: "edit_bookings",
    mandatory: false,
    urgent: false,
  },
  form_submitted: {
    category: "forms",
    permission: "view_clients",
    mandatory: false,
    urgent: false,
  },
  pre_arrival_submitted: {
    category: "forms",
    permission: "view_bookings",
    mandatory: false,
    urgent: false,
  },
  /**
   * A customer has arrived and said so from their phone.
   *
   * URGENT, which almost nothing else here is: somebody is standing at the
   * door with an animal. The whole point of the button they pressed is that
   * the desk finds out NOW, and a notice that waits behind the day's other
   * fifteen is the same as no notice.
   *
   * `check_in_out` rather than `view_bookings` — the people who need to know
   * are the ones who can actually receive the guest.
   */
  customer_arrived: {
    category: "bookings",
    permission: "check_in_out",
    mandatory: false,
    urgent: true,
  },
  vaccination_uploaded: {
    category: "forms",
    // A vaccination record is medical: only whoever may read those hears of one.
    permission: "view_pet_medical",
    mandatory: false,
    urgent: false,
  },
  swap_requested: {
    category: "schedule",
    permission: "scheduling_approve_swaps",
    mandatory: false,
    urgent: false,
  },
  time_off_requested: {
    category: "schedule",
    permission: "scheduling_approve_time_off",
    mandatory: false,
    urgent: false,
  },
  swap_decided: {
    category: "schedule",
    permission: null,
    mandatory: false,
    urgent: false,
  },
  time_off_decided: {
    category: "schedule",
    permission: null,
    mandatory: false,
    urgent: false,
  },
  incident_reported: {
    category: "incidents",
    permission: "ops_incidents_view",
    mandatory: true,
    urgent: true,
  },
  estimate_accepted: {
    category: "estimates",
    permission: "view_estimates",
    mandatory: false,
    urgent: false,
  },
  estimate_declined: {
    category: "estimates",
    permission: "view_estimates",
    mandatory: false,
    urgent: false,
  },
} as const satisfies Record<string, NotificationKindSpec>;
export type NotificationKind = keyof typeof NOTIFICATION_KINDS;

export function isNotificationKind(value: string): value is NotificationKind {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_KINDS, value);
}

const ALL = [...NOTIFICATION_CATEGORIES];

/**
 * Who hears about what until a facility changes it. In-app only: email is
 * something each person switches on for themselves.
 */
export const SHIPPED_ROLE_DEFAULTS: Record<StaffRole, NotificationCategory[]> =
  {
    owner: ALL,
    admin: ALL,
    manager: ALL,
    supervisor: ["bookings", "forms", "schedule", "incidents"],
    reception: ["bookings", "forms", "incidents", "estimates"],
    groomer: ["forms", "incidents"],
    trainer: ["forms", "incidents"],
    caretaker: ["forms", "incidents"],
    daycare_attendant: ["forms", "incidents"],
    boarding_attendant: ["forms", "incidents"],
    retail: [],
    accountant: ["estimates"],
    sanitation: ["incidents"],
  };

const categoryList = z.array(z.enum(NOTIFICATION_CATEGORIES));

/** The `notification_role_defaults` settings domain. */
export const notificationRoleDefaultsSchema = z.object({
  roles: z.object(
    Object.fromEntries(
      STAFF_ROLES.map((role) => [role, categoryList]),
    ) as Record<StaffRole, typeof categoryList>,
  ),
});
export type NotificationRoleDefaults = z.infer<
  typeof notificationRoleDefaultsSchema
>;

export const SHIPPED_NOTIFICATION_ROLE_DEFAULTS: NotificationRoleDefaults = {
  roles: SHIPPED_ROLE_DEFAULTS,
};

const categorySwitches = z
  .object(
    Object.fromEntries(
      NOTIFICATION_CATEGORIES.map((c) => [c, z.boolean()]),
    ) as Record<NotificationCategory, z.ZodBoolean>,
  )
  .partial();

/**
 * One person's own choices at one facility. A category absent from `inApp`
 * follows their role's default; absent from `email` is off.
 */
export const notificationPreferencesSchema = z.object({
  inApp: categorySwitches,
  email: categorySwitches,
});
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const NO_PREFERENCES: NotificationPreferences = { inApp: {}, email: {} };

/**
 * Whether one person receives a notice, and how. The same rule the database
 * function applies, kept here so the preferences screen can show it and the
 * unit tests can pin it.
 */
export function deliveryFor(input: {
  role: StaffRole;
  kind: NotificationKind;
  roleDefaults: NotificationRoleDefaults;
  preferences: NotificationPreferences;
  /** False when the person lacks the kind's permission. */
  permitted: boolean;
}): { inApp: boolean; email: boolean } {
  const spec: NotificationKindSpec = NOTIFICATION_KINDS[input.kind];
  if (!input.permitted) return { inApp: false, email: false };
  const byRole = (input.roleDefaults.roles[input.role] ?? []).includes(
    spec.category,
  );
  const chosen = input.preferences.inApp[spec.category];
  const inApp = spec.mandatory || (chosen ?? byRole);
  const email = input.preferences.email[spec.category] ?? false;
  return { inApp, email: email && (inApp || spec.mandatory) };
}
