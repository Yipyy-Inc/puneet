"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePermission } from "@/hooks/use-facility-rbac";
import {
  logShiftCreated,
  logShiftUpdated,
  logShiftDeleted,
  logShiftAssigned,
  logShiftUnassigned,
  logShiftMoved,
  logShiftCopied,
  logSchedulePublished,
  logDraftDiscarded,
  logOpenShiftPosted,
} from "@/lib/schedule-audit";
import {
  ScheduleHeader,
  type ViewMode,
} from "@/components/scheduling/ScheduleHeader";
import { ScheduleCalendar } from "@/components/scheduling/ScheduleCalendar";
import { ScheduleStats } from "@/components/scheduling/ScheduleStats";
import { DraftPublishBar } from "@/components/scheduling/DraftPublishBar";
import { AddShiftDialog } from "@/components/scheduling/AddShiftDialog";
import { SaveAsTemplateDialog } from "@/components/scheduling/SaveAsTemplateDialog";
import { TimeClock } from "@/components/scheduling/TimeClock";
import { PostShiftOpportunityDialog } from "@/components/scheduling/PostShiftOpportunityDialog";
import { ShiftOpportunityNotificationSettingsDialog } from "@/components/scheduling/ShiftOpportunityNotificationSettingsDialog";
import { DraftReviewSummary } from "@/components/scheduling/DraftReviewSummary";
import {
  employeeAvailabilities,
  shiftOpportunities as initialShiftOpportunities,
  shiftOpportunityNotificationSettings as initialNotifSettings,
} from "@/data/scheduling";
import {
  schedulingQueries,
  swapQueries,
  timeOffQueries,
  useCreateShift,
  useDeleteShift,
  usePublishSchedule,
  useUpdateShift,
} from "@/lib/api/scheduling";
import { staffQueries } from "@/lib/api/staff";
import { computeLaborCost, computeShiftHours } from "@/lib/scheduling-utils";
import type {
  Department,
  EnhancedTimeOffRequest,
  ScheduleEmployee,
  ScheduleShift,
  HolidayRate,
  TimeClockEntry,
  ShiftOpportunity,
  ShiftOpportunityNotificationSettings,
} from "@/types/scheduling";

// Mock holiday rates (dates near today: 2026-04-13)
const initialHolidayRates: HolidayRate[] = [
  {
    id: "holiday-1",
    date: "2026-04-14",
    name: "Easter Monday",
    multiplier: 1.5,
  },
  {
    id: "holiday-2",
    date: "2026-05-18",
    name: "Victoria Day",
    multiplier: 1.5,
  },
  {
    id: "holiday-3",
    date: "2026-07-01",
    name: "Canada Day",
    multiplier: 2.0,
  },
];

// Scheduling settings (matching schedulingSettingsSchema)
const schedulingSettings = {
  overtimeThresholdWeekly: 40,
  minTimeBetweenShifts: 8,
  maxConsecutiveDays: 6,
};

export function ScheduleView() {
  const { user } = useCurrentUser();
  // Section 5E — editing shifts (opening the edit dialog, drag move/copy)
  // requires scheduling_edit_shifts; creating requires scheduling_create_shifts.
  // All-access fallback keeps admin intact.
  const canEditShifts = usePermission("scheduling_edit_shifts");
  const canCreateShifts = usePermission("scheduling_create_shifts");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [defaultShiftDate, setDefaultShiftDate] = useState<string>();
  const [defaultShiftEmployee, setDefaultShiftEmployee] = useState<
    string | undefined
  >();
  const [holidayRates] = useState<HolidayRate[]>(initialHolidayRates);
  const [timeClockOpen, setTimeClockOpen] = useState(false);
  const [timeClockEntries, setTimeClockEntries] = useState<TimeClockEntry[]>(
    [],
  );

  // Shift opportunities state
  const [, setShiftOpportunities] = useState<ShiftOpportunity[]>(
    initialShiftOpportunities,
  );
  const [notifSettings, setNotifSettings] =
    useState<ShiftOpportunityNotificationSettings>(initialNotifSettings);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  // Date range for the current view
  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      const dayStr = currentDate.toISOString().split("T")[0];
      return { start: dayStr, end: dayStr };
    }

    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + mondayOffset);

    const end = new Date(start);
    if (viewMode === "month") {
      end.setDate(start.getDate() + 34);
    } else if (viewMode === "2weeks") {
      end.setDate(start.getDate() + 13);
    } else {
      end.setDate(start.getDate() + 6);
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }, [currentDate, viewMode]);

  // ── The rota, from Postgres ────────────────────────────────────────────
  //
  // Until 2026-08-21 this whole screen was `useState(scheduleShifts)` over a
  // fixture — the scheduling module's LANDING page, where a manager plans the
  // week, saving nowhere, while `/scheduling/roster` beside it read the real
  // table. Two calendars of the same shifts, disagreeing.
  //
  // The window is part of the shifts key, so stepping to next week is a new
  // query rather than a refetch that blanks the week on screen.
  const { data: structure } = useQuery(schedulingQueries.structure());
  const { data: roster, isPending: rosterPending } = useQuery(
    schedulingQueries.shifts(dateRange.start, dateRange.end),
  );
  const { data: staff } = useQuery(staffQueries.profiles());
  const { data: leave } = useQuery(timeOffQueries.list("all"));
  const { data: swapData } = useQuery(swapQueries.list("pending"));

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const removeShift = useDeleteShift();
  const publishSchedule = usePublishSchedule();

  const departments = useMemo(() => structure?.departments ?? [], [structure]);
  const allPositions = useMemo(() => structure?.positions ?? [], [structure]);
  const shifts = useMemo(() => roster?.shifts ?? [], [roster]);

  // ── DERIVED, NOT SYNCHRONISED ───────────────────────────────────────────
  //
  // The first version defaulted this with an effect that called setState on
  // arrival — a cascading render, and the exact shape "you might not need an
  // effect" is about. Which department is on screen is a function of what the
  // user picked and what exists: their choice if it is still there, otherwise
  // the first one, and `undefined` for a facility whose org chart is empty —
  // which is where every new facility starts, not an edge case. The fixture
  // version indexed `departments[0]` and would simply have crashed.
  const selectedDepartment = useMemo<Department | undefined>(
    () =>
      departments.find((d) => d.id === selectedDepartmentId) ?? departments[0],
    [departments, selectedDepartmentId],
  );

  // The RESOLVED department, not the raw selection. `selectedDepartmentId` is
  // empty until somebody picks one, while `selectedDepartment` has already
  // fallen back to the first — so filtering on the raw id would show an empty
  // week under a header naming a department that has shifts in it.
  //
  // A facility with no departments has no calendar to draw at all. The hooks
  // below still have to run, so they get an empty id and the render returns an
  // empty state before any of it reaches the screen.
  const deptId = selectedDepartment?.id ?? "";
  const deptName = selectedDepartment?.name ?? "";

  // `rowId`, NOT `id`: `StaffProfile.id` is the legacy string ("fs-003") and
  // `staff_shifts.staff_id` is the uuid. Keying on the label matches no shift.
  const scheduleEmployees = useMemo<ScheduleEmployee[]>(
    () =>
      (staff ?? []).map((member) => ({
        id: member.rowId ?? member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        email: member.email,
        phone: member.phone,
        avatar: member.avatarUrl,
        initials:
          [member.firstName, member.lastName]
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("") || "—",
        // Department and position membership live in `staff_departments` and on
        // the shift, not on the person — so these stay empty and the screen
        // reads the org chart, which is the one place that knows.
        departmentIds: [],
        positionIds: [],
        primaryPositionId: "",
        hireDate: member.employment?.hireDate ?? "",
        status: member.status === "active" ? "active" : "inactive",
        // `maxHoursPerWeek` and `employmentType` have nowhere to come from yet:
        // `PayrollConfig` is WITHHELD without `view_payroll`, and a default of 0
        // would render as a fact about somebody's contract. 40 is the same
        // number `schedulingSettings.overtimeThresholdWeekly` already assumes.
        maxHoursPerWeek: 40,
        employmentType: "full_time",
        role: member.jobTitle ?? member.primaryRole,
      })),
    [staff],
  );

  // The query already asked for this window, so the only filter left is the
  // department.
  const filteredShifts = useMemo(
    () => shifts.filter((s) => s.departmentId === deptId),
    [shifts, deptId],
  );

  // ── EVERY PERSON WITH A SHIFT, NOT JUST EVERY MEMBER ────────────────────
  //
  // The grid is people down the side and days across the top, so a person with
  // no row has no shift ON SCREEN — however real the row in the table. Drawing
  // only the department's declared members would therefore make a shift
  // assigned to somebody covering from another department silently invisible,
  // which is the same class of bug as the empty Daily Care board: no error, no
  // gap, just work nobody can see.
  //
  // So it is the union: declared members, plus anybody actually rostered in the
  // window. Today the first half is always empty — `staff_departments` has no
  // writer yet, the Departments screen being still on fixtures — and this is
  // the reason the calendar draws anything at all.
  const deptEmployees = useMemo(() => {
    const declared = new Set(selectedDepartment?.employeeIds ?? []);
    const rostered = new Set(
      filteredShifts
        .map((shift) => shift.employeeId)
        .filter((id): id is string => Boolean(id)),
    );
    return scheduleEmployees.filter(
      (e) => declared.has(e.id) || rostered.has(e.id),
    );
  }, [scheduleEmployees, selectedDepartment, filteredShifts]);

  const deptPositions = useMemo(
    () => allPositions.filter((p) => p.departmentId === deptId),
    [allPositions, deptId],
  );

  const draftShifts = useMemo(
    () => filteredShifts.filter((s) => s.status === "draft"),
    [filteredShifts],
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const scheduledToday = useMemo(
    () =>
      new Set(
        shifts
          .filter(
            (s) =>
              s.departmentId === deptId && s.date === todayStr && s.employeeId,
          )
          .map((s) => s.employeeId),
      ).size,
    [shifts, deptId, todayStr],
  );

  const totalHours = useMemo(
    () =>
      filteredShifts.reduce(
        (sum, s) =>
          sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
        0,
      ),
    [filteredShifts],
  );

  // ── FROM THE ROTA ON SCREEN AND THE REAL PAY TABLE ──────────────────────
  //
  // `calculateLaborCost` read fixture shifts against fixture positions, so the
  // tile showed a figure derived from neither the week being looked at nor
  // anybody's actual wage — and after the calendar became real it read $0
  // against a rota with real rates behind it.
  //
  // `canSeePay` is the structure route's answer from `my_permissions()`, which
  // is the same cascade the `facility_position_pay` policy consults. Without
  // it the positions arrive with no figures on them and this returns null, so
  // the tile is ABSENT rather than zero.
  // Both dialogs below take `canViewPayRates`, and it is THIS value — not
  // `can("payroll.view")`, which they were given before. Those are two
  // permission systems answering one question, and they disagree in exactly the
  // case phase 1 was built around: the ACCOUNTANT holds
  // `scheduling_view_labor_cost` and is not a facility administrator, so the
  // legacy flag hid rates that RLS had already handed over.
  const laborCost = useMemo(
    () =>
      computeLaborCost(
        filteredShifts,
        allPositions,
        structure?.canSeePay ?? false,
      ),
    [filteredShifts, allPositions, structure],
  );

  // Leave and swaps belong to a PERSON, not to a department — so "this
  // department's pending requests" is the requests whose requester is in it.
  // The fixture carried a `departmentId` on the request itself, which was a
  // second place for the same fact to be wrong.
  const deptStaffIds = useMemo(
    () => new Set(deptEmployees.map((e) => e.id)),
    [deptEmployees],
  );

  const deptRequests = useMemo(
    () => (leave?.requests ?? []).filter((r) => deptStaffIds.has(r.employeeId)),
    [leave, deptStaffIds],
  );

  const pendingTimeOff = useMemo(
    () => deptRequests.filter((r) => r.status === "pending").length,
    [deptRequests],
  );

  const pendingSwaps = useMemo(
    () =>
      (swapData?.swaps ?? []).filter((sw) =>
        deptStaffIds.has(sw.requestingEmployeeId),
      ).length,
    [swapData, deptStaffIds],
  );

  const getEmployeeHours = useCallback(
    (employeeId: string) =>
      filteredShifts
        .filter((s) => s.employeeId === employeeId)
        .reduce(
          (sum, s) =>
            sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
          0,
        ),
    [filteredShifts],
  );

  // Date range label
  const dateRangeLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const yearOpts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${new Date(dateRange.start + "T00:00:00").toLocaleDateString("en-US", opts)} – ${new Date(dateRange.end + "T00:00:00").toLocaleDateString("en-US", yearOpts)}`;
  }, [dateRange]);

  // ── ADAPTED, NOT RESHAPED ───────────────────────────────────────────────
  //
  // `ScheduleCalendar`, `DraftReviewSummary` and `AddShiftDialog` all take
  // `EnhancedTimeOffRequest[]`, but the only fields any of them reads are
  // employeeId, status, startDate, endDate and type — see `checkTimeOff` in
  // scheduling-conflicts.ts. Narrowing those three prop types to that Pick is
  // the better shape and is its own change; this fills the two fields they
  // declare and never look at, with the department DERIVED rather than stored.
  const deptTimeOff = useMemo<EnhancedTimeOffRequest[]>(
    () =>
      deptRequests.map((r) => ({
        ...r,
        departmentId: deptId,
        reason: r.reason || "",
      })),
    [deptRequests, deptId],
  );

  // ─── Audit helpers ───────────────────────────────────────────────────────

  const buildShiftCtx = useCallback(
    (shift: Partial<ScheduleShift> & { id?: string }) => {
      const position = shift.positionId
        ? deptPositions.find((p) => p.id === shift.positionId)
        : undefined;
      const employee = shift.employeeId
        ? deptEmployees.find((e) => e.id === shift.employeeId)
        : undefined;
      return {
        departmentId: deptId,
        departmentName: deptName,
        shiftId: shift.id,
        shiftDate: shift.date,
        shiftTimeRange:
          shift.startTime && shift.endTime
            ? `${shift.startTime} – ${shift.endTime}`
            : undefined,
        positionId: shift.positionId,
        positionName: position?.name,
        employeeId: shift.employeeId,
        employeeName: employee?.name,
        actorId: user.id,
        actorName: user.name,
        actorType: "staff" as const,
      };
    },
    [deptEmployees, deptPositions, deptId, deptName, user.id, user.name],
  );

  const diffShifts = useCallback(
    (
      before: ScheduleShift,
      after: Partial<ScheduleShift>,
    ): { field: string; oldValue: string; newValue: string }[] => {
      const out: { field: string; oldValue: string; newValue: string }[] = [];
      if (after.date && after.date !== before.date) {
        out.push({
          field: "Date",
          oldValue: before.date,
          newValue: after.date,
        });
      }
      if (after.startTime && after.startTime !== before.startTime) {
        out.push({
          field: "Start time",
          oldValue: before.startTime,
          newValue: after.startTime,
        });
      }
      if (after.endTime && after.endTime !== before.endTime) {
        out.push({
          field: "End time",
          oldValue: before.endTime,
          newValue: after.endTime,
        });
      }
      if (
        after.positionId !== undefined &&
        after.positionId !== before.positionId
      ) {
        const oldPos = deptPositions.find((p) => p.id === before.positionId);
        const newPos = deptPositions.find((p) => p.id === after.positionId);
        out.push({
          field: "Position",
          oldValue: oldPos?.name ?? before.positionId,
          newValue: newPos?.name ?? after.positionId,
        });
      }
      if (
        after.employeeId !== undefined &&
        after.employeeId !== before.employeeId
      ) {
        const oldEmp = before.employeeId
          ? deptEmployees.find((e) => e.id === before.employeeId)
          : null;
        const newEmp = after.employeeId
          ? deptEmployees.find((e) => e.id === after.employeeId)
          : null;
        out.push({
          field: "Assigned to",
          oldValue: oldEmp?.name ?? "Open",
          newValue: newEmp?.name ?? "Open",
        });
      }
      if (
        after.breakMinutes !== undefined &&
        after.breakMinutes !== before.breakMinutes
      ) {
        out.push({
          field: "Break (min)",
          oldValue: String(before.breakMinutes),
          newValue: String(after.breakMinutes),
        });
      }
      return out;
    },
    [deptEmployees, deptPositions],
  );

  // ─── Shift handlers ──────────────────────────────────────────────────────

  const handleShiftClick = (shift: ScheduleShift) => {
    // Section 5E — without scheduling_edit_shifts the schedule is view-only:
    // clicking a shift must NOT open the editable dialog.
    if (!canEditShifts) return;
    setEditingShift(shift);
    setAddShiftOpen(true);
  };

  const handleCellClick = (employeeId: string | undefined, date: string) => {
    // 5E: empty-cell "click to create" is a create action.
    if (!canCreateShifts) return;
    setDefaultShiftEmployee(employeeId);
    setDefaultShiftDate(date);
    setEditingShift(null);
    setAddShiftOpen(true);
  };

  const handleAddShift = () => {
    setDefaultShiftDate(undefined);
    setDefaultShiftEmployee(undefined);
    setEditingShift(null);
    setAddShiftOpen(true);
  };

  const handleSaveShift = async (shiftsData: Omit<ScheduleShift, "id">[]) => {
    if (editingShift) {
      const shiftData = shiftsData[0]!;
      const changes = diffShifts(editingShift, shiftData);
      try {
        await updateShift.mutateAsync({
          id: editingShift.id,
          employeeId: shiftData.employeeId ?? null,
          departmentId: shiftData.departmentId,
          positionId: shiftData.positionId,
          date: shiftData.date,
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          breakMinutes: shiftData.breakMinutes,
          notes: shiftData.notes ?? null,
        });
      } catch (error) {
        // The exclusion constraint refusing a double-booking arrives here as a
        // sentence. Reporting success and then refetching the UNCHANGED row is
        // how a screen tells somebody their edit saved when it did not.
        toast.error((error as Error).message);
        return;
      }
      logShiftUpdated({
        ...buildShiftCtx({ ...editingShift, ...shiftData }),
        changes,
      });
      toast.success("Shift updated");
      return;
    }

    // A recurring series is several rows, and one of them can be refused while
    // the others are written — so what is reported is what actually landed.
    const written: ScheduleShift[] = [];
    const refused: string[] = [];

    for (const draft of shiftsData) {
      try {
        written.push(
          await createShift.mutateAsync({
            employeeId: draft.employeeId ?? null,
            departmentId: draft.departmentId,
            positionId: draft.positionId,
            date: draft.date,
            startTime: draft.startTime,
            endTime: draft.endTime,
            breakMinutes: draft.breakMinutes,
            notes: draft.notes ?? null,
            status: "draft",
          }),
        );
      } catch (error) {
        refused.push(`${draft.date}: ${(error as Error).message}`);
      }
    }

    written.forEach((shift) => {
      if (shift.employeeId) {
        logShiftCreated(buildShiftCtx(shift));
      } else {
        logOpenShiftPosted(buildShiftCtx(shift));
      }
    });

    if (written.length === 0) {
      toast.error(refused[0] ?? "That shift was not saved.");
      return;
    }
    if (refused.length > 0) {
      toast.warning(`${written.length} of ${shiftsData.length} shifts added`, {
        description: refused[0],
        duration: 8000,
      });
      return;
    }
    if (written.length === 1) {
      toast.success("Draft shift added");
    } else {
      toast.success(`${written.length} recurring shifts added`, {
        description: "All shifts added as drafts.",
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    const target = shifts.find((s) => s.id === shiftId);
    try {
      await removeShift.mutateAsync(shiftId);
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }
    if (target) logShiftDeleted(buildShiftCtx(target));
    toast.success("Shift deleted");
  };

  const handleMoveShift = useCallback(
    async (
      shiftId: string,
      newEmployeeId: string | undefined,
      newDate: string,
    ) => {
      // 5E: drag-move is an edit — no-op without scheduling_edit_shifts.
      if (!canEditShifts) return;
      const original = shifts.find((s) => s.id === shiftId);
      try {
        await updateShift.mutateAsync({
          id: shiftId,
          employeeId: newEmployeeId ?? null,
          date: newDate,
        });
      } catch (error) {
        // Dropping somebody onto a day they already work is refused by the
        // exclusion constraint. The row does not move, and neither does the
        // card — the refetch puts it back where it was.
        toast.error((error as Error).message);
        return;
      }
      if (original) {
        const changes = diffShifts(original, {
          employeeId: newEmployeeId,
          date: newDate,
        });
        const previousEmp = original.employeeId
          ? deptEmployees.find((e) => e.id === original.employeeId)
          : null;
        logShiftMoved({
          ...buildShiftCtx({
            ...original,
            employeeId: newEmployeeId,
            date: newDate,
          }),
          previousEmployeeId: original.employeeId,
          previousEmployeeName: previousEmp?.name,
          changes,
        });
      }
      toast.success("Shift moved");
    },
    [
      shifts,
      deptEmployees,
      buildShiftCtx,
      diffShifts,
      canEditShifts,
      updateShift,
    ],
  );

  const handleCopyShift = useCallback(
    async (
      shiftId: string,
      newEmployeeId: string | undefined,
      newDate: string,
    ) => {
      // 5E: drag-copy is an edit — no-op without scheduling_edit_shifts.
      if (!canEditShifts) return;
      const original = shifts.find((s) => s.id === shiftId);
      if (!original) return;

      // A copy is a NEW row, so it goes through create rather than update — and
      // it lands as a draft with no recurrence, because a copied shift is not
      // part of the series it was copied from.
      let copied: ScheduleShift;
      try {
        copied = await createShift.mutateAsync({
          employeeId: newEmployeeId ?? null,
          departmentId: original.departmentId,
          positionId: original.positionId,
          date: newDate,
          startTime: original.startTime,
          endTime: original.endTime,
          breakMinutes: original.breakMinutes,
          notes: original.notes ?? null,
          status: "draft",
        });
      } catch (error) {
        toast.error((error as Error).message);
        return;
      }
      logShiftCopied(buildShiftCtx(copied));
      toast.success("Shift copied");
    },
    [shifts, buildShiftCtx, canEditShifts, createShift],
  );

  const handleAssignShift = useCallback(
    async (shiftId: string, employeeId: string | undefined) => {
      const original = shifts.find((s) => s.id === shiftId);
      try {
        // `null`, not undefined: making a shift OPEN is a value, and a field
        // the route reads as "not sent" would leave the person on it.
        await updateShift.mutateAsync({
          id: shiftId,
          employeeId: employeeId ?? null,
        });
      } catch (error) {
        toast.error((error as Error).message);
        return;
      }
      if (original) {
        if (employeeId) {
          logShiftAssigned(buildShiftCtx({ ...original, employeeId }));
        } else {
          const previousEmp = original.employeeId
            ? deptEmployees.find((e) => e.id === original.employeeId)
            : null;
          logShiftUnassigned({
            ...buildShiftCtx({ ...original, employeeId: undefined }),
            previousEmployeeId: original.employeeId,
            previousEmployeeName: previousEmp?.name,
          });
        }
      }
      if (employeeId) {
        toast.success("Employee assigned");
      } else {
        toast.success("Shift made open");
      }
    },
    [shifts, deptEmployees, buildShiftCtx, updateShift],
  );

  // ─── Publish / Draft handlers ──────────────────────────────────────────

  const handlePublish = async () => {
    let published: number;
    try {
      // One call for the window, not one per shift. A rota half-published is a
      // rota nobody can act on and the screen cannot show which half made it.
      ({ published } = await publishSchedule.mutateAsync({
        departmentId: deptId,
        from: dateRange.start,
        to: dateRange.end,
      }));
    } catch (error) {
      toast.error((error as Error).message);
      return;
    }

    logSchedulePublished({
      departmentId: deptId,
      departmentName: deptName,
      count: published,
      weekStart: dateRange.start,
      actorId: user.id,
      actorName: user.name,
    });

    if (published === 0) {
      toast.info("Nothing to publish", {
        description: "There are no draft shifts in this week.",
      });
      return;
    }

    // NOT "Staff will be notified." Publishing changes a status in the roster
    // and there is nothing here that sends anybody anything — the previous
    // wording described a feature that does not exist.
    toast.success(`${published} shift${published === 1 ? "" : "s"} published`, {
      description: "They now appear on the staff schedule.",
    });
  };

  const handleDiscard = async () => {
    // Discarding is N deletes, and unlike publishing there is no single
    // statement for it — each row goes through the same policy as any other
    // delete. What is reported is what actually went.
    const doomed = draftShifts.map((shift) => shift.id);
    const removed: string[] = [];

    for (const id of doomed) {
      try {
        await removeShift.mutateAsync(id);
        removed.push(id);
      } catch {
        // Collected below rather than one toast per failure.
      }
    }

    logDraftDiscarded({
      departmentId: deptId,
      departmentName: deptName,
      count: removed.length,
      actorId: user.id,
      actorName: user.name,
    });

    if (removed.length < doomed.length) {
      toast.error(
        `${removed.length} of ${doomed.length} draft shifts discarded`,
        { description: "The rest could not be removed." },
      );
      return;
    }
    toast.info(
      removed.length === 0
        ? "No draft shifts to discard"
        : `${removed.length} draft shift${removed.length === 1 ? "" : "s"} discarded`,
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsTemplate = () => {
    setSaveTemplateOpen(true);
  };

  // ─── Time Clock handlers ───────────────────────────────────────────────

  const handleClockIn = useCallback((shiftId: string, employeeId: string) => {
    const newEntry: TimeClockEntry = {
      id: `tc-${Date.now()}`,
      shiftId,
      employeeId,
      date: new Date().toISOString().split("T")[0],
      clockedInAt: new Date().toISOString(),
      status: "clocked_in",
    };
    setTimeClockEntries((prev) => [...prev, newEntry]);
    toast.success("Clocked in");
  }, []);

  const handleClockOut = useCallback((entryId: string) => {
    setTimeClockEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const clockedOutAt = new Date().toISOString();
        const actualMinutes = e.clockedInAt
          ? Math.round(
              (new Date(clockedOutAt).getTime() -
                new Date(e.clockedInAt).getTime()) /
                60000,
            )
          : 0;
        return {
          ...e,
          clockedOutAt,
          actualMinutes,
          status: "clocked_out" as const,
        };
      }),
    );
    toast.success("Clocked out");
  }, []);

  // ── AFTER EVERY HOOK, NEVER BEFORE ONE ─────────────────────────────────
  //
  // The fixture version indexed `departments[0]`, so a facility with none would
  // have crashed on a property of undefined. Real facilities start with none —
  // a brand-new one has an empty org chart until somebody builds it — so this
  // is the ordinary first-run state, not an edge case.
  if (!selectedDepartment) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
        <CalendarRange className="text-muted-foreground size-10 opacity-30" />
        <div>
          <p className="font-medium">
            {structure ? "No departments yet" : "Loading the schedule…"}
          </p>
          {structure && (
            <p className="text-muted-foreground mt-1 text-sm">
              A rota is built per department. Add one under Departments and it
              will appear here.
            </p>
          )}
        </div>
        {structure && (
          <Button asChild size="sm" variant="outline">
            <Link href="/facility/dashboard/services/scheduling/departments">
              Go to Departments
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-x-hidden">
      <ScheduleHeader
        currentDate={currentDate}
        viewMode={viewMode}
        selectedDepartment={selectedDepartment}
        departments={departments}
        isDraft={draftShifts.length > 0}
        draftShiftCount={draftShifts.length}
        onDateChange={setCurrentDate}
        onViewModeChange={setViewMode}
        onDepartmentChange={(department) =>
          setSelectedDepartmentId(department.id)
        }
        onPublish={handlePublish}
        onAddShift={handleAddShift}
        onPrint={handlePrint}
        onSaveAsTemplate={handleSaveAsTemplate}
        onOpenTimeClock={() => setTimeClockOpen(true)}
        onPostOpenShift={() => setShowPostDialog(true)}
        onOpenShiftNotifSettings={() => setShowNotifSettings(true)}
      />

      <ScheduleStats
        totalEmployees={deptEmployees.length}
        scheduledToday={scheduledToday}
        totalHoursThisWeek={totalHours}
        laborCost={laborCost?.total ?? null}
        pendingTimeOff={pendingTimeOff}
        pendingSwaps={pendingSwaps}
        overtimeAlerts={0}
      />

      <div className="bg-muted/20 min-w-0 space-y-2 border-t px-4 py-2">
        <DraftReviewSummary
          shifts={filteredShifts}
          employees={deptEmployees}
          availabilities={employeeAvailabilities}
          timeOffRequests={deptTimeOff}
          settings={schedulingSettings}
        />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden border-t">
        {/* An empty grid and a week still loading look identical, and the first
            is a statement that nobody is working. */}
        {rosterPending ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <ScheduleCalendar
            viewMode={viewMode}
            currentDate={currentDate}
            employees={deptEmployees}
            shifts={filteredShifts}
            positions={deptPositions}
            timeOffRequests={deptTimeOff}
            holidayRates={holidayRates}
            overtimeThreshold={schedulingSettings.overtimeThresholdWeekly}
            onShiftClick={handleShiftClick}
            onCellClick={handleCellClick}
            onMoveShift={handleMoveShift}
            onCopyShift={handleCopyShift}
            onDeleteShift={handleDeleteShift}
            onAssignShift={handleAssignShift}
            getEmployeeHours={getEmployeeHours}
          />
        )}
      </div>

      <DraftPublishBar
        draftCount={draftShifts.length}
        hasChanges={draftShifts.length > 0}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />

      <SaveAsTemplateDialog
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
        shifts={filteredShifts}
        department={selectedDepartment}
        dateRangeLabel={dateRangeLabel}
      />

      <AddShiftDialog
        key={
          editingShift?.id ??
          `new-${defaultShiftDate ?? ""}-${defaultShiftEmployee ?? ""}`
        }
        open={addShiftOpen}
        onOpenChange={setAddShiftOpen}
        employees={deptEmployees}
        positions={deptPositions}
        departmentId={deptId}
        defaultDate={defaultShiftDate}
        defaultEmployeeId={defaultShiftEmployee}
        editingShift={editingShift}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        allShifts={shifts}
        availabilities={employeeAvailabilities}
        timeOffRequests={deptTimeOff}
        schedulingSettings={schedulingSettings}
        canViewPayRates={structure?.canSeePay ?? false}
      />

      <TimeClock
        open={timeClockOpen}
        onOpenChange={setTimeClockOpen}
        shifts={filteredShifts}
        employees={deptEmployees}
        positions={deptPositions}
        entries={timeClockEntries}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        department={selectedDepartment}
      />

      <PostShiftOpportunityDialog
        open={showPostDialog}
        onOpenChange={setShowPostDialog}
        departments={departments}
        positions={allPositions}
        employees={scheduleEmployees}
        defaultDepartmentId={deptId}
        canViewPayRates={structure?.canSeePay ?? false}
        onPost={async (opp) => {
          setShiftOpportunities((prev) => [opp, ...prev]);

          // The OPPORTUNITY is still local — nothing stores those yet. The
          // SHIFT it creates is not: an open shift is a real row with no one on
          // it, which is exactly what `staff_shifts.staff_id IS NULL` means and
          // what the roster's read policy already shows to everybody.
          try {
            await createShift.mutateAsync({
              employeeId: null,
              departmentId: opp.departmentId,
              positionId: opp.positionId,
              date: opp.date,
              startTime: opp.startTime,
              endTime: opp.endTime,
              breakMinutes: opp.breakMinutes,
              status: "draft",
              urgent: opp.urgency !== "normal",
              notes: opp.reason || null,
            });
          } catch (error) {
            toast.error((error as Error).message);
            return;
          }

          // Navigate the calendar to the department and week of the new shift
          const oppDept = departments.find((d) => d.id === opp.departmentId);
          if (oppDept) setSelectedDepartmentId(oppDept.id);
          setCurrentDate(new Date(opp.date + "T12:00:00"));
          const pos = allPositions.find((p) => p.id === opp.positionId);
          logOpenShiftPosted({
            departmentId: opp.departmentId,
            departmentName: oppDept?.name,
            shiftId: opp.id,
            shiftDate: opp.date,
            shiftTimeRange: `${opp.startTime} – ${opp.endTime}`,
            positionId: opp.positionId,
            positionName: pos?.name,
            actorId: user.id,
            actorName: user.name,
            metadata:
              opp.claimMode === "invite_only"
                ? {
                    claimMode: opp.claimMode,
                    invitedCount: opp.invitedEmployeeIds?.length ?? 0,
                  }
                : { claimMode: opp.claimMode ?? "open" },
          });
        }}
      />

      <ShiftOpportunityNotificationSettingsDialog
        open={showNotifSettings}
        onOpenChange={setShowNotifSettings}
        settings={notifSettings}
        departments={departments}
        employees={scheduleEmployees}
        onSave={setNotifSettings}
      />
    </div>
  );
}
