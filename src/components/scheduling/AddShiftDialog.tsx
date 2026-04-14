"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { RecurrenceSection } from "@/components/scheduling/RecurrenceSection";
import { ConflictList } from "@/components/scheduling/ConflictList";
import { SkillMultiSelect } from "@/components/scheduling/SkillMultiSelect";
import { skillsCatalog } from "@/data/scheduling";
import { parseLocalDate, generateRecurringDates } from "@/lib/shift-recurrence";
import {
  detectShiftConflicts,
  hasBlockingConflict,
} from "@/lib/scheduling-conflicts";
import type {
  ScheduleEmployee,
  Position,
  ScheduleShift,
  ShiftRecurrence,
  EmployeeAvailability,
  EnhancedTimeOffRequest,
  SchedulingSettings,
} from "@/types/scheduling";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: ScheduleEmployee[];
  positions: Position[];
  departmentId: string;
  defaultDate?: string;
  defaultEmployeeId?: string;
  editingShift?: ScheduleShift | null;
  onSave: (shifts: Omit<ScheduleShift, "id">[]) => void;
  onDelete?: (shiftId: string) => void;
  /** Conflict-detection inputs — optional for backwards compat */
  allShifts?: ScheduleShift[];
  availabilities?: EmployeeAvailability[];
  timeOffRequests?: EnhancedTimeOffRequest[];
  schedulingSettings?: Pick<
    SchedulingSettings,
    "overtimeThresholdWeekly" | "minTimeBetweenShifts" | "maxConsecutiveDays"
  >;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddShiftDialog({
  open,
  onOpenChange,
  employees,
  positions,
  departmentId,
  defaultDate,
  defaultEmployeeId,
  editingShift,
  onSave,
  onDelete,
  allShifts,
  availabilities,
  timeOffRequests,
  schedulingSettings,
}: AddShiftDialogProps) {
  const isEditing = !!editingShift;

  const todayIso = new Date().toISOString().split("T")[0];
  const initialDate = editingShift?.date ?? defaultDate ?? todayIso;

  // ── Core fields
  const [employeeId, setEmployeeId] = useState(
    editingShift?.employeeId ?? defaultEmployeeId ?? "unassigned",
  );
  const [positionId, setPositionId] = useState(editingShift?.positionId ?? "");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(
    editingShift?.startTime ?? "09:00",
  );
  const [endTime, setEndTime] = useState(editingShift?.endTime ?? "17:00");
  const [breakMinutes, setBreakMinutes] = useState(
    editingShift?.breakMinutes?.toString() ?? "30",
  );
  const [notes, setNotes] = useState(editingShift?.notes ?? "");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(
    editingShift?.requiredSkills ?? [],
  );

  // ── Recurrence (new shifts only)
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] =
    useState<ShiftRecurrence["frequency"]>("weekly");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() => [
    parseLocalDate(initialDate).getDay(),
  ]);
  const [endsOn, setEndsOn] = useState<"never" | "date" | "count">("never");
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });
  const [occurrences, setOccurrences] = useState("12");

  // ── When date changes, sync default day selection if nothing is chosen
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (daysOfWeek.length === 0) {
      setDaysOfWeek([parseLocalDate(newDate).getDay()]);
    }
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  // ── Available positions: all dept positions, or filtered to employee's roles
  const selectedEmployee =
    employeeId !== "unassigned"
      ? employees.find((e) => e.id === employeeId)
      : undefined;
  const availablePositions = selectedEmployee
    ? positions.filter((p) => selectedEmployee.positionIds.includes(p.id))
    : positions;

  const handleEmployeeChange = (value: string) => {
    setEmployeeId(value);
    if (value !== "unassigned" && positionId) {
      const emp = employees.find((e) => e.id === value);
      if (emp && !emp.positionIds.includes(positionId)) setPositionId("");
    }
  };

  // ── Conflict detection (only runs when a real employee is assigned)
  const conflicts = useMemo(() => {
    if (
      employeeId === "unassigned" ||
      !selectedEmployee ||
      !positionId ||
      !date ||
      !startTime ||
      !endTime ||
      !allShifts ||
      !schedulingSettings
    ) {
      return [];
    }
    const availability = availabilities?.find(
      (a) => a.employeeId === selectedEmployee.id,
    );
    return detectShiftConflicts({
      shift: {
        id: editingShift?.id,
        employeeId: selectedEmployee.id,
        departmentId: selectedEmployee.departmentIds[0] ?? departmentId,
        positionId,
        date,
        startTime,
        endTime,
        breakMinutes: parseInt(breakMinutes) || 0,
        status: "draft",
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : undefined,
      },
      employee: selectedEmployee,
      allShifts,
      availability,
      timeOffRequests: timeOffRequests ?? [],
      settings: schedulingSettings,
    });
  }, [
    employeeId,
    selectedEmployee,
    positionId,
    date,
    startTime,
    endTime,
    breakMinutes,
    editingShift?.id,
    departmentId,
    allShifts,
    availabilities,
    timeOffRequests,
    schedulingSettings,
    requiredSkills,
  ]);

  const blocked = hasBlockingConflict(conflicts);

  // ── Save
  const canSave =
    !!positionId && !!date && !!startTime && !!endTime && !blocked;

  const handleSave = () => {
    if (!canSave) return;

    const resolvedEmployeeId =
      employeeId === "unassigned" ? undefined : employeeId;
    const employee = resolvedEmployeeId
      ? employees.find((e) => e.id === resolvedEmployeeId)
      : undefined;

    const base: Omit<ScheduleShift, "id" | "date"> = {
      employeeId: resolvedEmployeeId,
      departmentId: employee?.departmentIds[0] ?? departmentId,
      positionId,
      startTime,
      endTime,
      breakMinutes: parseInt(breakMinutes) || 0,
      notes: notes || undefined,
      status: "draft",
      requiredSkills: requiredSkills.length > 0 ? requiredSkills : undefined,
    };

    if (isEditing) {
      onSave([{ ...base, date }]);
    } else if (isRecurring) {
      const recurrence: ShiftRecurrence = {
        frequency,
        daysOfWeek:
          frequency === "weekly" || frequency === "biweekly"
            ? daysOfWeek
            : undefined,
        endsOn,
        endDate: endsOn === "date" ? endDate : undefined,
        count: endsOn === "count" ? parseInt(occurrences) || 1 : undefined,
      };
      const dates = generateRecurringDates(date, recurrence);
      const recurrenceId = `rec-${Date.now()}`;
      onSave(dates.map((d) => ({ ...base, date: d, recurrenceId })));
    } else {
      onSave([{ ...base, date }]);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[520px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-500">
              <Clock className="size-4 text-white" />
            </div>
            {isEditing ? "Edit Shift" : "Add New Shift"}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 py-2 pr-1">
            {/* ── Shift Details ───────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Shift Details
              </p>

              {/* Position (required) */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Briefcase className="size-3" /> Position
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Select value={positionId} onValueChange={setPositionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePositions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: pos.color }}
                          />
                          {pos.name}
                          {pos.hourlyRate && (
                            <Badge
                              variant="secondary"
                              className="ml-1 text-[10px]"
                            >
                              ${pos.hourlyRate}/hr
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee (optional) */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <User className="size-3" /> Assign Employee
                  <Badge
                    variant="outline"
                    className="ml-1 px-1.5 py-0 text-[9px]"
                  >
                    optional
                  </Badge>
                </Label>
                <Select value={employeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <div className="border-muted-foreground/50 flex size-5 items-center justify-center rounded-full border border-dashed">
                          <UserX className="text-muted-foreground size-3" />
                        </div>
                        <span className="text-muted-foreground">
                          Unassigned — Open Shift
                        </span>
                      </div>
                    </SelectItem>
                    {employees
                      .filter((e) => e.status === "active")
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5">
                              <AvatarFallback className="bg-linear-to-br from-indigo-400 to-purple-500 text-[8px] text-white">
                                {emp.initials}
                              </AvatarFallback>
                            </Avatar>
                            {emp.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* ── Schedule ────────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                Schedule
              </p>

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Calendar className="size-3" />
                  {isRecurring ? "Starting Date" : "Date"}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Break */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Break (minutes)
                </Label>
                <Input
                  type="number"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                  min={0}
                  max={120}
                  step={15}
                  className="w-32"
                />
              </div>

              {/* Required skills / certifications */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="size-3" /> Required skills /
                  certifications
                  <Badge
                    variant="outline"
                    className="ml-1 px-1.5 py-0 text-[9px]"
                  >
                    optional
                  </Badge>
                </Label>
                <SkillMultiSelect
                  skills={skillsCatalog}
                  value={requiredSkills}
                  onChange={setRequiredSkills}
                  placeholder="e.g. Opener, Medication Cert"
                />
              </div>
            </div>

            {/* ── Recurrence (new shifts only) ────────────────────────── */}
            {!isEditing && (
              <RecurrenceSection
                isRecurring={isRecurring}
                onIsRecurringChange={setIsRecurring}
                frequency={frequency}
                onFrequencyChange={setFrequency}
                daysOfWeek={daysOfWeek}
                onToggleDay={toggleDay}
                endsOn={endsOn}
                onEndsOnChange={setEndsOn}
                endDate={endDate}
                onEndDateChange={setEndDate}
                occurrences={occurrences}
                onOccurrencesChange={setOccurrences}
                startDate={date}
              />
            )}

            {conflicts.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                    Scheduling Conflicts
                  </p>
                  <ConflictList conflicts={conflicts} />
                </div>
              </>
            )}

            <Separator />

            {/* ── Notes ───────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <MessageSquare className="size-3" /> Notes (optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add shift notes or instructions..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="mt-2 shrink-0">
          <div className="flex w-full items-center justify-between">
            {isEditing && onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onDelete(editingShift!.id);
                  onOpenChange(false);
                }}
              >
                Delete Shift
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave}
                className="bg-linear-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
              >
                {isEditing
                  ? "Update Shift"
                  : isRecurring
                    ? "Add Recurring Shifts"
                    : "Add Shift"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
