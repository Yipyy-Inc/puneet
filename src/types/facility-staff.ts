// ============================================================================
// Facility Staff — types, role presets, permission catalog
// ============================================================================

export type FacilityStaffRole =
  | "owner"
  | "admin"
  | "manager"
  | "supervisor"
  | "reception" // spec "Receptionist"
  | "groomer"
  | "trainer"
  | "caretaker"
  | "daycare_attendant"
  | "boarding_attendant"
  | "retail"
  | "accountant"
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
  // ── Personal / always-on (every account, non-removable) ──────────────────
  | "view_own_schedule"
  | "view_team_schedule"
  | "view_own_documents"
  | "view_onboarding"
  | "view_training_materials"
  | "manage_own_tasks"
  | "view_own_profile"
  | "edit_own_profile"
  | "clock_in_out"
  | "request_time_off"
  | "request_shift_swap"
  | "submit_availability"
  | "view_own_performance"
  | "view_own_writeups"
  | "message_manager"
  // ── Customer data ────────────────────────────────────────────────────────
  | "view_client_list"
  | "view_clients"
  | "view_client_contact_info"
  | "view_client_address"
  | "view_client_financial"
  | "create_clients"
  | "edit_clients"
  | "delete_clients"
  | "merge_clients"
  | "export_clients"
  | "view_pet_records"
  | "edit_pet_records"
  | "add_pet_notes"
  | "view_pet_medical"
  | "edit_pet_medical"
  | "view_client_documents"
  // ── Bookings & scheduling ────────────────────────────────────────────────
  | "view_bookings"
  | "create_bookings"
  | "edit_bookings"
  | "cancel_bookings"
  | "reschedule_bookings"
  | "view_booking_financials"
  | "view_all_calendars"
  | "manage_booking_calendar"
  | "manage_waitlist"
  | "override_booking_capacity"
  // ── Grooming ─────────────────────────────────────────────────────────────
  | "view_grooming_queue"
  | "grooming_view_own_calendar"
  | "grooming_view_all_calendars"
  | "perform_grooming"
  | "add_grooming_notes"
  | "grooming_upload_photos"
  | "grooming_manage_styles"
  | "grooming_edit_pricing"
  // ── Boarding ─────────────────────────────────────────────────────────────
  | "boarding_view_dashboard"
  | "boarding_daily_care_log"
  | "boarding_assign_kennels"
  | "boarding_log_feeding"
  | "boarding_log_medication"
  | "boarding_manage_belongings"
  | "boarding_send_updates"
  // ── Daycare ──────────────────────────────────────────────────────────────
  | "daycare_view_dashboard"
  | "daycare_check_in_out"
  | "daycare_log_activity"
  | "daycare_manage_groups"
  | "daycare_incident_report"
  | "daycare_send_updates"
  // ── Training ─────────────────────────────────────────────────────────────
  | "view_training_queue"
  | "training_view_own_calendar"
  | "run_training_sessions"
  | "add_training_notes"
  | "training_manage_programs"
  | "training_log_progress"
  | "training_issue_certificates"
  // ── Retail / POS ─────────────────────────────────────────────────────────
  | "retail_pos_access"
  | "retail_process_sale"
  | "retail_process_return"
  | "retail_apply_discount"
  | "retail_manage_inventory"
  | "retail_manage_products"
  | "retail_manage_suppliers"
  | "retail_view_reports"
  // ── Staff scheduling ─────────────────────────────────────────────────────
  | "scheduling_view_all"
  | "scheduling_create_shifts"
  | "scheduling_edit_shifts"
  | "scheduling_publish"
  | "scheduling_approve_time_off"
  | "scheduling_approve_swaps"
  | "scheduling_manage_availability"
  | "scheduling_view_labor_cost"
  // ── Calling & messages ───────────────────────────────────────────────────
  | "calling_view"
  | "calling_make_calls"
  | "calling_view_recordings"
  | "calling_view_voicemail"
  | "calling_manage_routing"
  | "messages_view_inbox"
  | "messages_send"
  | "messages_view_all_threads"
  | "messages_manage_templates"
  // ── Services / pricing ───────────────────────────────────────────────────
  | "view_services"
  | "manage_services"
  | "manage_rates"
  // ── Financial ────────────────────────────────────────────────────────────
  | "take_payment"
  | "financial_take_payment"
  | "process_refund"
  | "apply_discount"
  | "financial_view_amounts"
  | "financial_view_revenue"
  | "view_revenue"
  | "financial_reports"
  | "view_financial_reports"
  | "export_financials"
  | "financial_manage_invoices"
  | "financial_manage_gift_cards"
  | "financial_manage_payouts"
  | "financial_view_labor_cost"
  // ── Marketing ────────────────────────────────────────────────────────────
  | "marketing_view"
  | "marketing_create_campaigns"
  | "marketing_manage_automations"
  | "marketing_view_analytics"
  | "marketing_manage_reviews"
  | "marketing_manage_loyalty"
  | "marketing_manage_referrals"
  // ── Operations & logs ────────────────────────────────────────────────────
  | "check_in_out"
  | "log_feedings"
  | "log_medications"
  | "log_potty_breaks"
  | "log_play_sessions"
  | "log_incidents"
  | "log_cleaning"
  | "ops_incidents_view"
  | "ops_incidents_manage"
  | "ops_smart_insights"
  | "ops_view_reports"
  | "ops_manage_tasks"
  | "ops_manage_checklists"
  // ── Staff management ─────────────────────────────────────────────────────
  | "view_staff"
  | "view_staff_permissions"
  | "manage_staff"
  | "manage_roles"
  | "view_payroll"
  | "edit_payroll"
  | "manage_onboarding"
  | "manage_writeups"
  | "view_staff_performance"
  // ── Inventory & supplies ─────────────────────────────────────────────────
  | "view_inventory"
  | "manage_supplies"
  // ── Communications ───────────────────────────────────────────────────────
  | "communicate_clients"
  | "send_marketing"
  // ── Settings & administration ────────────────────────────────────────────
  | "manage_facility_settings"
  | "manage_locations"
  | "manage_integrations"
  | "settings_general"
  | "settings_subscription"
  | "settings_billing"
  | "settings_manage_forms"
  | "settings_manage_notifications"
  | "settings_manage_taxes"
  | "settings_audit_log"
  | "settings_data_export"
  // ── HQ / multi-location ──────────────────────────────────────────────────
  | "hq_view"
  | "hq_manage_locations"
  | "hq_view_consolidated_reports"
  | "hq_transfer_resources"
  | "hq_manage_settings";

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
  /** Facility-defined custom role ids (from `useFacilityRoles`). Additive to preset roles. */
  customRoleIds?: string[];
  serviceAssignments: ServiceModule[];
  assignedLocations: string[];
  showOnCalendar: boolean;
  calendarAccess: CalendarAccess;
  clockIn: ClockInSettings;
  permissionOverrides: Partial<Record<PermissionKey, PermissionSetting>>;
  notifications: Record<NotificationEvent, NotificationScope>;
  payroll: PayrollConfig;
  employment: EmploymentDetails;
  status: "active" | "invited" | "inactive" | "terminated";
  /** ISO timestamp of the last status change */
  statusChangedAt?: string;
  /** Reason code for the current status (set when moving to inactive or terminated) */
  statusReason?:
    | "vacation"
    | "medical_leave"
    | "resigned"
    | "terminated_cause"
    | "performance"
    | "rehired"
    | "other";
  /** Free-text note added when the status was last changed */
  statusNote?: string;
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
  admin: {
    label: "Admin",
    tagline: "Full administrative access short of ownership",
    accent: "bg-amber-500/10",
    ring: "ring-amber-500/40",
    icon: "ShieldCheck",
  },
  manager: {
    label: "Manager",
    tagline: "Runs day-to-day ops, approvals, and team",
    accent: "bg-violet-500/10",
    ring: "ring-violet-500/40",
    icon: "ShieldCheck",
  },
  supervisor: {
    label: "Supervisor",
    tagline: "Shift lead — approves swaps and oversees the floor",
    accent: "bg-purple-500/10",
    ring: "ring-purple-500/40",
    icon: "UserCog",
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
  caretaker: {
    label: "Caretaker",
    tagline: "General animal care across boarding & daycare",
    accent: "bg-cyan-500/10",
    ring: "ring-cyan-500/40",
    icon: "PawPrint",
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
  retail: {
    label: "Retail Associate",
    tagline: "Point of sale, products, and stock",
    accent: "bg-fuchsia-500/10",
    ring: "ring-fuchsia-500/40",
    icon: "ShoppingBag",
  },
  accountant: {
    label: "Accountant",
    tagline: "Financials, invoices, and reporting — no floor ops",
    accent: "bg-lime-500/10",
    ring: "ring-lime-500/40",
    icon: "Calculator",
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

// The "Personal" tab — every account gets these and they cannot be revoked.
export const ALWAYS_ON_PERMISSIONS: PermissionKey[] = [
  "view_own_schedule",
  "view_team_schedule",
  "view_own_documents",
  "view_onboarding",
  "view_training_materials",
  "manage_own_tasks",
  "view_own_profile",
  "edit_own_profile",
  "clock_in_out",
  "request_time_off",
  "request_shift_swap",
  "submit_availability",
  "view_own_performance",
  "view_own_writeups",
  "message_manager",
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
    label: "Personal (always on)",
    description:
      "Every account gets these — schedule, docs, tasks, own account",
    permissions: [
      { key: "view_own_schedule", label: "View own schedule" },
      { key: "view_team_schedule", label: "View team schedule" },
      { key: "view_own_documents", label: "View own documents" },
      { key: "view_onboarding", label: "View onboarding material" },
      { key: "view_training_materials", label: "View training material" },
      { key: "manage_own_tasks", label: "Manage own tasks" },
      { key: "view_own_profile", label: "View own profile" },
      { key: "edit_own_profile", label: "Edit own profile" },
      { key: "clock_in_out", label: "Clock in / out" },
      { key: "request_time_off", label: "Request time off" },
      { key: "request_shift_swap", label: "Request a shift swap" },
      { key: "submit_availability", label: "Submit availability" },
      { key: "view_own_performance", label: "View own performance" },
      { key: "view_own_writeups", label: "View own write-ups" },
      { key: "message_manager", label: "Message manager" },
    ],
  },
  {
    id: "clients",
    label: "Customer data",
    description: "Look up and edit client & pet profiles",
    permissions: [
      { key: "view_client_list", label: "View client list" },
      { key: "view_clients", label: "View client profiles" },
      {
        key: "view_client_contact_info",
        label: "View contact info",
        hint: "Phone & email",
      },
      {
        key: "view_client_address",
        label: "View home address",
        hint: "Admin / Owner / Manager only",
      },
      {
        key: "view_client_financial",
        label: "View client financials",
        hint: "Lifetime value & balances",
      },
      { key: "create_clients", label: "Create clients" },
      { key: "edit_clients", label: "Edit clients" },
      { key: "delete_clients", label: "Delete clients" },
      { key: "merge_clients", label: "Merge duplicate clients" },
      { key: "export_clients", label: "Export client data" },
      { key: "view_pet_records", label: "View pet records" },
      { key: "edit_pet_records", label: "Edit pet records" },
      { key: "add_pet_notes", label: "Add pet notes" },
      { key: "view_pet_medical", label: "View pet medical records" },
      { key: "edit_pet_medical", label: "Edit pet medical records" },
      { key: "view_client_documents", label: "View client documents" },
    ],
  },
  {
    id: "bookings",
    label: "Bookings & scheduling",
    description: "Create, edit, cancel, and manage the calendar",
    permissions: [
      { key: "view_bookings", label: "View bookings" },
      { key: "create_bookings", label: "Create bookings" },
      { key: "edit_bookings", label: "Edit bookings" },
      { key: "cancel_bookings", label: "Cancel bookings" },
      { key: "reschedule_bookings", label: "Reschedule bookings" },
      {
        key: "view_booking_financials",
        label: "View booking amounts",
        hint: "Dollar amounts on bookings",
      },
      { key: "view_all_calendars", label: "View all calendars" },
      { key: "manage_booking_calendar", label: "Manage booking calendar" },
      { key: "manage_waitlist", label: "Manage waitlist" },
      { key: "override_booking_capacity", label: "Override capacity limits" },
    ],
  },
  {
    id: "grooming",
    label: "Grooming",
    description: "Gated to grooming-assigned staff",
    permissions: [
      { key: "view_grooming_queue", label: "View grooming queue" },
      {
        key: "grooming_view_own_calendar",
        label: "View own grooming calendar",
      },
      {
        key: "grooming_view_all_calendars",
        label: "View all grooming calendars",
      },
      { key: "perform_grooming", label: "Perform grooming" },
      { key: "add_grooming_notes", label: "Add grooming notes" },
      { key: "grooming_upload_photos", label: "Upload grooming photos" },
      { key: "grooming_manage_styles", label: "Manage grooming styles" },
      { key: "grooming_edit_pricing", label: "Edit grooming pricing" },
    ],
  },
  {
    id: "boarding",
    label: "Boarding",
    description: "Gated to boarding staff",
    permissions: [
      { key: "boarding_view_dashboard", label: "View boarding dashboard" },
      { key: "boarding_daily_care_log", label: "Boarding daily care log" },
      { key: "boarding_assign_kennels", label: "Assign kennels" },
      { key: "boarding_log_feeding", label: "Log boarding feeding" },
      { key: "boarding_log_medication", label: "Log boarding medication" },
      { key: "boarding_manage_belongings", label: "Manage pet belongings" },
      { key: "boarding_send_updates", label: "Send boarding updates" },
    ],
  },
  {
    id: "daycare",
    label: "Daycare",
    description: "Gated to daycare staff",
    permissions: [
      { key: "daycare_view_dashboard", label: "View daycare dashboard" },
      { key: "daycare_check_in_out", label: "Daycare check in / out" },
      { key: "daycare_log_activity", label: "Log daycare activity" },
      { key: "daycare_manage_groups", label: "Manage playgroups" },
      { key: "daycare_incident_report", label: "File daycare incident report" },
      { key: "daycare_send_updates", label: "Send daycare updates" },
    ],
  },
  {
    id: "training",
    label: "Training",
    description: "Gated to trainers",
    permissions: [
      { key: "view_training_queue", label: "View training queue" },
      {
        key: "training_view_own_calendar",
        label: "View own training calendar",
      },
      { key: "run_training_sessions", label: "Run training sessions" },
      { key: "add_training_notes", label: "Add training notes" },
      { key: "training_manage_programs", label: "Manage training programs" },
      { key: "training_log_progress", label: "Log training progress" },
      { key: "training_issue_certificates", label: "Issue certificates" },
    ],
  },
  {
    id: "retail",
    label: "Retail / POS",
    description: "Point of sale, products, and stock",
    permissions: [
      { key: "retail_pos_access", label: "Access point of sale" },
      { key: "retail_process_sale", label: "Process a sale" },
      { key: "retail_process_return", label: "Process a return" },
      { key: "retail_apply_discount", label: "Apply retail discount" },
      { key: "retail_manage_inventory", label: "Manage retail inventory" },
      { key: "retail_manage_products", label: "Manage products" },
      { key: "retail_manage_suppliers", label: "Manage suppliers" },
      { key: "retail_view_reports", label: "View retail reports" },
    ],
  },
  {
    id: "staff_scheduling",
    label: "Staff scheduling",
    description: "Shifts, time off, and swaps for the team",
    permissions: [
      { key: "scheduling_view_all", label: "View all staff schedules" },
      { key: "scheduling_create_shifts", label: "Create shifts" },
      { key: "scheduling_edit_shifts", label: "Edit shifts" },
      { key: "scheduling_publish", label: "Publish schedules" },
      {
        key: "scheduling_approve_time_off",
        label: "Approve time-off requests",
      },
      { key: "scheduling_approve_swaps", label: "Approve shift swaps" },
      { key: "scheduling_manage_availability", label: "Manage availability" },
      {
        key: "scheduling_view_labor_cost",
        label: "View labor cost",
        hint: "Scheduled hours × pay rate",
      },
    ],
  },
  {
    id: "calling_messages",
    label: "Calling & messages",
    description: "Phone, voicemail, and client messaging",
    permissions: [
      { key: "calling_view", label: "View calling" },
      { key: "calling_make_calls", label: "Make calls" },
      { key: "calling_view_recordings", label: "View call recordings" },
      { key: "calling_view_voicemail", label: "View voicemail" },
      { key: "calling_manage_routing", label: "Manage call routing" },
      { key: "messages_view_inbox", label: "View message inbox" },
      { key: "messages_send", label: "Send messages" },
      { key: "messages_view_all_threads", label: "View all message threads" },
      { key: "messages_manage_templates", label: "Manage message templates" },
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
    label: "Financial",
    description: "Payments, refunds, revenue, and invoices",
    permissions: [
      { key: "take_payment", label: "Take payment" },
      { key: "financial_take_payment", label: "Take payment (POS/booking)" },
      { key: "process_refund", label: "Process refunds" },
      { key: "apply_discount", label: "Apply discounts" },
      {
        key: "financial_view_amounts",
        label: "View financial amounts",
        hint: "Invoice totals & outstanding balances",
      },
      { key: "financial_view_revenue", label: "View revenue" },
      { key: "view_revenue", label: "View revenue (legacy)" },
      { key: "financial_reports", label: "View financial reports" },
      {
        key: "view_financial_reports",
        label: "View financial reports (legacy)",
      },
      { key: "export_financials", label: "Export financials" },
      { key: "financial_manage_invoices", label: "Manage invoices" },
      { key: "financial_manage_gift_cards", label: "Manage gift cards" },
      { key: "financial_manage_payouts", label: "Manage payouts" },
      { key: "financial_view_labor_cost", label: "View labor cost" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Campaigns, reviews, loyalty, and referrals",
    permissions: [
      { key: "marketing_view", label: "View marketing" },
      { key: "marketing_create_campaigns", label: "Create campaigns" },
      { key: "marketing_manage_automations", label: "Manage automations" },
      { key: "marketing_view_analytics", label: "View campaign analytics" },
      { key: "marketing_manage_reviews", label: "Manage reviews" },
      { key: "marketing_manage_loyalty", label: "Manage loyalty program" },
      { key: "marketing_manage_referrals", label: "Manage referrals" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Care logs, incidents, tasks, and insights",
    permissions: [
      { key: "check_in_out", label: "Check in / out" },
      { key: "log_feedings", label: "Log feedings" },
      { key: "log_medications", label: "Log medications" },
      { key: "log_potty_breaks", label: "Log potty breaks" },
      { key: "log_play_sessions", label: "Log play sessions" },
      { key: "log_incidents", label: "Log incidents" },
      { key: "log_cleaning", label: "Log cleaning" },
      { key: "ops_incidents_view", label: "View incidents" },
      { key: "ops_incidents_manage", label: "Manage incidents" },
      { key: "ops_smart_insights", label: "View Smart Insights" },
      { key: "ops_view_reports", label: "View operations reports" },
      { key: "ops_manage_tasks", label: "Manage team tasks" },
      { key: "ops_manage_checklists", label: "Manage checklists" },
    ],
  },
  {
    id: "staff",
    label: "Staff management",
    description: "Roles, payroll, onboarding, and write-ups",
    permissions: [
      { key: "view_staff", label: "View staff directory" },
      {
        key: "view_staff_permissions",
        label: "View staff permissions",
        hint: "See the Access tab on each staff profile",
      },
      { key: "manage_staff", label: "Manage staff" },
      { key: "manage_roles", label: "Manage roles & permissions" },
      { key: "view_payroll", label: "View payroll" },
      { key: "edit_payroll", label: "Edit payroll" },
      { key: "manage_onboarding", label: "Manage onboarding checklists" },
      {
        key: "manage_writeups",
        label: "Manage write-ups",
        hint: "Confidential — Manager+",
      },
      { key: "view_staff_performance", label: "View staff performance" },
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
    description: "Client messaging and marketing sends",
    permissions: [
      { key: "communicate_clients", label: "Message clients" },
      { key: "send_marketing", label: "Send marketing campaigns" },
    ],
  },
  {
    id: "facility",
    label: "Settings & administration",
    description: "Global configuration — high risk",
    permissions: [
      { key: "manage_facility_settings", label: "Facility settings" },
      { key: "manage_locations", label: "Manage locations" },
      { key: "manage_integrations", label: "Manage integrations" },
      { key: "settings_general", label: "General settings" },
      { key: "settings_subscription", label: "Manage subscription" },
      { key: "settings_billing", label: "Manage billing" },
      { key: "settings_manage_forms", label: "Manage forms" },
      {
        key: "settings_manage_notifications",
        label: "Manage notification settings",
      },
      { key: "settings_manage_taxes", label: "Manage taxes" },
      { key: "settings_audit_log", label: "View audit log" },
      { key: "settings_data_export", label: "Export facility data" },
    ],
  },
  {
    id: "hq",
    label: "HQ & multi-location",
    description: "Cross-location oversight and transfers",
    permissions: [
      { key: "hq_view", label: "View HQ" },
      { key: "hq_manage_locations", label: "Manage HQ locations" },
      {
        key: "hq_view_consolidated_reports",
        label: "View consolidated reports",
      },
      { key: "hq_transfer_resources", label: "Transfer resources" },
      { key: "hq_manage_settings", label: "Manage HQ settings" },
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

/** Every grantable (non-core) key — owner/admin get all of these. */
const ALL_GRANTABLE_KEYS: PermissionKey[] = PERMISSION_GROUPS.filter(
  (g) => g.id !== "core",
).flatMap((g) => g.permissions.map((p) => p.key));

/** Compose a preset: core (always-on) + the given keys at a single scope. */
function preset(keys: PermissionKey[], scope: AccessScope): PresetEntry[] {
  return [...CORE_PRESET, ...keys.map((k) => [k, scope] as PresetEntry)];
}

export const ROLE_PRESETS: Record<
  FacilityStaffRole,
  {
    permissions: PresetEntry[];
    services: ServiceModule[];
    defaultNotifications: Partial<Record<NotificationEvent, NotificationScope>>;
  }
> = {
  owner: {
    permissions: preset(ALL_GRANTABLE_KEYS, "anytime"),
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
  admin: {
    permissions: preset(ALL_GRANTABLE_KEYS, "anytime"),
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
    permissions: preset(
      [
        // Customer data
        "view_client_list",
        "view_clients",
        "view_client_contact_info",
        "view_client_address",
        "view_client_financial",
        "create_clients",
        "edit_clients",
        "merge_clients",
        "export_clients",
        "view_pet_records",
        "edit_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "edit_pet_medical",
        "view_client_documents",
        // Bookings
        "view_bookings",
        "create_bookings",
        "edit_bookings",
        "cancel_bookings",
        "reschedule_bookings",
        "view_booking_financials",
        "view_all_calendars",
        "manage_booking_calendar",
        "manage_waitlist",
        "override_booking_capacity",
        // Grooming / boarding / daycare / training oversight
        "view_grooming_queue",
        "grooming_view_all_calendars",
        "add_grooming_notes",
        "grooming_upload_photos",
        "grooming_manage_styles",
        "boarding_view_dashboard",
        "boarding_daily_care_log",
        "boarding_assign_kennels",
        "boarding_manage_belongings",
        "boarding_send_updates",
        "daycare_view_dashboard",
        "daycare_manage_groups",
        "daycare_incident_report",
        "daycare_send_updates",
        "view_training_queue",
        "training_manage_programs",
        // Retail
        "retail_pos_access",
        "retail_process_sale",
        "retail_process_return",
        "retail_apply_discount",
        "retail_manage_inventory",
        "retail_manage_products",
        "retail_manage_suppliers",
        "retail_view_reports",
        // Staff scheduling
        "scheduling_view_all",
        "scheduling_create_shifts",
        "scheduling_edit_shifts",
        "scheduling_publish",
        "scheduling_approve_time_off",
        "scheduling_approve_swaps",
        "scheduling_manage_availability",
        "scheduling_view_labor_cost",
        // Calling & messages
        "calling_view",
        "calling_make_calls",
        "calling_view_recordings",
        "calling_view_voicemail",
        "calling_manage_routing",
        "messages_view_inbox",
        "messages_send",
        "messages_view_all_threads",
        "messages_manage_templates",
        // Services & pricing
        "view_services",
        "manage_services",
        "manage_rates",
        // Financial
        "take_payment",
        "financial_take_payment",
        "process_refund",
        "apply_discount",
        "financial_view_amounts",
        "financial_view_revenue",
        "view_revenue",
        "financial_reports",
        "view_financial_reports",
        "export_financials",
        "financial_manage_invoices",
        "financial_manage_gift_cards",
        "financial_view_labor_cost",
        // Marketing
        "marketing_view",
        "marketing_create_campaigns",
        "marketing_manage_automations",
        "marketing_view_analytics",
        "marketing_manage_reviews",
        "marketing_manage_loyalty",
        "marketing_manage_referrals",
        // Operations
        "check_in_out",
        "log_feedings",
        "log_medications",
        "log_potty_breaks",
        "log_play_sessions",
        "log_incidents",
        "log_cleaning",
        "ops_incidents_view",
        "ops_incidents_manage",
        "ops_smart_insights",
        "ops_view_reports",
        "ops_manage_tasks",
        "ops_manage_checklists",
        // Staff management
        "view_staff",
        "view_staff_permissions",
        "manage_staff",
        "view_payroll",
        "manage_onboarding",
        "manage_writeups",
        "view_staff_performance",
        // Inventory / comms
        "view_inventory",
        "manage_supplies",
        "communicate_clients",
        "send_marketing",
        // Settings (limited)
        "settings_general",
        "settings_manage_forms",
        "settings_manage_notifications",
        // HQ (read)
        "hq_view",
        "hq_view_consolidated_reports",
      ],
      "anytime",
    ),
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
  supervisor: {
    permissions: preset(
      [
        "view_client_list",
        "view_clients",
        "view_client_contact_info",
        "view_pet_records",
        "edit_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "view_client_documents",
        "view_bookings",
        "create_bookings",
        "edit_bookings",
        "cancel_bookings",
        "reschedule_bookings",
        "view_all_calendars",
        "manage_booking_calendar",
        "manage_waitlist",
        "view_grooming_queue",
        "grooming_view_all_calendars",
        "boarding_view_dashboard",
        "boarding_daily_care_log",
        "daycare_view_dashboard",
        "daycare_check_in_out",
        "daycare_log_activity",
        "daycare_manage_groups",
        "daycare_incident_report",
        "view_training_queue",
        "retail_pos_access",
        "retail_process_sale",
        "scheduling_view_all",
        "scheduling_edit_shifts",
        "scheduling_approve_time_off",
        "scheduling_approve_swaps",
        "scheduling_manage_availability",
        "calling_view",
        "calling_make_calls",
        "messages_view_inbox",
        "messages_send",
        "take_payment",
        "financial_take_payment",
        "apply_discount",
        "marketing_view",
        "check_in_out",
        "log_feedings",
        "log_medications",
        "log_potty_breaks",
        "log_play_sessions",
        "log_incidents",
        "log_cleaning",
        "ops_incidents_view",
        "ops_incidents_manage",
        "ops_view_reports",
        "ops_manage_tasks",
        "ops_manage_checklists",
        "view_staff",
        "view_staff_performance",
        "view_inventory",
        "manage_supplies",
        "communicate_clients",
      ],
      "operating_hours",
    ),
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
      task_assigned: "related_to_them",
    },
  },
  reception: {
    permissions: preset(
      [
        "view_client_list",
        "view_clients",
        "view_client_contact_info",
        "create_clients",
        "edit_clients",
        "view_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "view_client_documents",
        "view_bookings",
        "create_bookings",
        "edit_bookings",
        "cancel_bookings",
        "reschedule_bookings",
        "view_booking_financials",
        "view_all_calendars",
        "manage_booking_calendar",
        "manage_waitlist",
        "view_grooming_queue",
        // Reception is front-of-house: it can check daycare guests in
        // (daycare_check_in_out) but does NOT get the Boarding/Daycare
        // dashboards — those sections are not_granted for reception (spec 1.2).
        "daycare_check_in_out",
        "view_training_queue",
        "retail_pos_access",
        "retail_process_sale",
        "retail_process_return",
        "retail_apply_discount",
        "calling_view",
        "calling_make_calls",
        "calling_view_voicemail",
        "messages_view_inbox",
        "messages_send",
        "view_services",
        "take_payment",
        "financial_take_payment",
        "apply_discount",
        "financial_view_amounts",
        "financial_manage_invoices",
        "financial_manage_gift_cards",
        "marketing_view",
        "check_in_out",
        "log_incidents",
        "ops_incidents_view",
        "view_inventory",
        "communicate_clients",
      ],
      "operating_hours",
    ),
    services: ["reception"],
    defaultNotifications: {
      new_booking_request: "at_working_business",
      abandoned_booking: "at_working_business",
      intake_form_submitted: "at_working_business",
      appointment_canceled: "at_working_business",
    },
  },
  groomer: {
    permissions: preset(
      [
        "view_clients",
        "view_client_contact_info",
        "view_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "view_bookings",
        "view_grooming_queue",
        "grooming_view_own_calendar",
        "perform_grooming",
        "add_grooming_notes",
        "grooming_upload_photos",
        "check_in_out",
        "messages_view_inbox",
        "messages_send",
      ],
      "assigned_shifts",
    ),
    services: ["grooming"],
    defaultNotifications: {
      appointment_created: "related_to_them",
      appointment_canceled: "related_to_them",
      task_assigned: "related_to_them",
    },
  },
  trainer: {
    permissions: preset(
      [
        "view_clients",
        "view_client_contact_info",
        "view_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "view_bookings",
        "view_training_queue",
        "training_view_own_calendar",
        "run_training_sessions",
        "add_training_notes",
        "training_log_progress",
        "training_issue_certificates",
        "check_in_out",
        "messages_view_inbox",
        "messages_send",
      ],
      "assigned_shifts",
    ),
    services: ["training"],
    defaultNotifications: {
      appointment_created: "related_to_them",
      appointment_canceled: "related_to_them",
      task_assigned: "related_to_them",
    },
  },
  caretaker: {
    permissions: preset(
      [
        "view_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "view_bookings",
        "boarding_view_dashboard",
        "boarding_daily_care_log",
        "boarding_log_feeding",
        "boarding_log_medication",
        "boarding_manage_belongings",
        "boarding_send_updates",
        "daycare_view_dashboard",
        "daycare_check_in_out",
        "daycare_log_activity",
        "daycare_incident_report",
        "daycare_send_updates",
        "check_in_out",
        "log_feedings",
        "log_medications",
        "log_potty_breaks",
        "log_play_sessions",
        "log_incidents",
        "log_cleaning",
      ],
      "anytime",
    ),
    services: ["daycare", "boarding"],
    defaultNotifications: {
      task_assigned: "related_to_them",
      appointment_created: "at_working_business",
    },
  },
  daycare_attendant: {
    permissions: preset(
      [
        "view_pet_records",
        "add_pet_notes",
        "view_bookings",
        "daycare_view_dashboard",
        "daycare_check_in_out",
        "daycare_log_activity",
        "daycare_manage_groups",
        "daycare_incident_report",
        "daycare_send_updates",
        "check_in_out",
        "log_feedings",
        "log_medications",
        "log_potty_breaks",
        "log_play_sessions",
        "log_incidents",
        "log_cleaning",
      ],
      "assigned_shifts",
    ),
    services: ["daycare"],
    defaultNotifications: {
      task_assigned: "related_to_them",
      appointment_created: "at_working_business",
    },
  },
  boarding_attendant: {
    permissions: preset(
      [
        "view_pet_records",
        "add_pet_notes",
        "view_pet_medical",
        "view_bookings",
        "boarding_view_dashboard",
        "boarding_daily_care_log",
        "boarding_assign_kennels",
        "boarding_log_feeding",
        "boarding_log_medication",
        "boarding_manage_belongings",
        "boarding_send_updates",
        "check_in_out",
        "log_feedings",
        "log_medications",
        "log_potty_breaks",
        "log_incidents",
        "log_cleaning",
      ],
      "anytime",
    ),
    services: ["boarding"],
    defaultNotifications: {
      task_assigned: "related_to_them",
      appointment_created: "at_working_business",
    },
  },
  retail: {
    permissions: preset(
      [
        "view_client_list",
        "view_clients",
        "view_bookings",
        "retail_pos_access",
        "retail_process_sale",
        "retail_process_return",
        "retail_apply_discount",
        "retail_manage_inventory",
        "retail_manage_products",
        "retail_manage_suppliers",
        "retail_view_reports",
        "take_payment",
        "financial_take_payment",
        "apply_discount",
        "view_inventory",
        "manage_supplies",
        "messages_view_inbox",
        "messages_send",
      ],
      "operating_hours",
    ),
    services: ["retail"],
    defaultNotifications: {
      task_assigned: "related_to_them",
    },
  },
  accountant: {
    permissions: preset(
      [
        "view_client_list",
        "view_clients",
        "view_client_financial",
        "view_bookings",
        "view_booking_financials",
        "take_payment",
        "financial_take_payment",
        "process_refund",
        "apply_discount",
        "financial_view_amounts",
        "financial_view_revenue",
        "view_revenue",
        "financial_reports",
        "view_financial_reports",
        "export_financials",
        "financial_manage_invoices",
        "financial_manage_gift_cards",
        "financial_manage_payouts",
        "financial_view_labor_cost",
        "scheduling_view_labor_cost",
        "view_payroll",
        "retail_view_reports",
        "marketing_view_analytics",
        "settings_billing",
        "settings_manage_taxes",
        "settings_data_export",
        "hq_view_consolidated_reports",
      ],
      "anytime",
    ),
    services: [],
    defaultNotifications: {
      invoice_paid: "at_working_business",
    },
  },
  sanitation: {
    permissions: preset(
      ["log_cleaning", "check_in_out", "view_inventory", "manage_supplies"],
      "assigned_shifts",
    ),
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

// ============================================================================
// Custom / editable roles
// ============================================================================

/**
 * A facility-defined role. Distinct from the 8 hard-coded {@link FacilityStaffRole}
 * presets — these are created by the facility owner in settings.
 */
export interface CustomFacilityRole {
  id: string;
  label: string;
  description: string;
  /** Tailwind background accent class (e.g. "bg-amber-500/10"). */
  accent: string;
  /** Tailwind ring class (e.g. "ring-amber-500/40"). */
  ring: string;
  /** Icon name from lucide-react (e.g. "Sparkles"). Resolved via the shared ICON_MAP. */
  icon: string;
  /** Per-permission grant + scope. Missing keys mean "not granted". */
  permissions: Partial<Record<PermissionKey, AccessScope>>;
  createdAt: string;
}

/**
 * Per-facility editable overrides applied on top of {@link ROLE_PRESETS}. A missing
 * key means "use the preset default". Presence means the facility has explicitly
 * granted or revoked that permission for the role.
 */
export type RolePresetOverrides = Partial<
  Record<
    FacilityStaffRole,
    Partial<Record<PermissionKey, AccessScope | "revoked">>
  >
>;

/** Lookup table of custom roles by id. */
export type CustomRolesById = Record<string, CustomFacilityRole>;

function scopeForRole(
  role: FacilityStaffRole,
  key: PermissionKey,
  overrides?: RolePresetOverrides,
): AccessScope | undefined {
  const override = overrides?.[role]?.[key];
  if (override === "revoked") return undefined;
  if (override) return override;
  const preset = ROLE_PRESETS[role].permissions.find(([k]) => k === key);
  return preset?.[1];
}

export interface ResolvePermissionContext {
  presetOverrides?: RolePresetOverrides;
  customRoles?: CustomRolesById;
}

export function resolvePermission(
  staff: StaffProfile,
  key: PermissionKey,
  ctx: ResolvePermissionContext = {},
): PermissionSetting {
  if (staff.permissionOverrides[key]) {
    return staff.permissionOverrides[key]!;
  }

  const scopes: AccessScope[] = [];
  const primary = scopeForRole(staff.primaryRole, key, ctx.presetOverrides);
  if (primary) scopes.push(primary);
  for (const add of staff.additionalRoles) {
    const s = scopeForRole(add, key, ctx.presetOverrides);
    if (s) scopes.push(s);
  }
  if (ctx.customRoles && staff.customRoleIds) {
    for (const id of staff.customRoleIds) {
      const role = ctx.customRoles[id];
      const s = role?.permissions[key];
      if (s) scopes.push(s);
    }
  }

  if (scopes.length === 0) return { granted: false, scope: "none" };
  // Union: widest scope wins (anytime > operating_hours > assigned_shifts > none).
  const rank: Record<AccessScope, number> = {
    none: 0,
    assigned_shifts: 1,
    operating_hours: 2,
    anytime: 3,
  };
  const widest = scopes.reduce((best, s) => (rank[s] > rank[best] ? s : best));
  return { granted: true, scope: widest };
}

/** Every permission key, derived from the grouped catalog (source of truth). */
export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions.map((p) => p.key),
);

/**
 * The effective permission map for one staff member: each key maps to its
 * granted {@link AccessScope}, or `false` when the permission is not granted.
 * This is the shape guards / sidebars / field-masking consume.
 */
export type EffectivePermissions = Record<PermissionKey, AccessScope | false>;

/**
 * Resolve EVERY permission for a staff member in one pass — the plural companion
 * to {@link resolvePermission}. Loads the role preset (or custom-role) defaults
 * and applies the staff's per-key overrides (GRANT / REVOKE / scope; a missing
 * override key means "inherit the role default"). Pure — no React, no I/O — so
 * both the provider and non-hook callers can use it.
 */
export function resolveAllPermissions(
  staff: StaffProfile,
  ctx: ResolvePermissionContext = {},
): EffectivePermissions {
  const out = {} as EffectivePermissions;
  for (const key of ALL_PERMISSION_KEYS) {
    const { granted, scope } = resolvePermission(staff, key, ctx);
    out[key] = granted ? scope : false;
  }
  return out;
}
