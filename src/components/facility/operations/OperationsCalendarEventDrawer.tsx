"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Ban,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Flag,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PawPrint,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Tag,
  Truck,
  Undo2,
  User,
  UserCog,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  type CapturedLead,
  convertLeadToBooking,
  updateCapturedLead,
  useCapturedLeads,
} from "@/lib/lead-capture";
import { defaultServiceAddOns } from "@/data/service-addons";
import type { FacilityTask } from "@/data/facility-tasks";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import {
  BOOKING_SOURCE_LABELS,
  BUILTIN_SERVICE_COLORS,
  STATUS_COLOR_MAP,
  isGroupFull,
  type CalendarEventCapacity,
  type GroupAttendee,
  type ManualFacilityEvent,
  type OperationsCalendarEvent,
  type RouteStop,
} from "@/lib/operations-calendar";
import {
  isAttendeeCheckedIn,
  toggleAttendeeCheckIn,
  useAttendeeCheckIns,
} from "@/lib/group-attendance";
import {
  sendNotification,
  useEventNotifications,
  type NotificationChannel,
  type SentNotification,
} from "@/lib/calendar-notifications";
import {
  cancelOccurrence,
  cancelSeriesFrom,
  computeOccurrences,
  recurrencePatternLabel,
} from "@/lib/recurring-events";
import {
  isStopCompleted,
  toggleStopCompleted,
  useRouteStops,
} from "@/lib/route-stops";
import {
  formatCurrency,
  formatLocalDateTime,
  type NoteSectionState,
} from "@/components/facility/operations/OperationsCalendarDrawerHelpers";

export type BookingDrawerTab =
  | "summary"
  | "pet-details"
  | "addons"
  | "tasks"
  | "notes"
  | "billing";

export interface BookingDrawerAddOnItem {
  id: string;
  name: string;
  scheduledAt?: string;
  assignedStaff?: string;
  status: "pending" | "completed";
}

interface OperationsCalendarEventDrawerProps {
  open: boolean;
  event: OperationsCalendarEvent | null;
  userRole: string;
  userDisplayName: string;
  readOnlyMode: boolean;
  canCompleteTasks: boolean;
  canCheckInOut: boolean;
  canEditBookingActions: boolean;
  canManageCustomEvents: boolean;
  supportsCheckInOut?: boolean;
  showAddOnsTab?: boolean;
  booking?: Booking;
  client?: Client;
  pet?: Pet;
  task?: FacilityTask;
  taskSeries: FacilityTask[];
  bookingTasks: FacilityTask[];
  bookingAddOns: BookingDrawerAddOnItem[];
  bookingsForPet: Booking[];
  bookingTab: BookingDrawerTab;
  onBookingTabChange: (tab: BookingDrawerTab) => void;
  notesState: {
    booking: NoteSectionState;
    pet: NoteSectionState;
    customer: NoteSectionState;
  };
  staffOptions: string[];
  managerAlertCount: number;
  onClose: () => void;
  onOpenLinkedBooking: (bookingId: number) => void;
  onCheckInBooking: (bookingId: number) => void;
  onCheckOutBooking: (bookingId: number) => void;
  onAssignStaff: (
    bookingId: number,
    primary: string,
    secondary?: string,
  ) => void;
  onMarkTaskComplete: (taskId: string, allowEarly?: boolean) => void;
  onMarkAllBookingTasksComplete: (bookingId: number) => void;
  onAddBookingTask: (bookingId: number, task: Partial<FacilityTask>) => void;
  onAddBookingAddOn: (bookingId: number, addOn: BookingDrawerAddOnItem) => void;
  onUpdateBookingAddOn: (
    bookingId: number,
    addOnId: string,
    updates: Partial<BookingDrawerAddOnItem>,
  ) => void;
  onRemoveBookingAddOn: (bookingId: number, addOnId: string) => void;
  onUpdateNotes: (
    section: "booking" | "pet" | "customer",
    content: string,
    editorName: string,
  ) => void;
  onMessageCustomer: (bookingId: number) => void;
  onRescheduleBooking: (bookingId: number) => void;
  onCancelBooking: (bookingId: number, reason: string) => void;
  onUpdateManualEvent: (
    eventId: string,
    updates: Partial<ManualFacilityEvent>,
  ) => void;
  onDeleteManualEvent: (eventId: string) => void;
}

/** Visible tabs, mapped onto the existing BookingDrawerTab union. */
const DRAWER_TABS: Array<{ id: BookingDrawerTab; label: string }> = [
  { id: "summary", label: "Details" },
  { id: "addons", label: "Add-Ons" },
  { id: "notes", label: "Notes" },
  { id: "billing", label: "History" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || name === "-") return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function resolveServiceColor(event: OperationsCalendarEvent): string {
  return (
    event.rateColor ??
    BUILTIN_SERVICE_COLORS[event.service] ??
    BUILTIN_SERVICE_COLORS[event.module] ??
    "#64748b"
  );
}

export function OperationsCalendarEventDrawer({
  open,
  event,
  userDisplayName,
  readOnlyMode,
  canCompleteTasks,
  canCheckInOut,
  canEditBookingActions,
  supportsCheckInOut,
  showAddOnsTab,
  booking,
  client,
  pet,
  bookingAddOns,
  bookingTab,
  onBookingTabChange,
  notesState,
  staffOptions,
  onClose,
  onOpenLinkedBooking,
  onCheckInBooking,
  onCheckOutBooking,
  onAssignStaff,
  onMarkTaskComplete,
  onAddBookingAddOn,
  onUpdateBookingAddOn,
  onUpdateNotes,
  onRescheduleBooking,
  onCancelBooking,
}: OperationsCalendarEventDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const capturedLeads = useCapturedLeads();

  // Local tab state so tabs work for non-booking events too (the parent only
  // persists tab memory for bookings). Reseed from the prop when the event
  // changes, using the render-time "adjust state on prop change" pattern.
  const [activeTab, setActiveTab] = useState<BookingDrawerTab>(bookingTab);
  const [syncedEventId, setSyncedEventId] = useState<string | null>(
    event?.id ?? null,
  );
  if (event && event.id !== syncedEventId) {
    setSyncedEventId(event.id);
    setActiveTab(bookingTab);
  }

  // Animate in on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!open || !event) {
    return null;
  }

  // Group / multi-pet module events get an "Attendees" tab (Tables 81–82);
  // shuttle / transport modules get a "Route" tab (Table 83).
  const isGroupEvent = Boolean(event.capacity && event.attendees?.length);
  const isTransportEvent = Boolean(event.stops?.length);
  const tabs = DRAWER_TABS.filter(
    (tab) => tab.id !== "addons" || showAddOnsTab !== false,
  );
  if (isTransportEvent) {
    tabs.splice(1, 0, { id: "tasks", label: "Route" });
  }
  if (isGroupEvent) {
    tabs.splice(1, 0, { id: "pet-details", label: "Attendees" });
  }
  const effectiveTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : "summary";

  // Custom-module add-ons flow through the Add-Ons tab too (Table 80): when
  // there's no linked booking, fall back to the event's own add-ons.
  const drawerAddOns: BookingDrawerAddOnItem[] =
    bookingAddOns.length > 0
      ? bookingAddOns
      : event.addOns.map((addOn) => ({
          id: addOn.id,
          name: addOn.name,
          scheduledAt: addOn.scheduledAt?.toISOString(),
          status: "pending" as const,
        }));

  const selectTab = (tab: BookingDrawerTab) => {
    setActiveTab(tab);
    onBookingTabChange(tab);
  };

  const serviceColor = resolveServiceColor(event);
  const statusColor = STATUS_COLOR_MAP[event.status] ?? "#64748b";

  // Lead-review state (Task 11 / Table 72).
  const isLeadEvent = Boolean(event.external?.leadCaptured);
  const lead = isLeadEvent
    ? capturedLeads.find((entry) => entry.externalEventId === event.id)
    : undefined;
  const handleConvertToBooking = () => {
    convertLeadToBooking(event);
    toast.success("Converted to booking", {
      description: `${lead?.name ?? event.customerName ?? "The lead"} is now a Yipyy booking.`,
    });
    onClose();
  };

  const eventNumericId = event.bookingId ?? (Number(event.sourceId) || 0);
  const timeLabel = event.allDay
    ? "All day"
    : `${event.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${event.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  const dateLabel = event.start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const rawStatus = event.bookingRawStatus ?? booking?.status ?? "";
  const isCheckedOut =
    rawStatus === "completed" ||
    rawStatus === "checked-out" ||
    rawStatus === "checked_out";
  const isCheckedIn = rawStatus === "in_progress" || rawStatus === "checked_in";
  const isCancelled = rawStatus === "cancelled";
  const checkInOutEnabled =
    supportsCheckInOut ?? event.requiresCheckInOut !== false;

  const petName = pet?.name ?? event.petNames[0] ?? "-";
  const ownerName = client?.name ?? event.customerName ?? "-";
  const staffName =
    event.staff && event.staff !== "Unassigned" ? event.staff : "Unassigned";

  // External (synced) events are never mutated from here.
  const isReadOnlyEvent = readOnlyMode || event.external?.readOnly === true;
  const canEdit = canEditBookingActions && !isReadOnlyEvent;

  // ── Details-tab derived state (Table 30) ──
  const petId = pet?.id ?? event.petId;
  const clientId = client?.id ?? event.clientId;
  const petHref =
    petId && clientId
      ? `/facility/dashboard/clients/${clientId}/pets/${petId}`
      : undefined;
  const ownerHref = clientId
    ? `/facility/dashboard/clients/${clientId}`
    : undefined;

  const hasBooking =
    Boolean(booking) ||
    event.type === "booking" ||
    event.type === "add-on" ||
    Boolean(event.bookingId);
  const currentStatusKey = toStatusKey(rawStatus);
  const durationLabel = event.allDay
    ? "All day"
    : formatDuration(event.start, event.end);
  const bookingSourceLabel = event.bookingSource
    ? BOOKING_SOURCE_LABELS[event.bookingSource]
    : "—";

  const showMarkComplete =
    !isCheckedOut &&
    !isCancelled &&
    (event.type === "task" ? Boolean(event.taskId) : hasBooking);
  const canMarkComplete =
    event.type === "task"
      ? canCompleteTasks && !isReadOnlyEvent
      : canCheckInOut && !isReadOnlyEvent;

  const handleStaffChange = (staff: string) => {
    onAssignStaff(eventNumericId, staff);
  };
  const handleStatusChange = (next: StatusKey) => {
    if (next === currentStatusKey) return;
    if (next === "checked_in") {
      onCheckInBooking(eventNumericId);
    } else if (next === "completed") {
      onCheckOutBooking(eventNumericId);
    } else if (next === "cancelled") {
      const reason =
        window.prompt("Cancellation reason", "Customer request") ??
        "Customer request";
      onCancelBooking(eventNumericId, reason);
    }
    // "confirmed": no revert handler exists — the control snaps back on render.
  };
  const handleEditBooking = () => {
    if (event.type === "booking" || event.type === "add-on") {
      window.open(event.href, "_blank");
    } else if (event.bookingId) {
      onOpenLinkedBooking(event.bookingId);
    }
  };
  const handleMarkComplete = () => {
    if (!window.confirm("Mark this as complete?")) return;
    if (event.type === "task" && event.taskId) {
      onMarkTaskComplete(event.taskId);
    } else {
      onCheckOutBooking(eventNumericId);
    }
  };

  const isTerminal = isCheckedOut || isCancelled;

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`${petName} — ${event.service}`}
      className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[480px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out"
      style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
    >
      {/* ── 4px service-colour top stripe ── */}
      <div
        className="h-1 w-full shrink-0"
        style={{ backgroundColor: serviceColor }}
      />

      {/* ── Header (A5) ── */}
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 pt-4 pb-3">
        <Avatar className="size-11 shrink-0">
          <AvatarFallback
            className="text-sm font-semibold"
            style={{
              backgroundColor: `${serviceColor}22`,
              color: serviceColor,
            }}
          >
            {getInitials(petName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl leading-tight font-bold text-slate-900">
            {petName}
          </h2>
          <p className="truncate text-sm text-slate-500">{event.service}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1.5 border-slate-200 text-[11px] font-medium text-slate-600"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              {event.status}
            </Badge>
            {event.external && (
              <Badge
                variant="outline"
                className="border-slate-200 text-[11px] font-medium text-slate-500"
              >
                {event.external.sourceLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <DrawerHeaderMenu
            event={event}
            eventNumericId={eventNumericId}
            hasBooking={hasBooking}
            isTerminal={isTerminal}
            canEdit={canEdit}
            ownerHref={ownerHref}
            petHref={petHref}
            clientId={clientId}
            petId={petId}
            recipientName={ownerName}
            recipientPhone={client?.phone}
            currentDate={booking?.startDate}
            onEditBooking={handleEditBooking}
            onCancelBooking={onCancelBooking}
            onRescheduleBooking={onRescheduleBooking}
            onCloseDrawer={onClose}
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-slate-500"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Lead-review banner (Task 11 / Table 72) ── */}
      {isLeadEvent && (
        <LeadReviewBanner
          key={event.id}
          lead={lead}
          source={event.external?.sourceLabel}
          fallbackName={event.customerName ?? "New lead"}
        />
      )}

      {/* ── Quick Info row ── */}
      <div className="grid grid-cols-4 gap-3 border-b border-slate-100 px-5 py-3">
        <QuickInfoItem icon={Clock} label="Time" value={timeLabel} />
        <QuickInfoItem icon={CalendarDays} label="Date" value={dateLabel} />
        <QuickInfoItem icon={User} label="Owner" value={ownerName} />
        <QuickInfoItem icon={UserCog} label="Staff" value={staffName} />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 border-b border-slate-100 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-active={effectiveTab === tab.id}
            onClick={() => selectTab(tab.id)}
            className="-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 data-[active=true]:border-slate-900 data-[active=true]:text-slate-900"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {effectiveTab === "summary" && (
          <DetailsTab
            event={event}
            petName={petName}
            ownerName={ownerName}
            petHref={petHref}
            ownerHref={ownerHref}
            staffName={staffName}
            staffOptions={staffOptions}
            location={event.location ?? "-"}
            durationLabel={durationLabel}
            currentStatusKey={currentStatusKey}
            bookingSourceLabel={bookingSourceLabel}
            hasBooking={hasBooking}
            canEditStaff={hasBooking && canEdit}
            canChangeStatus={hasBooking && !isReadOnlyEvent}
            showEditBooking={hasBooking}
            showMarkComplete={showMarkComplete}
            canMarkComplete={canMarkComplete}
            onStaffChange={handleStaffChange}
            onStatusChange={handleStatusChange}
            onEditBooking={handleEditBooking}
            onMarkComplete={handleMarkComplete}
          />
        )}
        {effectiveTab === "addons" && (
          <AddOnsTab
            addOns={drawerAddOns}
            canComplete={canCompleteTasks && !isReadOnlyEvent}
            canEdit={canEdit}
            invoiceHref={`/facility/dashboard/services/retail?bookingId=${eventNumericId}`}
            onToggle={(addOnId, completed) =>
              onUpdateBookingAddOn(eventNumericId, addOnId, {
                status: completed ? "completed" : "pending",
              })
            }
            onAdd={(option) =>
              onAddBookingAddOn(eventNumericId, {
                id: `addon-${option.id}-${eventNumericId}`,
                name: option.name,
                status: "pending",
              })
            }
          />
        )}
        {effectiveTab === "pet-details" && isGroupEvent && (
          <AttendeesTab
            eventId={event.id}
            attendees={event.attendees ?? []}
            capacity={event.capacity}
            canCheckIn={canCheckInOut && !isReadOnlyEvent}
          />
        )}
        {effectiveTab === "tasks" && isTransportEvent && (
          <RouteTab
            eventId={event.id}
            stops={event.stops ?? []}
            canComplete={canCheckInOut && !isReadOnlyEvent}
          />
        )}
        {effectiveTab === "notes" && (
          <NotesTab
            key={event.id}
            note={notesState.booking}
            readOnly={isReadOnlyEvent}
            onSave={(content) =>
              onUpdateNotes("booking", content, userDisplayName)
            }
          />
        )}
        {effectiveTab === "billing" && (
          <HistoryTab
            event={event}
            booking={booking}
            addOns={bookingAddOns}
            note={notesState.booking}
            checkedIn={isCheckedIn || isCheckedOut}
          />
        )}
      </div>

      {/* ── Sticky action bar (Table 35) ── */}
      <div className="sticky bottom-0 mt-auto border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <DrawerActionBar
          event={event}
          isReadOnlyEvent={isReadOnlyEvent}
          hasBooking={hasBooking}
          isCheckedIn={isCheckedIn}
          isCompleted={isCheckedOut}
          isCancelled={isCancelled}
          checkInOutEnabled={checkInOutEnabled}
          canCheckInOut={canCheckInOut}
          canEdit={canEdit}
          canCompleteTasks={canCompleteTasks}
          eventNumericId={eventNumericId}
          clientId={clientId}
          petId={petId}
          petName={petName}
          recipientName={ownerName}
          recipientPhone={client?.phone}
          recipientEmail={client?.email}
          senderName={userDisplayName}
          onCheckInBooking={onCheckInBooking}
          onCheckOutBooking={onCheckOutBooking}
          onAddBookingAddOn={onAddBookingAddOn}
          onMarkTaskComplete={onMarkTaskComplete}
          onConvertToBooking={isLeadEvent ? handleConvertToBooking : undefined}
        />
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════
   Header "..." menu (Table 36)
   ═══════════════════════════════════════════════════ */

function DrawerHeaderMenu({
  event,
  eventNumericId,
  hasBooking,
  isTerminal,
  canEdit,
  ownerHref,
  petHref,
  clientId,
  petId,
  recipientName,
  recipientPhone,
  currentDate,
  onEditBooking,
  onCancelBooking,
  onRescheduleBooking,
  onCloseDrawer,
}: {
  event: OperationsCalendarEvent;
  eventNumericId: number;
  hasBooking: boolean;
  isTerminal: boolean;
  canEdit: boolean;
  ownerHref?: string;
  petHref?: string;
  clientId?: number;
  petId?: number;
  recipientName: string;
  recipientPhone?: string;
  currentDate?: string;
  onEditBooking: () => void;
  onCancelBooking: (bookingId: number, reason: string) => void;
  onRescheduleBooking: (bookingId: number) => void;
  onCloseDrawer: () => void;
}) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [recurringCancelOpen, setRecurringCancelOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const isRecurring = Boolean(event.recurrenceSeriesId);

  const rebook = () => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", String(clientId));
    if (petId) params.set("petId", String(petId));
    if (event.service) params.set("service", event.service.toLowerCase());
    window.open(`/facility/dashboard/bookings?${params.toString()}`, "_blank");
  };

  const flagForReview = () => {
    toast.success("Flagged for review", {
      description: `${recipientName || event.title} was added to the review queue.`,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-slate-500"
            aria-label="More actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {hasBooking && (
            <DropdownMenuItem
              className="gap-2"
              disabled={!canEdit}
              onClick={onEditBooking}
            >
              <Pencil className="size-4" />
              Edit Booking
            </DropdownMenuItem>
          )}
          {hasBooking && !isTerminal && (
            <DropdownMenuItem
              className="gap-2"
              disabled={!canEdit}
              onClick={() => setMoveOpen(true)}
            >
              <CalendarClock className="size-4" />
              Move to Different Date
            </DropdownMenuItem>
          )}
          {hasBooking && (
            <DropdownMenuItem
              className="gap-2"
              disabled={!canEdit}
              onClick={rebook}
            >
              <CalendarPlus className="size-4" />
              Rebook
            </DropdownMenuItem>
          )}
          {hasBooking && (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => setSmsOpen(true)}
            >
              <MessageSquare className="size-4" />
              Send Reminder SMS
            </DropdownMenuItem>
          )}

          {(ownerHref || petHref) && <DropdownMenuSeparator />}
          {ownerHref && (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => router.push(ownerHref)}
            >
              <User className="size-4" />
              View Client Profile
            </DropdownMenuItem>
          )}
          {petHref && (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => router.push(petHref)}
            >
              <PawPrint className="size-4" />
              View Pet Profile
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" onClick={flagForReview}>
            <Flag className="size-4" />
            Flag for Review
          </DropdownMenuItem>

          {(hasBooking || isRecurring) && !isTerminal && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-red-600 focus:text-red-700"
                disabled={!canEdit}
                onClick={() =>
                  isRecurring
                    ? setRecurringCancelOpen(true)
                    : setCancelOpen(true)
                }
              >
                <Ban className="size-4" />
                {isRecurring ? "Cancel…" : "Cancel Booking"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelBookingDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(reason) => onCancelBooking(eventNumericId, reason)}
      />
      <RecurringCancelDialog
        open={recurringCancelOpen}
        onOpenChange={setRecurringCancelOpen}
        event={event}
        onCloseDrawer={onCloseDrawer}
      />
      <SendReminderSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        recipientName={recipientName}
        recipientPhone={recipientPhone}
        event={event}
      />
      <MoveDateDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        currentDate={currentDate}
        onConfirm={() => onRescheduleBooking(eventNumericId)}
      />
    </>
  );
}

const CANCEL_REASONS = [
  "Customer request",
  "Schedule conflict",
  "Pet unwell",
  "Weather",
  "Facility closure",
  "No-show",
];

function CancelBookingDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [fee, setFee] = useState("");

  const confirm = () => {
    const feeValue = Number(fee);
    const composed =
      feeValue > 0
        ? `${reason} — cancellation fee ${formatCurrency(feeValue)}`
        : reason;
    onConfirm(composed);
    onOpenChange(false);
    setFee("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            Cancellation policy and refund eligibility will be reviewed before
            this is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-fee">Cancellation fee (optional)</Label>
            <Input
              id="cancel-fee"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={fee}
              onChange={(changeEvent) => setFee(changeEvent.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep booking
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={confirm}
          >
            Cancel booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Recurring-event cancellation scope (spec Table 84).
function RecurringCancelDialog({
  open,
  onOpenChange,
  event,
  onCloseDrawer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: OperationsCalendarEvent;
  onCloseDrawer: () => void;
}) {
  const pattern = recurrencePatternLabel(event.recurrence, event.start);

  const cancelThis = () => {
    cancelOccurrence(event.id);
    toast.success("This occurrence was cancelled");
    onOpenChange(false);
    onCloseDrawer();
  };

  const cancelFuture = () => {
    if (event.recurrenceSeriesId) {
      cancelSeriesFrom(event.recurrenceSeriesId, event.start);
    }
    toast.success("All future occurrences cancelled");
    onOpenChange(false);
    onCloseDrawer();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel recurring event</DialogTitle>
          <DialogDescription>
            {pattern ?? "This event repeats."} Choose what to cancel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={cancelThis}
          >
            Cancel this occurrence only
          </Button>
          <Button
            className="w-full justify-start bg-red-600 text-white hover:bg-red-700"
            onClick={cancelFuture}
          >
            Cancel all future occurrences
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendReminderSmsDialog({
  open,
  onOpenChange,
  recipientName,
  recipientPhone,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientPhone?: string;
  event: OperationsCalendarEvent;
}) {
  const defaultMessage = `Hi ${recipientName || "there"}, this is a reminder for your ${event.service} appointment on ${event.start.toLocaleDateString(
    "en-US",
    { weekday: "long", month: "short", day: "numeric" },
  )}. Reply to this message with any questions. See you soon!`;
  const [message, setMessage] = useState(defaultMessage);

  const send = () => {
    toast.success("Reminder SMS sent", {
      description: recipientPhone
        ? `Sent to ${recipientName} (${recipientPhone}).`
        : `Sent to ${recipientName}.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send reminder SMS</DialogTitle>
          <DialogDescription>
            {recipientPhone
              ? `To ${recipientName} · ${recipientPhone}`
              : `To ${recipientName}`}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={5}
          value={message}
          onChange={(changeEvent) => setMessage(changeEvent.target.value)}
        />
        <p className="text-[11px] text-slate-400">
          {message.length} characters · standard SMS rates apply
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={message.trim().length === 0}
            onClick={send}
          >
            <MessageSquare className="size-3.5" />
            Send SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════
   Quick Notify composer (spec 8.7 / Task 47 / Table 92)
   ═══════════════════════════════════════════════════ */

function NotifyComposer({
  event,
  petName,
  recipientName,
  recipientPhone,
  recipientEmail,
  senderName,
}: {
  event: OperationsCalendarEvent;
  petName: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  senderName: string;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<NotificationChannel>("sms");
  const [subject, setSubject] = useState(
    `Your ${petName}'s appointment update`,
  );
  const [body, setBody] = useState("");

  const shortcuts = [
    "Running 10 minutes behind",
    "Your pet is ready for pickup",
    "Please confirm your appointment for today",
    `${petName} is checked in`,
  ];

  const address = channel === "sms" ? recipientPhone : recipientEmail;

  const insert = (text: string) =>
    setBody((prev) => (prev.trim() ? `${prev}\n${text}` : text));

  const send = () => {
    sendNotification({
      eventId: event.id,
      channel,
      subject: channel === "email" ? subject.trim() : undefined,
      body: body.trim(),
      recipient: recipientName,
      sentBy: senderName,
    });
    toast.success(channel === "sms" ? "SMS sent" : "Email sent", {
      description: address
        ? `To ${recipientName} · ${address}`
        : `To ${recipientName}`,
    });
    setBody("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Send className="size-3.5" />
          Notify
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-3">
        {/* Channel toggle */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          {(["sms", "email"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setChannel(value)}
              data-active={channel === value}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-slate-500 transition-colors data-[active=true]:bg-white data-[active=true]:text-slate-900 data-[active=true]:shadow-sm"
            >
              {value === "sms" ? (
                <MessageSquare className="size-3.5" />
              ) : (
                <Mail className="size-3.5" />
              )}
              {value === "sms" ? "SMS" : "Email"}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-500">
          To {recipientName}
          {address ? ` · ${address}` : ""}
        </p>

        {channel === "email" && (
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Subject</Label>
            <Input
              value={subject}
              onChange={(changeEvent) => setSubject(changeEvent.target.value)}
              className="h-8 text-[13px]"
            />
          </div>
        )}

        {/* INSERT shortcuts */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
            Insert
          </p>
          <div className="flex flex-wrap gap-1.5">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut}
                type="button"
                onClick={() => insert(shortcut)}
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                {shortcut}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          rows={4}
          value={body}
          placeholder="Write a message…"
          onChange={(changeEvent) => setBody(changeEvent.target.value)}
          className="text-[13px]"
        />

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={body.trim().length === 0}
            onClick={send}
          >
            <Send className="size-3.5" />
            Send
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MoveDateDialog({
  open,
  onOpenChange,
  currentDate,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate?: string;
  onConfirm: () => void;
}) {
  const [date, setDate] = useState(currentDate ?? "");

  const confirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to a different date</DialogTitle>
          <DialogDescription>
            Pick a new date, then continue to the reschedule flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>New date</Label>
          <DatePicker
            value={date}
            onValueChange={(next) => setDate(next)}
            displayMode="dialog"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!date}
            onClick={confirm}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════
   Sticky bottom action bar (Table 35)
   ═══════════════════════════════════════════════════ */

const ADD_ON_OPTIONS = defaultServiceAddOns.map((addOn) => ({
  id: addOn.id,
  name: addOn.name,
  category: addOn.category,
  price: addOn.price,
}));

const ADD_ON_PRICE_BY_NAME = new Map(
  defaultServiceAddOns.map((addOn) => [addOn.name.toLowerCase(), addOn.price]),
);

/** Price for an add-on by name (from service-addons); 0 for unknown/custom. */
function addOnPrice(name: string): number {
  return ADD_ON_PRICE_BY_NAME.get(name.toLowerCase()) ?? 0;
}

/** Shared add-on selector popover — used by the Add-Ons tab and the A4 bar. */
function AddOnPicker({
  onSelect,
  trigger,
}: {
  onSelect: (option: (typeof ADD_ON_OPTIONS)[number]) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
          Add an add-on
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {ADD_ON_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-800">
                  {option.name}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {option.category}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-slate-500">
                {formatCurrency(option.price)}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DrawerActionBar({
  event,
  isReadOnlyEvent,
  hasBooking,
  isCheckedIn,
  isCompleted,
  isCancelled,
  checkInOutEnabled,
  canCheckInOut,
  canEdit,
  canCompleteTasks,
  eventNumericId,
  clientId,
  petId,
  petName,
  recipientName,
  recipientPhone,
  recipientEmail,
  senderName,
  onCheckInBooking,
  onCheckOutBooking,
  onAddBookingAddOn,
  onMarkTaskComplete,
  onConvertToBooking,
}: {
  event: OperationsCalendarEvent;
  isReadOnlyEvent: boolean;
  hasBooking: boolean;
  isCheckedIn: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  checkInOutEnabled: boolean;
  canCheckInOut: boolean;
  canEdit: boolean;
  canCompleteTasks: boolean;
  eventNumericId: number;
  clientId?: number;
  petId?: number;
  petName: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  senderName: string;
  onCheckInBooking: (bookingId: number) => void;
  onCheckOutBooking: (bookingId: number) => void;
  onAddBookingAddOn: (bookingId: number, addOn: BookingDrawerAddOnItem) => void;
  onMarkTaskComplete: (taskId: string, allowEarly?: boolean) => void;
  onConvertToBooking?: () => void;
}) {
  // No dedicated payment/invoice handler is passed to the drawer, so both open
  // the POS/retail surface for this booking — the same target checkout uses.
  const openInvoice = () =>
    window.open(
      `/facility/dashboard/services/retail?bookingId=${eventNumericId}`,
      "_blank",
    );

  const bookAgain = () => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", String(clientId));
    if (petId) params.set("petId", String(petId));
    window.open(`/facility/dashboard/bookings?${params.toString()}`, "_blank");
  };

  const addAddOn = (option: (typeof ADD_ON_OPTIONS)[number]) => {
    onAddBookingAddOn(eventNumericId, {
      id: `addon-${option.id}-${eventNumericId}`,
      name: option.name,
      status: "pending",
    });
  };

  // Lead review → convert to a native Yipyy booking (Task 11 / Table 72)
  if (event.external?.leadCaptured) {
    return (
      <div className="space-y-2">
        {onConvertToBooking && (
          <Button
            size="sm"
            className="w-full gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
            onClick={onConvertToBooking}
          >
            <CalendarPlus className="size-3.5" />
            Convert to Booking
          </Button>
        )}
        {isReadOnlyEvent && (
          <p className="text-xs text-slate-500">
            Read-only — synced from {event.external.sourceLabel}.
          </p>
        )}
      </div>
    );
  }

  // Read-only synced (external) event
  if (isReadOnlyEvent && event.external) {
    return (
      <p className="text-xs text-slate-500">
        Read-only — synced from {event.external.sourceLabel}.
      </p>
    );
  }

  // Task event → keep Mark Complete
  if (event.type === "task") {
    if (!event.taskId || event.status === "Completed") return null;
    return (
      <Button
        size="sm"
        className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={!canCompleteTasks || isReadOnlyEvent}
        onClick={() => onMarkTaskComplete(event.taskId!)}
      >
        <CheckCircle2 className="size-3.5" />
        Mark Complete
      </Button>
    );
  }

  if (!hasBooking) return null;

  // Completed (or cancelled) → View Invoice + Book Again
  if (isCompleted || isCancelled) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={openInvoice}
        >
          <FileText className="size-3.5" />
          View Invoice
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!canEdit}
          onClick={bookAgain}
        >
          <CalendarPlus className="size-3.5" />
          Book Again
        </Button>
        <NotifyComposer
          event={event}
          petName={petName}
          recipientName={recipientName}
          recipientPhone={recipientPhone}
          recipientEmail={recipientEmail}
          senderName={senderName}
        />
      </div>
    );
  }

  // Active booking → Check In / Check Out + Add Add-On + Collect Payment
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isCheckedIn ? (
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!checkInOutEnabled || !canCheckInOut || isReadOnlyEvent}
          onClick={() => onCheckOutBooking(eventNumericId)}
        >
          <LogOut className="size-3.5" />
          Check Out
        </Button>
      ) : (
        <Button
          size="sm"
          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!checkInOutEnabled || !canCheckInOut || isReadOnlyEvent}
          onClick={() => onCheckInBooking(eventNumericId)}
        >
          <LogIn className="size-3.5" />
          Check In
        </Button>
      )}

      <AddOnPicker
        onSelect={addAddOn}
        trigger={
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!canEdit}
          >
            <Plus className="size-3.5" />
            Add Add-On
          </Button>
        }
      />

      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={isReadOnlyEvent}
        onClick={openInvoice}
      >
        <CreditCard className="size-3.5" />
        Collect Payment
      </Button>

      <NotifyComposer
        event={event}
        petName={petName}
        recipientName={recipientName}
        recipientPhone={recipientPhone}
        recipientEmail={recipientEmail}
        senderName={senderName}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Tab: Details (A2 / Table 30)
   ═══════════════════════════════════════════════════ */

type StatusKey = "confirmed" | "checked_in" | "completed" | "cancelled";

const STATUS_OPTIONS: Array<{ value: StatusKey; label: string }> = [
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked-in" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function toStatusKey(rawStatus: string): StatusKey {
  if (rawStatus === "in_progress" || rawStatus === "checked_in") {
    return "checked_in";
  }
  if (
    rawStatus === "completed" ||
    rawStatus === "checked-out" ||
    rawStatus === "checked_out"
  ) {
    return "completed";
  }
  if (rawStatus === "cancelled") return "cancelled";
  return "confirmed";
}

function formatDuration(start: Date, end: Date): string {
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  if (minutes === 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

const UNASSIGNED = "Unassigned";

function DetailsTab({
  event,
  petName,
  ownerName,
  petHref,
  ownerHref,
  staffName,
  staffOptions,
  location,
  durationLabel,
  currentStatusKey,
  bookingSourceLabel,
  hasBooking,
  canEditStaff,
  canChangeStatus,
  showEditBooking,
  showMarkComplete,
  canMarkComplete,
  onStaffChange,
  onStatusChange,
  onEditBooking,
  onMarkComplete,
}: {
  event: OperationsCalendarEvent;
  petName: string;
  ownerName: string;
  petHref?: string;
  ownerHref?: string;
  staffName: string;
  staffOptions: string[];
  location: string;
  durationLabel: string;
  currentStatusKey: StatusKey;
  bookingSourceLabel: string;
  hasBooking: boolean;
  canEditStaff: boolean;
  canChangeStatus: boolean;
  showEditBooking: boolean;
  showMarkComplete: boolean;
  canMarkComplete: boolean;
  onStaffChange: (staff: string) => void;
  onStatusChange: (next: StatusKey) => void;
  onEditBooking: () => void;
  onMarkComplete: () => void;
}) {
  const staffValues = staffOptions.includes(staffName)
    ? staffOptions
    : [staffName, ...staffOptions];

  return (
    <div className="space-y-5">
      {/* Two-column field grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Pet">
          {petHref ? (
            <Link
              href={petHref}
              className="truncate font-medium text-sky-600 hover:underline"
            >
              {petName}
            </Link>
          ) : (
            <FieldValue value={petName} />
          )}
        </Field>

        <Field label="Owner">
          {ownerHref ? (
            <Link
              href={ownerHref}
              className="truncate font-medium text-sky-600 hover:underline"
            >
              {ownerName}
            </Link>
          ) : (
            <FieldValue value={ownerName} />
          )}
        </Field>

        <Field label="Service Type">
          <FieldValue value={event.service} />
        </Field>

        <Field label="Staff Assigned">
          {canEditStaff ? (
            <Select value={staffName} onValueChange={onStaffChange}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {staffValues
                  .filter((name) => name !== UNASSIGNED)
                  .map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <FieldValue value={staffName} />
          )}
        </Field>

        <Field label="Location">
          <FieldValue value={location} />
        </Field>

        <Field label="Duration">
          <FieldValue value={durationLabel} />
        </Field>

        <Field label="Status">
          {canChangeStatus ? (
            <Select
              value={currentStatusKey}
              onValueChange={(value) => onStatusChange(value as StatusKey)}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <FieldValue value={event.status} />
          )}
        </Field>

        <Field label="Booking Source">
          <FieldValue value={bookingSourceLabel} />
        </Field>
      </div>

      {event.isWaitlist && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Waitlisted
          {event.waitlistPosition
            ? ` · position ${event.waitlistPosition}`
            : ""}
        </div>
      )}

      {event.completedAt && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Completed by {event.completedByName ?? "Staff"} at{" "}
            {formatLocalDateTime(event.completedAt)}
          </span>
        </div>
      )}

      {/* Recurrence pattern + occurrences (spec Table 84) */}
      {event.recurrence && event.recurrence !== "none" && (
        <RecurrenceSection event={event} />
      )}

      {/* Field actions */}
      {(showEditBooking || showMarkComplete) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {showEditBooking && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!hasBooking}
              onClick={onEditBooking}
            >
              <Pencil className="size-3.5" />
              Edit Booking
            </Button>
          )}
          {showMarkComplete && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={!canMarkComplete}
              onClick={onMarkComplete}
            >
              <CheckCircle2 className="size-3.5" />
              Mark Complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function RecurrenceSection({ event }: { event: OperationsCalendarEvent }) {
  const [showOccurrences, setShowOccurrences] = useState(false);
  const pattern = recurrencePatternLabel(event.recurrence, event.start);
  const occurrences = computeOccurrences(
    event.start,
    event.recurrence ?? "",
    6,
  );

  return (
    <div className="space-y-2 rounded-md border border-slate-200 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Repeat className="size-3.5 shrink-0 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">{pattern}</p>
      </div>
      <button
        type="button"
        onClick={() => setShowOccurrences((previous) => !previous)}
        className="text-xs font-medium text-sky-600 hover:underline"
      >
        {showOccurrences ? "Hide occurrences" : "View All Occurrences"}
      </button>
      {showOccurrences && (
        <ul className="space-y-1 border-t border-slate-100 pt-2">
          {occurrences.map((date, index) => (
            <li
              key={date.toISOString()}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-600">
                {date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {" · "}
                {date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {index === 0 && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  This occurrence
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      <div className="flex min-w-0 text-sm">{children}</div>
    </div>
  );
}

function FieldValue({ value }: { value: string }) {
  return (
    <span className="truncate font-medium text-slate-800" title={value}>
      {value}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   Tab: Add-Ons (Part B / B2)
   ═══════════════════════════════════════════════════ */

function AddOnsTab({
  addOns,
  canComplete,
  canEdit,
  invoiceHref,
  onToggle,
  onAdd,
}: {
  addOns: BookingDrawerAddOnItem[];
  canComplete: boolean;
  canEdit: boolean;
  invoiceHref: string;
  onToggle: (addOnId: string, completed: boolean) => void;
  onAdd: (option: (typeof ADD_ON_OPTIONS)[number]) => void;
}) {
  const total = addOns.reduce((sum, addOn) => sum + addOnPrice(addOn.name), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          {addOns.length} add-on{addOns.length === 1 ? "" : "s"}
        </p>
        <AddOnPicker
          onSelect={onAdd}
          trigger={
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={!canEdit}
            >
              <Plus className="size-3" />
              Add Add-On
            </Button>
          }
        />
      </div>

      {addOns.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No add-ons for this booking yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {addOns.map((addOn) => {
            const done = addOn.status === "completed";
            return (
              <label
                key={addOn.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50"
              >
                <Checkbox
                  checked={done}
                  disabled={!canComplete}
                  onCheckedChange={(checked) =>
                    onToggle(addOn.id, checked === true)
                  }
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      done ? "text-slate-400 line-through" : "text-slate-800",
                    )}
                  >
                    {addOn.name}
                  </span>
                  {(addOn.scheduledAt || addOn.assignedStaff) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {addOn.scheduledAt && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="size-3" />
                          {formatLocalDateTime(addOn.scheduledAt)}
                        </span>
                      )}
                      {addOn.assignedStaff && (
                        <span className="inline-flex items-center gap-1">
                          <UserCog className="size-3" />
                          {addOn.assignedStaff}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-700">
                  +{formatCurrency(addOnPrice(addOn.name))}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Total + invoice link */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <p className="text-xs text-slate-500">Total add-ons</p>
          <p className="text-base font-bold text-slate-900">
            {formatCurrency(total)}
          </p>
        </div>
        <a
          href={invoiceHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline"
        >
          <FileText className="size-3.5" />
          View on Invoice
        </a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Tab: Attendees — group / multi-pet modules (Tables 81–82)
   ═══════════════════════════════════════════════════ */

function AttendeesTab({
  eventId,
  attendees,
  capacity,
  canCheckIn,
}: {
  eventId: string;
  attendees: GroupAttendee[];
  capacity?: CalendarEventCapacity;
  canCheckIn: boolean;
}) {
  // Subscribe to per-dog check-in changes.
  useAttendeeCheckIns();
  const full = isGroupFull(capacity);
  const checkedInCount = attendees.filter((attendee) =>
    isAttendeeCheckedIn(eventId, attendee.id),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Attendees</p>
          {capacity && (
            <p className="text-sm font-bold text-slate-900">
              {capacity.used}/{capacity.total} dogs
              <span className="ml-1.5 text-xs font-medium text-slate-400">
                · {checkedInCount} checked in
              </span>
            </p>
          )}
        </div>
        {full ? (
          <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
            Slot full
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            title="Add a dog to this group"
          >
            <Plus className="size-3" />
            Add attendee
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {attendees.map((attendee) => {
          const checkedIn = isAttendeeCheckedIn(eventId, attendee.id);
          return (
            <label
              key={attendee.id}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50"
            >
              <Checkbox
                checked={checkedIn}
                disabled={!canCheckIn}
                onCheckedChange={() =>
                  toggleAttendeeCheckIn(eventId, attendee.id)
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {attendee.petName}
                  {attendee.breed && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      {attendee.breed}
                    </span>
                  )}
                </p>
                {attendee.ownerName && (
                  <p className="truncate text-xs text-slate-500">
                    {attendee.ownerName}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  checkedIn
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {checkedIn ? "Checked in" : "Expected"}
              </span>
            </label>
          );
        })}
      </div>

      {full && (
        <p className="text-[11px] text-slate-400">
          This group is at capacity — new bookings for this slot are blocked.
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Tab: Route — shuttle / transport modules (Table 83)
   ═══════════════════════════════════════════════════ */

function RouteTab({
  eventId,
  stops,
  canComplete,
}: {
  eventId: string;
  stops: RouteStop[];
  canComplete: boolean;
}) {
  useRouteStops();
  const doneCount = stops.filter((stop) =>
    isStopCompleted(eventId, stop.id),
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="size-4 shrink-0 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">
          Route
          <span className="ml-1.5 text-xs font-normal text-slate-400">
            {doneCount}/{stops.length} stops done
          </span>
        </p>
      </div>

      <ol className="space-y-1.5">
        {stops.map((stop, index) => {
          const completed = isStopCompleted(eventId, stop.id);
          return (
            <li
              key={stop.id}
              className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2.5"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    completed
                      ? "text-slate-400 line-through"
                      : "text-slate-800",
                  )}
                >
                  {stop.petName}
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                      stop.kind === "pickup"
                        ? "bg-sky-50 text-sky-600"
                        : "bg-violet-50 text-violet-600",
                    )}
                  >
                    {stop.kind}
                  </span>
                </p>
                <p className="truncate text-xs text-slate-500">
                  {stop.address}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  {stop.eta}
                </span>
                {completed ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                    <CheckCircle2 className="size-3" />
                    Done
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 gap-1 px-2 text-[10px]"
                    disabled={!canComplete}
                    onClick={() => toggleStopCompleted(eventId, stop.id)}
                  >
                    Mark completed
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Tab: Notes (Table 33)
   ═══════════════════════════════════════════════════ */

function formatDatePart(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimePart(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotesTab({
  note,
  readOnly,
  onSave,
}: {
  note: NoteSectionState;
  readOnly: boolean;
  onSave: (content: string) => void;
}) {
  const [draft, setDraft] = useState(note.content);
  const dirty = draft !== note.content;

  return (
    <div className="space-y-2.5">
      <textarea
        value={draft}
        readOnly={readOnly}
        placeholder={readOnly ? "No notes" : "Add booking notes…"}
        rows={8}
        className="w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 read-only:bg-slate-50 read-only:text-slate-500 focus:border-slate-400 focus:outline-none"
        onChange={(changeEvent) => setDraft(changeEvent.currentTarget.value)}
      />

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {draft.length} characters
        </span>
        {!readOnly && (
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!dirty}
            onClick={() => onSave(draft)}
          >
            <Save className="size-3.5" />
            Save
          </Button>
        )}
      </div>

      {note.lastEditedBy && (
        <p className="text-[11px] text-slate-400">
          Added by{" "}
          <span className="font-medium text-slate-500">
            {note.lastEditedBy}
          </span>{" "}
          on {formatDatePart(note.lastEditedAt)} at{" "}
          {formatTimePart(note.lastEditedAt)}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Tab: History (Table 34)
   ═══════════════════════════════════════════════════ */

type HistoryTone = "default" | "success" | "danger";

interface HistoryRow {
  id: string;
  icon: React.ElementType;
  description: string;
  staff: string;
  at: Date;
  tone: HistoryTone;
}

const HISTORY_TONE_CLASS: Record<HistoryTone, string> = {
  default: "bg-slate-100 text-slate-500",
  success: "bg-emerald-50 text-emerald-600",
  danger: "bg-red-50 text-red-600",
};

function shiftMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60000);
}

function safeDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function creatorLabel(
  event: OperationsCalendarEvent,
  fallback: string,
): string {
  if (event.bookingSource === "online") return "Online booking";
  if (event.bookingSource === "integration" && event.external) {
    return event.external.sourceLabel;
  }
  return fallback;
}

/** Maps an invoice audit event type to a history row style, or null to skip
 *  (created / payments are derived separately to avoid duplicate rows). */
function mapAuditType(
  type: string,
): { icon: React.ElementType; tone: HistoryTone } | null {
  switch (type) {
    case "status_changed":
      return { icon: RotateCcw, tone: "default" };
    case "discount_applied":
    case "discount_removed":
      return { icon: Tag, tone: "default" };
    case "refund_issued":
    case "deposit_refunded":
      return { icon: Undo2, tone: "danger" };
    case "manager_override":
      return { icon: ShieldAlert, tone: "danger" };
    case "tip_added":
      return { icon: CreditCard, tone: "success" };
    case "item_added":
    case "fee_added":
      return { icon: Plus, tone: "default" };
    default:
      return null;
  }
}

function buildHistoryRows(
  event: OperationsCalendarEvent,
  booking: Booking | undefined,
  addOns: BookingDrawerAddOnItem[],
  note: NoteSectionState,
  checkedIn: boolean,
  notifications: SentNotification[],
): HistoryRow[] {
  const rows: HistoryRow[] = [];
  const start = event.start;
  const invoice = booking?.invoice;
  const primaryStaff =
    event.staff && event.staff !== "Unassigned" ? event.staff : "Front desk";

  // Created
  const createdAudit = invoice?.auditTrail?.find(
    (entry) => entry.type === "invoice_created",
  );
  const createdAt = safeDate(
    createdAudit?.timestamp,
    shiftMinutes(start, -3 * 24 * 60),
  );
  rows.push({
    id: "created",
    icon: CalendarPlus,
    description: "Booking created",
    staff: createdAudit?.staffName ?? creatorLabel(event, primaryStaff),
    at: createdAt,
    tone: "default",
  });

  // Confirmed
  rows.push({
    id: "confirmed",
    icon: CheckCircle2,
    description: "Booking confirmed",
    staff: primaryStaff,
    at: shiftMinutes(createdAt, 20),
    tone: "success",
  });

  // Deposit
  if (invoice?.depositCollected && invoice.depositCollected > 0) {
    rows.push({
      id: "deposit",
      icon: CreditCard,
      description: `Deposit collected — ${formatCurrency(invoice.depositCollected)}`,
      staff: invoice.depositCollectedBy ?? primaryStaff,
      at: safeDate(invoice.depositCollectedAt, shiftMinutes(createdAt, 25)),
      tone: "success",
    });
  }

  // Payments
  invoice?.payments?.forEach((payment, index) => {
    rows.push({
      id: `payment-${index}`,
      icon: CreditCard,
      description: `Payment received — ${formatCurrency(payment.amount)} (${payment.method})`,
      staff: payment.collectedBy ?? primaryStaff,
      at: safeDate(payment.date, shiftMinutes(start, 60)),
      tone: "success",
    });
  });

  // Richer invoice-audit events (status changes, discounts, refunds, overrides)
  invoice?.auditTrail?.forEach((entry) => {
    const mapped = mapAuditType(entry.type);
    if (!mapped) return;
    rows.push({
      id: `audit-${entry.id}`,
      icon: mapped.icon,
      description: entry.description,
      staff: entry.staffName,
      at: safeDate(entry.timestamp, shiftMinutes(start, -1)),
      tone: mapped.tone,
    });
  });

  // Check-in
  if (checkedIn) {
    rows.push({
      id: "checkin",
      icon: LogIn,
      description: "Checked in",
      staff: primaryStaff,
      at: start,
      tone: "success",
    });
  }

  // Add-ons updated (completed)
  addOns
    .filter((addOn) => addOn.status === "completed")
    .forEach((addOn, index) => {
      rows.push({
        id: `addon-${addOn.id}`,
        icon: Sparkles,
        description: `Add-on “${addOn.name}” marked complete`,
        staff: addOn.assignedStaff ?? primaryStaff,
        at: safeDate(addOn.scheduledAt, shiftMinutes(start, 30 * (index + 1))),
        tone: "success",
      });
    });

  // Checkout / completed
  if (event.completedAt) {
    rows.push({
      id: "checkout",
      icon: LogOut,
      description: "Checked out — completed",
      staff: event.completedByName ?? primaryStaff,
      at: safeDate(event.completedAt, shiftMinutes(start, 120)),
      tone: "success",
    });
  }

  // Note added
  if (note.content && note.lastEditedBy) {
    rows.push({
      id: "note",
      icon: StickyNote,
      description: "Note added",
      staff: note.lastEditedBy,
      at: safeDate(note.lastEditedAt, shiftMinutes(start, 130)),
      tone: "default",
    });
  }

  // Owner notifications sent from the drawer (spec 8.7 / Table 92 → A3)
  notifications.forEach((notification) => {
    const channelLabel = notification.channel === "sms" ? "SMS" : "Email";
    const preview =
      notification.body.length > 60
        ? `${notification.body.slice(0, 60)}…`
        : notification.body;
    rows.push({
      id: `notif-${notification.id}`,
      icon: notification.channel === "sms" ? MessageSquare : Mail,
      description: `${channelLabel} sent — “${preview}”`,
      staff: notification.sentBy,
      at: safeDate(notification.sentAt, new Date()),
      tone: "default",
    });
  });

  return rows.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function HistoryTab({
  event,
  booking,
  addOns,
  note,
  checkedIn,
}: {
  event: OperationsCalendarEvent;
  booking?: Booking;
  addOns: BookingDrawerAddOnItem[];
  note: NoteSectionState;
  checkedIn: boolean;
}) {
  const notifications = useEventNotifications(event.id);
  const rows = buildHistoryRows(
    event,
    booking,
    addOns,
    note,
    checkedIn,
    notifications,
  );

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <li key={row.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${HISTORY_TONE_CLASS[row.tone]}`}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 border-b border-slate-100 pb-3">
              <p className="text-sm text-slate-800">{row.description}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {row.staff} · {formatLocalDateTime(row.at.toISOString())}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ═══════════════════════════════════════════════════
   Shared bits
   ═══════════════════════════════════════════════════ */

function QuickInfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
        <Icon className="size-3" />
        {label}
      </p>
      <p
        className="mt-0.5 truncate text-xs font-semibold text-slate-800"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Lead-review banner (Task 11 / Table 72)
   ═══════════════════════════════════════════════════ */

function LeadReviewBanner({
  lead,
  source,
  fallbackName,
}: {
  lead?: CapturedLead;
  source?: string;
  fallbackName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: lead?.name ?? fallbackName,
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    petName: lead?.petName ?? "",
  });

  const save = () => {
    if (lead) {
      updateCapturedLead(lead.id, {
        name: draft.name.trim() || fallbackName,
        email: draft.email.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        petName: draft.petName.trim() || undefined,
      });
    }
    setEditing(false);
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">
            New Lead from {source ?? "external calendar"}
          </p>
          <p className="text-xs text-amber-700">
            Customer record created — review and confirm.
          </p>
          {lead?.possibleDuplicate && (
            <p className="mt-1 text-[11px] font-medium text-amber-800">
              ⚠ Possible duplicate — verify against existing customers.
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-2.5 space-y-2">
          <Input
            value={draft.name}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Name"
            className="bg-white"
          />
          <Input
            value={draft.email}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                email: event.target.value,
              }))
            }
            placeholder="Email"
            className="bg-white"
          />
          <Input
            value={draft.phone}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                phone: event.target.value,
              }))
            }
            placeholder="Phone"
            className="bg-white"
          />
          <Input
            value={draft.petName}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                petName: event.target.value,
              }))
            }
            placeholder="Pet name"
            className="bg-white"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 space-y-1 rounded-md border border-amber-200 bg-white/70 px-3 py-2 text-xs">
          <LeadRow label="Name" value={lead?.name ?? fallbackName} />
          {lead?.email && <LeadRow label="Email" value={lead.email} />}
          {lead?.phone && <LeadRow label="Phone" value={lead.phone} />}
          {lead?.petName && <LeadRow label="Pet" value={lead.petName} />}
          <LeadRow label="Status" value={lead?.status ?? "Lead — Unverified"} />
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-amber-700 hover:underline"
            >
              Edit Customer Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="truncate text-right font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}
