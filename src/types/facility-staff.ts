// ============================================================================
// Facility Staff — types, role presets, permission catalog
// ============================================================================

export type FacilityStaffRole =
  | "owner"
  | "manager"
  | "reception"
  | "groomer"
  | "trainer"
  | "daycare_attendant"
  | "boarding_attendant"
  | "sanitation";

export type ServiceModule =
  | "grooming"
  | "training"
  | "daycare"
  | "boarding"
  | "reception"
  | "retail"
  | "sanitation"
  | "transport";

export type AccessScope =
  | "anytime"
  | "operating_hours"
  | "assigned_shifts"
  | "none";

export type PermissionKey =
  // Always-on (every account)
  | "view_own_schedule"
  | "view_team_schedule"
  | "view_own_documents"
  | "view_onboarding"
  | "view_training_materials"
  | "manage_own_tasks"
  // Clients & pets
  | "view_clients"
  | "edit_clients"
  | "view_pet_records"
  | "edit_pet_records"
  | "add_pet_notes"
  // Bookings
  | "view_bookings"
  | "create_bookings"
  | "edit_bookings"
  | "cancel_bookings"
  // Operational logs
  | "check_in_out"
  | "log_feedings"
  | "log_medications"
  | "log_potty_breaks"
  | "log_play_sessions"
  | "log_incidents"
  | "log_cleaning"
  // Grooming
  | "view_grooming_queue"
  | "perform_grooming"
  | "add_grooming_notes"
  // Training
  | "view_training_queue"
  | "run_training_sessions"
  | "add_training_notes"
  // Services / pricing
  | "view_services"
  | "manage_services"
  | "manage_rates"
  // Payments & finance
  | "take_payment"
  | "process_refund"
  | "apply_discount"
  | "view_financial_reports"
  | "view_revenue"
  | "export_financials"
  // Staff & payroll
  | "view_staff"
  | "manage_staff"
  | "manage_roles"
  | "view_payroll"
  | "edit_payroll"
  // Inventory & supplies
  | "view_inventory"
  | "manage_supplies"
  // Comms & marketing
  | "communicate_clients"
  | "send_marketing"
  // Facility
  | "manage_facility_settings"
  | "manage_locations"
  | "manage_integrations";

export type NotificationEvent =
  | "appointment_created"
  | "appointment_updated"
  | "appointment_canceled"
  | "new_booking_request"
  | "abandoned_booking"
  | "intake_form_submitted"
  | "agreement_signed"
  | "invoice_paid"
  | "review_submitted"
  | "card_on_file_added"
  | "task_assigned";

export type NotificationScope =
  | "related_to_them"
  | "at_working_business"
  | "do_not_notify";

export type CalendarAccess =
  | { mode: "all" }
  | { mode: "selected"; staffIds: string[] }
  | { mode: "none" };

export interface PermissionSetting {
  granted: boolean;
  scope: AccessScope;
}

export interface PayrollConfig {
  generalServiceCommission: number;
  hourlyRate: number;
  tipsRate: number;
  overrides: { serviceModule: ServiceModule; commission: number }[];
}

export interface EmploymentDetails {
  hireDate: string;
  employmentType: "full_time" | "part_time" | "contractor" | "seasonal";
  notes: string;
}

export interface ClockInSettings {
  requireAccessCode: boolean;
  accessCode?: string;
}

export interface StaffProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  colorHex: string;
  /** Optional custom position title shown in place of / alongside the role label (e.g. "Lead Bather", "Senior Trainer") */
  jobTitle?: string;
  primaryRole: FacilityStaffRole;
  additionalRoles: FacilityStaffRole[];
  serviceAssignments: ServiceModule[];
  assignedLocations: string[];
  showOnCalendar: boolean;
  calendarAccess: CalendarAccess;
  clockIn: ClockInSettings;
  permissionOverrides: Partial<Record<PermissionKey, PermissionSetting>>;
  notifications: Record<NotificationEvent, NotificationScope>;
  payroll: PayrollConfig;
  employment: EmploymentDetails;
  status: "active" | "invited" | "inactive";
  lastActive: string;
  upcomingAppointments: number;
  openTasks: number;
  invitationSentAt?: string;
}

// ============================================================================
// Catalog metadata
// ============================================================================

export const ROLE_META: Record<
  FacilityStaffRole,
  {
    label: string;
    tagline: string;
    accent: string;
    ring: string;
    icon: string;
  }
> = {
  owner: {
    label: "Owner",
    tagline: "Full control across every location and module",
    accent: "bg-amber-500/10",
    ring: "ring-amber-500/40",
    icon: "Crown",
  },
  manager: {
    label: "Manager",
    tagline: "Runs day-to-day ops, approvals, and team",
    accent: "bg-violet-500/10",
    ring: "ring-violet-500/40",
    icon: "ShieldCheck",
  },
  reception: {
    label: "Reception",
    tagline: "Bookings, clients, and front-desk flow",
    accent: "bg-sky-500/10",
    ring: "ring-sky-500/40",
    icon: "ConciergeBell",
  },
  groomer: {
    label: "Groomer",
    tagline: "Handles grooming queue and notes",
    accent: "bg-rose-500/10",
    ring: "ring-rose-500/40",
    icon: "Scissors",
  },
  trainer: {
    label: "Trainer",
    tagline: "Runs training sessions and progress tracking",
    accent: "bg-emerald-500/10",
    ring: "ring-emerald-500/40",
    icon: "Award",
  },
  daycare_attendant: {
    label: "Daycare Attendant",
    tagline: "Check-ins, play, feedings during daycare",
    accent: "bg-orange-500/10",
    ring: "ring-orange-500/40",
    icon: "PawPrint",
  },
  boarding_attendant: {
    label: "Boarding Attendant",
    tagline: "Kennel care, meds, and overnight logs",
    accent: "bg-indigo-500/10",
    ring: "ring-indigo-500/40",
    icon: "Home",
  },
  sanitation: {
    label: "Sanitation Specialist",
    tagline: "Keeps the facility clean and stocked",
    accent: "bg-teal-500/10",
    ring: "ring-teal-500/40",
    icon: "SprayCan",
  },
};

export const SERVICE_MODULE_META: Record<
  ServiceModule,
  { label: string; icon: string; tone: string }
> = {
  grooming: {
    label: "Grooming",
    icon: "Scissors",
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  training: {
    label: "Training",
    icon: "Award",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  daycare: {
    label: "Daycare",
    icon: "PawPrint",
    tone: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  boarding: {
    label: "Boarding",
    icon: "Home",
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  reception: {
    label: "Reception",
    icon: "ConciergeBell",
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  retail: {
    label: "Retail",
    icon: "ShoppingBag",
    tone: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  sanitation: {
    label: "Sanitation",
    icon: "SprayCan",
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  transport: {
    label: "Transport",
    icon: "Truck",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

export const ACCESS_SCOPE_META: Record<
  AccessScope,
  { label: string; description: string; tone: string }
> = {
  anytime: {
    label: "Anytime",
    description: "24/7 access, including after hours",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  operating_hours: {
    label: "Operating hours",
    description: "Only while the facility is open",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  assigned_shifts: {
    label: "Assigned shifts",
    description: "Only during their scheduled shifts",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  none: {
    label: "Blocked",
    description: "No access regardless of time",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
};

export const ALWAYS_ON_PERMISSIONS: PermissionKey[] = [
  "view_own_schedule",
  "view_team_schedule",
  "view_own_documents",
  "view_onboarding",
  "view_training_materials",
  "manage_own_tasks",
];

export interface PermissionGroup {
  id: string;
  label: string;
  description: string;
  permissions: { key: PermissionKey; label: string; hint?: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "core",
    label: "Core (always on)",
    description: "Every account gets these — schedule, docs, tasks",
    permissions: [
      { key: "view_own_schedule", label: "View own schedule" },
      { key: "view_team_schedule", label: "View team schedule" },
      { key: "view_own_documents", label: "View own documents" },
      { key: "view_onboarding", label: "View onboarding material" },
      { key: "view_training_materials", label: "View training material" },
      { key: "manage_own_tasks", label: "Manage own tasks" },
    ],
  },
  {
    id: "clients",
    label: "Clients & pets",
    description: "Who can look up and edit client & pet profiles",
    permissions: [
      { key: "view_clients", label: "View clients" },
      { key: "edit_clients", label: "Edit clients" },
      { key: "view_pet_records", label: "View pet records" },
      { key: "edit_pet_records", label: "Edit pet records" },
      { key: "add_pet_notes", label: "Add pet notes" },
    ],
  },
  {
    id: "bookings",
    label: "Bookings",
    description: "Create, edit, and cancel bookings",
    permissions: [
      { key: "view_bookings", label: "View bookings" },
      { key: "create_bookings", label: "Create bookings" },
      { key: "edit_bookings", label: "Edit bookings" },
      { key: "cancel_bookings", label: "Cancel bookings" },
    ],
  },
  {
    id: "operations",
    label: "Operational logs",
    description: "Check-ins, feedings, meds, cleaning",
    permissions: [
      { key: "check_in_out", label: "Check in / out" },
      { key: "log_feedings", label: "Log feedings" },
      { key: "log_medications", label: "Log medications" },
      { key: "log_potty_breaks", label: "Log potty breaks" },
      { key: "log_play_sessions", label: "Log play sessions" },
      { key: "log_incidents", label: "Log incidents" },
      { key: "log_cleaning", label: "Log cleaning" },
    ],
  },
  {
    id: "grooming",
    label: "Grooming",
    description: "Gated to grooming-assigned staff",
    permissions: [
      { key: "view_grooming_queue", label: "View grooming queue" },
      { key: "perform_grooming", label: "Perform grooming" },
      { key: "add_grooming_notes", label: "Add grooming notes" },
    ],
  },
  {
    id: "training",
    label: "Training",
    description: "Gated to trainers",
    permissions: [
      { key: "view_training_queue", label: "View training queue" },
      { key: "run_training_sessions", label: "Run training sessions" },
      { key: "add_training_notes", label: "Add training notes" },
    ],
  },
  {
    id: "services_pricing",
    label: "Services & pricing",
    description: "Careful — this changes what clients pay",
    permissions: [
      { key: "view_services", label: "View services" },
      { key: "manage_services", label: "Manage services" },
      { key: "manage_rates", label: "Manage rates & prices" },
    ],
  },
  {
    id: "finance",
    label: "Payments & finance",
    description: "Refunds, discounts, financial reports",
    permissions: [
      { key: "take_payment", label: "Take payment" },
      { key: "process_refund", label: "Process refunds" },
      { key: "apply_discount", label: "Apply discounts" },
      { key: "view_financial_reports", label: "View financial reports" },
      { key: "view_revenue", label: "View revenue" },
      { key: "export_financials", label: "Export financials" },
    ],
  },
  {
    id: "staff",
    label: "Staff & payroll",
    description: "Role, schedule, and pay decisions",
    permissions: [
      { key: "view_staff", label: "View staff directory" },
      { key: "manage_staff", label: "Manage staff" },
      { key: "manage_roles", label: "Manage roles & permissions" },
      { key: "view_payroll", label: "View payroll" },
      { key: "edit_payroll", label: "Edit payroll" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & supplies",
    description: "Stock, reorders, and sanitation supplies",
    permissions: [
      { key: "view_inventory", label: "View inventory" },
      { key: "manage_supplies", label: "Manage supplies" },
    ],
  },
  {
    id: "comms",
    label: "Communications",
    description: "Client messaging and marketing",
    permissions: [
      { key: "communicate_clients", label: "Message clients" },
      { key: "send_marketing", label: "Send marketing campaigns" },
    ],
  },
  {
    id: "facility",
    label: "Facility settings",
    description: "Global configuration — high risk",
    permissions: [
      { key: "manage_facility_settings", label: "Facility settings" },
      { key: "manage_locations", label: "Manage locations" },
      { key: "manage_integrations", label: "Manage integrations" },
    ],
  },
];

export const NOTIFICATION_EVENT_META: Record<
  NotificationEvent,
  { label: string; group: string }
> = {
  appointment_created: { label: "Appointment created", group: "Calendar" },
  appointment_updated: { label: "Appointment updated", group: "Calendar" },
  appointment_canceled: { label: "Appointment canceled", group: "Calendar" },
  new_booking_request: { label: "New booking request", group: "Bookings" },
  abandoned_booking: { label: "Abandoned booking", group: "Bookings" },
  intake_form_submitted: { label: "Intake form submitted", group: "Intake" },
  agreement_signed: { label: "Agreement signed", group: "Intake" },
  invoice_paid: { label: "Invoice paid", group: "Billing" },
  review_submitted: { label: "Review submitted", group: "Reputation" },
  card_on_file_added: { label: "Card on file added", group: "Billing" },
  task_assigned: { label: "Task assigned to them", group: "Tasks" },
};

// ============================================================================
// Role preset — default permission grant & scope for each role
// ============================================================================

type PresetEntry = [PermissionKey, AccessScope];

const CORE_PRESET: PresetEntry[] = ALWAYS_ON_PERMISSIONS.map(
  (p) => [p, "anytime"] as PresetEntry,
);

export const ROLE_PRESETS: Record<
  FacilityStaffRole,
  {
    permissions: PresetEntry[];
    services: ServiceModule[];
    defaultNotifications: Partial<Record<NotificationEvent, NotificationScope>>;
  }
> = {
  owner: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_clients",
          "edit_clients",
          "view_pet_records",
          "edit_pet_records",
          "add_pet_notes",
          "view_bookings",
          "create_bookings",
          "edit_bookings",
          "cancel_bookings",
          "check_in_out",
          "log_feedings",
          "log_medications",
          "log_potty_breaks",
          "log_play_sessions",
          "log_incidents",
          "log_cleaning",
          "view_grooming_queue",
          "perform_grooming",
          "add_grooming_notes",
          "view_training_queue",
          "run_training_sessions",
          "add_training_notes",
          "view_services",
          "manage_services",
          "manage_rates",
          "take_payment",
          "process_refund",
          "apply_discount",
          "view_financial_reports",
          "view_revenue",
          "export_financials",
          "view_staff",
          "manage_staff",
          "manage_roles",
          "view_payroll",
          "edit_payroll",
          "view_inventory",
          "manage_supplies",
          "communicate_clients",
          "send_marketing",
          "manage_facility_settings",
          "manage_locations",
          "manage_integrations",
        ] as PermissionKey[]
      ).map((p) => [p, "anytime"] as PresetEntry),
    ],
    services: [
      "grooming",
      "training",
      "daycare",
      "boarding",
      "reception",
      "retail",
      "sanitation",
      "transport",
    ],
    defaultNotifications: {
      new_booking_request: "at_working_business",
      invoice_paid: "at_working_business",
      review_submitted: "at_working_business",
      appointment_canceled: "at_working_business",
    },
  },
  manager: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_clients",
          "edit_clients",
          "view_pet_records",
          "edit_pet_records",
          "add_pet_notes",
          "view_bookings",
          "create_bookings",
          "edit_bookings",
          "cancel_bookings",
          "check_in_out",
          "log_feedings",
          "log_medications",
          "log_potty_breaks",
          "log_play_sessions",
          "log_incidents",
          "log_cleaning",
          "view_grooming_queue",
          "view_training_queue",
          "view_services",
          "manage_services",
          "take_payment",
          "process_refund",
          "apply_discount",
          "view_financial_reports",
          "view_revenue",
          "view_staff",
          "manage_staff",
          "view_payroll",
          "view_inventory",
          "manage_supplies",
          "communicate_clients",
          "send_marketing",
        ] as PermissionKey[]
      ).map((p) => [p, "anytime"] as PresetEntry),
    ],
    services: [
      "grooming",
      "training",
      "daycare",
      "boarding",
      "reception",
      "retail",
      "sanitation",
    ],
    defaultNotifications: {
      new_booking_request: "at_working_business",
      appointment_canceled: "at_working_business",
      review_submitted: "at_working_business",
    },
  },
  reception: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_clients",
          "edit_clients",
          "view_pet_records",
          "add_pet_notes",
          "view_bookings",
          "create_bookings",
          "edit_bookings",
          "cancel_bookings",
          "check_in_out",
          "view_services",
          "take_payment",
          "apply_discount",
          "view_inventory",
          "communicate_clients",
        ] as PermissionKey[]
      ).map((p) => [p, "operating_hours"] as PresetEntry),
    ],
    services: ["reception"],
    defaultNotifications: {
      new_booking_request: "at_working_business",
      abandoned_booking: "at_working_business",
      intake_form_submitted: "at_working_business",
      appointment_canceled: "at_working_business",
    },
  },
  groomer: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_clients",
          "view_pet_records",
          "add_pet_notes",
          "view_bookings",
          "check_in_out",
          "view_grooming_queue",
          "perform_grooming",
          "add_grooming_notes",
        ] as PermissionKey[]
      ).map((p) => [p, "assigned_shifts"] as PresetEntry),
    ],
    services: ["grooming"],
    defaultNotifications: {
      appointment_created: "related_to_them",
      appointment_canceled: "related_to_them",
      task_assigned: "related_to_them",
    },
  },
  trainer: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_clients",
          "view_pet_records",
          "add_pet_notes",
          "view_bookings",
          "check_in_out",
          "view_training_queue",
          "run_training_sessions",
          "add_training_notes",
        ] as PermissionKey[]
      ).map((p) => [p, "assigned_shifts"] as PresetEntry),
    ],
    services: ["training"],
    defaultNotifications: {
      appointment_created: "related_to_them",
      appointment_canceled: "related_to_them",
      task_assigned: "related_to_them",
    },
  },
  daycare_attendant: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_pet_records",
          "add_pet_notes",
          "view_bookings",
          "check_in_out",
          "log_feedings",
          "log_medications",
          "log_potty_breaks",
          "log_play_sessions",
          "log_incidents",
          "log_cleaning",
        ] as PermissionKey[]
      ).map((p) => [p, "assigned_shifts"] as PresetEntry),
    ],
    services: ["daycare"],
    defaultNotifications: {
      task_assigned: "related_to_them",
      appointment_created: "at_working_business",
    },
  },
  boarding_attendant: {
    permissions: [
      ...CORE_PRESET,
      ...(
        [
          "view_pet_records",
          "add_pet_notes",
          "view_bookings",
          "check_in_out",
          "log_feedings",
          "log_medications",
          "log_potty_breaks",
          "log_incidents",
          "log_cleaning",
        ] as PermissionKey[]
      ).map((p) => [p, "anytime"] as PresetEntry),
    ],
    services: ["boarding"],
    defaultNotifications: {
      task_assigned: "related_to_them",
      appointment_created: "at_working_business",
    },
  },
  sanitation: {
    permissions: [
      ...CORE_PRESET,
      ...(
        ["log_cleaning", "view_inventory", "manage_supplies"] as PermissionKey[]
      ).map((p) => [p, "assigned_shifts"] as PresetEntry),
    ],
    services: ["sanitation"],
    defaultNotifications: {
      task_assigned: "related_to_them",
    },
  },
};

export const ALL_NOTIFICATION_EVENTS: NotificationEvent[] = Object.keys(
  NOTIFICATION_EVENT_META,
) as NotificationEvent[];

export function buildDefaultNotifications(
  role: FacilityStaffRole,
): Record<NotificationEvent, NotificationScope> {
  const presetOverrides = ROLE_PRESETS[role].defaultNotifications;
  const base = Object.fromEntries(
    ALL_NOTIFICATION_EVENTS.map((e) => [
      e,
      "do_not_notify" as NotificationScope,
    ]),
  ) as Record<NotificationEvent, NotificationScope>;
  return { ...base, ...presetOverrides };
}

export function resolvePermission(
  staff: StaffProfile,
  key: PermissionKey,
): PermissionSetting {
  if (staff.permissionOverrides[key]) {
    return staff.permissionOverrides[key]!;
  }
  const presetMap = new Map<PermissionKey, AccessScope>(
    ROLE_PRESETS[staff.primaryRole].permissions,
  );
  for (const add of staff.additionalRoles) {
    for (const [k, scope] of ROLE_PRESETS[add].permissions) {
      if (!presetMap.has(k)) presetMap.set(k, scope);
    }
  }
  const scope = presetMap.get(key);
  return scope ? { granted: true, scope } : { granted: false, scope: "none" };
}
