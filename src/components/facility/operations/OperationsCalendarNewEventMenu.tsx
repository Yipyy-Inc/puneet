"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookPlus,
  CalendarClock,
  CalendarPlus,
  Lock,
  ShieldMinus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  EventReminder,
  ManualFacilityEvent,
  RecurrenceEnd,
  RecurrenceIntervalUnit,
} from "@/lib/operations-calendar";

// Curated 8-swatch palette for colour-coding custom events (Task 28).
const EVENT_COLOR_SWATCHES = [
  "#0284c7", // Sky
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f97316", // Orange
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#eab308", // Gold
  "#64748b", // Slate
];

export interface NewEventSeed {
  date: string;
  time: string;
}

/** Shared recurrence interval + end-condition draft fields (Tasks 26/27). */
interface RecurrenceDraft {
  recurrenceInterval: number;
  recurrenceIntervalUnit: RecurrenceIntervalUnit;
  recurrenceEndType: RecurrenceEnd["type"];
  recurrenceEndDate: string;
  recurrenceEndCount: number;
}

const RECURRENCE_DRAFT_DEFAULTS: RecurrenceDraft = {
  recurrenceInterval: 1,
  recurrenceIntervalUnit: "weeks",
  recurrenceEndType: "never",
  recurrenceEndDate: "",
  recurrenceEndCount: 10,
};

interface CustomEventDraft extends RecurrenceDraft {
  title: string;
  details: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  allDay: boolean;
  recurrence: NonNullable<ManualFacilityEvent["recurrence"]>;
  notes: string;
  linkedCustomerName: string;
  linkedPetName: string;
  assignedStaff: string;
  location: string;
  visibility: NonNullable<ManualFacilityEvent["visibility"]>;
  selectedRoles: string[];
  color: string;
  reminder: EventReminder;
  reminderSmsStaff: boolean;
}

interface BlockTimeDraft extends RecurrenceDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: NonNullable<ManualFacilityEvent["recurrence"]>;
  affects: NonNullable<ManualFacilityEvent["affects"]>;
  resource: string;
  staff: string;
}

/** Builds the ManualFacilityEvent recurrence fields from a draft. */
function buildRecurrenceFields(
  draft: RecurrenceDraft & { recurrence: string },
) {
  if (draft.recurrence === "none") {
    return {
      recurrenceInterval: undefined,
      recurrenceIntervalUnit: undefined,
      recurrenceEnd: undefined,
    };
  }
  const recurrenceEnd: RecurrenceEnd =
    draft.recurrenceEndType === "on"
      ? { type: "on", date: draft.recurrenceEndDate }
      : draft.recurrenceEndType === "after"
        ? { type: "after", count: draft.recurrenceEndCount }
        : { type: "never" };
  return {
    recurrenceInterval:
      draft.recurrence === "custom" ? draft.recurrenceInterval : undefined,
    recurrenceIntervalUnit:
      draft.recurrence === "custom" ? draft.recurrenceIntervalUnit : undefined,
    recurrenceEnd,
  };
}

type CreateMode = "custom-event" | "block-time" | null;

interface OperationsCalendarNewEventMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: NewEventSeed;
  quickCreateNonce?: number;
  quickCreateAnchor?: { x: number; y: number } | null;
  canCreateCustomEvent: boolean;
  canCreateBlockTime: boolean;
  canCreateBooking: boolean;
  canRecoverDeleted: boolean;
  staffOptions: string[];
  roleOptions: string[];
  onCreateBookingShortcut: (seed: NewEventSeed) => void;
  onCreateCustomEvent: (event: ManualFacilityEvent) => void;
  onCreateBlockTime: (event: ManualFacilityEvent) => void;
  onRecoverDeleted: () => void;
}

export function OperationsCalendarNewEventMenu({
  open,
  onOpenChange,
  seed,
  quickCreateNonce,
  quickCreateAnchor,
  canCreateCustomEvent,
  canCreateBlockTime,
  canCreateBooking,
  canRecoverDeleted,
  staffOptions,
  roleOptions,
  onCreateBookingShortcut,
  onCreateCustomEvent,
  onCreateBlockTime,
  onRecoverDeleted,
}: OperationsCalendarNewEventMenuProps) {
  const [mode, setMode] = useState<CreateMode>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const [customDraft, setCustomDraft] = useState<CustomEventDraft>({
    title: "",
    details: "",
    date: seed.date,
    startTime: seed.time,
    durationMinutes: 30,
    allDay: false,
    recurrence: "none",
    notes: "",
    linkedCustomerName: "",
    linkedPetName: "",
    assignedStaff: "",
    location: "",
    visibility: "all-staff",
    selectedRoles: [],
    color: EVENT_COLOR_SWATCHES[0],
    reminder: "none",
    reminderSmsStaff: false,
    ...RECURRENCE_DRAFT_DEFAULTS,
  });

  const [blockDraft, setBlockDraft] = useState<BlockTimeDraft>({
    title: "",
    date: seed.date,
    startTime: seed.time,
    endTime: shiftTime(seed.time, 60),
    recurrence: "none",
    affects: "facility",
    resource: "",
    staff: "",
    ...RECURRENCE_DRAFT_DEFAULTS,
  });

  const staffOptionsWithEmpty = useMemo(() => {
    return [
      "Unassigned",
      ...staffOptions.filter((name) => name !== "Unassigned"),
    ];
  }, [staffOptions]);

  useEffect(() => {
    if (!quickCreateNonce) return;

    if (canCreateCustomEvent) {
      // Seed a fresh custom draft from the clicked slot, then show the
      // lightweight quick-create popover (not the full modal).
      setCustomDraft((previous) => ({
        ...previous,
        title: "",
        details: "",
        date: seed.date,
        startTime: seed.time,
        durationMinutes: 30,
        notes: "",
        linkedCustomerName: "",
        linkedPetName: "",
        assignedStaff: "",
        location: "",
      }));
      setBlockDraft((previous) => ({
        ...previous,
        title: "",
        date: seed.date,
        startTime: seed.time,
        endTime: shiftTime(seed.time, 60),
        resource: "",
        staff: "",
      }));
      setDialogOpen(false);
      setQuickOpen(true);
      onOpenChange(false);
      return;
    }

    onOpenChange(true);
  }, [
    canCreateCustomEvent,
    onOpenChange,
    quickCreateNonce,
    seed.date,
    seed.time,
  ]);

  const openDialog = (nextMode: Exclude<CreateMode, null>) => {
    setCustomDraft((previous) => ({
      ...previous,
      title: "",
      details: "",
      date: seed.date,
      startTime: seed.time,
      durationMinutes: 30,
      notes: "",
      linkedCustomerName: "",
      linkedPetName: "",
      assignedStaff: "",
      location: "",
    }));
    setBlockDraft((previous) => ({
      ...previous,
      title: "",
      date: seed.date,
      startTime: seed.time,
      endTime: shiftTime(seed.time, 60),
      resource: "",
      staff: "",
    }));
    setMode(nextMode);
    setDialogOpen(true);
    onOpenChange(false);
  };

  const createCustomEvent = () => {
    if (!customDraft.title.trim()) {
      return;
    }

    const startTime = customDraft.allDay ? "00:00" : customDraft.startTime;
    const endTime = customDraft.allDay
      ? "23:59"
      : shiftTime(customDraft.startTime, customDraft.durationMinutes);

    onCreateCustomEvent({
      id: `custom-${Date.now()}`,
      kind: "custom-event",
      title: customDraft.title.trim(),
      details: customDraft.details.trim() || undefined,
      subtype: "custom-event",
      start: `${customDraft.date}T${startTime}:00`,
      end: `${customDraft.date}T${endTime}:00`,
      allDay: customDraft.allDay,
      location: customDraft.location || "Facility",
      staff: customDraft.assignedStaff || "Unassigned",
      status: "Scheduled",
      notes: customDraft.notes.trim() || undefined,
      linkedCustomerName: customDraft.linkedCustomerName.trim() || undefined,
      linkedPetName: customDraft.linkedPetName.trim() || undefined,
      recurrence: customDraft.recurrence,
      ...buildRecurrenceFields(customDraft),
      color: customDraft.color || undefined,
      reminder:
        customDraft.reminder === "none" ? undefined : customDraft.reminder,
      reminderSmsStaff:
        customDraft.reminder === "none"
          ? undefined
          : customDraft.reminderSmsStaff,
      visibility: customDraft.visibility,
      visibleRoles:
        customDraft.visibility === "selected-roles"
          ? customDraft.selectedRoles
          : [],
    });

    setDialogOpen(false);
    setMode(null);
  };

  // Quick-create popover → save the minimal event straight away.
  const saveQuickEvent = () => {
    if (!customDraft.title.trim()) return;
    createCustomEvent();
    setQuickOpen(false);
  };

  // Quick-create popover → escalate to the full modal (keeps the typed name).
  const openFullFromQuick = () => {
    setQuickOpen(false);
    setMode("custom-event");
    setDialogOpen(true);
  };

  const createBlockTime = () => {
    const start = `${blockDraft.date}T${blockDraft.startTime}:00`;
    const end = `${blockDraft.date}T${blockDraft.endTime}:00`;

    onCreateBlockTime({
      id: `block-${Date.now()}`,
      kind: "block-time",
      title: blockDraft.title.trim() || "Blocked time",
      subtype: "blocked-time",
      start,
      end,
      allDay: false,
      location:
        blockDraft.affects === "facility"
          ? "Entire facility"
          : blockDraft.affects === "resource"
            ? blockDraft.resource || "Resource"
            : blockDraft.staff || "Staff",
      staff:
        blockDraft.affects === "staff"
          ? blockDraft.staff || "Unassigned"
          : "Operations",
      status: "Planned",
      recurrence: blockDraft.recurrence,
      ...buildRecurrenceFields(blockDraft),
      affects: blockDraft.affects,
      affectedResource:
        blockDraft.affects === "resource" ? blockDraft.resource : undefined,
      affectedStaff:
        blockDraft.affects === "staff" ? blockDraft.staff : undefined,
      visibility: "all-staff",
    });

    setDialogOpen(false);
    setMode(null);
  };

  const customOnlyMode =
    canCreateCustomEvent &&
    !canCreateBlockTime &&
    !canCreateBooking &&
    !canRecoverDeleted;

  const yipyyPrimaryButtonClass =
    "gap-2 h-10 rounded-full px-6 font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-900/15 border border-sky-700/30 transition-all duration-300";

  return (
    <>
      {customOnlyMode ? (
        <Button
          className={yipyyPrimaryButtonClass}
          onClick={() => openDialog("custom-event")}
        >
          <CalendarPlus className="size-4" />
          New Event
        </Button>
      ) : (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button className={yipyyPrimaryButtonClass}>
              <CalendarPlus className="size-4" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            {canCreateCustomEvent && (
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => openDialog("custom-event")}
              >
                <CalendarClock className="size-4 text-slate-600" />
                Custom event
              </DropdownMenuItem>
            )}
            {canCreateBlockTime && (
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => openDialog("block-time")}
              >
                <ShieldMinus className="size-4 text-rose-600" />
                Block time
              </DropdownMenuItem>
            )}
            {canCreateBooking && (
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => onCreateBookingShortcut(seed)}
              >
                <BookPlus className="size-4 text-emerald-600" />
                Create booking
              </DropdownMenuItem>
            )}
            {canRecoverDeleted && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onSelect={onRecoverDeleted}>
                  <Lock className="size-4 text-slate-600" />
                  Recover last deleted event
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {mode === "custom-event" && (
            <>
              <DialogHeader>
                <DialogTitle>Create Custom Event</DialogTitle>
                <DialogDescription>
                  Non-booking events for reminders, meetings, and operational
                  planning.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={customDraft.title}
                  onChange={(event) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Name"
                  className="md:col-span-2"
                />

                <Input
                  value={customDraft.details}
                  onChange={(event) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      details: event.target.value,
                    }))
                  }
                  placeholder="Details"
                  className="md:col-span-2"
                />

                <DatePicker
                  value={customDraft.date}
                  onValueChange={(next) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      date: next,
                    }))
                  }
                  displayMode="dialog"
                  showQuickPresets={false}
                  popoverClassName="!w-[300px]"
                  calendarClassName="p-1 text-xs"
                />

                <TimePickerLux
                  value={customDraft.startTime}
                  onValueChange={(next) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      startTime: next,
                    }))
                  }
                  disabled={customDraft.allDay}
                  placeholder="Start time"
                />

                <Select
                  value={customDraft.assignedStaff || "Unassigned"}
                  onValueChange={(value) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      assignedStaff: value === "Unassigned" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffOptionsWithEmpty.map((staff) => (
                      <SelectItem key={staff} value={staff}>
                        {staff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={customDraft.linkedCustomerName}
                  onChange={(event) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      linkedCustomerName: event.target.value,
                    }))
                  }
                  placeholder="Customer (optional)"
                />

                <Input
                  value={customDraft.linkedPetName}
                  onChange={(event) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      linkedPetName: event.target.value,
                    }))
                  }
                  placeholder="Pet (optional)"
                />

                <div className="relative">
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={customDraft.durationMinutes}
                    onChange={(event) =>
                      setCustomDraft((previous) => ({
                        ...previous,
                        durationMinutes: Number(event.target.value),
                      }))
                    }
                    placeholder="Duration"
                    disabled={customDraft.allDay}
                    className="pr-16"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                    minutes
                  </span>
                </div>

                <Textarea
                  value={customDraft.notes}
                  onChange={(event) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-24 md:col-span-2"
                  placeholder="Notes"
                />

                <Select
                  value={customDraft.recurrence}
                  onValueChange={(value) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      recurrence: value as CustomEventDraft["recurrence"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom interval</SelectItem>
                  </SelectContent>
                </Select>

                <RecurrenceExtras
                  recurrence={customDraft.recurrence}
                  interval={customDraft.recurrenceInterval}
                  intervalUnit={customDraft.recurrenceIntervalUnit}
                  endType={customDraft.recurrenceEndType}
                  endDate={customDraft.recurrenceEndDate}
                  endCount={customDraft.recurrenceEndCount}
                  onPatch={(patch) =>
                    setCustomDraft((previous) => ({ ...previous, ...patch }))
                  }
                />

                {/* Colour picker — chosen colour drives the chip (Task 28) */}
                <div className="space-y-1.5 md:col-span-2">
                  <p className="text-xs font-medium text-slate-600">Colour</p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={`Colour ${swatch}`}
                        onClick={() =>
                          setCustomDraft((previous) => ({
                            ...previous,
                            color: swatch,
                          }))
                        }
                        className={cn(
                          "size-6 rounded-full ring-offset-1 transition-transform hover:scale-110",
                          customDraft.color === swatch &&
                            "ring-2 ring-slate-900",
                        )}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                </div>

                {/* Reminder — bell notification + optional staff SMS (Task 29) */}
                <Select
                  value={customDraft.reminder}
                  onValueChange={(value) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      reminder: value as EventReminder,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminder</SelectItem>
                    <SelectItem value="15m">15 minutes before</SelectItem>
                    <SelectItem value="30m">30 minutes before</SelectItem>
                    <SelectItem value="1h">1 hour before</SelectItem>
                    <SelectItem value="1d">1 day before</SelectItem>
                  </SelectContent>
                </Select>

                {customDraft.reminder !== "none" && (
                  <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
                    Also SMS assigned staff
                    <Switch
                      checked={customDraft.reminderSmsStaff}
                      onCheckedChange={(checked) =>
                        setCustomDraft((previous) => ({
                          ...previous,
                          reminderSmsStaff: checked,
                        }))
                      }
                    />
                  </label>
                )}

                <Input
                  value={customDraft.location}
                  onChange={(event) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Location (optional)"
                />

                <Select
                  value={customDraft.visibility}
                  onValueChange={(value) =>
                    setCustomDraft((previous) => ({
                      ...previous,
                      visibility: value as CustomEventDraft["visibility"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal-only">Internal only</SelectItem>
                    <SelectItem value="all-staff">
                      Visible to all staff
                    </SelectItem>
                    <SelectItem value="selected-roles">
                      Visible to selected roles
                    </SelectItem>
                  </SelectContent>
                </Select>

                <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
                  All day
                  <Switch
                    checked={customDraft.allDay}
                    onCheckedChange={(checked) =>
                      setCustomDraft((previous) => ({
                        ...previous,
                        allDay: checked,
                      }))
                    }
                  />
                </label>

                {customDraft.visibility === "selected-roles" && (
                  <div className="space-y-2 rounded-md border border-slate-200 p-3 md:col-span-2">
                    <p className="text-xs font-medium text-slate-700">
                      Visible roles
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {roleOptions.map((role) => {
                        const checked =
                          customDraft.selectedRoles.includes(role);
                        return (
                          <label
                            key={role}
                            className="flex items-center gap-2 text-xs text-slate-700"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                setCustomDraft((previous) => ({
                                  ...previous,
                                  selectedRoles: checked
                                    ? previous.selectedRoles.filter(
                                        (item) => item !== role,
                                      )
                                    : [...previous.selectedRoles, role],
                                }))
                              }
                            />
                            <span>{role}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createCustomEvent}>Create custom event</Button>
              </DialogFooter>
            </>
          )}

          {mode === "block-time" && (
            <>
              <DialogHeader>
                <DialogTitle>Create Block Time</DialogTitle>
                <DialogDescription>
                  Blocks booking availability for facilities, resources, or
                  staff.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={blockDraft.title}
                  onChange={(event) =>
                    setBlockDraft((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Title / reason"
                  className="md:col-span-2"
                />

                <DatePicker
                  value={blockDraft.date}
                  onValueChange={(next) =>
                    setBlockDraft((previous) => ({
                      ...previous,
                      date: next,
                    }))
                  }
                  displayMode="dialog"
                  showQuickPresets={false}
                  popoverClassName="!w-[300px]"
                  calendarClassName="p-1 text-xs"
                />

                <Select
                  value={blockDraft.recurrence}
                  onValueChange={(value) =>
                    setBlockDraft((previous) => ({
                      ...previous,
                      recurrence: value as BlockTimeDraft["recurrence"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom interval</SelectItem>
                  </SelectContent>
                </Select>

                <RecurrenceExtras
                  recurrence={blockDraft.recurrence}
                  interval={blockDraft.recurrenceInterval}
                  intervalUnit={blockDraft.recurrenceIntervalUnit}
                  endType={blockDraft.recurrenceEndType}
                  endDate={blockDraft.recurrenceEndDate}
                  endCount={blockDraft.recurrenceEndCount}
                  onPatch={(patch) =>
                    setBlockDraft((previous) => ({ ...previous, ...patch }))
                  }
                />

                <TimePickerLux
                  value={blockDraft.startTime}
                  onValueChange={(next) =>
                    setBlockDraft((previous) => ({
                      ...previous,
                      startTime: next,
                    }))
                  }
                  placeholder="Start time"
                />
                <TimePickerLux
                  value={blockDraft.endTime}
                  onValueChange={(next) =>
                    setBlockDraft((previous) => ({
                      ...previous,
                      endTime: next,
                    }))
                  }
                  placeholder="End time"
                />

                <Select
                  value={blockDraft.affects}
                  onValueChange={(value) =>
                    setBlockDraft((previous) => ({
                      ...previous,
                      affects: value as BlockTimeDraft["affects"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facility">Entire facility</SelectItem>
                    <SelectItem value="resource">Specific resource</SelectItem>
                    <SelectItem value="staff">Specific staff member</SelectItem>
                  </SelectContent>
                </Select>

                {blockDraft.affects === "resource" && (
                  <Input
                    value={blockDraft.resource}
                    onChange={(event) =>
                      setBlockDraft((previous) => ({
                        ...previous,
                        resource: event.target.value,
                      }))
                    }
                    placeholder="Resource (kennel, grooming room, pool, yard)"
                  />
                )}

                {blockDraft.affects === "staff" && (
                  <Select
                    value={blockDraft.staff || "Unassigned"}
                    onValueChange={(value) =>
                      setBlockDraft((previous) => ({
                        ...previous,
                        staff: value === "Unassigned" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOptionsWithEmpty.map((staff) => (
                        <SelectItem key={staff} value={staff}>
                          {staff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createBlockTime}>Create block time</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightweight quick-create popover (Task 30 / Table 25) */}
      <Popover open={quickOpen} onOpenChange={setQuickOpen}>
        <PopoverAnchor asChild>
          <div
            aria-hidden
            className="pointer-events-none fixed h-0 w-0"
            style={{
              left: quickCreateAnchor?.x ?? 0,
              top: quickCreateAnchor?.y ?? 0,
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          side="right"
          sideOffset={10}
          className="w-72 space-y-2.5"
        >
          <p className="text-xs font-semibold text-slate-700">
            Quick add event
          </p>
          <Input
            autoFocus
            value={customDraft.title}
            onChange={(event) =>
              setCustomDraft((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveQuickEvent();
              }
            }}
            placeholder="Event name"
          />
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CalendarClock className="size-3.5" />
            {formatQuickWhen(customDraft.date, customDraft.startTime)}
          </p>
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={openFullFromQuick}
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              More options
            </button>
            <Button
              size="sm"
              onClick={saveQuickEvent}
              disabled={!customDraft.title.trim()}
            >
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function formatQuickWhen(date: string, time: string): string {
  const parsed = new Date(`${date}T${time || "09:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;
  const dateLabel = parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} · ${timeLabel}`;
}

function RecurrenceExtras({
  recurrence,
  interval,
  intervalUnit,
  endType,
  endDate,
  endCount,
  onPatch,
}: {
  recurrence: ManualFacilityEvent["recurrence"];
  interval: number;
  intervalUnit: RecurrenceIntervalUnit;
  endType: RecurrenceEnd["type"];
  endDate: string;
  endCount: number;
  onPatch: (patch: Partial<RecurrenceDraft>) => void;
}) {
  if (!recurrence || recurrence === "none") return null;

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3 md:col-span-2">
      {/* Custom interval — "Every [X] [Days/Weeks/Months]" (Task 26) */}
      {recurrence === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Every</span>
          <Input
            type="number"
            min={1}
            value={interval}
            onChange={(event) =>
              onPatch({
                recurrenceInterval: Math.max(
                  1,
                  Number(event.target.value) || 1,
                ),
              })
            }
            className="w-20"
          />
          <Select
            value={intervalUnit}
            onValueChange={(value) =>
              onPatch({
                recurrenceIntervalUnit: value as RecurrenceIntervalUnit,
              })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* End Repeat — Never / On date / After N occurrences (Task 27) */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">End repeat</p>
        <Select
          value={endType}
          onValueChange={(value) =>
            onPatch({ recurrenceEndType: value as RecurrenceEnd["type"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="on">On date</SelectItem>
            <SelectItem value="after">After N occurrences</SelectItem>
          </SelectContent>
        </Select>

        {endType === "on" && (
          <DatePicker
            value={endDate}
            onValueChange={(next) => onPatch({ recurrenceEndDate: next })}
            displayMode="dialog"
            showQuickPresets={false}
            popoverClassName="!w-[300px]"
            calendarClassName="p-1 text-xs"
          />
        )}
        {endType === "after" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">After</span>
            <Input
              type="number"
              min={1}
              value={endCount}
              onChange={(event) =>
                onPatch({
                  recurrenceEndCount: Math.max(
                    1,
                    Number(event.target.value) || 1,
                  ),
                })
              }
              className="w-20"
            />
            <span className="text-xs text-slate-600">occurrences</span>
          </div>
        )}
      </div>
    </div>
  );
}

function shiftTime(time: string, minutesToAdd: number): string {
  const [hourRaw = "09", minuteRaw = "00"] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const now = new Date();
  now.setHours(
    Number.isNaN(hour) ? 9 : hour,
    Number.isNaN(minute) ? 0 : minute,
    0,
    0,
  );
  const shifted = new Date(now.getTime() + minutesToAdd * 60 * 1000);
  const shiftedHour = `${shifted.getHours()}`.padStart(2, "0");
  const shiftedMinute = `${shifted.getMinutes()}`.padStart(2, "0");
  return `${shiftedHour}:${shiftedMinute}`;
}
