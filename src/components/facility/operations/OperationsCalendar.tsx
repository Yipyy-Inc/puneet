"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  getModuleWorkflowQuestionnaire,
} from "@/data/custom-services";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { customServiceCheckIns } from "@/data/custom-service-checkins";
import { facilityTasks, type FacilityTask } from "@/data/facility-tasks";
import { getAllTransactions } from "@/data/retail";
import { users } from "@/data/users";
import { useCustomServices } from "@/hooks/use-custom-services";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { CustomServiceModule } from "@/types/facility";
import type { Pet } from "@/types/pet";
import {
  OperationsCalendarConfigPanel,
  type ManualEventDraft,
} from "@/components/facility/operations/OperationsCalendarConfigPanel";
import { OperationsCalendarContent } from "@/components/facility/operations/OperationsCalendarContent";
import {
  type BookingDrawerAddOnItem,
  type BookingDrawerTab,
  OperationsCalendarEventDrawer,
} from "@/components/facility/operations/OperationsCalendarEventDrawer";
import { OperationsCalendarFiltersPanel } from "@/components/facility/operations/OperationsCalendarFiltersPanel";
import { OperationsCalendarReportsPanel } from "@/components/facility/operations/OperationsCalendarReportsPanel";
import {
  activeFiltersCount,
  canAccessSavedView,
  loadStoredJson,
  parseCsv,
  parseUserRoleFromCookie,
  toCsv,
} from "@/components/facility/operations/OperationsCalendarHelpers";
import {
  getBookingNotes,
  getCustomerNotes,
  getPetNotes,
  toDisplayRole,
  type NoteSectionState,
} from "@/components/facility/operations/OperationsCalendarDrawerHelpers";
import {
  type NewEventSeed,
  OperationsCalendarNewEventMenu,
} from "@/components/facility/operations/OperationsCalendarNewEventMenu";
import { OperationsCalendarToolbar } from "@/components/facility/operations/OperationsCalendarToolbar";
import { OperationsCalendarSidePanel } from "@/components/facility/operations/OperationsCalendarSidePanel";
import {
  type CalendarCardFieldKey,
  type CalendarAxisMode,
  type CalendarVisualConfig,
  type ManualFacilityEvent,
  type OperationsCalendarEvent,
  type OperationsCalendarFilters,
  type ResourceCalendarOption,
  type OperationsCalendarSavedView,
  type OperationsCalendarView,
  DEFAULT_VISUAL_CONFIG,
  OPERATIONS_CALENDAR_EMPTY_FILTERS,
  buildServiceColorMap,
  buildUnifiedEvents,
  deriveResourceCalendarOptions,
  deriveFilterOptions,
  eventIntersectsWindow,
  findResourceConflict,
  filterEvents,
  formatDateKey,
  formatRangeLabel,
  getDaysForView,
  getTimelineSlotHeight,
  getViewWindow,
  isCalendarView,
  isSameDay,
  parseDateKey,
  sortEvents,
  stepAnchorDate,
} from "@/lib/operations-calendar";

const FACILITY_ID = 11;
const VISUAL_CONFIG_KEY = `operations-calendar-visual-config-${FACILITY_ID}`;
const SAVED_VIEWS_KEY = `operations-calendar-saved-views-${FACILITY_ID}`;
const MANUAL_EVENTS_KEY = `operations-calendar-manual-events-${FACILITY_ID}`;
const CALENDAR_AXIS_KEY = `operations-calendar-axis-${FACILITY_ID}`;
const CALENDAR_RESOURCE_TYPE_KEY = `operations-calendar-resource-type-${FACILITY_ID}`;

interface TaskCompletionAuditEntry {
  id: string;
  source: "calendar-drawer" | "task-drawer" | "task-engine";
  staffUserId: string;
  staffDisplayName: string;
  completedAt: string;
  timezone: string;
  taskId: string;
  taskName: string;
  taskType: string;
  bookingId?: number;
  petId?: number;
  completionNote?: string;
  photoProofUrl?: string;
}

interface OverdueMeta {
  alertedAt: string;
  reminderSentAt?: string;
  escalationTaskId?: string;
}

interface ManagerAlert {
  id: string;
  type: "overdue" | "reminder" | "escalation";
  message: string;
  createdAt: string;
}

type CalendarPermissionLevel =
  | "view-only"
  | "standard"
  | "booking-edit"
  | "manager"
  | "admin";

type CalendarVisibilityScope = "full-facility" | "own-schedule" | "selected-roles";

interface CalendarPermissionSet {
  level: CalendarPermissionLevel;
  canCompleteTasks: boolean;
  canCheckInOut: boolean;
  canEditBookings: boolean;
  canCreateCustomEvents: boolean;
  canCreateBlockTime: boolean;
  canManageFacilitySavedViews: boolean;
  canViewAudit: boolean;
  canOverrideResourceConflict: boolean;
  canConfigureCalendar: boolean;
  canRecoverDeletedEvents: boolean;
}

interface CalendarAuditEntry {
  id: string;
  action:
    | "booking_created"
    | "booking_edited"
    | "booking_rescheduled"
    | "booking_cancelled"
    | "booking_checkin"
    | "booking_checkout"
    | "task_completed"
    | "task_overdue"
    | "escalation_notification_sent"
    | "escalation_task_created"
    | "custom_event_created"
    | "custom_event_edited"
    | "custom_event_deleted"
    | "block_time_created"
    | "block_time_removed"
    | "resource_conflict_override"
    | "saved_view_created"
    | "saved_view_deleted";
  actorUserId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  details: Record<string, string | number | boolean | null | undefined>;
}

function parsePermissionLevelFromCookie(userRole: string): CalendarPermissionLevel {
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(
      /(?:^|;\s*)calendar_permission_level=([^;]+)/,
    );
    const cookieValue = cookieMatch?.[1];
    if (
      cookieValue === "view-only" ||
      cookieValue === "standard" ||
      cookieValue === "booking-edit" ||
      cookieValue === "manager" ||
      cookieValue === "admin"
    ) {
      return cookieValue;
    }
  }

  const normalized = userRole.toLowerCase();
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("manager")) return "manager";
  if (
    normalized.includes("front") ||
    normalized.includes("lead") ||
    normalized.includes("supervisor")
  ) {
    return "booking-edit";
  }
  if (
    normalized.includes("trainee") ||
    normalized.includes("observer") ||
    normalized.includes("shadow")
  ) {
    return "view-only";
  }
  return "standard";
}

function parseVisibilityScopeFromCookie(
  level: CalendarPermissionLevel,
): CalendarVisibilityScope {
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(
      /(?:^|;\s*)calendar_visibility_scope=([^;]+)/,
    );
    const cookieValue = cookieMatch?.[1];
    if (
      cookieValue === "full-facility" ||
      cookieValue === "own-schedule" ||
      cookieValue === "selected-roles"
    ) {
      return cookieValue;
    }
  }

  if (level === "manager" || level === "admin") return "full-facility";
  return "full-facility";
}

function parseVisibilityRolesFromCookie(): string[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie.match(
    /(?:^|;\s*)calendar_visibility_roles=([^;]+)/,
  );
  if (!match?.[1]) return [];
  return decodeURIComponent(match[1])
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function buildPermissionSet(level: CalendarPermissionLevel): CalendarPermissionSet {
  return {
    level,
    canCompleteTasks:
      level === "standard" ||
      level === "booking-edit" ||
      level === "manager" ||
      level === "admin",
    canCheckInOut:
      level === "standard" ||
      level === "booking-edit" ||
      level === "manager" ||
      level === "admin",
    canEditBookings:
      level === "booking-edit" || level === "manager" || level === "admin",
    canCreateCustomEvents: level === "manager" || level === "admin",
    canCreateBlockTime: level === "manager" || level === "admin",
    canManageFacilitySavedViews: level === "manager" || level === "admin",
    canViewAudit: level === "manager" || level === "admin",
    canOverrideResourceConflict: level === "manager" || level === "admin",
    canConfigureCalendar: level === "admin",
    canRecoverDeletedEvents: level === "admin",
  };
}

const TASK_COMPLETION_RULES: Record<
  FacilityTask["category"],
  {
    noteRequired: boolean;
    photoRequired: boolean;
    overdueReminderMinutes: number;
    createEscalationTask: boolean;
  }
> = {
  medication: {
    noteRequired: true,
    photoRequired: true,
    overdueReminderMinutes: 30,
    createEscalationTask: true,
  },
  feeding: {
    noteRequired: false,
    photoRequired: false,
    overdueReminderMinutes: 30,
    createEscalationTask: true,
  },
  activity: {
    noteRequired: false,
    photoRequired: false,
    overdueReminderMinutes: 45,
    createEscalationTask: false,
  },
  care: {
    noteRequired: false,
    photoRequired: false,
    overdueReminderMinutes: 30,
    createEscalationTask: true,
  },
  cleanup: {
    noteRequired: false,
    photoRequired: false,
    overdueReminderMinutes: 30,
    createEscalationTask: false,
  },
};

const DEFAULT_DRAFT: ManualEventDraft = {
  title: "",
  subtype: "blocked-time",
  date: formatDateKey(new Date()),
  startTime: "09:00",
  endTime: "10:00",
  allDay: false,
  privateToUser: false,
  location: "Front Desk",
  staff: "Management",
};

function parseUserNameFromCookie(): string {
  if (typeof document === "undefined") return "Manager on Duty";
  const match = document.cookie.match(/(?:^|;\s*)user_name=([^;]+)/);
  if (!match?.[1]) return "Manager on Duty";
  return decodeURIComponent(match[1]);
}

function parseUserIdFromCookie(): string {
  if (typeof document === "undefined") return "facility-user";
  const match = document.cookie.match(/(?:^|;\s*)user_id=([^;]+)/);
  return match?.[1] ?? "facility-user";
}

function parseTaskDueDate(task: FacilityTask): Date {
  return new Date(`${task.scheduledDate}T${task.scheduledTime}:00`);
}

function getPrimaryPetId(petId: Booking["petId"]): number | undefined {
  if (Array.isArray(petId)) {
    return petId[0];
  }
  return petId;
}

function inferShiftFromHour(hour: number): FacilityTask["shiftPeriod"] {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function createDefaultNotesState(): {
  booking: NoteSectionState;
  pet: NoteSectionState;
  customer: NoteSectionState;
} {
  return {
    booking: {
      content: "",
      lastEditedBy: "",
      lastEditedAt: "",
    },
    pet: {
      content: "",
      lastEditedBy: "",
      lastEditedAt: "",
    },
    customer: {
      content: "",
      lastEditedBy: "",
      lastEditedAt: "",
    },
  };
}

function mapBookingToAddOns(source: Booking[]): Record<number, BookingDrawerAddOnItem[]> {
  const result: Record<number, BookingDrawerAddOnItem[]> = {};

  for (const booking of source) {
    const invoiceAddOns = (booking.invoice?.items ?? [])
      .filter((item) => item.type === "addon")
      .map((item, index) => ({
        id: `invoice-${booking.id}-${index}`,
        name: item.name,
        status: "pending" as const,
      }));

    const extraAddOns = (booking.extraServices ?? []).map((entry, index) => {
      const name = typeof entry === "string" ? entry : entry.serviceId;
      return {
        id: `extra-${booking.id}-${index}`,
        name,
        status: "pending" as const,
      };
    });

    const deduped = [...invoiceAddOns, ...extraAddOns].filter((item, index, allItems) => {
      return allItems.findIndex((candidate) => candidate.name === item.name) === index;
    });

    result[booking.id] = deduped;
  }

  return result;
}

function buildTaskAuditEntry(input: {
  source: TaskCompletionAuditEntry["source"];
  task: FacilityTask;
  userId: string;
  userName: string;
  note?: string;
  photoProofUrl?: string;
}): TaskCompletionAuditEntry {
  const completedAt = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    id: `task-audit-${Date.now()}-${input.task.id}`,
    source: input.source,
    staffUserId: input.userId,
    staffDisplayName: input.userName,
    completedAt,
    timezone,
    taskId: input.task.id,
    taskName: input.task.name,
    taskType: input.task.category,
    bookingId: input.task.bookingId,
    petId: input.task.petId,
    completionNote: input.note,
    photoProofUrl: input.photoProofUrl,
  };
}

function mapWorkflowTaskTypeToCategory(
  taskType: "feeding" | "medication" | "activity" | "care" | "cleanup",
): FacilityTask["category"] {
  return taskType;
}

function shiftMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function buildCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\n");
}

function generateTasksFromCustomServiceWorkflow(
  checkIns: typeof customServiceCheckIns,
  modules: CustomServiceModule[],
): FacilityTask[] {
  const moduleById = new Map(modules.map((serviceModule) => [serviceModule.id, serviceModule]));

  return checkIns.flatMap((checkIn, checkInIndex) => {
    const serviceModule = moduleById.get(checkIn.moduleId);
    if (!serviceModule) return [];

    const workflow = getModuleWorkflowQuestionnaire(serviceModule);
    if (!workflow.generatesTasks || workflow.taskTemplates.length === 0) return [];

    const start = new Date(checkIn.checkInTime);
    const checkoutBase = checkIn.checkOutTime
      ? new Date(checkIn.checkOutTime)
      : new Date(checkIn.scheduledCheckOut);

    return workflow.taskTemplates.map((template, templateIndex) => {
      let scheduledAt = start;
      if (template.timingRule === "before_start") {
        scheduledAt = shiftMinutes(start, -(template.offsetMinutes || 0));
      }
      if (template.timingRule === "after_check_out") {
        scheduledAt = shiftMinutes(checkoutBase, template.offsetMinutes || 0);
      }

      const bookingIdSeed = Number.parseInt(
        checkIn.id.replace(/[^0-9]/g, ""),
        10,
      );
      const bookingId = Number.isFinite(bookingIdSeed)
        ? bookingIdSeed
        : 900000 + checkInIndex;

      return {
        id: `csm-auto-${checkIn.id}-${template.id}-${templateIndex}`,
        bookingId,
        petId: checkIn.petId,
        petName: checkIn.petName,
        ownerName: checkIn.ownerName,
        name: template.taskName,
        description: `${checkIn.moduleName} auto-task (${template.timingRule})${template.requiresCompletionNote ? " | note required" : ""}${template.requiresPhotoProof ? " | photo required" : ""}`,
        category: mapWorkflowTaskTypeToCategory(template.taskType),
        assignmentType: "specific_staff",
        assignedToName: checkIn.staffAssigned,
        autoAssigned: true,
        scheduledDate: formatDateKey(scheduledAt),
        scheduledTime: `${`${scheduledAt.getHours()}`.padStart(2, "0")}:${`${scheduledAt.getMinutes()}`.padStart(2, "0")}`,
        shiftPeriod: inferShiftFromHour(scheduledAt.getHours()),
        status: "pending",
        isOverdue: false,
        isCritical: template.requiresPhotoProof || template.requiresCompletionNote,
      } as FacilityTask;
    });
  });
}

export function OperationsCalendar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeModules, modules, resources } = useCustomServices();

  const [userRole, setUserRole] = useState("facility_admin");
  const [userName, setUserName] = useState("Manager on Duty");
  const [userId, setUserId] = useState("facility-user");

  const [bookingRecords, setBookingRecords] = useState<Booking[]>(bookings);
  const [taskRecords, setTaskRecords] = useState<FacilityTask[]>(facilityTasks);
  const [bookingAddOnState, setBookingAddOnState] = useState<Record<number, BookingDrawerAddOnItem[]>>(
    () => mapBookingToAddOns(bookings),
  );

  const [taskCompletionAudit, setTaskCompletionAudit] = useState<TaskCompletionAuditEntry[]>([]);
  const [overdueMeta, setOverdueMeta] = useState<Record<string, OverdueMeta>>({});
  const [managerAlerts, setManagerAlerts] = useState<ManagerAlert[]>([]);
  const [calendarAuditLog, setCalendarAuditLog] = useState<CalendarAuditEntry[]>([]);
  const [clockTimestamp, setClockTimestamp] = useState(0);

  const [permissionLevel, setPermissionLevel] = useState<CalendarPermissionLevel>("admin");
  const [visibilityScope, setVisibilityScope] = useState<CalendarVisibilityScope>(
    "full-facility",
  );
  const [visibilityRoles, setVisibilityRoles] = useState<string[]>([]);

  const [axisMode, setAxisMode] = useState<CalendarAxisMode>(() => {
    return "master";
  });

  const [selectedResourceType, setSelectedResourceType] = useState<string>(() => {
    const incoming = searchParams.get("resourceType");
    if (incoming && incoming.length > 0) return incoming;
    if (typeof window === "undefined") return "pool";
    return localStorage.getItem(CALENDAR_RESOURCE_TYPE_KEY) ?? "pool";
  });

  const [showReports, setShowReports] = useState<boolean>(() => {
    return false;
  });

  const [view, setView] = useState<OperationsCalendarView>(() => {
    const incoming = searchParams.get("view");
    if (incoming === "day" || incoming === "week" || incoming === "month") {
      return incoming;
    }
    return "week";
  });

  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    return parseDateKey(searchParams.get("date")) ?? new Date();
  });

  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return searchParams.get("search") ?? "";
  });

  const [filters, setFilters] = useState<OperationsCalendarFilters>(() => ({
    ...OPERATIONS_CALENDAR_EMPTY_FILTERS,
    modules: parseCsv(searchParams.get("modules") ?? searchParams.get("services")),
  }));

  const [visualConfig, setVisualConfig] = useState<CalendarVisualConfig>(() => {
    const stored = loadStoredJson<CalendarVisualConfig>(
      VISUAL_CONFIG_KEY,
      DEFAULT_VISUAL_CONFIG,
    );

    const colorMode = searchParams.get("colorMode");
    const colorStyle = searchParams.get("colorStyle");
    const zoomLevel = searchParams.get("zoom");
    const addOnMode = searchParams.get("addonMode");
    const taskDecoration = searchParams.get("taskDecor");

    return {
      ...DEFAULT_VISUAL_CONFIG,
      ...stored,
      cardFields: {
        ...DEFAULT_VISUAL_CONFIG.cardFields,
        ...stored.cardFields,
      },
      colorMode:
        colorMode === "service-type" ||
        colorMode === "staff-member" ||
        colorMode === "status"
          ? colorMode
          : stored.colorMode ?? DEFAULT_VISUAL_CONFIG.colorMode,
      colorStyle:
        colorStyle === "stripe" || colorStyle === "full-background"
          ? colorStyle
          : stored.colorStyle ?? DEFAULT_VISUAL_CONFIG.colorStyle,
      zoomLevel:
        zoomLevel === "compact" ||
        zoomLevel === "comfortable" ||
        zoomLevel === "expanded"
          ? zoomLevel
          : stored.zoomLevel ?? DEFAULT_VISUAL_CONFIG.zoomLevel,
      addOnDisplayMode:
        addOnMode === "nested" || addOnMode === "separate"
          ? addOnMode
          : stored.addOnDisplayMode ?? DEFAULT_VISUAL_CONFIG.addOnDisplayMode,
      completedTaskDecoration:
        taskDecoration === "none" ||
        taskDecoration === "checkmark" ||
        taskDecoration === "strikethrough"
          ? taskDecoration
          : stored.completedTaskDecoration ?? DEFAULT_VISUAL_CONFIG.completedTaskDecoration,
    };
  });

  const [showFilters, setShowFilters] = useState<boolean>(() => {
    return searchParams.get("filters") === "open";
  });

  const [showConfig, setShowConfig] = useState<boolean>(() => {
    return false;
  });

  const [showEventCreator, setShowEventCreator] = useState(false);
  const [manualEventDraft, setManualEventDraft] = useState(DEFAULT_DRAFT);
  const [manualFacilityEvents, setManualFacilityEvents] = useState<ManualFacilityEvent[]>(() =>
    loadStoredJson<ManualFacilityEvent[]>(MANUAL_EVENTS_KEY, []),
  );

  const [savedViews, setSavedViews] = useState<OperationsCalendarSavedView[]>(() =>
    loadStoredJson<OperationsCalendarSavedView[]>(SAVED_VIEWS_KEY, []),
  );
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<string>("");

  const [newEventMenuOpen, setNewEventMenuOpen] = useState(false);
  const [newEventSeed, setNewEventSeed] = useState<NewEventSeed>({
    date: formatDateKey(new Date()),
    time: "09:00",
  });
  const [quickCreateNonce, setQuickCreateNonce] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [bookingTabMemory, setBookingTabMemory] = useState<Record<number, BookingDrawerTab>>({});
  const [noteStateByBooking, setNoteStateByBooking] = useState<
    Record<number, { booking: NoteSectionState; pet: NoteSectionState; customer: NoteSectionState }>
  >({});

  const initialFocusNow = useRef(searchParams.get("focus") === "now");
  const timelineRef = useRef<HTMLDivElement>(null);
  const didAutoScroll = useRef(false);

  useEffect(() => {
    const parsedRole = parseUserRoleFromCookie();
    const parsedName = parseUserNameFromCookie();
    const parsedId = parseUserIdFromCookie();
    const parsedLevel = parsePermissionLevelFromCookie(parsedRole);

    setUserRole(parsedRole);
    setUserName(parsedName);
    setUserId(parsedId);
    setPermissionLevel(parsedLevel);
    setVisibilityScope(parseVisibilityScopeFromCookie(parsedLevel));
    setVisibilityRoles(parseVisibilityRolesFromCookie());
  }, []);

  useEffect(() => {
    localStorage.setItem(VISUAL_CONFIG_KEY, JSON.stringify(visualConfig));
  }, [visualConfig]);

  useEffect(() => {
    localStorage.setItem(MANUAL_EVENTS_KEY, JSON.stringify(manualFacilityEvents));
  }, [manualFacilityEvents]);

  useEffect(() => {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  useEffect(() => {
    localStorage.setItem(CALENDAR_AXIS_KEY, axisMode);
  }, [axisMode]);

  useEffect(() => {
    localStorage.setItem(CALENDAR_RESOURCE_TYPE_KEY, selectedResourceType);
  }, [selectedResourceType]);

  const permissions = useMemo(
    () => buildPermissionSet(permissionLevel),
    [permissionLevel],
  );

  const canCreateFacilityViews = permissions.canManageFacilitySavedViews;
  const canCreateBookingShortcut = permissions.canEditBookings;

  const generatedWorkflowTasks = useMemo(
    () => generateTasksFromCustomServiceWorkflow(customServiceCheckIns, modules),
    [modules],
  );

  useEffect(() => {
    if (generatedWorkflowTasks.length === 0) return;

    setTaskRecords((previous) => {
      const existingById = new Map(previous.map((task) => [task.id, task]));
      let changed = false;

      for (const generatedTask of generatedWorkflowTasks) {
        if (!existingById.has(generatedTask.id)) {
          existingById.set(generatedTask.id, generatedTask);
          changed = true;
        }
      }

      return changed ? Array.from(existingById.values()) : previous;
    });
  }, [generatedWorkflowTasks]);

  const clientLookup = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, []);

  const allEvents = useMemo(() => {
    const merged = buildUnifiedEvents({
      bookings: bookingRecords,
      clients,
      customServiceCheckIns,
      tasks: taskRecords,
      transactions: getAllTransactions(),
      customModules: activeModules,
      facilityId: FACILITY_ID,
      view,
      addOnDisplayMode: visualConfig.addOnDisplayMode,
      manualFacilityEvents,
      viewerKey: userId,
      resources,
    });

    return sortEvents(merged);
  }, [
    activeModules,
    bookingRecords,
    manualFacilityEvents,
    taskRecords,
    userId,
    view,
    visualConfig.addOnDisplayMode,
    resources,
  ]);

  const eventLookup = useMemo(() => {
    return new Map(allEvents.map((event) => [event.id, event]));
  }, [allEvents]);

  const filterOptions = useMemo(
    () => deriveFilterOptions(allEvents, activeModules),
    [allEvents, activeModules],
  );

  const staffOptions = useMemo(() => {
    return Array.from(
      new Set(
        users
          .filter((user) => user.status === "active")
          .map((user) => user.name)
          .concat(filterOptions.staff.map((staff) => staff.value)),
      ),
    ).sort((first, second) => first.localeCompare(second));
  }, [filterOptions.staff]);

  const roleOptions = useMemo(() => {
    return Array.from(
      new Set(users.map((user) => user.role).concat(filterOptions.staffRoles.map((role) => role.value))),
    ).sort((first, second) => first.localeCompare(second));
  }, [filterOptions.staffRoles]);

  const serviceColorMap = useMemo(
    () => buildServiceColorMap(activeModules),
    [activeModules],
  );

  const resourceCalendarOptions = useMemo<ResourceCalendarOption[]>(
    () => deriveResourceCalendarOptions(allEvents, resources, activeModules),
    [activeModules, allEvents, resources],
  );

  const resourceTypeOptions = useMemo(
    () =>
      resourceCalendarOptions.map((option) => ({
        value: option.type,
        label: option.label,
      })),
    [resourceCalendarOptions],
  );

  useEffect(() => {
    if (resourceTypeOptions.length === 0) return;
    if (
      !resourceTypeOptions.some((option) => option.value === selectedResourceType)
    ) {
      setSelectedResourceType(resourceTypeOptions[0].value);
    }
  }, [resourceTypeOptions, selectedResourceType]);

  const scopedEvents = useMemo(() => {
    const roleScope = visibilityRoles.map((entry) => entry.toLowerCase());

    return allEvents.filter((event) => {
      if (visibilityScope === "full-facility") return true;

      if (visibilityScope === "own-schedule") {
        return (
          event.staff === userName ||
          event.createdByName === userName ||
          event.staff.toLowerCase() === userRole.toLowerCase()
        );
      }

      if (visibilityScope === "selected-roles") {
        if (roleScope.length === 0) return true;

        const staffRole = (event.staffRole ?? "").toLowerCase();
        const roleGroup = (event.roleGroup ?? "").toLowerCase();
        return roleScope.some(
          (role) => staffRole.includes(role) || roleGroup.includes(role),
        );
      }

      return true;
    });
  }, [allEvents, userName, userRole, visibilityRoles, visibilityScope]);

  const searchFilteredEvents = useMemo(
    () => filterEvents(scopedEvents, filters, searchTerm),
    [filters, scopedEvents, searchTerm],
  );

  const filteredEvents = useMemo(
    () =>
      searchFilteredEvents.filter((event) => {
        if (event.type === "booking" || event.type === "add-on") {
          return true;
        }

        if (event.type === "facility-event") {
          return event.service === "Custom Event";
        }

        return false;
      }),
    [searchFilteredEvents],
  );

  const selectedResourceOption = useMemo(
    () =>
      resourceCalendarOptions.find(
        (option) => option.type === selectedResourceType,
      ) ?? null,
    [resourceCalendarOptions, selectedResourceType],
  );

  const calendarWindow = useMemo(() => getViewWindow(anchorDate, view), [anchorDate, view]);

  const visibleEvents = useMemo(() => {
    return filteredEvents.filter((event) => eventIntersectsWindow(event, calendarWindow));
  }, [filteredEvents, calendarWindow]);

  const days = useMemo(() => getDaysForView(anchorDate, view), [anchorDate, view]);

  const availableSavedViews = useMemo(
    () => savedViews.filter((savedView) => canAccessSavedView(savedView, userRole)),
    [savedViews, userRole],
  );

  const recoverableDeletedEvents = useMemo(() => {
    if (clockTimestamp <= 0) return [];

    const now = clockTimestamp;
    const maxWindow = 30 * 24 * 60 * 60 * 1000;
    return manualFacilityEvents
      .filter((event) => {
        if (!event.deletedAt) return false;
        const deletedAt = new Date(event.deletedAt).getTime();
        return Number.isFinite(deletedAt) && now - deletedAt <= maxWindow;
      })
      .sort((first, second) => {
        const firstAt = new Date(first.deletedAt ?? "").getTime();
        const secondAt = new Date(second.deletedAt ?? "").getTime();
        return secondAt - firstAt;
      });
  }, [clockTimestamp, manualFacilityEvents]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("date", formatDateKey(anchorDate));

    if (searchTerm.trim().length > 0) {
      params.set("search", searchTerm.trim());
    }

    const entries: Array<["modules", string]> = [["modules", "modules"]];

    for (const [group, queryKey] of entries) {
      const values = filters[group];
      if (values.length > 0) {
        params.set(queryKey, toCsv(values));
      }
    }

    if (showFilters) {
      params.set("filters", "open");
    }

    params.set("colorMode", visualConfig.colorMode);
    params.set("colorStyle", visualConfig.colorStyle);
    params.set("zoom", visualConfig.zoomLevel);
    params.set("addonMode", visualConfig.addOnDisplayMode);
    params.set("taskDecor", visualConfig.completedTaskDecoration);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    anchorDate,
    filters,
    pathname,
    router,
    searchTerm,
    showFilters,
    view,
    visualConfig,
  ]);

  useEffect(() => {
    if (didAutoScroll.current) return;
    if (!initialFocusNow.current) return;
    if (view !== "day") return;
    if (!isSameDay(anchorDate, new Date())) return;
    if (!timelineRef.current) return;

    const now = new Date();
    const slotHeight = getTimelineSlotHeight(visualConfig.zoomLevel);
    timelineRef.current.scrollTop = Math.max(0, (now.getHours() - 1) * slotHeight);
    didAutoScroll.current = true;
  }, [anchorDate, view, visualConfig.zoomLevel]);

  useEffect(() => {
    if (!selectedEventId) return;
    if (!eventLookup.has(selectedEventId)) {
      setDrawerOpen(false);
      setSelectedEventId("");
    }
  }, [eventLookup, selectedEventId]);

  const appendAuditEntry = useCallback((
    action: CalendarAuditEntry["action"],
    details: CalendarAuditEntry["details"],
  ) => {
    setCalendarAuditLog((previous) => [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action,
        actorUserId: userId,
        actorName: userName,
        actorRole: userRole,
        timestamp: new Date().toISOString(),
        details,
      },
      ...previous,
    ]);
  }, [userId, userName, userRole]);

  useEffect(() => {
    const now = new Date();
    const nextMeta: Record<string, OverdueMeta> = { ...overdueMeta };
    let metaChanged = false;
    const freshAlerts: ManagerAlert[] = [];
    const escalationTasks: FacilityTask[] = [];
    const auditTrailEvents: Array<{
      action: CalendarAuditEntry["action"];
      details: CalendarAuditEntry["details"];
    }> = [];

    setTaskRecords((previous) => {
      let tasksChanged = false;

      const updated: FacilityTask[] = previous.map((task): FacilityTask => {
        if (task.status === "pending") {
          const dueDate = parseTaskDueDate(task);
          if (dueDate.getTime() <= now.getTime()) {
            tasksChanged = true;

            if (!nextMeta[task.id]) {
              nextMeta[task.id] = {
                alertedAt: now.toISOString(),
              };
              metaChanged = true;

              freshAlerts.push({
                id: `alert-overdue-${task.id}-${Date.now()}`,
                type: "overdue",
                message: `${task.name} for ${task.petName} is overdue (assigned: ${task.assignedToName ?? "Unassigned"})`,
                createdAt: now.toISOString(),
              });
              auditTrailEvents.push({
                action: "task_overdue",
                details: {
                  taskId: task.id,
                  taskName: task.name,
                  petName: task.petName,
                  bookingId: task.bookingId,
                },
              });

              const rule = TASK_COMPLETION_RULES[task.category];
              if (rule.createEscalationTask) {
                const escalationId = `esc-${task.id}-${Date.now()}`;
                nextMeta[task.id].escalationTaskId = escalationId;
                escalationTasks.push({
                  id: escalationId,
                  bookingId: task.bookingId,
                  petId: task.petId,
                  petName: task.petName,
                  ownerName: task.ownerName,
                  name: `Escalation: ${task.name}`,
                  description: `Auto-generated escalation for overdue task ${task.id}`,
                  category: task.category,
                  assignmentType: "specific_staff",
                  assignedToName: "Manager On Duty",
                  autoAssigned: true,
                  scheduledDate: formatDateKey(now),
                  scheduledTime: `${`${now.getHours()}`.padStart(2, "0")}:${`${now.getMinutes()}`.padStart(2, "0")}`,
                  shiftPeriod: inferShiftFromHour(now.getHours()),
                  status: "pending",
                  isOverdue: false,
                  isCritical: true,
                });

                freshAlerts.push({
                  id: `alert-escalation-${task.id}-${Date.now()}`,
                  type: "escalation",
                  message: `Escalation task created for ${task.petName}: ${task.name}`,
                  createdAt: now.toISOString(),
                });
                auditTrailEvents.push({
                  action: "escalation_task_created",
                  details: {
                    taskId: task.id,
                    escalationTaskId: escalationId,
                    petName: task.petName,
                  },
                });
              }
            }

            return {
              ...task,
              status: "overdue",
              isOverdue: true,
            };
          }
        }

        if (task.status === "overdue") {
          const meta = nextMeta[task.id];
          if (meta && !meta.reminderSentAt) {
            const rule = TASK_COMPLETION_RULES[task.category];
            const elapsedMinutes =
              (now.getTime() - new Date(meta.alertedAt).getTime()) / (60 * 1000);

            if (elapsedMinutes >= rule.overdueReminderMinutes) {
              meta.reminderSentAt = now.toISOString();
              metaChanged = true;
              freshAlerts.push({
                id: `alert-reminder-${task.id}-${Date.now()}`,
                type: "reminder",
                message: `Reminder: ${task.name} for ${task.petName} is still overdue`,
                createdAt: now.toISOString(),
              });
              auditTrailEvents.push({
                action: "escalation_notification_sent",
                details: {
                  taskId: task.id,
                  taskName: task.name,
                  petName: task.petName,
                },
              });
            }
          }
        }

        return task;
      });

      if (escalationTasks.length > 0) {
        tasksChanged = true;
      }

      return tasksChanged ? [...updated, ...escalationTasks] : previous;
    });

    if (metaChanged) {
      setOverdueMeta(nextMeta);
    }

    if (freshAlerts.length > 0) {
      setManagerAlerts((previous) => [...freshAlerts, ...previous].slice(0, 80));
    }

    if (auditTrailEvents.length > 0) {
      for (const auditEvent of auditTrailEvents) {
        appendAuditEntry(auditEvent.action, auditEvent.details);
      }
    }
  }, [appendAuditEntry, overdueMeta]);

  useEffect(() => {
    setClockTimestamp(Date.now());
    const interval = window.setInterval(() => {
      setOverdueMeta((previous) => ({ ...previous }));
      setClockTimestamp(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const renderSettings = useMemo(
    () => ({
      visualConfig,
      serviceColorMap,
    }),
    [serviceColorMap, visualConfig],
  );

  const activeCount = activeFiltersCount(filters);
  const selectedEvent = selectedEventId ? eventLookup.get(selectedEventId) ?? null : null;

  const moduleById = useMemo(
    () => new Map(activeModules.map((module) => [module.id, module])),
    [activeModules],
  );

  const moduleByName = useMemo(
    () =>
      new Map(
        activeModules.map((module) => [module.name.toLowerCase(), module]),
      ),
    [activeModules],
  );

  const selectedServiceModule = useMemo(() => {
    if (selectedEvent?.moduleId) {
      return moduleById.get(selectedEvent.moduleId);
    }

    if (selectedEvent?.module) {
      return moduleByName.get(selectedEvent.module.toLowerCase());
    }

    return undefined;
  }, [moduleById, moduleByName, selectedEvent]);

  const selectedWorkflow = useMemo(
    () =>
      selectedServiceModule
        ? getModuleWorkflowQuestionnaire(selectedServiceModule)
        : undefined,
    [selectedServiceModule],
  );

  const selectedSupportsCheckInOut =
    selectedWorkflow?.requiresCheckInOut;
  const selectedAllowsAddOns = selectedWorkflow
    ? selectedWorkflow.allowsAddOns
    : true;

  const selectedBooking = useMemo(() => {
    if (!selectedEvent?.bookingId) return undefined;
    return bookingRecords.find((booking) => booking.id === selectedEvent.bookingId);
  }, [bookingRecords, selectedEvent]);

  const selectedTask = useMemo(() => {
    if (!selectedEvent || selectedEvent.type !== "task") return undefined;
    return taskRecords.find((task) => task.id === selectedEvent.sourceId);
  }, [selectedEvent, taskRecords]);

  const selectedClient = useMemo<Client | undefined>(() => {
    if (!selectedBooking) return undefined;
    return clientLookup.get(selectedBooking.clientId);
  }, [clientLookup, selectedBooking]);

  const selectedPet = useMemo<Pet | undefined>(() => {
    if (!selectedBooking || !selectedClient) return undefined;
    const selectedBookingPetId = getPrimaryPetId(selectedBooking.petId);
    if (selectedBookingPetId === undefined) return undefined;
    return selectedClient.pets.find((pet) => pet.id === selectedBookingPetId);
  }, [selectedBooking, selectedClient]);

  const selectedBookingTasks = useMemo(() => {
    if (!selectedBooking) return [];
    return taskRecords
      .filter((task) => task.bookingId === selectedBooking.id)
      .sort((first, second) => {
        const firstDue = parseTaskDueDate(first).getTime();
        const secondDue = parseTaskDueDate(second).getTime();
        return firstDue - secondDue;
      });
  }, [selectedBooking, taskRecords]);

  const selectedTaskSeries = useMemo(() => {
    if (!selectedTask) return [];

    return taskRecords
      .filter(
        (task) =>
          task.id !== selectedTask.id &&
          task.petId === selectedTask.petId &&
          task.name === selectedTask.name,
      )
      .sort((first, second) => parseTaskDueDate(first).getTime() - parseTaskDueDate(second).getTime());
  }, [selectedTask, taskRecords]);

  const selectedBookingAddOns = selectedBooking
    ? bookingAddOnState[selectedBooking.id] ?? []
    : [];

  useEffect(() => {
    if (!selectedBooking) return;

    const selectedBookingPetId = getPrimaryPetId(selectedBooking.petId);

    setNoteStateByBooking((previous) => {
      if (previous[selectedBooking.id]) return previous;

      return {
        ...previous,
        [selectedBooking.id]: {
          booking: {
            content: getBookingNotes(selectedBooking.id),
            lastEditedBy: "System",
            lastEditedAt: "",
          },
          pet: {
            content: getPetNotes(selectedBookingPetId),
            lastEditedBy: "System",
            lastEditedAt: "",
          },
          customer: {
            content: getCustomerNotes(selectedBooking.clientId),
            lastEditedBy: "System",
            lastEditedAt: "",
          },
        },
      };
    });
  }, [selectedBooking]);

  const selectedNotesState =
    selectedBooking && noteStateByBooking[selectedBooking.id]
      ? noteStateByBooking[selectedBooking.id]
      : createDefaultNotesState();

  const activeBookingTab: BookingDrawerTab = selectedBooking
    ? bookingTabMemory[selectedBooking.id] ?? "summary"
    : "summary";

  useEffect(() => {
    if (showReports && !permissions.canViewAudit) {
      setShowReports(false);
    }
  }, [permissions.canViewAudit, showReports]);

  useEffect(() => {
    if (showConfig && !permissions.canConfigureCalendar) {
      setShowConfig(false);
    }
  }, [permissions.canConfigureCalendar, showConfig]);

  const reportDailySummary = useMemo(() => {
    const reportDateKey = formatDateKey(anchorDate);
    const todaysBookings = bookingRecords.filter(
      (booking) => booking.startDate === reportDateKey,
    );
    const todaysTasks = taskRecords.filter((task) => task.scheduledDate === reportDateKey);
    const todaysManualEvents = manualFacilityEvents.filter(
      (event) => !event.deletedAt && event.start.startsWith(reportDateKey),
    );

    return {
      dateLabel: anchorDate.toLocaleDateString(),
      bookingsScheduled: todaysBookings.length,
      checkedIn: todaysBookings.filter((booking) => booking.status === "in_progress").length,
      checkedOut: todaysBookings.filter((booking) => booking.status === "completed").length,
      cancelled: todaysBookings.filter((booking) => booking.status === "cancelled").length,
      tasksDue: todaysTasks.length,
      overdueTasks: todaysTasks.filter((task) => task.status === "overdue").length,
      facilityEvents: todaysManualEvents.length,
    };
  }, [anchorDate, bookingRecords, manualFacilityEvents, taskRecords]);

  const reportTaskCompletionMetrics = useMemo(() => {
    const metricMap = new Map<
      string,
      {
        staffName: string;
        completedCount: number;
        withNoteCount: number;
        withPhotoCount: number;
      }
    >();

    for (const auditEntry of taskCompletionAudit) {
      const completedAt = new Date(auditEntry.completedAt).getTime();
      if (
        completedAt < calendarWindow.start.getTime() ||
        completedAt > calendarWindow.end.getTime()
      ) {
        continue;
      }

      const existing = metricMap.get(auditEntry.staffDisplayName) ?? {
        staffName: auditEntry.staffDisplayName,
        completedCount: 0,
        withNoteCount: 0,
        withPhotoCount: 0,
      };

      existing.completedCount += 1;
      if (auditEntry.completionNote) existing.withNoteCount += 1;
      if (auditEntry.photoProofUrl) existing.withPhotoCount += 1;
      metricMap.set(auditEntry.staffDisplayName, existing);
    }

    return Array.from(metricMap.values()).sort(
      (first, second) => second.completedCount - first.completedCount,
    );
  }, [calendarWindow.end, calendarWindow.start, taskCompletionAudit]);

  const reportOverdueSummary = useMemo(() => {
    const now = clockTimestamp;
    return {
      overdueOpen: taskRecords.filter((task) => {
        if (task.status === "overdue") return true;
        if (task.status !== "pending") return false;
        return parseTaskDueDate(task).getTime() < now;
      }).length,
      escalationOpen: taskRecords.filter(
        (task) =>
          task.status !== "completed" && task.name.toLowerCase().startsWith("escalation:"),
      ).length,
      managerAlerts: managerAlerts.length,
    };
  }, [clockTimestamp, managerAlerts.length, taskRecords]);

  const reportServiceUtilization = useMemo(() => {
    const aggregate = new Map<
      string,
      { key: string; label: string; eventCount: number; scheduledMinutes: number }
    >();

    const reportWindowMinutes = Math.max(
      1,
      Math.round(
        (calendarWindow.end.getTime() - calendarWindow.start.getTime()) /
          (60 * 1000),
      ),
    );

    for (const event of visibleEvents) {
      const boundedStart = Math.max(event.start.getTime(), calendarWindow.start.getTime());
      const boundedEnd = Math.min(event.end.getTime(), calendarWindow.end.getTime());
      const durationMinutes = Math.max(
        0,
        Math.round((boundedEnd - boundedStart) / (60 * 1000)),
      );
      if (durationMinutes === 0) continue;

      const label = event.module || event.service || "Unspecified";
      const key = label.toLowerCase();
      const existing = aggregate.get(key) ?? {
        key,
        label,
        eventCount: 0,
        scheduledMinutes: 0,
      };
      existing.eventCount += 1;
      existing.scheduledMinutes += durationMinutes;
      aggregate.set(key, existing);
    }

    return Array.from(aggregate.values())
      .map((row) => ({
        ...row,
        utilizationPercent: (row.scheduledMinutes / reportWindowMinutes) * 100,
      }))
      .sort((first, second) => second.scheduledMinutes - first.scheduledMinutes);
  }, [calendarWindow.end, calendarWindow.start, visibleEvents]);

  const reportResourceUtilization = useMemo(() => {
    const aggregate = new Map<
      string,
      { key: string; label: string; eventCount: number; scheduledMinutes: number }
    >();

    const reportWindowMinutes = Math.max(
      1,
      Math.round(
        (calendarWindow.end.getTime() - calendarWindow.start.getTime()) /
          (60 * 1000),
      ),
    );

    for (const event of visibleEvents) {
      if (!event.resource) continue;

      const boundedStart = Math.max(event.start.getTime(), calendarWindow.start.getTime());
      const boundedEnd = Math.min(event.end.getTime(), calendarWindow.end.getTime());
      const durationMinutes = Math.max(
        0,
        Math.round((boundedEnd - boundedStart) / (60 * 1000)),
      );
      if (durationMinutes === 0) continue;

      const typeLabel = event.resourceType ?? "resource";
      const key = `${typeLabel.toLowerCase()}-${event.resource}`;
      const label = `${event.resource} (${typeLabel})`;
      const existing = aggregate.get(key) ?? {
        key,
        label,
        eventCount: 0,
        scheduledMinutes: 0,
      };
      existing.eventCount += 1;
      existing.scheduledMinutes += durationMinutes;
      aggregate.set(key, existing);
    }

    return Array.from(aggregate.values())
      .map((row) => ({
        ...row,
        utilizationPercent: (row.scheduledMinutes / reportWindowMinutes) * 100,
      }))
      .sort((first, second) => second.scheduledMinutes - first.scheduledMinutes);
  }, [calendarWindow.end, calendarWindow.start, visibleEvents]);

  const onExportReport = (
    scope:
      | "daily-ops"
      | "task-completion"
      | "overdue"
      | "service-utilization"
      | "resource-utilization"
      | "audit-log",
  ) => {
    if (!permissions.canViewAudit) {
      toast.error("Manager or admin access is required to export reports");
      return;
    }

    let csvContent = "";

    if (scope === "daily-ops") {
      csvContent = buildCsv(
        [
          "date",
          "bookingsScheduled",
          "checkedIn",
          "checkedOut",
          "cancelled",
          "tasksDue",
          "overdueTasks",
          "facilityEvents",
        ],
        [
          [
            reportDailySummary.dateLabel,
            reportDailySummary.bookingsScheduled,
            reportDailySummary.checkedIn,
            reportDailySummary.checkedOut,
            reportDailySummary.cancelled,
            reportDailySummary.tasksDue,
            reportDailySummary.overdueTasks,
            reportDailySummary.facilityEvents,
          ],
        ],
      );
    }

    if (scope === "task-completion") {
      csvContent = buildCsv(
        ["staffName", "completedCount", "withNoteCount", "withPhotoCount"],
        reportTaskCompletionMetrics.map((row) => [
          row.staffName,
          row.completedCount,
          row.withNoteCount,
          row.withPhotoCount,
        ]),
      );
    }

    if (scope === "overdue") {
      csvContent = buildCsv(
        ["overdueOpen", "escalationOpen", "managerAlerts"],
        [[reportOverdueSummary.overdueOpen, reportOverdueSummary.escalationOpen, reportOverdueSummary.managerAlerts]],
      );
    }

    if (scope === "service-utilization") {
      csvContent = buildCsv(
        ["service", "eventCount", "scheduledMinutes", "utilizationPercent"],
        reportServiceUtilization.map((row) => [
          row.label,
          row.eventCount,
          row.scheduledMinutes,
          row.utilizationPercent,
        ]),
      );
    }

    if (scope === "resource-utilization") {
      csvContent = buildCsv(
        ["resource", "eventCount", "scheduledMinutes", "utilizationPercent"],
        reportResourceUtilization.map((row) => [
          row.label,
          row.eventCount,
          row.scheduledMinutes,
          row.utilizationPercent,
        ]),
      );
    }

    if (scope === "audit-log") {
      csvContent = buildCsv(
        ["id", "action", "actorName", "actorRole", "timestamp", "details"],
        calendarAuditLog.map((row) => [
          row.id,
          row.action,
          row.actorName,
          row.actorRole,
          row.timestamp,
          JSON.stringify(row.details),
        ]),
      );
    }

    const fileName = `calendar-report-${scope}-${formatDateKey(new Date())}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${scope} report`);
  };

  const updateFilterGroup = (group: "modules", value: string) => {
    setFilters((previous) => {
      const selected = previous[group] as string[];
      const nextValues = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];

      return {
        ...previous,
        [group]: nextValues,
      };
    });
  };

  const clearAllFilters = () => {
    setFilters(OPERATIONS_CALENDAR_EMPTY_FILTERS);
  };

  const setToday = () => {
    setAnchorDate(new Date());
  };

  const onDateChange = (nextDate: string | "") => {
    const parsed = parseDateKey(nextDate || null);
    if (parsed) {
      setAnchorDate(parsed);
    }
  };

  const toggleCardField = (fieldKey: CalendarCardFieldKey) => {
    setVisualConfig((previous) => ({
      ...previous,
      cardFields: {
        ...previous.cardFields,
        [fieldKey]: !previous.cardFields[fieldKey],
      },
    }));
  };

  const createManualFacilityEvent = () => {
    if (!permissions.canCreateCustomEvents) {
      toast.error("You do not have permission to create custom events");
      return;
    }

    if (manualEventDraft.title.trim().length === 0) {
      return;
    }

    const event: ManualFacilityEvent = {
      id: `manual-${Date.now()}`,
      title: manualEventDraft.title.trim(),
      subtype: manualEventDraft.subtype,
      start: `${manualEventDraft.date}T${manualEventDraft.startTime}:00`,
      end: `${manualEventDraft.date}T${manualEventDraft.endTime}:00`,
      allDay: manualEventDraft.allDay,
      location: manualEventDraft.location,
      staff: manualEventDraft.staff,
      status: "Scheduled",
      privateToUser: manualEventDraft.privateToUser ? userId : undefined,
      createdAt: new Date().toISOString(),
      createdByRole: userRole,
      createdByName: userName,
    };

    setManualFacilityEvents((previous) => [event, ...previous]);
    setManualEventDraft(DEFAULT_DRAFT);
    appendAuditEntry("custom_event_created", {
      eventId: event.id,
      title: event.title,
      subtype: event.subtype,
    });
    toast.success("Facility event created");
  };

  const appendCustomEvent = (event: ManualFacilityEvent) => {
    if (!permissions.canCreateCustomEvents) {
      toast.error("You do not have permission to create custom events");
      return;
    }

    const eventId = event.id;
    setManualFacilityEvents((previous) => [
      {
        ...event,
        createdAt: new Date().toISOString(),
        createdByRole: userRole,
        createdByName: userName,
        privateToUser: event.visibility === "internal-only" ? userId : undefined,
      },
      ...previous,
    ]);
    appendAuditEntry("custom_event_created", {
      eventId,
      title: event.title,
      subtype: event.subtype,
    });
    toast.success("Custom event added to calendar");
  };

  const appendBlockTime = (event: ManualFacilityEvent) => {
    if (!permissions.canCreateBlockTime) {
      toast.error("You do not have permission to create block time");
      return;
    }

    const eventId = event.id;
    setManualFacilityEvents((previous) => [
      {
        ...event,
        visibility: "all-staff",
        createdAt: new Date().toISOString(),
        createdByRole: userRole,
        createdByName: userName,
      },
      ...previous,
    ]);
    appendAuditEntry("block_time_created", {
      eventId,
      title: event.title,
      location: event.location,
      start: event.start,
      end: event.end,
    });
    toast.success("Block time created");
  };

  const recoverLastDeletedEvent = () => {
    if (!permissions.canRecoverDeletedEvents) {
      toast.error("Only admins can recover deleted custom events");
      return;
    }

    const latest = recoverableDeletedEvents[0];
    if (!latest) {
      toast.info("No deleted events available for recovery");
      return;
    }

    setManualFacilityEvents((previous) =>
      previous.map((item) =>
        item.id === latest.id
          ? {
              ...item,
              deletedAt: undefined,
            }
          : item,
      ),
    );

    appendAuditEntry("custom_event_created", {
      eventId: latest.id,
      title: latest.title,
      restored: true,
    });

    toast.success(`Recovered ${latest.title}`);
  };

  const saveCurrentView = (scope: "personal" | "facility") => {
    if (scope === "facility" && !permissions.canManageFacilitySavedViews) {
      toast.error("You do not have permission to create facility saved views");
      return;
    }

    const name = window.prompt("Saved view name", "My saved view");
    if (!name || name.trim().length === 0) {
      return;
    }

    let sharedRoles: string[] = [];
    if (scope === "facility") {
      const rawRoles = window.prompt(
        "Share with roles (comma separated, optional)",
        "front desk, kennel tech, groomer",
      );
      sharedRoles = rawRoles
        ? rawRoles
            .split(",")
            .map((role) => role.trim())
            .filter((role) => role.length > 0)
        : [];
    }

    const savedView: OperationsCalendarSavedView = {
      id: `saved-view-${Date.now()}`,
      name: name.trim(),
      scope,
      sharedRoles,
      view,
      searchTerm,
      filters,
      visualConfig,
      createdAt: new Date().toISOString(),
      createdByRole: userRole,
    };

    setSavedViews((previous) => [savedView, ...previous]);
    setSelectedSavedViewId(savedView.id);
    appendAuditEntry("saved_view_created", {
      viewId: savedView.id,
      name: savedView.name,
      scope: savedView.scope,
    });
    toast.success("Saved view created");
  };

  const applySavedView = (savedViewId: string) => {
    setSelectedSavedViewId(savedViewId);
    const savedView = availableSavedViews.find((candidate) => candidate.id === savedViewId);
    if (!savedView) return;

    setView(
      savedView.view === "day" || savedView.view === "week" || savedView.view === "month"
        ? savedView.view
        : "week",
    );
    setSearchTerm(savedView.searchTerm);
    setFilters({
      ...OPERATIONS_CALENDAR_EMPTY_FILTERS,
      modules:
        savedView.filters.modules.length > 0
          ? savedView.filters.modules
          : savedView.filters.services,
    });
    setVisualConfig({
      ...DEFAULT_VISUAL_CONFIG,
      ...savedView.visualConfig,
      cardFields: {
        ...DEFAULT_VISUAL_CONFIG.cardFields,
        ...savedView.visualConfig.cardFields,
      },
    });
  };

  const deleteSavedView = (savedViewId: string) => {
    const targetView = availableSavedViews.find((viewItem) => viewItem.id === savedViewId);
    if (!targetView) {
      return;
    }

    if (
      targetView.scope === "facility" &&
      !permissions.canManageFacilitySavedViews
    ) {
      toast.error("You do not have permission to delete facility saved views");
      return;
    }

    setSavedViews((previous) => previous.filter((viewItem) => viewItem.id !== savedViewId));
    if (selectedSavedViewId === savedViewId) {
      setSelectedSavedViewId("");
    }
    appendAuditEntry("saved_view_deleted", {
      viewId: savedViewId,
    });
    toast.success("Saved view deleted");
  };

  const openEventDrawer = (event: OperationsCalendarEvent) => {
    if ((event.type === "booking" || event.type === "add-on") && event.bookingId) {
      router.push(`/facility/dashboard/bookings?bookingId=${event.bookingId}`);
      return;
    }

    setSelectedEventId(event.id);
    setDrawerOpen(true);

    if (event.type === "booking" && event.bookingId) {
      setBookingTabMemory((previous) => ({
        ...previous,
        [event.bookingId as number]: previous[event.bookingId as number] ?? "summary",
      }));
    }
  };

  const markTaskComplete = (
    taskId: string,
    options?: {
      allowEarly?: boolean;
      source?: TaskCompletionAuditEntry["source"];
      bypassPrompts?: boolean;
      completionNote?: string;
    },
  ) => {
    if (!permissions.canCompleteTasks) {
      toast.error("You do not have permission to complete tasks from calendar");
      return;
    }

    const source = options?.source ?? "calendar-drawer";
    let auditEntry: TaskCompletionAuditEntry | null = null;
    let didUpdate = false;

    setTaskRecords((previous) => {
      const target = previous.find((task) => task.id === taskId);
      if (!target) return previous;
      if (target.status === "completed") return previous;

      const dueDate = parseTaskDueDate(target);
      if (options?.allowEarly && dueDate.getTime() > Date.now()) {
        const confirmed = window.confirm(
          "This occurrence is scheduled for the future. Mark complete early?",
        );
        if (!confirmed) {
          return previous;
        }
      }

      const rule = TASK_COMPLETION_RULES[target.category];
      let completionNote = options?.completionNote ?? "";
      let photoProofUrl = "";

      if (!options?.bypassPrompts) {
        if (rule.noteRequired) {
          completionNote =
            window.prompt("Completion note is required for this task", completionNote) ?? "";
          if (!completionNote.trim()) {
            toast.error("Completion note is required");
            return previous;
          }
        } else if (target.status === "overdue") {
          completionNote =
            window.prompt("Add completion note (optional)", completionNote) ?? completionNote;
        }

        if (rule.photoRequired) {
          photoProofUrl =
            window.prompt(
              "Photo proof URL is required for this task type",
              "https://",
            ) ?? "";
          if (!photoProofUrl.trim()) {
            toast.error("Photo proof is required");
            return previous;
          }
        }
      }

      const completionTime = new Date().toISOString();
      didUpdate = true;

      auditEntry = buildTaskAuditEntry({
        source,
        task: target,
        userId,
        userName,
        note: completionNote || undefined,
        photoProofUrl: photoProofUrl || undefined,
      });

      return previous.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "completed",
              isOverdue: false,
              completedAt: completionTime,
              completedByName: userName,
              completionNotes: completionNote || task.completionNotes,
            }
          : task,
      );
    });

    if (!didUpdate || !auditEntry) return;

    const finalizedAuditEntry: TaskCompletionAuditEntry = auditEntry;
    setTaskCompletionAudit((previous) => [finalizedAuditEntry, ...previous]);
    appendAuditEntry("task_completed", {
      taskId: finalizedAuditEntry.taskId,
      taskName: finalizedAuditEntry.taskName,
      bookingId: finalizedAuditEntry.bookingId,
      source,
    });
    setOverdueMeta((previous) => {
      if (!previous[taskId]) return previous;
      const next = { ...previous };
      delete next[taskId];
      return next;
    });

    const bookingNote =
      finalizedAuditEntry.bookingId &&
      (finalizedAuditEntry.completionNote || finalizedAuditEntry.photoProofUrl)
        ? {
            bookingId: finalizedAuditEntry.bookingId,
            note: `Task ${finalizedAuditEntry.taskName} completed by ${userName}${finalizedAuditEntry.completionNote ? ` | Note: ${finalizedAuditEntry.completionNote}` : ""}${finalizedAuditEntry.photoProofUrl ? ` | Proof: ${finalizedAuditEntry.photoProofUrl}` : ""}`,
          }
        : null;

    if (bookingNote) {
      setNoteStateByBooking((previous) => {
        const existing = previous[bookingNote.bookingId] ?? createDefaultNotesState();
        return {
          ...previous,
          [bookingNote.bookingId]: {
            ...existing,
            booking: {
              content: `${existing.booking.content}\n${bookingNote.note}`.trim(),
              lastEditedBy: userName,
              lastEditedAt: new Date().toISOString(),
            },
          },
        };
      });
    }

    toast.success("Task marked complete");
  };

  const markAllBookingTasksComplete = (bookingId: number) => {
    if (!permissions.canCompleteTasks) {
      toast.error("You do not have permission to complete tasks from calendar");
      return;
    }

    const bookingTaskItems = taskRecords.filter(
      (task) => task.bookingId === bookingId && task.status !== "completed",
    );

    if (bookingTaskItems.length === 0) {
      toast.info("No open tasks for this booking");
      return;
    }

    const hasOverdue = bookingTaskItems.some((task) => task.status === "overdue");
    if (hasOverdue) {
      const confirmed = window.confirm(
        "Some tasks are overdue. Mark all open tasks complete?",
      );
      if (!confirmed) return;
    }

    for (const bookingTaskItem of bookingTaskItems) {
      markTaskComplete(bookingTaskItem.id, {
        bypassPrompts: true,
        source: "task-engine",
        completionNote: "Bulk completion from booking drawer",
      });
    }
  };

  const checkInBooking = (bookingId: number) => {
    if (!permissions.canCheckInOut) {
      toast.error("You do not have permission to check in from calendar");
      return;
    }

    setBookingRecords((previous) =>
      previous.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "in_progress",
            }
          : booking,
      ),
    );
    appendAuditEntry("booking_checkin", { bookingId });
    toast.success(`Checked in by ${toDisplayRole(userRole)}`);
  };

  const checkOutBooking = (bookingId: number) => {
    if (!permissions.canCheckInOut) {
      toast.error("You do not have permission to check out from calendar");
      return;
    }

    const booking = bookingRecords.find((entry) => entry.id === bookingId);
    if (!booking) return;

    if ((booking.invoice?.remainingDue ?? 0) > 0) {
      const openInvoice = window.confirm(
        "Outstanding balance exists. Open invoice in POS after check-out?",
      );
      if (openInvoice) {
        window.open(`/facility/dashboard/services/retail?bookingId=${bookingId}`, "_blank");
      }
    }

    setBookingRecords((previous) =>
      previous.map((entry) =>
        entry.id === bookingId
          ? {
              ...entry,
              status: "completed",
            }
          : entry,
      ),
    );

    appendAuditEntry("booking_checkout", { bookingId });
    toast.success(`Checked out by ${toDisplayRole(userRole)}`);
  };

  const assignBookingStaff = (bookingId: number, primary: string, secondary?: string) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to reassign bookings");
      return;
    }

    setBookingRecords((previous) =>
      previous.map((booking) => {
        if (booking.id !== bookingId) return booking;

        if (booking.service.toLowerCase() === "training") {
          return {
            ...booking,
            trainerId: primary === "Unassigned" ? undefined : primary,
          };
        }

        return {
          ...booking,
          stylistPreference: primary === "Unassigned" ? undefined : primary,
          trainerId: secondary || booking.trainerId,
        };
      }),
    );

    appendAuditEntry("booking_edited", {
      bookingId,
      primaryStaff: primary,
      secondaryStaff: secondary,
      field: "staff-assignment",
    });
    toast.success("Staff assignment updated");
  };

  const addBookingTask = (bookingId: number, task: Partial<FacilityTask>) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to add tasks from booking drawer");
      return;
    }

    const booking = bookingRecords.find((entry) => entry.id === bookingId);
    if (!booking) return;

    const bookingPetId = getPrimaryPetId(booking.petId);
    if (bookingPetId === undefined) {
      toast.error("Unable to add task: booking is missing a primary pet");
      return;
    }

    const now = new Date();
    const scheduledDate = booking.startDate || formatDateKey(now);
    const nextTask: FacilityTask = {
      id: `ft-${Date.now()}`,
      bookingId,
      petId: bookingPetId,
      petName:
        clients
          .flatMap((client) => client.pets)
          .find((pet) => pet.id === bookingPetId)?.name ?? "Pet",
      ownerName: clients.find((client) => client.id === booking.clientId)?.name ?? "Owner",
      name: task.name ?? "New task",
      description: task.description,
      category: task.category ?? "care",
      assignmentType: task.assignedToName ? "specific_staff" : "unassigned",
      assignedToName: task.assignedToName,
      autoAssigned: false,
      scheduledDate,
      scheduledTime: task.scheduledTime ?? "10:00",
      shiftPeriod: inferShiftFromHour(Number((task.scheduledTime ?? "10:00").split(":")[0])),
      status: "pending",
      isOverdue: false,
      isCritical: false,
    };

    setTaskRecords((previous) => [nextTask, ...previous]);
    appendAuditEntry("booking_edited", {
      bookingId,
      field: "task-added",
      taskId: nextTask.id,
      taskName: nextTask.name,
    });
    toast.success("Task linked to booking");
  };

  const addBookingAddOn = (bookingId: number, addOn: BookingDrawerAddOnItem) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to modify add-ons");
      return;
    }

    setBookingAddOnState((previous) => ({
      ...previous,
      [bookingId]: [addOn, ...(previous[bookingId] ?? [])],
    }));

    setBookingRecords((previous) =>
      previous.map((booking) => {
        if (booking.id !== bookingId) return booking;

        const extras = booking.extraServices ?? [];
        if (extras.some((entry) => (typeof entry === "string" ? entry : entry.serviceId) === addOn.name)) {
          return booking;
        }

        return {
          ...booking,
          extraServices: [...extras, addOn.name],
        };
      }),
    );

    appendAuditEntry("booking_edited", {
      bookingId,
      field: "addon-added",
      addOnName: addOn.name,
    });
    toast.success("Add-on attached to booking");
  };

  const updateBookingAddOn = (
    bookingId: number,
    addOnId: string,
    updates: Partial<BookingDrawerAddOnItem>,
  ) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to modify add-ons");
      return;
    }

    setBookingAddOnState((previous) => ({
      ...previous,
      [bookingId]: (previous[bookingId] ?? []).map((item) =>
        item.id === addOnId
          ? {
              ...item,
              ...updates,
            }
          : item,
      ),
    }));

    appendAuditEntry("booking_edited", {
      bookingId,
      field: "addon-updated",
      addOnId,
    });
  };

  const removeBookingAddOn = (bookingId: number, addOnId: string) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to modify add-ons");
      return;
    }

    const removedName = bookingAddOnState[bookingId]?.find((item) => item.id === addOnId)?.name;

    setBookingAddOnState((previous) => ({
      ...previous,
      [bookingId]: (previous[bookingId] ?? []).filter((item) => item.id !== addOnId),
    }));

    if (removedName) {
      setBookingRecords((previous) =>
        previous.map((booking) => {
          if (booking.id !== bookingId) return booking;

          return {
            ...booking,
            extraServices: (booking.extraServices ?? []).filter((entry) => {
              const name = typeof entry === "string" ? entry : entry.serviceId;
              return name !== removedName;
            }),
          };
        }),
      );
    }

    appendAuditEntry("booking_edited", {
      bookingId,
      field: "addon-removed",
      addOnId,
      addOnName: removedName,
    });
    toast.success("Add-on removed");
  };

  const updateNotes = (
    section: "booking" | "pet" | "customer",
    content: string,
    editorName: string,
  ) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to update booking notes");
      return;
    }

    if (!selectedBooking) return;

    setNoteStateByBooking((previous) => {
      const existing = previous[selectedBooking.id] ?? createDefaultNotesState();
      return {
        ...previous,
        [selectedBooking.id]: {
          ...existing,
          [section]: {
            content,
            lastEditedBy: editorName,
            lastEditedAt: new Date().toISOString(),
          },
        },
      };
    });

    appendAuditEntry("booking_edited", {
      bookingId: selectedBooking.id,
      field: `${section}-notes-updated`,
      editorName,
    });
    toast.success("Notes updated");
  };

  const messageCustomer = (bookingId: number) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to message customers from calendar");
      return;
    }

    const booking = bookingRecords.find((entry) => entry.id === bookingId);
    if (!booking) return;

    const customer = clientLookup.get(booking.clientId);
    window.open(
      `/facility/dashboard/communications?clientId=${booking.clientId}&bookingId=${bookingId}`,
      "_blank",
    );

    appendAuditEntry("booking_edited", {
      bookingId,
      field: "customer-message-opened",
      clientId: booking.clientId,
    });
    toast.success(`Messaging panel opened for ${customer?.name ?? "customer"}`);
  };

  const rescheduleBooking = (bookingId: number) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to reschedule bookings");
      return;
    }

    window.open(`/facility/dashboard/bookings?bookingId=${bookingId}&mode=reschedule`, "_blank");
    appendAuditEntry("booking_rescheduled", {
      bookingId,
      source: "calendar-reschedule-shortcut",
    });
    toast.info("Reschedule flow opened");
  };

  const cancelBooking = (bookingId: number, reason: string) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to cancel bookings");
      return;
    }

    const confirmed = window.confirm(
      `Cancellation reason: ${reason}\n\nCancellation policy and refund eligibility will be reviewed before confirmation. Continue?`,
    );
    if (!confirmed) return;

    setBookingRecords((previous) =>
      previous.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "cancelled",
            }
          : booking,
      ),
    );

    appendAuditEntry("booking_cancelled", {
      bookingId,
      reason,
      source: "calendar-drawer",
    });
    toast.success("Booking cancelled");
  };

  const updateManualEvent = (eventId: string, updates: Partial<ManualFacilityEvent>) => {
    if (!permissions.canCreateCustomEvents) {
      toast.error("You do not have permission to edit custom events");
      return;
    }

    const existing = manualFacilityEvents.find((event) => event.id === eventId);
    if (!existing || existing.deletedAt) {
      toast.error("Event was not found or is already deleted");
      return;
    }

    setManualFacilityEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              ...updates,
            }
          : event,
      ),
    );

    appendAuditEntry("custom_event_edited", {
      eventId,
      title: updates.title ?? existing.title,
      subtype: existing.subtype,
    });
    toast.success("Event updated");
  };

  const deleteManualEvent = (eventId: string) => {
    if (!permissions.canCreateCustomEvents) {
      toast.error("You do not have permission to delete custom events");
      return;
    }

    const existing = manualFacilityEvents.find((event) => event.id === eventId);
    if (!existing || existing.deletedAt) {
      toast.error("Event was not found or is already deleted");
      return;
    }

    setManualFacilityEvents((previous) =>
      previous.map((event) =>
        event.id === eventId
          ? {
              ...event,
              deletedAt: new Date().toISOString(),
            }
          : event,
      ),
    );

    appendAuditEntry(
      existing.subtype === "blocked-time"
        ? "block_time_removed"
        : "custom_event_deleted",
      {
        eventId,
        title: existing.title,
        subtype: existing.subtype,
      },
    );

    toast.success("Event deleted (recoverable for 30 days)");
    setDrawerOpen(false);
  };

  const openLinkedBookingFromTask = (bookingId: number) => {
    const bookingEvent = allEvents.find(
      (event) => event.type === "booking" && event.bookingId === bookingId,
    );

    if (!bookingEvent) {
      toast.error("Linked booking is not visible in this calendar range");
      return;
    }

    openEventDrawer(bookingEvent);
  };

  const onSlotCreate = (slot: Date) => {
    setNewEventSeed({
      date: formatDateKey(slot),
      time: `${`${slot.getHours()}`.padStart(2, "0")}:${`${slot.getMinutes()}`.padStart(2, "0")}`,
    });
    setQuickCreateNonce((current) => current + 1);
  };

  const onCreateBookingShortcut = (seed: NewEventSeed) => {
    if (!permissions.canEditBookings) {
      toast.error("You do not have permission to create bookings from calendar");
      return;
    }

    const params = new URLSearchParams({
      create: "1",
      date: seed.date,
      time: seed.time,
    });

    if (axisMode === "resource" && selectedResourceOption) {
      const defaultResourceName = selectedResourceOption.resources[0]?.name;
      const resourceName =
        window.prompt("Assign resource for this booking", defaultResourceName ?? "")?.trim() ?? "";

      if (resourceName.length > 0) {
        const start = new Date(`${seed.date}T${seed.time}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const conflict = findResourceConflict(allEvents, {
          start,
          end,
          resourceName,
          resourceType: selectedResourceType,
        });

        if (conflict.hasConflict) {
          if (!permissions.canOverrideResourceConflict) {
            toast.error(
              `Resource already booked (${conflict.conflictingEvent?.title ?? "existing event"}). Manager or admin override required.`,
            );
            return;
          }

          const approved = window.confirm(
            `Resource ${resourceName} is already booked for this time. Override and continue?`,
          );
          if (!approved) {
            return;
          }

          appendAuditEntry("resource_conflict_override", {
            resourceName,
            resourceType: selectedResourceType,
            conflictedEventId: conflict.conflictingEvent?.id,
            conflictedEventTitle: conflict.conflictingEvent?.title,
            requestedDate: seed.date,
            requestedTime: seed.time,
          });
        }

        params.set("resource", resourceName);
        params.set("resourceType", selectedResourceType);
      }
    }

    appendAuditEntry("booking_created", {
      source: "calendar-shortcut",
      date: seed.date,
      time: seed.time,
      axisMode,
    });
    window.open(`/facility/dashboard/bookings?${params.toString()}`, "_blank");
    toast.info("Booking creation flow opened");
  };

  const rangeLabel = formatRangeLabel(anchorDate, view);

  return (
    <div className="flex bg-slate-50 min-h-[calc(100vh-4rem)] animate-in fade-in duration-700 ease-in-out">
      {/* Left sidebar: mini calendar + stats */}
      <OperationsCalendarSidePanel
        anchorDate={anchorDate}
        view={view}
        allEvents={allEvents}
        visibleEvents={visibleEvents}
        serviceColorMap={serviceColorMap}
        onDateChange={onDateChange}
      />

      {/* Main calendar area */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4 p-4 pt-6 md:p-6 overflow-auto">
        <OperationsCalendarToolbar
          view={view}
          onViewChange={setView}
          onToday={setToday}
          onStep={(direction) =>
            setAnchorDate((current) => stepAnchorDate(current, view, direction))
          }
          rangeLabel={rangeLabel}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((previous) => !previous)}
          activeFilterCount={activeCount}
          newEventMenu={
            <OperationsCalendarNewEventMenu
              open={newEventMenuOpen}
              onOpenChange={setNewEventMenuOpen}
              seed={newEventSeed}
              quickCreateNonce={quickCreateNonce}
              canCreateCustomEvent={permissions.canCreateCustomEvents}
              canCreateBlockTime={false}
              canCreateBooking={false}
              canRecoverDeleted={false}
              staffOptions={staffOptions}
              roleOptions={roleOptions}
              onCreateBookingShortcut={onCreateBookingShortcut}
              onCreateCustomEvent={appendCustomEvent}
              onCreateBlockTime={appendBlockTime}
              onRecoverDeleted={recoverLastDeletedEvent}
            />
          }
        />

        <OperationsCalendarFiltersPanel
          open={showFilters}
          filters={filters}
          filterOptions={filterOptions}
          onToggleGroupValue={updateFilterGroup}
          onClearAll={clearAllFilters}
          onClose={() => setShowFilters(false)}
        />

        <OperationsCalendarContent
          axisMode={axisMode}
          resourceTypeLabel={selectedResourceOption?.label}
          resourceResources={
            selectedResourceOption
              ? selectedResourceOption.resources.map((resource) => ({
                  ...resource,
                  type: selectedResourceOption.type,
                }))
              : []
          }
          view={view}
          anchorDate={anchorDate}
          days={days}
          visibleEvents={visibleEvents}
          activeFilterCount={activeCount}
          timelineRef={timelineRef}
          renderSettings={renderSettings}
          onClearAllFilters={clearAllFilters}
          onEventClick={openEventDrawer}
          onSlotCreate={onSlotCreate}
        />
      </div>

      <OperationsCalendarEventDrawer
        open={drawerOpen && Boolean(selectedEvent)}
        event={selectedEvent}
        userRole={userRole}
        userDisplayName={userName}
        readOnlyMode={permissions.level === "view-only"}
        canCompleteTasks={permissions.canCompleteTasks}
        canCheckInOut={permissions.canCheckInOut}
        canEditBookingActions={permissions.canEditBookings}
        canManageCustomEvents={permissions.canCreateCustomEvents}
        supportsCheckInOut={selectedSupportsCheckInOut}
        showAddOnsTab={selectedAllowsAddOns}
        booking={selectedBooking}
        client={selectedClient}
        pet={selectedPet}
        task={selectedTask}
        taskSeries={selectedTaskSeries}
        bookingTasks={selectedBookingTasks}
        bookingAddOns={selectedBookingAddOns}
        bookingsForPet={
          selectedBooking
            ? bookingRecords.filter(
                (booking) =>
                  getPrimaryPetId(booking.petId) ===
                  getPrimaryPetId(selectedBooking.petId),
              )
            : []
        }
        bookingTab={activeBookingTab}
        onBookingTabChange={(tab) => {
          if (!selectedBooking) return;
          setBookingTabMemory((previous) => ({
            ...previous,
            [selectedBooking.id]: tab,
          }));
        }}
        notesState={selectedNotesState}
        staffOptions={staffOptions}
        managerAlertCount={managerAlerts.length}
        onClose={() => setDrawerOpen(false)}
        onOpenLinkedBooking={openLinkedBookingFromTask}
        onCheckInBooking={checkInBooking}
        onCheckOutBooking={checkOutBooking}
        onAssignStaff={assignBookingStaff}
        onMarkTaskComplete={(taskId, allowEarly) =>
          markTaskComplete(taskId, {
            allowEarly,
            source: selectedTask ? "task-drawer" : "calendar-drawer",
          })
        }
        onMarkAllBookingTasksComplete={markAllBookingTasksComplete}
        onAddBookingTask={addBookingTask}
        onAddBookingAddOn={addBookingAddOn}
        onUpdateBookingAddOn={updateBookingAddOn}
        onRemoveBookingAddOn={removeBookingAddOn}
        onUpdateNotes={updateNotes}
        onMessageCustomer={messageCustomer}
        onRescheduleBooking={rescheduleBooking}
        onCancelBooking={cancelBooking}
        onUpdateManualEvent={updateManualEvent}
        onDeleteManualEvent={deleteManualEvent}
      />
    </div>
  );
}
