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
import type { ManualFacilityEvent } from "@/lib/operations-calendar";

export interface NewEventSeed {
  date: string;
  time: string;
}

interface CustomEventDraft {
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
}

interface BlockTimeDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  recurrence: NonNullable<ManualFacilityEvent["recurrence"]>;
  affects: NonNullable<ManualFacilityEvent["affects"]>;
  resource: string;
  staff: string;
}

type CreateMode = "custom-event" | "block-time" | null;

interface OperationsCalendarNewEventMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: NewEventSeed;
  quickCreateNonce?: number;
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
      setMode("custom-event");
      setDialogOpen(true);
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
      visibility: customDraft.visibility,
      visibleRoles:
        customDraft.visibility === "selected-roles"
          ? customDraft.selectedRoles
          : [],
    });

    setDialogOpen(false);
    setMode(null);
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
                  placeholder="Duration (minutes)"
                  disabled={customDraft.allDay}
                />

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
    </>
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
