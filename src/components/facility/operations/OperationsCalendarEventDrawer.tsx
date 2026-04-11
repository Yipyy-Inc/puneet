"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { FacilityTask } from "@/data/facility-tasks";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import type { ManualFacilityEvent, OperationsCalendarEvent } from "@/lib/operations-calendar";
import {
  canEditBookingNotes,
  canEditPersistentNotes,
  formatCurrency,
  formatLocalDateTime,
  getAgreementStatus,
  getCustomerTagDetails,
  getLastVisitDate,
  getPetTagDetails,
  getServiceHistorySummary,
  getVaccineRows,
  isManagerOrAdminRole,
  parseManualEventLabel,
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
  onAssignStaff: (bookingId: number, primary: string, secondary?: string) => void;
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
  onUpdateManualEvent: (eventId: string, updates: Partial<ManualFacilityEvent>) => void;
  onDeleteManualEvent: (eventId: string) => void;
}

function resolvePrimaryBookingPetId(petId: Booking["petId"]): number | undefined {
  if (Array.isArray(petId)) {
    return petId[0];
  }
  return petId;
}

export function OperationsCalendarEventDrawer({
  open,
  event,
  userRole,
  userDisplayName,
  readOnlyMode,
  canCompleteTasks,
  canCheckInOut,
  canEditBookingActions,
  canManageCustomEvents,
  supportsCheckInOut,
  showAddOnsTab = true,
  booking,
  client,
  pet,
  task,
  taskSeries,
  bookingTasks,
  bookingAddOns,
  bookingsForPet,
  bookingTab,
  onBookingTabChange,
  notesState,
  staffOptions,
  managerAlertCount,
  onClose,
  onOpenLinkedBooking,
  onCheckInBooking,
  onCheckOutBooking,
  onAssignStaff,
  onMarkTaskComplete,
  onMarkAllBookingTasksComplete,
  onAddBookingTask,
  onAddBookingAddOn,
  onUpdateBookingAddOn,
  onRemoveBookingAddOn,
  onUpdateNotes,
  onMessageCustomer,
  onRescheduleBooking,
  onCancelBooking,
  onUpdateManualEvent,
  onDeleteManualEvent,
}: OperationsCalendarEventDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onEscape = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        onClose();
      }
    };

    const onOutsidePointer = (mouseEvent: MouseEvent) => {
      const target = mouseEvent.target as Node | null;
      if (target && panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("keydown", onEscape);
    document.addEventListener("mousedown", onOutsidePointer, true);

    return () => {
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("mousedown", onOutsidePointer, true);
    };
  }, [open, onClose]);

  if (!open || !event) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <aside
        ref={panelRef}
        className="pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Calendar Event</p>
            <h2 className="text-base font-semibold text-slate-900">{event.title}</h2>
            <p className="text-xs text-slate-500">{event.type.replace(/-/g, " ")}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </header>

        {event.type === "booking" && booking && (
          <BookingDrawerContent
            booking={booking}
            client={client}
            pet={pet}
            bookingTasks={bookingTasks}
            bookingAddOns={bookingAddOns}
            bookingsForPet={bookingsForPet}
            bookingTab={bookingTab}
            onBookingTabChange={onBookingTabChange}
            notesState={notesState}
            userRole={userRole}
            userDisplayName={userDisplayName}
            readOnlyMode={readOnlyMode}
            canCompleteTasks={canCompleteTasks}
            canCheckInOut={canCheckInOut}
            canEditBookingActions={canEditBookingActions}
            supportsCheckInOut={supportsCheckInOut}
            showAddOnsTab={showAddOnsTab}
            staffOptions={staffOptions}
            onCheckInBooking={onCheckInBooking}
            onCheckOutBooking={onCheckOutBooking}
            onAssignStaff={onAssignStaff}
            onMarkTaskComplete={onMarkTaskComplete}
            onMarkAllBookingTasksComplete={onMarkAllBookingTasksComplete}
            onAddBookingTask={onAddBookingTask}
            onAddBookingAddOn={onAddBookingAddOn}
            onUpdateBookingAddOn={onUpdateBookingAddOn}
            onRemoveBookingAddOn={onRemoveBookingAddOn}
            onUpdateNotes={onUpdateNotes}
            onMessageCustomer={onMessageCustomer}
            onRescheduleBooking={onRescheduleBooking}
            onCancelBooking={onCancelBooking}
          />
        )}

        {event.type === "task" && task && (
          <TaskDrawerContent
            task={task}
            taskSeries={taskSeries}
            managerAlertCount={managerAlertCount}
            onMarkTaskComplete={onMarkTaskComplete}
            onOpenLinkedBooking={onOpenLinkedBooking}
            canCompleteTasks={canCompleteTasks}
          />
        )}

        {event.type === "facility-event" && (
          <FacilityEventDrawerContent
            event={event}
            userRole={userRole}
            onUpdateManualEvent={onUpdateManualEvent}
            onDeleteManualEvent={onDeleteManualEvent}
            canManageCustomEvents={canManageCustomEvents}
          />
        )}
      </aside>
    </div>
  );
}

function BookingDrawerContent({
  booking,
  client,
  pet,
  bookingTasks,
  bookingAddOns,
  bookingsForPet,
  bookingTab,
  onBookingTabChange,
  notesState,
  userRole,
  userDisplayName,
  readOnlyMode,
  canCompleteTasks,
  canCheckInOut,
  canEditBookingActions,
  supportsCheckInOut,
  showAddOnsTab,
  staffOptions,
  onCheckInBooking,
  onCheckOutBooking,
  onAssignStaff,
  onMarkTaskComplete,
  onMarkAllBookingTasksComplete,
  onAddBookingTask,
  onAddBookingAddOn,
  onUpdateBookingAddOn,
  onRemoveBookingAddOn,
  onUpdateNotes,
  onMessageCustomer,
  onRescheduleBooking,
  onCancelBooking,
}: {
  booking: Booking;
  client?: Client;
  pet?: Pet;
  bookingTasks: FacilityTask[];
  bookingAddOns: BookingDrawerAddOnItem[];
  bookingsForPet: Booking[];
  bookingTab: BookingDrawerTab;
  onBookingTabChange: (tab: BookingDrawerTab) => void;
  notesState: OperationsCalendarEventDrawerProps["notesState"];
  userRole: string;
  userDisplayName: string;
  readOnlyMode: boolean;
  canCompleteTasks: boolean;
  canCheckInOut: boolean;
  canEditBookingActions: boolean;
  supportsCheckInOut?: boolean;
  showAddOnsTab: boolean;
  staffOptions: string[];
  onCheckInBooking: (bookingId: number) => void;
  onCheckOutBooking: (bookingId: number) => void;
  onAssignStaff: (bookingId: number, primary: string, secondary?: string) => void;
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
}) {
  const [newAddOnName, setNewAddOnName] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskTime, setTaskTime] = useState("10:00");
  const [taskAssignee, setTaskAssignee] = useState("Unassigned");

  const bookingPetId = resolvePrimaryBookingPetId(booking.petId);

  const petTags = getPetTagDetails(bookingPetId);
  const customerTags = getCustomerTagDetails(booking.clientId);
  const vaccines = getVaccineRows(bookingPetId, booking.service);
  const agreementStatus = getAgreementStatus(booking.clientId);
  const lastVisit = getLastVisitDate(bookingsForPet, bookingPetId);
  const history = getServiceHistorySummary(bookingsForPet, bookingPetId);
  const assignedStaff = [booking.stylistPreference, booking.trainerId].filter(Boolean) as string[];

  const canEditBooking = canEditBookingNotes(userRole, assignedStaff);
  const canEditPersistent = canEditPersistentNotes(userRole);
  const supportsCheckIn =
    supportsCheckInOut ??
    ["boarding", "daycare", "grooming", "evaluation"].includes(
      booking.service.toLowerCase(),
    );

  const openTaskCount = bookingTasks.filter((task) => task.status !== "completed").length;

  const statusLabel = booking.status === "in_progress"
    ? "Checked-in"
    : booking.status === "completed"
      ? "Checked-out"
      : booking.status === "cancelled"
        ? "Cancelled"
        : booking.status === "pending"
          ? "Pending"
          : "Confirmed";

  return (
    <>
      <Tabs value={bookingTab} onValueChange={(value) => onBookingTabChange(value as BookingDrawerTab)} className="flex flex-1 flex-col overflow-hidden">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="pet-details">Pet Details</TabsTrigger>
          {showAddOnsTab && <TabsTrigger value="addons">Add-Ons</TabsTrigger>}
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24">
          <TabsContent value="summary" className="space-y-3 pt-3">
            <Badge variant="outline">{statusLabel}</Badge>
            <DetailRow
              label="Pet"
              value={
                pet?.name ??
                (bookingPetId !== undefined ? bookingPetId.toString() : "-")
              }
            />
            <DetailRow label="Owner" value={client?.name ?? "Unknown"} />
            <DetailRow label="Contact" value={client?.phone ?? client?.email ?? "-"} />
            <DetailRow label="Service" value={booking.service} />
            <DetailRow label="Date" value={`${booking.startDate} to ${booking.endDate}`} />
            <DetailRow label="Time" value={`${booking.checkInTime ?? "-"} to ${booking.checkOutTime ?? "-"}`} />
            <DetailRow label="Assigned staff" value={assignedStaff.join(", ") || "Unassigned"} />
            <DetailRow label="Location" value={booking.kennel ?? "Facility"} />
            <DetailRow label="Booking ID" value={booking.id.toString()} />
            <DetailRow label="Confirmation" value={booking.invoice?.id ?? "-"} />
            <div>
              <p className="text-xs font-medium text-slate-700">Add-on snapshot</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {bookingAddOns.slice(0, 5).map((addOn) => (
                  <Badge key={addOn.id} variant="outline">{addOn.name}</Badge>
                ))}
                {bookingAddOns.length === 0 && <p className="text-xs text-slate-500">No add-ons</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">Open tasks</p>
              <Badge className="mt-1" variant="outline">{openTaskCount}</Badge>
            </div>
          </TabsContent>

          <TabsContent value="pet-details" className="space-y-3 pt-3">
            <DetailRow label="Breed" value={pet?.breed ?? "-"} />
            <DetailRow label="Age" value={pet ? `${pet.age} yrs` : "-"} />
            <DetailRow label="Weight" value={pet ? `${pet.weight} lb` : "-"} />
            <DetailRow label="Sex" value={pet?.sex ?? "-"} />
            <DetailRow label="Altered" value={pet?.spayedNeutered ? "Yes" : "No"} />

            <div>
              <p className="text-xs font-medium text-slate-700">Pet tags</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {petTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: `${tag.color}22`, borderColor: `${tag.color}66`, color: tag.color }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-700">Customer tags</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {customerTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: `${tag.color}22`, borderColor: `${tag.color}66`, color: tag.color }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            {(pet?.allergies || pet?.specialNeeds || petTags.some((tag) => tag.priority !== "informational")) && (
              <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">Active alerts</p>
                {pet?.allergies && <p className="text-xs text-amber-700">Medical: {pet.allergies}</p>}
                {pet?.specialNeeds && <p className="text-xs text-amber-700">Handling: {pet.specialNeeds}</p>}
                {petTags.filter((tag) => tag.priority !== "informational").map((tag) => (
                  <p key={tag.id} className="text-xs text-amber-700">Behavior: {tag.name}</p>
                ))}
              </div>
            )}

            <div className="space-y-1 rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">Vaccine status</p>
              {vaccines.map((vaccine) => (
                <div key={vaccine.vaccineName} className="flex items-center justify-between text-xs">
                  <span>{vaccine.vaccineName}</span>
                  <span className={vaccine.status === "valid" ? "text-emerald-600" : "text-rose-600"}>
                    {vaccine.status === "valid" ? "Valid" : vaccine.status === "expired" ? "Expired" : "Missing"}
                    {vaccine.expiryDate ? ` • ${vaccine.expiryDate}` : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-slate-200 p-3 text-xs">
              <p className="font-semibold text-slate-700">Agreement / waiver</p>
              <p className={agreementStatus.signed ? "text-emerald-600" : "text-rose-600"}>
                {agreementStatus.signed ? "Signed" : "Unsigned"}
              </p>
              {agreementStatus.latestSignedAt && (
                <p className="text-slate-500">Signed on {formatLocalDateTime(agreementStatus.latestSignedAt)}</p>
              )}
            </div>

            <div className="rounded-md border border-slate-200 p-3 text-xs text-slate-700">
              <p>Last visit: {lastVisit ?? "-"}</p>
              <p className="mt-1">History: {history}</p>
            </div>
          </TabsContent>

          {showAddOnsTab && (
            <TabsContent value="addons" className="space-y-3 pt-3">
            {bookingAddOns.map((addOn) => (
              <div key={addOn.id} className="space-y-2 rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{addOn.name}</p>
                  <Button variant="ghost" size="sm" onClick={() => onRemoveBookingAddOn(booking.id, addOn.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    type="time"
                    value={addOn.scheduledAt ?? ""}
                    onChange={(event) =>
                      onUpdateBookingAddOn(booking.id, addOn.id, {
                        scheduledAt: event.target.value,
                      })
                    }
                  />
                  <Select
                    value={addOn.assignedStaff || "Unassigned"}
                    onValueChange={(value) =>
                      onUpdateBookingAddOn(booking.id, addOn.id, {
                        assignedStaff: value === "Unassigned" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unassigned">Unassigned</SelectItem>
                      {staffOptions.map((staff) => (
                        <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={addOn.status}
                    onValueChange={(value) =>
                      onUpdateBookingAddOn(booking.id, addOn.id, {
                        status: value as BookingDrawerAddOnItem["status"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3">
              <Input
                placeholder="Add-on name"
                value={newAddOnName}
                onChange={(event) => setNewAddOnName(event.target.value)}
              />
              <Button
                size="sm"
                  disabled={readOnlyMode || !canEditBookingActions}
                onClick={() => {
                  if (!newAddOnName.trim()) return;
                  onAddBookingAddOn(booking.id, {
                    id: `addon-${Date.now()}`,
                    name: newAddOnName.trim(),
                    status: "pending",
                  });
                  setNewAddOnName("");
                }}
              >
                <Plus className="mr-1 size-3.5" />
                Add
              </Button>
            </div>
            </TabsContent>
          )}

          <TabsContent value="tasks" className="space-y-3 pt-3">
            {bookingTasks.map((taskItem) => (
              <label
                key={taskItem.id}
                className={`flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${
                  taskItem.status === "overdue" ? "border-rose-300 bg-rose-50" : "border-slate-200"
                }`}
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{taskItem.name}</p>
                  <p className="text-xs text-slate-600">
                    {taskItem.assignedToName ?? "Unassigned"} • {taskItem.scheduledTime}
                  </p>
                  {taskItem.completedAt && (
                    <p className="text-xs text-emerald-600">
                      Completed {formatLocalDateTime(taskItem.completedAt)}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={taskItem.status === "completed" ? "secondary" : "outline"}
                  disabled={!canCompleteTasks || readOnlyMode}
                  onClick={() => onMarkTaskComplete(taskItem.id)}
                >
                  {taskItem.status === "completed" ? "Done" : "Mark complete"}
                </Button>
              </label>
            ))}

            {showTaskForm && (
              <div className="space-y-2 rounded-md border border-dashed border-slate-300 p-3">
                <Input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Task name" />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} />
                  <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unassigned">Unassigned</SelectItem>
                      {staffOptions.map((staff) => (
                        <SelectItem key={staff} value={staff}>{staff}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={readOnlyMode || !canEditBookingActions}
                  onClick={() => {
                    if (!taskName.trim()) return;
                    onAddBookingTask(booking.id, {
                      name: taskName.trim(),
                      scheduledTime: taskTime,
                      assignedToName: taskAssignee === "Unassigned" ? undefined : taskAssignee,
                      category: "care",
                    });
                    setTaskName("");
                    setShowTaskForm(false);
                  }}
                >
                  Save task
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-3 pt-3">
            <NotesEditor
              title="Booking notes"
              helper="Editable by assigned staff and above"
              value={notesState.booking.content}
              canEdit={canEditBooking && !readOnlyMode}
              lastEditedBy={notesState.booking.lastEditedBy}
              lastEditedAt={notesState.booking.lastEditedAt}
              onSave={(content) => onUpdateNotes("booking", content, userDisplayName)}
            />
            <NotesEditor
              title="Pet notes"
              helper="Managers and admins can edit"
              value={notesState.pet.content}
              canEdit={canEditPersistent && !readOnlyMode}
              lastEditedBy={notesState.pet.lastEditedBy}
              lastEditedAt={notesState.pet.lastEditedAt}
              onSave={(content) => onUpdateNotes("pet", content, userDisplayName)}
            />
            <NotesEditor
              title="Customer notes"
              helper="Managers and admins can edit"
              value={notesState.customer.content}
              canEdit={canEditPersistent && !readOnlyMode}
              lastEditedBy={notesState.customer.lastEditedBy}
              lastEditedAt={notesState.customer.lastEditedAt}
              onSave={(content) => onUpdateNotes("customer", content, userDisplayName)}
            />
          </TabsContent>

          <TabsContent value="billing" className="space-y-3 pt-3 text-sm">
            <DetailRow label="Total value" value={formatCurrency(booking.invoice?.total)} />
            <DetailRow
              label="Amount paid"
              value={formatCurrency((booking.invoice?.total ?? 0) - (booking.invoice?.remainingDue ?? 0))}
            />
            <DetailRow label="Amount due" value={formatCurrency(booking.invoice?.remainingDue)} />
            <DetailRow
              label="Deposit status"
              value={
                (booking.invoice?.depositCollected ?? 0) === 0
                  ? "Pending"
                  : booking.invoice?.remainingDue
                    ? "Paid"
                    : "Paid"
              }
            />
            <DetailRow
              label="Payment method"
              value={booking.invoice?.payments.at(-1)?.method ?? "On file - unknown"}
            />
            {(booking.invoice?.remainingDue ?? 0) > 0 && (
              <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
                Outstanding balance present
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/facility/dashboard/services/retail?bookingId=${booking.id}`, "_blank")}
            >
              Open full invoice in POS
            </Button>
          </TabsContent>
        </div>
      </Tabs>

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {supportsCheckIn && booking.status === "confirmed" && (
            <Button
              size="sm"
              disabled={!canCheckInOut || readOnlyMode}
              onClick={() => onCheckInBooking(booking.id)}
            >
              Check-in
            </Button>
          )}
          {supportsCheckIn && booking.status === "in_progress" && (
            <Button
              size="sm"
              disabled={!canCheckInOut || readOnlyMode}
              onClick={() => onCheckOutBooking(booking.id)}
            >
              Check-out
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={!canEditBookingActions || readOnlyMode}
            onClick={() => {
              const primary = window.prompt("Primary staff", assignedStaff[0] ?? "Unassigned") ?? "Unassigned";
              const secondary = window.prompt("Secondary staff (optional)", "") ?? "";
              onAssignStaff(booking.id, primary, secondary || undefined);
            }}
          >
            Assign staff
          </Button>

          {showAddOnsTab && (
            <Button
              size="sm"
              variant="outline"
              disabled={!canEditBookingActions || readOnlyMode}
              onClick={() => onBookingTabChange("addons")}
            >
              Add / remove add-ons
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={!canEditBookingActions || readOnlyMode}
            onClick={() => {
              onBookingTabChange("tasks");
              setShowTaskForm(true);
            }}
          >
            Add task
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canEditBookingActions || readOnlyMode}
            onClick={() => onMessageCustomer(booking.id)}
          >
            <MessageSquare className="mr-1 size-3.5" />
            Message customer
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canCompleteTasks || readOnlyMode}
            onClick={() => onMarkAllBookingTasksComplete(booking.id)}
          >
            Mark tasks complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canEditBookingActions || readOnlyMode}
            onClick={() => onRescheduleBooking(booking.id)}
          >
            Reschedule
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!canEditBookingActions || readOnlyMode}
            onClick={() => {
              const reason = window.prompt("Cancellation reason", "Customer request") ?? "Customer request";
              onCancelBooking(booking.id, reason);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}

function TaskDrawerContent({
  task,
  taskSeries,
  managerAlertCount,
  onMarkTaskComplete,
  onOpenLinkedBooking,
  canCompleteTasks,
}: {
  task: FacilityTask;
  taskSeries: FacilityTask[];
  managerAlertCount: number;
  onMarkTaskComplete: (taskId: string, allowEarly?: boolean) => void;
  onOpenLinkedBooking: (bookingId: number) => void;
  canCompleteTasks: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
      <div className="space-y-3">
        <Button disabled={!canCompleteTasks} onClick={() => onMarkTaskComplete(task.id)}>
          <CheckCircle2 className="mr-2 size-4" />
          Mark complete
        </Button>

        <DetailRow label="Task type" value={task.category} />
        <DetailRow label="Linked pet" value={task.petName} />
        <DetailRow label="Assigned staff" value={task.assignedToName ?? "Unassigned"} />
        <DetailRow label="Due" value={`${task.scheduledDate} ${task.scheduledTime}`} />
        <DetailRow label="Status" value={task.status} />

        <div className="rounded-md border border-slate-200 p-3 text-xs text-slate-700">
          <p className="font-semibold">Instructions</p>
          <p className="mt-1">{task.description ?? "No additional instructions"}</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => onOpenLinkedBooking(task.bookingId)}>
          Open linked booking
        </Button>

        {managerAlertCount > 0 && (
          <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700">
            {managerAlertCount} overdue task alert(s) currently active for manager/admin review.
          </div>
        )}

        <Separator />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">Next occurrences</p>
          {taskSeries.map((seriesItem) => (
            <div key={seriesItem.id} className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-xs">
              <div>
                <p>{seriesItem.scheduledDate} {seriesItem.scheduledTime}</p>
                <p className="text-slate-500">{seriesItem.status}</p>
              </div>
              {seriesItem.status !== "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canCompleteTasks}
                  onClick={() => onMarkTaskComplete(seriesItem.id, true)}
                >
                  Complete early
                </Button>
              )}
            </div>
          ))}
          {taskSeries.length === 0 && <p className="text-xs text-slate-500">No recurring occurrences found.</p>}
        </div>
      </div>
    </div>
  );
}

function FacilityEventDrawerContent({
  event,
  userRole,
  onUpdateManualEvent,
  onDeleteManualEvent,
  canManageCustomEvents,
}: {
  event: OperationsCalendarEvent;
  userRole: string;
  onUpdateManualEvent: (eventId: string, updates: Partial<ManualFacilityEvent>) => void;
  onDeleteManualEvent: (eventId: string) => void;
  canManageCustomEvents: boolean;
}) {
  const [title, setTitle] = useState(event.title);
  const [details, setDetails] = useState(event.details ?? "");
  const [customerName, setCustomerName] = useState(event.customerName ?? "");
  const [petName, setPetName] = useState(event.petNames[0] ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const canEdit =
    canManageCustomEvents &&
    (isManagerOrAdminRole(userRole) || event.createdByRole === userRole);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
      <div className="space-y-3">
        <Badge variant="outline">{parseManualEventLabel({
          id: event.sourceId,
          title: event.title,
          subtype: event.subtype as ManualFacilityEvent["subtype"],
          start: event.start.toISOString(),
          end: event.end.toISOString(),
          allDay: event.allDay,
          location: event.location,
          staff: event.staff,
          status: event.status,
        })}</Badge>
        <DetailRow label="Time" value={`${event.start.toLocaleString()} - ${event.end.toLocaleString()}`} />
        <DetailRow label="Location" value={event.location} />
        <DetailRow label="Staff" value={event.staff} />
        <DetailRow label="Customer" value={customerName || "Not linked"} />
        <DetailRow label="Pet" value={petName || "Not linked"} />

        <Input value={title} onChange={(eventInput) => setTitle(eventInput.target.value)} disabled={!canEdit} />
        <Input
          value={details}
          onChange={(eventInput) => setDetails(eventInput.target.value)}
          disabled={!canEdit}
          placeholder="Details"
        />
        <Input
          value={customerName}
          onChange={(eventInput) => setCustomerName(eventInput.target.value)}
          disabled={!canEdit}
          placeholder="Customer"
        />
        <Input
          value={petName}
          onChange={(eventInput) => setPetName(eventInput.target.value)}
          disabled={!canEdit}
          placeholder="Pet"
        />
        <Textarea value={notes} onChange={(eventInput) => setNotes(eventInput.target.value)} disabled={!canEdit} />

        {canEdit && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                const recurrenceScope = window.prompt(
                  "Edit recurrence scope: one / future / all",
                  "one",
                );
                if (!recurrenceScope) return;
                onUpdateManualEvent(event.sourceId, {
                  title,
                  details,
                  notes,
                  linkedCustomerName: customerName,
                  linkedPetName: petName,
                });
              }}
            >
              Save changes
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                const warning =
                  event.subtype === "blocked-time"
                    ? "Removing this block will reopen availability for the affected time. Confirm?"
                    : "Delete this event?";
                if (!window.confirm(warning)) return;
                onDeleteManualEvent(event.sourceId);
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function NotesEditor({
  title,
  helper,
  value,
  canEdit,
  lastEditedBy,
  lastEditedAt,
  onSave,
}: {
  title: string;
  helper: string;
  value: string;
  canEdit: boolean;
  lastEditedBy: string;
  lastEditedAt: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500">{helper}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setDraft(`${draft} **bold**`)}>
          Bold
        </Button>
        <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setDraft(`${draft}\n`)}>
          New line
        </Button>
      </div>
      <Textarea
        className="min-h-24"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={!canEdit}
      />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Last edited by {lastEditedBy || "-"}</span>
        <span>{lastEditedAt ? formatLocalDateTime(lastEditedAt) : "-"}</span>
      </div>
      <Button size="sm" onClick={() => onSave(draft)} disabled={!canEdit}>
        Save notes
      </Button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
