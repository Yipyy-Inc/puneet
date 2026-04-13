import {
  COLOR_HEX_MAP,
  getModuleWorkflowQuestionnaire,
} from "@/data/custom-services";
import { getTagsByType, getTagsForEntity } from "@/data/tags-notes";
import { users } from "@/data/users";
import type { FacilityTask } from "@/data/facility-tasks";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type {
  CustomServiceCheckIn,
  CustomServiceModule,
  FacilityResource,
} from "@/types/facility";
import type { Transaction } from "@/types/retail";

export type OperationsCalendarEventType =
  | "booking"
  | "add-on"
  | "task"
  | "facility-event"
  | "retail-pos";

export type OperationsCalendarView =
  | "day"
  | "week"
  | "two-week"
  | "month"
  | "day-list"
  | "week-list"
  | "month-list";

export type CalendarAxisMode = "master" | "resource";

export type CalendarAddOnDisplayMode = "nested" | "separate";

export type CalendarColorMode = "service-type" | "staff-member" | "status";

export type CalendarColorStyle = "stripe" | "full-background";

export type CalendarZoomLevel = "compact" | "comfortable" | "expanded";

export type CalendarCompletedTaskDecoration =
  | "none"
  | "checkmark"
  | "strikethrough";

export type CalendarTagLogic = "and" | "or";

export type CalendarCardFieldKey =
  | "petNames"
  | "customerName"
  | "serviceName"
  | "time"
  | "staff"
  | "location"
  | "status"
  | "tagChips"
  | "addOnIcons";

export type CalendarCardFieldConfig = Record<CalendarCardFieldKey, boolean>;

export interface CalendarVisualConfig {
  colorMode: CalendarColorMode;
  colorStyle: CalendarColorStyle;
  zoomLevel: CalendarZoomLevel;
  addOnDisplayMode: CalendarAddOnDisplayMode;
  completedTaskDecoration: CalendarCompletedTaskDecoration;
  cardFields: CalendarCardFieldConfig;
}

export interface OperationsCalendarSavedView {
  id: string;
  name: string;
  scope: "personal" | "facility";
  sharedRoles: string[];
  view: OperationsCalendarView;
  searchTerm: string;
  filters: OperationsCalendarFilters;
  visualConfig: CalendarVisualConfig;
  createdAt: string;
  createdByRole: string;
}

export interface CalendarAddOn {
  id: string;
  name: string;
  iconKey:
    | "tooth-brushing"
    | "medication"
    | "treats"
    | "enrichment"
    | "nail-trim"
    | "yogurt"
    | "video-call"
    | "custom";
  scheduledAt?: Date;
}

export interface ManualFacilityEvent {
  id: string;
  title: string;
  details?: string;
  subtype:
    | "blocked-time"
    | "staff-meeting"
    | "maintenance"
    | "holiday-closure"
    | "personal-reminder"
    | "custom-event";
  kind?: "custom-event" | "block-time";
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  staff: string;
  status: string;
  notes?: string;
  linkedCustomerName?: string;
  linkedPetName?: string;
  recurrence?:
    | "none"
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "custom";
  affects?: "facility" | "resource" | "staff";
  affectedResource?: string;
  affectedStaff?: string;
  visibility?: "internal-only" | "all-staff" | "selected-roles";
  visibleRoles?: string[];
  createdAt?: string;
  createdByName?: string;
  createdByRole?: string;
  seriesId?: string;
  deletedAt?: string;
  privateToUser?: string;
}

export interface OperationsCalendarEvent {
  id: string;
  sourceId: string;
  type: OperationsCalendarEventType;
  subtype: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  status: string;
  service: string;
  module: string;
  moduleId?: string;
  taskType?: string;
  staff: string;
  staffRole?: string;
  roleGroup?: string;
  location: string;
  resource?: string;
  resourceId?: string;
  resourceType?: string;
  unassigned: boolean;
  petId?: number;
  clientId?: number;
  taskId?: string;
  bookingRawStatus?: string;
  petNames: string[];
  customerName?: string;
  details?: string;
  notes?: string;
  bookingId?: number;
  confirmationNumber?: string;
  parentEventId?: string;
  isSubEvent?: boolean;
  createdByName?: string;
  createdByRole?: string;
  recurrence?: ManualFacilityEvent["recurrence"];
  visibility?: ManualFacilityEvent["visibility"];
  calendarCardDisplayMode?: "full-block" | "compact-block" | "icon-only";
  requiresCheckInOut?: boolean;
  allowsAddOns?: boolean;
  affectsCapacityHeatmap?: boolean;
  capacityCeilingPerHour?: number;
  onlineBookable?: boolean;
  deletedAt?: string;
  completedAt?: string;
  completedByName?: string;
  completedByStaffId?: string;
  petTags: string[];
  customerTags: string[];
  bookingTags: string[];
  addOns: CalendarAddOn[];
  href: string;
}

export interface OperationsCalendarFilters {
  types: string[];
  modules: string[];
  services: string[];
  taskTypes: string[];
  staff: string[];
  staffRoles: string[];
  locations: string[];
  statuses: string[];
  bookingStatuses: string[];
  taskStatuses: string[];
  petTags: string[];
  customerTags: string[];
  unassignedOnly: boolean;
  showRetailPos: boolean;
  showCompletedTasks: boolean;
  tagLogic: CalendarTagLogic;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface OperationsCalendarFilterOptions {
  types: FilterOption[];
  modules: FilterOption[];
  taskTypes: FilterOption[];
  staff: FilterOption[];
  staffRoles: FilterOption[];
  locations: FilterOption[];
  statuses: FilterOption[];
  bookingStatuses: FilterOption[];
  taskStatuses: FilterOption[];
  petTags: FilterOption[];
  customerTags: FilterOption[];
}

export interface ResourceCalendarOption {
  type: string;
  label: string;
  resources: Array<{
    id: string;
    name: string;
  }>;
}

export interface ResourceConflictResult {
  hasConflict: boolean;
  conflictingEvent?: OperationsCalendarEvent;
}

export interface CalendarWindow {
  start: Date;
  end: Date;
}

export interface CompletedAddOnEntry {
  addOnName: string;
  bookingId: number;
  completedAt: string;
  completedByName: string;
  completedByStaffId: string;
}

interface BuildUnifiedEventsInput {
  bookings: Booking[];
  clients: Client[];
  customServiceCheckIns: CustomServiceCheckIn[];
  tasks: FacilityTask[];
  transactions: Transaction[];
  customModules: CustomServiceModule[];
  facilityId: number;
  view: OperationsCalendarView;
  addOnDisplayMode: CalendarAddOnDisplayMode;
  manualFacilityEvents?: ManualFacilityEvent[];
  completedAddOns?: CompletedAddOnEntry[];
  viewerKey?: string;
  resources?: FacilityResource[];
}

function resourceTypeLabel(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === "pool") return "Pool";
  if (normalized === "room") return "Grooming Rooms";
  if (normalized === "van" || normalized === "vehicle") return "Vans";
  if (normalized === "yard") return "Yards";
  if (normalized === "facility") return "Facility";
  if (normalized === "equipment") return "Equipment";
  return titleCase(type);
}

const BUILTIN_SERVICE_LABELS: Record<string, string> = {
  daycare: "Daycare",
  boarding: "Boarding",
  grooming: "Grooming",
  training: "Training",
  vet: "Vet",
  retail: "Retail / POS",
  custom: "Custom Service",
};

export const BUILTIN_SERVICE_COLORS: Record<string, string> = {
  Daycare: "#0284c7",
  Boarding: "#8b5cf6",
  Grooming: "#ec4899",
  Training: "#f97316",
  Evaluation: "#14b8a6",
  "Retail / POS": "#64748b",
  Facility: "#0f766e",
};

export const STATUS_COLOR_MAP: Record<string, string> = {
  Confirmed: "#3b82f6",
  Pending: "#f59e0b",
  "Checked-in": "#22c55e",
  "Checked-out": "#06b6d4",
  Cancelled: "#6b7280",
  Completed: "#22c55e",
  Overdue: "#ef4444",
  Scheduled: "#3b82f6",
  Planned: "#0ea5e9",
  Refunded: "#64748b",
};

const STAFF_COLOR_PALETTE = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#ec4899",
  "#8b5cf6",
  "#eab308",
  "#14b8a6",
  "#f43f5e",
  "#6366f1",
  "#84cc16",
];

/** Curated brand palette — the only colors users can pick from. */
export const BRAND_COLOR_PALETTE: Array<{ hex: string; name: string }> = [
  // Blues
  { hex: "#0284c7", name: "Sky" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#3b82f6", name: "Royal" },
  { hex: "#0ea5e9", name: "Cyan" },
  { hex: "#06b6d4", name: "Teal Blue" },
  // Purples
  { hex: "#8b5cf6", name: "Violet" },
  { hex: "#7c3aed", name: "Purple" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#a855f7", name: "Amethyst" },
  // Pinks & Reds
  { hex: "#ec4899", name: "Pink" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#e11d48", name: "Crimson" },
  { hex: "#ef4444", name: "Red" },
  // Oranges & Yellows
  { hex: "#f97316", name: "Orange" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#eab308", name: "Gold" },
  { hex: "#d97706", name: "Honey" },
  // Greens
  { hex: "#22c55e", name: "Green" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#059669", name: "Jade" },
  { hex: "#84cc16", name: "Lime" },
  // Neutrals
  { hex: "#64748b", name: "Slate" },
  { hex: "#0f766e", name: "Deep Teal" },
  { hex: "#78716c", name: "Stone" },
  { hex: "#475569", name: "Charcoal" },
];

export interface CalendarColorOverrides {
  /** service name → hex */
  services: Record<string, string>;
  /** status label → hex */
  statuses: Record<string, string>;
}

export const EMPTY_COLOR_OVERRIDES: CalendarColorOverrides = {
  services: {},
  statuses: {},
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  checked_in: "Checked-in",
  checked_out: "Checked-out",
  completed: "Checked-out",
  cancelled: "Cancelled",
  in_progress: "Checked-in",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  overdue: "Overdue",
  skipped: "Completed",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  "medication-task": "Medication",
  "feeding-task": "Feeding",
  "enrichment-task": "Enrichment",
  "grooming-prep-task": "Grooming checklist",
  "cleaning-task": "Cleaning",
  "template-task": "Custom task",
};

const ROLE_GROUP_LABELS: Record<string, string> = {
  "front-desk": "Front desk",
  "kennel-tech": "Kennel tech",
  groomer: "Groomer",
  trainer: "Trainer",
  chauffeur: "Driver / chauffeur",
  custom: "Custom role",
};

export const OPERATIONS_CALENDAR_VIEWS: Array<{
  value: OperationsCalendarView;
  label: string;
}> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "two-week", label: "2-Week" },
  { value: "month", label: "Month" },
  { value: "day-list", label: "Day List" },
  { value: "week-list", label: "Week List" },
  { value: "month-list", label: "Month List" },
];

export const CALENDAR_ZOOM_OPTIONS: Array<{
  value: CalendarZoomLevel;
  label: string;
}> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "expanded", label: "Expanded" },
];

export const DEFAULT_CARD_FIELD_CONFIG: CalendarCardFieldConfig = {
  petNames: true,
  customerName: true,
  serviceName: true,
  time: true,
  staff: true,
  location: true,
  status: true,
  tagChips: true,
  addOnIcons: true,
};

export const DEFAULT_VISUAL_CONFIG: CalendarVisualConfig = {
  colorMode: "service-type",
  colorStyle: "stripe",
  zoomLevel: "comfortable",
  addOnDisplayMode: "nested",
  completedTaskDecoration: "checkmark",
  cardFields: DEFAULT_CARD_FIELD_CONFIG,
};

export const OPERATIONS_CALENDAR_EMPTY_FILTERS: OperationsCalendarFilters = {
  types: [],
  modules: [],
  services: [],
  taskTypes: [],
  staff: [],
  staffRoles: [],
  locations: [],
  statuses: [],
  bookingStatuses: [],
  taskStatuses: [],
  petTags: [],
  customerTags: [],
  unassignedOnly: false,
  showRetailPos: false,
  showCompletedTasks: true,
  tagLogic: "and",
};

const USER_ROLE_LOOKUP = new Map(users.map((user) => [user.name, user.role]));

function titleCase(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeHexColor(value: string): string {
  if (value.startsWith("#")) {
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }
    return value;
  }
  return COLOR_HEX_MAP[value] ?? "#64748b";
}

function parseDateInput(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function parseTimeToParts(value: string): { hour: number; minute: number } {
  const [rawHour = "9", rawMinute = "0"] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  return {
    hour: Number.isNaN(hour) ? 9 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
  };
}

function makeDateTime(date: string, time?: string): Date {
  const parsedDate = parseDateInput(date);
  const base = parsedDate ?? new Date();
  const { hour, minute } = parseTimeToParts(time ?? "09:00");

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

function getPrimaryBookingPetId(petId: Booking["petId"]): number | undefined {
  if (Array.isArray(petId)) {
    return petId[0];
  }
  return petId;
}

function toDateOrFallback(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = parseDateInput(value);
  return parsed ?? fallback;
}

function toStatusLabel(raw: string | undefined, fallback = "Pending"): string {
  if (!raw) return fallback;
  return BOOKING_STATUS_LABELS[raw] ?? TASK_STATUS_LABELS[raw] ?? titleCase(raw);
}

function resolveRoleGroup(
  staffRole: string,
  service: string,
  taskType?: string,
): string {
  const normalizedRole = staffRole.toLowerCase();
  const normalizedService = service.toLowerCase();
  const normalizedTask = (taskType ?? "").toLowerCase();

  if (normalizedService.includes("groom") || normalizedRole.includes("groom")) {
    return "groomer";
  }
  if (normalizedService.includes("train") || normalizedRole.includes("train")) {
    return "trainer";
  }
  if (
    normalizedService.includes("transport") ||
    normalizedService.includes("express") ||
    normalizedRole.includes("driver") ||
    normalizedRole.includes("chauffeur")
  ) {
    return "chauffeur";
  }
  if (normalizedRole.includes("admin") || normalizedRole.includes("manager")) {
    return "front-desk";
  }
  if (
    normalizedTask.includes("feeding") ||
    normalizedTask.includes("medication") ||
    normalizedTask.includes("enrichment") ||
    normalizedRole.includes("staff")
  ) {
    return "kennel-tech";
  }

  return "custom";
}

function resolveStaffRole(staffName: string): string {
  if (staffName === "Unassigned") return "Unassigned";
  return USER_ROLE_LOOKUP.get(staffName) ?? "Staff";
}

function normalizeServiceLabel(rawService: string): string {
  const lowered = rawService.toLowerCase();
  return BUILTIN_SERVICE_LABELS[lowered] ?? titleCase(rawService);
}

function mapBookingSubtype(booking: Booking): string {
  if (booking.includesEvaluation) {
    return "evaluation";
  }

  const service = booking.service.toLowerCase();
  if (service === "boarding") return "boarding-stay-block";
  if (service === "daycare") return "daycare-reservation";
  if (service === "grooming") return "grooming-appointment";
  if (service === "training") return "training-session";
  return "custom-service";
}

function inferResourceTypeFromText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("pool")) return "pool";
  if (normalized.includes("room") || normalized.includes("suite") || normalized.includes("kennel")) {
    return "room";
  }
  if (normalized.includes("van") || normalized.includes("vehicle")) return "van";
  if (normalized.includes("yard") || normalized.includes("play")) return "yard";
  if (normalized.includes("equipment")) return "equipment";
  return undefined;
}

function inferBookingResourceType(booking: Booking): string | undefined {
  const service = booking.service.toLowerCase();

  if (service.includes("groom") || service.includes("evaluation")) return "room";
  if (service.includes("train") || service.includes("daycare")) return "yard";
  if (service.includes("board")) return "room";

  return inferResourceTypeFromText(booking.kennel);
}

function mapTaskSubtype(task: FacilityTask): string {
  const name = task.name.toLowerCase();
  if (name.includes("medication") || task.category === "medication") {
    return "medication-task";
  }
  if (name.includes("feed") || task.category === "feeding") {
    return "feeding-task";
  }
  if (name.includes("enrichment")) {
    return "enrichment-task";
  }
  if (name.includes("groom") || name.includes("nail")) {
    return "grooming-prep-task";
  }
  if (name.includes("clean")) {
    return "cleaning-task";
  }
  return "template-task";
}

function getAddOnIconKey(name: string): CalendarAddOn["iconKey"] {
  const normalized = name.toLowerCase();
  if (normalized.includes("tooth") || normalized.includes("brush")) return "tooth-brushing";
  if (normalized.includes("med")) return "medication";
  if (normalized.includes("treat") || normalized.includes("kong")) return "treats";
  if (normalized.includes("enrich") || normalized.includes("play")) return "enrichment";
  if (normalized.includes("nail")) return "nail-trim";
  if (normalized.includes("yogurt")) return "yogurt";
  if (
    normalized.includes("video") ||
    normalized.includes("call") ||
    normalized.includes("cam") ||
    normalized.includes("facetime")
  )
    return "video-call";
  return "custom";
}

function inferAddOnScheduledAt(
  booking: Booking,
  addOnName: string,
  index: number,
): Date | undefined {
  const normalized = addOnName.toLowerCase();
  const bookingStart = makeDateTime(booking.startDate, booking.checkInTime ?? "09:00");

  if (normalized.includes("med")) {
    const firstDose = booking.medicationInstructions
      ?.flatMap((medication) => medication.doses)
      .find((dose) => dose.scheduledAt)?.scheduledAt;

    if (firstDose) {
      return toDateOrFallback(firstDose, addMinutes(bookingStart, 30));
    }
  }

  if (
    normalized.includes("video") ||
    normalized.includes("call") ||
    normalized.includes("cam") ||
    normalized.includes("facetime")
  ) {
    // Video calls scheduled at 10:00 AM on the check-in day
    return makeDateTime(booking.startDate, "10:00");
  }

  if (
    normalized.includes("nail") ||
    normalized.includes("tooth") ||
    normalized.includes("groom") ||
    normalized.includes("enrich") ||
    normalized.includes("session")
  ) {
    return addMinutes(bookingStart, (index + 1) * 20);
  }

  return undefined;
}

function extractBookingAddOns(booking: Booking): CalendarAddOn[] {
  const invoiceAddOns = [
    ...(booking.invoice?.items ?? []),
    ...(booking.invoice?.fees ?? []),
  ].filter((lineItem) => lineItem.type === "addon");

  const explicitExtras = (booking.extraServices ?? []).map((extra, index) => {
    if (typeof extra === "string") {
      return {
        id: `extra-${booking.id}-${index}`,
        name: titleCase(extra),
      };
    }

    return {
      id: `extra-${booking.id}-${extra.serviceId}`,
      name: titleCase(extra.serviceId),
    };
  });

  const combined: Array<{ id: string; name: string }> = [
    ...invoiceAddOns.map((addOn, index) => ({
      id: `addon-${booking.id}-${index}-${addOn.name}`,
      name: addOn.name,
    })),
    ...explicitExtras,
  ];

  const seen = new Set<string>();
  const deduped = combined.filter((addOn) => {
    const key = addOn.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.map((addOn, index) => ({
    id: addOn.id,
    name: addOn.name,
    iconKey: getAddOnIconKey(addOn.name),
    scheduledAt: inferAddOnScheduledAt(booking, addOn.name, index),
  }));
}

function buildClientLookups(clients: Client[]) {
  const petLookup = new Map<number, { petName: string; ownerName: string; clientId: number }>();
  const clientLookup = new Map<number, Client>();

  for (const client of clients) {
    clientLookup.set(client.id, client);
    for (const pet of client.pets) {
      if (!petLookup.has(pet.id)) {
        petLookup.set(pet.id, {
          petName: pet.name,
          ownerName: client.name,
          clientId: client.id,
        });
      }
    }
  }

  return { petLookup, clientLookup };
}

function buildTagNames(entityType: "pet" | "customer" | "booking", entityId?: number): string[] {
  if (!entityId) return [];
  return getTagsForEntity(entityType, entityId).map((tag) => tag.name);
}

function buildBookingEvents(
  inputBookings: Booking[],
  clients: Client[],
  facilityId: number,
): OperationsCalendarEvent[] {
  const { petLookup } = buildClientLookups(clients);

  return inputBookings
    .filter((booking) => booking.facilityId === facilityId)
    .map((booking) => {
      const primaryPetId = getPrimaryBookingPetId(booking.petId);
      const petContext = primaryPetId !== undefined ? petLookup.get(primaryPetId) : undefined;
      const serviceLabel = normalizeServiceLabel(booking.service);
      const bookingStatus = toStatusLabel(booking.status, "Confirmed");
      const start = makeDateTime(booking.startDate, booking.checkInTime ?? "09:00");
      const rawEnd = makeDateTime(
        booking.endDate ?? booking.startDate,
        booking.checkOutTime ?? booking.checkInTime ?? "10:00",
      );
      const end = rawEnd <= start ? addMinutes(start, 60) : rawEnd;
      const staff = booking.stylistPreference ?? booking.trainerId ?? "Unassigned";
      const staffRole = resolveStaffRole(staff);
      const roleGroup = resolveRoleGroup(staffRole, serviceLabel);
      const addOns = extractBookingAddOns(booking);
      const resourceType = inferBookingResourceType(booking);

      return {
        id: `booking-${booking.id}`,
        sourceId: String(booking.id),
        type: "booking" as const,
        subtype: mapBookingSubtype(booking),
        title: `${serviceLabel} - ${petContext?.petName ?? "Pet"}`,
        start,
        end,
        allDay: false,
        status: bookingStatus,
        service: serviceLabel,
        module: serviceLabel,
        staff,
        staffRole,
        roleGroup,
        location: booking.kennel ?? "Front Desk",
        resource: booking.kennel ?? "Front Desk",
        resourceType,
        unassigned: staff === "Unassigned",
        petId: primaryPetId,
        clientId: booking.clientId,
        bookingRawStatus: booking.status,
        petNames: petContext?.petName ? [petContext.petName] : [],
        customerName: petContext?.ownerName,
        bookingId: booking.id,
        confirmationNumber: booking.invoice?.id,
        petTags: buildTagNames("pet", primaryPetId),
        customerTags: buildTagNames("customer", booking.clientId),
        bookingTags: buildTagNames("booking", booking.id),
        addOns,
        allowsAddOns: true,
        requiresCheckInOut: ["boarding", "daycare", "grooming"].includes(
          booking.service.toLowerCase(),
        ),
        affectsCapacityHeatmap: true,
        href: `/facility/dashboard/bookings?bookingId=${booking.id}`,
      };
    });
}

function buildEvaluationEvents(
  inputBookings: Booking[],
  clients: Client[],
  facilityId: number,
): OperationsCalendarEvent[] {
  const { petLookup } = buildClientLookups(clients);

  return inputBookings
    .filter((booking) => booking.facilityId === facilityId && booking.includesEvaluation)
    .map((booking) => {
      const primaryPetId = getPrimaryBookingPetId(booking.petId);
      const petContext = primaryPetId !== undefined ? petLookup.get(primaryPetId) : undefined;
      const serviceLabel = "Evaluation";
      const start = addMinutes(
        makeDateTime(booking.startDate, booking.checkInTime ?? "09:00"),
        45,
      );
      const end = addMinutes(start, 45);
      const status = toStatusLabel(booking.evaluationStatus, "Pending");
      const staff = booking.evaluationEvaluator ?? "Unassigned";
      const staffRole = resolveStaffRole(staff);
      const roleGroup = resolveRoleGroup(staffRole, serviceLabel);
      const resourceType = inferBookingResourceType(booking);

      return {
        id: `evaluation-${booking.id}`,
        sourceId: String(booking.id),
        type: "booking" as const,
        subtype: "evaluation",
        title: `Evaluation - ${petContext?.petName ?? "Pet"}`,
        start,
        end,
        allDay: false,
        status,
        service: serviceLabel,
        module: serviceLabel,
        staff,
        staffRole,
        roleGroup,
        location: booking.kennel ?? "Evaluation Room",
        resource: booking.kennel ?? "Evaluation Room",
        resourceType,
        unassigned: staff === "Unassigned",
        petId: primaryPetId,
        clientId: booking.clientId,
        bookingRawStatus: booking.status,
        petNames: petContext?.petName ? [petContext.petName] : [],
        customerName: petContext?.ownerName,
        bookingId: booking.id,
        confirmationNumber: booking.invoice?.id,
        petTags: buildTagNames("pet", primaryPetId),
        customerTags: buildTagNames("customer", booking.clientId),
        bookingTags: buildTagNames("booking", booking.id),
        addOns: [],
        requiresCheckInOut: true,
        allowsAddOns: true,
        affectsCapacityHeatmap: true,
        href: `/facility/dashboard/evaluations?bookingId=${booking.id}`,
      };
    });
}

function buildCustomServiceEvents(
  checkIns: CustomServiceCheckIn[],
  customModules: CustomServiceModule[],
): OperationsCalendarEvent[] {
  const moduleById = new Map(
    customModules.map((customModule) => [customModule.id, customModule]),
  );

  return checkIns.flatMap((checkIn) => {
    const customModule = moduleById.get(checkIn.moduleId);
    const workflow = customModule
      ? getModuleWorkflowQuestionnaire(customModule)
      : undefined;

    if (workflow && !workflow.appearsOnCalendar) {
      return [];
    }

    const start = toDateOrFallback(checkIn.checkInTime, new Date());
    const endFromSchedule = toDateOrFallback(
      checkIn.scheduledCheckOut,
      addMinutes(start, checkIn.durationMinutes),
    );
    const actualEnd = checkIn.checkOutTime
      ? toDateOrFallback(checkIn.checkOutTime, endFromSchedule)
      : endFromSchedule;

    const allDay = workflow ? !workflow.requiresTimeSlots : false;
    const displayStart = allDay ? startOfDay(start) : start;
    const displayEnd = allDay ? endOfDay(start) : actualEnd;

    const status = workflow?.requiresCheckInOut
      ? toStatusLabel(checkIn.status, "Confirmed")
      : checkIn.status === "completed" || checkIn.status === "checked-out"
        ? "Completed"
        : checkIn.status === "scheduled"
          ? "Confirmed"
          : toStatusLabel(checkIn.status, "Confirmed");

    const staff = checkIn.staffAssigned ?? "Unassigned";
    const staffRole = resolveStaffRole(staff);
    const roleGroup = resolveRoleGroup(staffRole, checkIn.moduleName);

    const location = workflow?.requiresResource
      ? checkIn.resourceName ?? "Unassigned resource"
      : "Open time";

    return [{
      id: `custom-service-${checkIn.id}`,
      sourceId: checkIn.id,
      type: "booking" as const,
      subtype: "custom-service",
      title: `${checkIn.moduleName} - ${checkIn.petName}`,
      start: displayStart,
      end: displayEnd,
      allDay,
      status,
      service: checkIn.moduleName,
      module: checkIn.moduleName,
      moduleId: checkIn.moduleId,
      staff,
      staffRole,
      roleGroup,
      location,
      resource: location,
      resourceId: workflow?.resourceIds?.[0],
      resourceType:
        workflow?.requiresResource
          ? workflow.resourceType
          : inferResourceTypeFromText(checkIn.resourceName),
      unassigned: staff === "Unassigned",
      petId: checkIn.petId,
      clientId: checkIn.ownerId,
      petNames: [checkIn.petName],
      customerName: checkIn.ownerName,
      bookingRawStatus: checkIn.status,
      petTags: buildTagNames("pet", checkIn.petId),
      customerTags: buildTagNames("customer", checkIn.ownerId),
      bookingTags: [],
      addOns: [],
      calendarCardDisplayMode:
        workflow?.calendarCardDisplayMode ?? "full-block",
      requiresCheckInOut: workflow?.requiresCheckInOut ?? true,
      allowsAddOns: workflow?.allowsAddOns ?? true,
      affectsCapacityHeatmap: workflow?.affectsCapacityHeatmap ?? true,
      capacityCeilingPerHour: workflow?.capacityCeilingPerHour,
      onlineBookable: workflow?.bookableOnline ?? customModule?.onlineBooking.enabled,
      href: `/facility/dashboard/services/custom-modules/${checkIn.moduleSlug}`,
    }];
  });
}

function buildTaskEvents(
  tasks: FacilityTask[],
  bookings: Booking[],
): OperationsCalendarEvent[] {
  const bookingClientLookup = new Map(
    bookings.map((b) => [b.id, b.clientId]),
  );

  return tasks.map((task) => {
    const start = makeDateTime(task.scheduledDate, task.scheduledTime);
    const end = addMinutes(start, 30);
    const subtype = mapTaskSubtype(task);
    const taskType = TASK_TYPE_LABELS[subtype] ?? "Custom task";
    const taskStatus = toStatusLabel(task.status, "Pending");
    const staff = task.assignedToName ?? "Unassigned";
    const staffRole = resolveStaffRole(staff);
    const roleGroup = resolveRoleGroup(staffRole, task.category, taskType);

    return {
      id: `task-${task.id}`,
      sourceId: task.id,
      type: "task" as const,
      subtype,
      title: task.name,
      start,
      end,
      allDay: false,
      status: taskStatus,
      taskStatus,
      service: titleCase(task.category),
      module: titleCase(task.category),
      taskType,
      staff,
      staffRole,
      roleGroup,
      location: `${titleCase(task.shiftPeriod)} Shift`,
      resource: `${titleCase(task.shiftPeriod)} Shift`,
      resourceType: undefined,
      unassigned: !task.assignedToName,
      petId: task.petId,
      clientId: bookingClientLookup.get(task.bookingId),
      taskId: task.id,
      petNames: [task.petName],
      customerName: task.ownerName,
      bookingId: task.bookingId,
      petTags: buildTagNames("pet", task.petId),
      customerTags: [],
      bookingTags: buildTagNames("booking", task.bookingId),
      addOns: [],
      affectsCapacityHeatmap: false,
      href: `/facility/dashboard/tasks?taskId=${task.id}`,
    };
  });
}

function buildFacilitySeedEvents(anchorDate: Date): ManualFacilityEvent[] {
  const day = formatDateKey(anchorDate);
  const next = formatDateKey(addDays(anchorDate, 1));
  const nextTwo = formatDateKey(addDays(anchorDate, 2));

  return [
    {
      id: "facility-seed-blocked-time",
      title: "Blocked Time - Pool Maintenance",
      subtype: "blocked-time",
      start: `${day}T11:00:00`,
      end: `${day}T12:00:00`,
      allDay: false,
      location: "Main Pool",
      staff: "Operations Team",
      status: "Planned",
    },
    {
      id: "facility-seed-meeting",
      title: "All Staff Meeting",
      subtype: "staff-meeting",
      start: `${next}T08:30:00`,
      end: `${next}T09:15:00`,
      allDay: false,
      location: "Ops Room",
      staff: "All Staff",
      status: "Scheduled",
    },
    {
      id: "facility-seed-closure",
      title: "Holiday Closure",
      subtype: "holiday-closure",
      start: `${nextTwo}T00:00:00`,
      end: `${nextTwo}T23:59:00`,
      allDay: true,
      location: "Facility Wide",
      staff: "Management",
      status: "Planned",
    },
  ];
}

function buildFacilityEvents(
  anchorDate: Date,
  manualEvents: ManualFacilityEvent[],
  viewerKey?: string,
): OperationsCalendarEvent[] {
  const seeded = buildFacilitySeedEvents(anchorDate);
  const merged = [...seeded, ...manualEvents];

  return merged
    .filter((event) => {
      if (event.deletedAt) {
        return false;
      }

      if (event.privateToUser && event.privateToUser !== viewerKey) {
        return false;
      }

      if (event.visibility === "internal-only") {
        return event.privateToUser === viewerKey;
      }

      if (event.visibility === "selected-roles" && event.visibleRoles?.length) {
        const role = (viewerKey ?? "").toLowerCase();
        return event.visibleRoles.some((allowedRole) =>
          role.includes(allowedRole.toLowerCase()),
        );
      }

      return true;
    })
    .map((event) => {
      const start = toDateOrFallback(event.start, anchorDate);
      const end = toDateOrFallback(event.end, addMinutes(start, 60));
      const staffRole = resolveStaffRole(event.staff);
      const roleGroup = resolveRoleGroup(staffRole, "Facility");
      const resourceType =
        event.affects === "resource"
          ? inferResourceTypeFromText(event.affectedResource ?? event.location)
          : event.affects === "facility"
            ? "facility"
            : undefined;

      return {
        id: `facility-event-${event.id}`,
        sourceId: event.id,
        type: "facility-event" as const,
        subtype: event.subtype,
        title: event.title,
        start,
        end,
        allDay: event.allDay,
        status: event.status,
        service: event.kind === "custom-event" ? "Custom Event" : "Facility",
        module: event.kind === "custom-event" ? "Custom Event" : "Facility",
        staff: event.staff,
        staffRole,
        roleGroup,
        location: event.location,
        resource: event.location,
        resourceType,
        unassigned: false,
        createdByName: event.createdByName,
        createdByRole: event.createdByRole,
        recurrence: event.recurrence,
        visibility: event.visibility,
        deletedAt: event.deletedAt,
        petNames: event.linkedPetName ? [event.linkedPetName] : [],
        customerName: event.linkedCustomerName,
        details: event.details,
        notes: event.notes,
        petTags: [],
        customerTags: [],
        bookingTags: [],
        addOns: [],
        affectsCapacityHeatmap: false,
        href: "/facility/dashboard/notifications",
      };
    });
}

function buildRetailPosEvents(transactions: Transaction[]): OperationsCalendarEvent[] {
  return transactions
    .filter((transaction) => (transaction.bookingId || transaction.petId) && transaction.status)
    .map((transaction) => {
      const start = toDateOrFallback(transaction.createdAt, new Date());
      const end = addMinutes(start, 20);
      const status = toStatusLabel(transaction.status, "Completed");
      const staff = transaction.cashierName || "Cashier";
      const staffRole = resolveStaffRole(staff);
      const roleGroup = resolveRoleGroup(staffRole, "Retail / POS");

      return {
        id: `retail-${transaction.id}`,
        sourceId: transaction.id,
        type: "retail-pos" as const,
        subtype: "pos-transaction",
        title: `POS Sale - ${transaction.customerName ?? "Walk-in"}`,
        start,
        end,
        allDay: false,
        status,
        service: "Retail / POS",
        module: "Retail / POS",
        staff,
        staffRole,
        roleGroup,
        location: transaction.locationId ?? "Front Desk",
        resource: transaction.locationId ?? "Front Desk",
        unassigned: false,
        petNames: transaction.petName ? [transaction.petName] : [],
        customerName: transaction.customerName,
        bookingId: transaction.bookingId,
        confirmationNumber: transaction.transactionNumber,
        petTags: transaction.petId ? buildTagNames("pet", transaction.petId) : [],
        customerTags: transaction.customerId
          ? buildTagNames("customer", Number(transaction.customerId))
          : [],
        bookingTags: transaction.bookingId
          ? buildTagNames("booking", transaction.bookingId)
          : [],
        addOns: [],
        href: `/facility/dashboard/services/retail?transaction=${transaction.id}`,
      };
    });
}

function buildAddOnSubEvents(
  bookingEvents: OperationsCalendarEvent[],
  view: OperationsCalendarView,
  addOnDisplayMode: CalendarAddOnDisplayMode,
  completedAddOns?: CompletedAddOnEntry[],
): OperationsCalendarEvent[] {
  if (addOnDisplayMode !== "separate") return [];
  if (view !== "day" && view !== "week") return [];

  const completedLookup = new Map(
    (completedAddOns ?? []).map((entry) => [`${entry.bookingId}-${entry.addOnName.toLowerCase()}`, entry]),
  );

  return bookingEvents.flatMap((event) => {
    return event.addOns
      .filter((addOn) => addOn.scheduledAt)
      .map((addOn, index) => {
        const start = addOn.scheduledAt ?? event.start;
        const end = addMinutes(start, 20);
        const addOnEventId = `addon-${event.id}-${index}`;
        const completionEntry = completedLookup.get(`${event.bookingId}-${addOn.name.toLowerCase()}`);
        const isCompleted = !!completionEntry;

        return {
          id: addOnEventId,
          sourceId: addOn.id,
          type: "add-on" as const,
          subtype: addOn.iconKey,
          title: addOn.name,
          start,
          end,
          allDay: false,
          status: isCompleted ? "Completed" : event.status,
          completedAt: completionEntry?.completedAt,
          completedByName: completionEntry?.completedByName,
          completedByStaffId: completionEntry?.completedByStaffId,
          service: event.service,
          module: event.module,
          staff: event.staff,
          staffRole: event.staffRole,
          roleGroup: event.roleGroup,
          location: event.location,
          resource: event.resource,
          unassigned: event.unassigned,
          petNames: event.petNames,
          customerName: event.customerName,
          bookingId: event.bookingId,
          confirmationNumber: event.confirmationNumber,
          parentEventId: event.id,
          isSubEvent: true,
          petTags: event.petTags,
          customerTags: event.customerTags,
          bookingTags: event.bookingTags,
          addOns: [addOn],
          href: event.href,
        };
      });
  });
}

// Services where the main "stay" block is hidden from the calendar.
// Only their scheduled add-ons appear as discrete events.
const STAY_SERVICES = new Set(["boarding", "daycare"]);

/**
 * Builds standalone calendar events for each scheduled add-on belonging to a
 * boarding or daycare booking.  The parent stay block itself is intentionally
 * excluded from the calendar so the view shows only actionable events.
 */
function buildStayAddOnCalendarEvents(
  stayBookings: Booking[],
  clients: Client[],
  facilityId: number,
  completedAddOns?: CompletedAddOnEntry[],
): OperationsCalendarEvent[] {
  const completedLookup = new Map(
    (completedAddOns ?? []).map((entry) => [`${entry.bookingId}-${entry.addOnName.toLowerCase()}`, entry]),
  );
  const { petLookup } = buildClientLookups(clients);

  return stayBookings
    .filter((booking) => booking.facilityId === facilityId)
    .flatMap((booking) => {
      const primaryPetId = getPrimaryBookingPetId(booking.petId);
      const petContext =
        primaryPetId !== undefined ? petLookup.get(primaryPetId) : undefined;
      const serviceLabel = normalizeServiceLabel(booking.service);
      const bookingStart = makeDateTime(
        booking.startDate,
        booking.checkInTime ?? "09:00",
      );

      const addOnItems = [
        ...(booking.invoice?.items ?? []),
        ...(booking.invoice?.fees ?? []),
      ].filter((item) => item.type === "addon");

      if (addOnItems.length === 0) return [];

      return addOnItems.map((item, index) => {
        const scheduledAt =
          inferAddOnScheduledAt(booking, item.name, index) ??
          addMinutes(bookingStart, (index + 1) * 60);
        const end = addMinutes(scheduledAt, 30);

        // Use the add-on's assigned staff if present; fall back to "Unassigned".
        // Facilities can set item.staffName when creating scheduled add-ons.
        const assignedStaff = item.staffName ?? "Unassigned";
        const staffRole = resolveStaffRole(assignedStaff);
        const roleGroup = resolveRoleGroup(staffRole, serviceLabel);

        const addOnEntry: CalendarAddOn = {
          id: `stay-addon-item-${booking.id}-${index}`,
          name: item.name,
          iconKey: getAddOnIconKey(item.name),
          scheduledAt,
        };

        // Check if this add-on has been marked completed
        const addOnEventId = `stay-addon-${booking.id}-${index}`;
        const completionEntry = completedLookup.get(`${booking.id}-${item.name.toLowerCase()}`);
        const isCompleted = !!completionEntry;

        return {
          id: addOnEventId,
          sourceId: String(booking.id),
          type: "add-on" as const,
          subtype: getAddOnIconKey(item.name),
          title: `${item.name} — ${petContext?.petName ?? "Pet"}`,
          start: scheduledAt,
          end,
          allDay: false,
          status: isCompleted ? "Completed" : "Scheduled",
          completedAt: completionEntry?.completedAt,
          completedByName: completionEntry?.completedByName,
          completedByStaffId: completionEntry?.completedByStaffId,
          service: serviceLabel,
          module: serviceLabel,
          staff: assignedStaff,
          staffRole,
          roleGroup,
          location: booking.kennel ?? "Front Desk",
          resource: booking.kennel ?? "Front Desk",
          resourceType: undefined,
          unassigned: assignedStaff === "Unassigned",
          petId: primaryPetId,
          clientId: booking.clientId,
          bookingRawStatus: booking.status,
          petNames: petContext?.petName ? [petContext.petName] : [],
          customerName: petContext?.ownerName,
          bookingId: booking.id,
          confirmationNumber: booking.invoice?.id,
          parentEventId: `booking-${booking.id}`,
          isSubEvent: true,
          petTags: buildTagNames("pet", primaryPetId),
          customerTags: buildTagNames("customer", booking.clientId),
          bookingTags: buildTagNames("booking", booking.id),
          addOns: [addOnEntry],
          href: `/facility/dashboard/bookings?bookingId=${booking.id}`,
        } satisfies OperationsCalendarEvent;
      });
    });
}

export function buildUnifiedEvents(input: BuildUnifiedEventsInput): OperationsCalendarEvent[] {
  // Split bookings: stay-type services (boarding/daycare) are hidden as full
  // blocks; only their add-ons surface as discrete scheduled events.
  const stayBookings = input.bookings.filter((b) =>
    STAY_SERVICES.has(b.service.toLowerCase()),
  );
  const schedulableBookings = input.bookings.filter(
    (b) => !STAY_SERVICES.has(b.service.toLowerCase()),
  );

  const bookingEvents = [
    ...buildBookingEvents(schedulableBookings, input.clients, input.facilityId),
    // Evaluations still surface for ALL bookings (including boarding/daycare)
    ...buildEvaluationEvents(input.bookings, input.clients, input.facilityId),
    ...buildCustomServiceEvents(input.customServiceCheckIns, input.customModules),
  ];

  // Add-on sub-events for schedulable services (respects nested/separate mode)
  const addOnSubEvents = buildAddOnSubEvents(
    bookingEvents,
    input.view,
    input.addOnDisplayMode,
    input.completedAddOns,
  );

  // Stay add-ons always appear as standalone events regardless of display mode
  const stayAddOnEvents = buildStayAddOnCalendarEvents(
    stayBookings,
    input.clients,
    input.facilityId,
    input.completedAddOns,
  );

  const taskEvents = buildTaskEvents(input.tasks, input.bookings);
  const facilityEvents = buildFacilityEvents(
    new Date(),
    input.manualFacilityEvents ?? [],
    input.viewerKey,
  );
  const retailEvents = buildRetailPosEvents(input.transactions);

  return sortEvents([
    ...bookingEvents,
    ...addOnSubEvents,
    ...stayAddOnEvents,
    ...taskEvents,
    ...facilityEvents,
    ...retailEvents,
  ]);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

export function addMonths(date: Date, months: number): Date {
  const clone = new Date(date);
  clone.setMonth(clone.getMonth() + months);
  return clone;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function startOfWeek(date: Date): Date {
  const base = startOfDay(date);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(base, mondayOffset);
}

export function endOfWeek(date: Date): Date {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isCurrentMonthDay(day: Date, anchorDate: Date): boolean {
  return day.getMonth() === anchorDate.getMonth() && day.getFullYear() === anchorDate.getFullYear();
}

export function isCalendarView(value: string | null): value is OperationsCalendarView {
  return OPERATIONS_CALENDAR_VIEWS.some((item) => item.value === value);
}

export function getViewWindow(
  anchorDate: Date,
  view: OperationsCalendarView,
): CalendarWindow {
  if (view === "day" || view === "day-list") {
    return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
  }

  if (view === "week" || view === "week-list") {
    const start = startOfWeek(anchorDate);
    return { start, end: endOfDay(addDays(start, 6)) };
  }

  if (view === "two-week") {
    const start = startOfWeek(anchorDate);
    return { start, end: endOfDay(addDays(start, 13)) };
  }

  if (view === "month") {
    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    return {
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    };
  }

  return {
    start: startOfMonth(anchorDate),
    end: endOfMonth(anchorDate),
  };
}

export function stepAnchorDate(
  anchorDate: Date,
  view: OperationsCalendarView,
  direction: -1 | 1,
): Date {
  if (view === "day" || view === "day-list") {
    return addDays(anchorDate, direction);
  }

  if (view === "week" || view === "week-list") {
    return addDays(anchorDate, direction * 7);
  }

  if (view === "two-week") {
    return addDays(anchorDate, direction * 14);
  }

  return addMonths(anchorDate, direction);
}

export function formatRangeLabel(
  anchorDate: Date,
  view: OperationsCalendarView,
): string {
  if (view === "day" || view === "day-list") {
    return anchorDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (view === "month" || view === "month-list") {
    return anchorDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  const window = getViewWindow(anchorDate, view);
  const startLabel = window.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = window.end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

export function eventIntersectsWindow(
  event: OperationsCalendarEvent,
  window: CalendarWindow,
): boolean {
  return event.start <= window.end && event.end >= window.start;
}

export function getDaysForView(
  anchorDate: Date,
  view: OperationsCalendarView,
): Date[] {
  if (view === "day" || view === "day-list") {
    return [startOfDay(anchorDate)];
  }

  if (view === "week" || view === "week-list") {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }

  if (view === "two-week") {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 14 }, (_, index) => addDays(start, index));
  }

  if (view === "month") {
    const monthStart = startOfMonth(anchorDate);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  }

  const monthStart = startOfMonth(anchorDate);
  const daysInMonth = endOfMonth(anchorDate).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => addDays(monthStart, index));
}

export function sortEvents(events: OperationsCalendarEvent[]): OperationsCalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.start.getTime() !== b.start.getTime()) {
      return a.start.getTime() - b.start.getTime();
    }
    if (a.isSubEvent !== b.isSubEvent) {
      return a.isSubEvent ? 1 : -1;
    }
    return a.end.getTime() - b.end.getTime();
  });
}

export function getEventsForDay(
  events: OperationsCalendarEvent[],
  day: Date,
): OperationsCalendarEvent[] {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return sortEvents(
    events.filter((event) => event.start <= dayEnd && event.end >= dayStart),
  );
}

function matchesTagLogic(
  selectedTags: string[],
  eventTags: string[],
  logic: CalendarTagLogic,
): boolean {
  if (selectedTags.length === 0) return true;
  if (logic === "and") {
    return selectedTags.every((tag) => eventTags.includes(tag));
  }
  return selectedTags.some((tag) => eventTags.includes(tag));
}

export function filterEvents(
  events: OperationsCalendarEvent[],
  filters: OperationsCalendarFilters,
  searchTerm: string,
): OperationsCalendarEvent[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedModules = filters.modules;

  return events.filter((event) => {
    if (
      selectedModules.length > 0 &&
      !selectedModules.includes(event.module) &&
      !selectedModules.includes(event.service)
    ) {
      return false;
    }

    if (normalizedSearch.length === 0) {
      return true;
    }

    const searchable = [
      event.title,
      event.service,
      event.module,
      event.staff,
      event.staffRole ?? "",
      event.location,
      event.status,
      event.petNames.join(" "),
      event.customerName ?? "",
      event.details ?? "",
      event.notes ?? "",
      String(event.bookingId ?? ""),
      event.confirmationNumber ?? "",
      event.petTags.join(" "),
      event.customerTags.join(" "),
      event.bookingTags.join(" "),
      event.addOns.map((addOn) => addOn.name).join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });
}

function mapOptions(values: string[]): FilterOption[] {
  return values
    .filter((value) => value.length > 0)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

export function deriveFilterOptions(
  events: OperationsCalendarEvent[],
  customModules: CustomServiceModule[] = [],
): OperationsCalendarFilterOptions {
  const types = Array.from(new Set(events.map((event) => event.type))).sort();
  const modulesFromEvents = Array.from(
    new Set(
      events
        .filter((event) => event.type === "booking" || event.type === "add-on")
        .map((event) => event.module),
    ),
  );
  const dynamicCustomModules = customModules.map((module) => module.name);

  const taskTypes = Array.from(
    new Set(events.map((event) => event.taskType).filter(Boolean) as string[]),
  );

  const bookingStatuses = Array.from(
    new Set(events.filter((event) => event.type === "booking").map((event) => event.status)),
  );

  const taskStatuses = Array.from(
    new Set(events.filter((event) => event.type === "task").map((event) => event.status)),
  );

  const staffRoles = Array.from(
    new Set(
      events.flatMap((event) => [
        event.staffRole ?? "",
        event.roleGroup ? ROLE_GROUP_LABELS[event.roleGroup] ?? event.roleGroup : "",
      ]),
    ),
  ).filter(Boolean);

  const petTags = getTagsByType("pet").map((tag) => tag.name);
  const customerTags = getTagsByType("customer").map((tag) => tag.name);

  return {
    types: types.map((type) => ({ value: type, label: titleCase(type) })),
    modules: mapOptions(Array.from(new Set([...modulesFromEvents, ...dynamicCustomModules]))),
    taskTypes: mapOptions(taskTypes),
    staff: mapOptions(Array.from(new Set(events.map((event) => event.staff)))),
    staffRoles: mapOptions(staffRoles),
    locations: mapOptions(Array.from(new Set(events.map((event) => event.location)))),
    statuses: mapOptions(Array.from(new Set(events.map((event) => event.status)))),
    bookingStatuses: mapOptions(bookingStatuses),
    taskStatuses: mapOptions(taskStatuses),
    petTags: mapOptions(petTags),
    customerTags: mapOptions(customerTags),
  };
}

export function deriveResourceCalendarOptions(
  events: OperationsCalendarEvent[],
  resources: FacilityResource[],
  customModules: CustomServiceModule[],
): ResourceCalendarOption[] {
  const byType = new Map<
    string,
    Array<{
      id: string;
      name: string;
    }>
  >();

  for (const resource of resources) {
    const type = resource.type.toLowerCase();
    const existing = byType.get(type) ?? [];
    if (!existing.some((entry) => entry.id === resource.id)) {
      existing.push({ id: resource.id, name: resource.name });
    }
    byType.set(type, existing);
  }

  for (const customModule of customModules) {
    const workflow = getModuleWorkflowQuestionnaire(customModule);
    if (!workflow.appearsOnCalendar || !workflow.requiresResource) continue;

    const type = (workflow.resourceType ?? "other").toLowerCase();
    const existing = byType.get(type) ?? [];

    for (const resourceId of workflow.resourceIds) {
      const match = resources.find((resource) => resource.id === resourceId);
      if (match && !existing.some((entry) => entry.id === match.id)) {
        existing.push({ id: match.id, name: match.name });
      }
      if (!match && !existing.some((entry) => entry.id === resourceId)) {
        existing.push({ id: resourceId, name: resourceId });
      }
    }

    byType.set(type, existing);
  }

  for (const event of events) {
    if (!event.resourceType || !event.resource) continue;
    const type = event.resourceType.toLowerCase();
    const existing = byType.get(type) ?? [];
    const resourceId = event.resourceId ?? `${type}-${event.resource}`;
    if (!existing.some((entry) => entry.id === resourceId)) {
      existing.push({
        id: resourceId,
        name: event.resource,
      });
    }
    byType.set(type, existing);
  }

  return Array.from(byType.entries())
    .filter(([, entries]) => entries.length > 0)
    .map(([type, entries]) => ({
      type,
      label: resourceTypeLabel(type),
      resources: [...entries].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function findResourceConflict(
  events: OperationsCalendarEvent[],
  input: {
    start: Date;
    end: Date;
    resourceName: string;
    resourceType?: string;
    excludeEventId?: string;
  },
): ResourceConflictResult {
  const conflict = events.find((event) => {
    if (input.excludeEventId && event.id === input.excludeEventId) return false;
    if (!event.resource || event.resource !== input.resourceName) return false;

    if (
      input.resourceType &&
      event.resourceType &&
      event.resourceType.toLowerCase() !== input.resourceType.toLowerCase()
    ) {
      return false;
    }

    return event.start < input.end && event.end > input.start;
  });

  return {
    hasConflict: Boolean(conflict),
    conflictingEvent: conflict,
  };
}

export function buildServiceColorMap(
  customModules: CustomServiceModule[],
  colorOverrides?: CalendarColorOverrides,
  builtInColorSettings?: Record<string, string>,
): Record<string, string> {
  const customMap: Record<string, string> = {};

  for (const customModule of customModules) {
    const workflow = getModuleWorkflowQuestionnaire(customModule);
    customMap[customModule.name] = normalizeHexColor(
      workflow.calendarColor || customModule.iconColor,
    );
  }

  return {
    ...BUILTIN_SERVICE_COLORS,
    ...(builtInColorSettings ?? {}),
    ...customMap,
    ...(colorOverrides?.services ?? {}),
  };
}

function getStaffColor(staffName: string): string {
  const index = hashString(staffName) % STAFF_COLOR_PALETTE.length;
  return STAFF_COLOR_PALETTE[index];
}

export function resolveEventColor(
  event: OperationsCalendarEvent,
  colorMode: CalendarColorMode,
  serviceColorMap: Record<string, string>,
  colorOverrides?: CalendarColorOverrides,
): string {
  if (colorMode === "status") {
    return colorOverrides?.statuses[event.status] ?? STATUS_COLOR_MAP[event.status] ?? "#64748b";
  }

  if (colorMode === "staff-member") {
    return getStaffColor(event.staff);
  }

  return serviceColorMap[event.module] ?? serviceColorMap[event.service] ?? "#64748b";
}

export function hexToRgba(hexColor: string, opacity: number): string {
  const hex = normalizeHexColor(hexColor).replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function getRoleGroupLabel(roleGroup: string | undefined): string {
  if (!roleGroup) return "";
  return ROLE_GROUP_LABELS[roleGroup] ?? roleGroup;
}

export function getZoomEventLimit(zoomLevel: CalendarZoomLevel): number {
  if (zoomLevel === "compact") return 2;
  if (zoomLevel === "expanded") return 8;
  return 4;
}

export function getTimelineSlotHeight(zoomLevel: CalendarZoomLevel): number {
  if (zoomLevel === "compact") return 60;
  if (zoomLevel === "expanded") return 96;
  return 78;
}

export function formatPetLabel(petNames: string[]): string {
  if (petNames.length === 0) return "";
  if (petNames.length === 1) return petNames[0];
  return `${petNames[0]} + ${petNames.length - 1}`;
}
