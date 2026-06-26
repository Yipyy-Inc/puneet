"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FacilityTask } from "@/data/facility-tasks";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import type {
  ManualFacilityEvent,
  OperationsCalendarEvent,
} from "@/lib/operations-calendar";
import {
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

export function OperationsCalendarEventDrawer({
  open,
  event,
  readOnlyMode,
  canCompleteTasks,
  canCheckInOut,
  canEditBookingActions,
  booking,
  client,
  pet,
  bookingAddOns,
  onClose,
  onOpenLinkedBooking,
  onCheckInBooking,
  onCheckOutBooking,
  onAssignStaff,
  onMarkTaskComplete,
  onMessageCustomer,
  onRescheduleBooking,
  onCancelBooking,
}: OperationsCalendarEventDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 transition-all duration-300 ease-out"
        style={{
          backgroundColor: visible
            ? "rgba(15, 23, 42, 0.4)"
            : "rgba(15, 23, 42, 0)",
          backdropFilter: visible ? "blur(6px)" : "blur(0px)",
          WebkitBackdropFilter: visible ? "blur(6px)" : "blur(0px)",
        }}
      />

      {/* Center card */}
      <aside
        ref={panelRef}
        className="relative z-10 flex max-h-[85vh] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl transition-all duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.96) translateY(10px)",
        }}
      >
        <QuickActionCard
          event={event}
          booking={booking}
          client={client}
          pet={pet}
          bookingAddOns={bookingAddOns}
          readOnlyMode={readOnlyMode}
          canCompleteTasks={canCompleteTasks}
          canCheckInOut={canCheckInOut}
          canEditBookingActions={canEditBookingActions}
          onClose={onClose}
          onCheckInBooking={onCheckInBooking}
          onCheckOutBooking={onCheckOutBooking}
          onAssignStaff={onAssignStaff}
          onMarkTaskComplete={onMarkTaskComplete}
          onOpenLinkedBooking={onOpenLinkedBooking}
          onRescheduleBooking={onRescheduleBooking}
          onCancelBooking={onCancelBooking}
          onMessageCustomer={onMessageCustomer}
        />
      </aside>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Quick Action Card — unified lightweight view for ALL events
   ═══════════════════════════════════════════════════ */

function QuickActionCard({
  event,
  booking,
  client,
  pet,
  bookingAddOns,
  readOnlyMode,
  canCompleteTasks,
  canCheckInOut,
  canEditBookingActions,
  onClose,
  onCheckInBooking,
  onCheckOutBooking,
  onMarkTaskComplete,
  onRescheduleBooking,
  onCancelBooking,
}: {
  event: OperationsCalendarEvent;
  booking?: Booking;
  client?: Client;
  pet?: Pet;
  bookingAddOns: BookingDrawerAddOnItem[];
  readOnlyMode: boolean;
  canCompleteTasks: boolean;
  canCheckInOut: boolean;
  canEditBookingActions: boolean;
  onClose: () => void;
  onCheckInBooking: (bookingId: number) => void;
  onCheckOutBooking: (bookingId: number) => void;
  onAssignStaff: (
    bookingId: number,
    primary: string,
    secondary?: string,
  ) => void;
  onMarkTaskComplete: (taskId: string, allowEarly?: boolean) => void;
  onOpenLinkedBooking: (bookingId: number) => void;
  onRescheduleBooking: (bookingId: number) => void;
  onCancelBooking: (bookingId: number, reason: string) => void;
  onMessageCustomer: (bookingId: number) => void;
}) {
  const eventNumericId = event.bookingId ?? (Number(event.sourceId) || 0);
  const timeLabel = event.allDay
    ? "All day"
    : `${event.start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${event.end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  const rawStatus = event.bookingRawStatus ?? booking?.status ?? "";
  const isCheckedOut =
    rawStatus === "completed" ||
    rawStatus === "checked-out" ||
    rawStatus === "checked_out";
  const isCheckedIn = rawStatus === "in_progress" || rawStatus === "checked_in";
  const isConfirmed = rawStatus === "confirmed" || rawStatus === "scheduled";
  const isCancelled = rawStatus === "cancelled";
  const supportsCheckInOut = event.requiresCheckInOut !== false;

  const petName = pet?.name ?? event.petNames[0] ?? "-";
  const ownerName = client?.name ?? event.customerName ?? "-";
  const staffName =
    event.staff && event.staff !== "Unassigned" ? event.staff : "Unassigned";
  const location = event.location ?? "-";

  return (
    <>
      {/* ── Header ── */}
      <div className="border-b border-slate-100 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {event.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                {event.service}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {event.status}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="-mt-1 -mr-2 shrink-0"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        <InfoRow label="Pet" value={petName} />
        <InfoRow label="Owner" value={ownerName} />
        <InfoRow label="Time" value={timeLabel} />
        <InfoRow label="Staff" value={staffName} />
        <InfoRow label="Location" value={location} />

        {/* Add-ons */}
        {bookingAddOns.length > 0 && (
          <div className="pt-1">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Add-ons</p>
            <div className="flex flex-wrap gap-1.5">
              {bookingAddOns.map((addOn) => (
                <Badge
                  key={addOn.id}
                  variant="outline"
                  className={
                    addOn.status === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : ""
                  }
                >
                  {addOn.status === "completed" && (
                    <CheckCircle2 className="mr-1 size-3" />
                  )}
                  {addOn.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Completed info */}
        {event.completedAt && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Completed by {event.completedByName ?? "Staff"} at{" "}
            {formatLocalDateTime(event.completedAt)}
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
            {event.notes}
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <div className="flex flex-wrap gap-2">
          {/* Check-in / Check-out */}
          {supportsCheckInOut && isConfirmed && !isCancelled && (
            <Button
              size="sm"
              disabled={!canCheckInOut || readOnlyMode}
              onClick={() => onCheckInBooking(eventNumericId)}
            >
              Check-in
            </Button>
          )}
          {supportsCheckInOut && isCheckedIn && (
            <Button
              size="sm"
              disabled={!canCheckInOut || readOnlyMode}
              onClick={() => onCheckOutBooking(eventNumericId)}
            >
              Check-out
            </Button>
          )}

          {/* Mark complete — tasks and add-ons */}
          {event.type === "task" &&
            event.taskId &&
            event.status !== "Completed" && (
              <Button
                size="sm"
                disabled={!canCompleteTasks || readOnlyMode}
                onClick={() => onMarkTaskComplete(event.taskId!)}
              >
                <CheckCircle2 className="mr-1.5 size-3.5" />
                Mark complete
              </Button>
            )}

          {/* Reschedule */}
          {!isCheckedOut && !isCancelled && (
            <Button
              size="sm"
              variant="outline"
              disabled={!canEditBookingActions || readOnlyMode}
              onClick={() => onRescheduleBooking(eventNumericId)}
            >
              Reschedule
            </Button>
          )}

          {/* Cancel */}
          {!isCheckedOut && !isCancelled && (
            <Button
              size="sm"
              variant="destructive"
              disabled={!canEditBookingActions || readOnlyMode}
              onClick={() => {
                const reason =
                  window.prompt("Cancellation reason", "Customer request") ??
                  "Customer request";
                onCancelBooking(eventNumericId, reason);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
