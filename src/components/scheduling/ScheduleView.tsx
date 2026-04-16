"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  departments,
  positions as allPositions,
  scheduleEmployees,
  scheduleShifts as initialShifts,
  enhancedTimeOffRequests,
  enhancedShiftSwaps,
  employeeAvailabilities,
  shiftOpportunities as initialShiftOpportunities,
  shiftOpportunityNotificationSettings as initialNotifSettings,
  getPositionsForDepartment,
  getDepartmentEmployees,
  calculateLaborCost,
} from "@/data/scheduling";
import { computeShiftHours } from "@/lib/scheduling-utils";
import type {
  Department,
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(
    departments[0],
  );
  const [shifts, setShifts] = useState<ScheduleShift[]>(initialShifts);
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
  const [shiftOpportunities, setShiftOpportunities] = useState<
    ShiftOpportunity[]
  >(initialShiftOpportunities);
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

  // Department employees and positions
  const deptEmployees = useMemo(
    () => getDepartmentEmployees(selectedDepartment.id),
    [selectedDepartment.id],
  );
  const deptPositions = useMemo(
    () => getPositionsForDepartment(selectedDepartment.id),
    [selectedDepartment.id],
  );

  // Filtered shifts for current view
  const filteredShifts = useMemo(
    () =>
      shifts.filter(
        (s) =>
          s.departmentId === selectedDepartment.id &&
          s.date >= dateRange.start &&
          s.date <= dateRange.end,
      ),
    [shifts, selectedDepartment.id, dateRange],
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
              s.departmentId === selectedDepartment.id &&
              s.date === todayStr &&
              s.employeeId,
          )
          .map((s) => s.employeeId),
      ).size,
    [shifts, selectedDepartment.id, todayStr],
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

  const laborCost = useMemo(
    () =>
      calculateLaborCost(selectedDepartment.id, dateRange.start, dateRange.end),
    [selectedDepartment.id, dateRange],
  );

  const pendingTimeOff = enhancedTimeOffRequests.filter(
    (r) => r.departmentId === selectedDepartment.id && r.status === "pending",
  ).length;

  const pendingSwaps = enhancedShiftSwaps.filter(
    (r) => r.departmentId === selectedDepartment.id && r.status === "pending",
  ).length;

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

  const deptTimeOff = useMemo(
    () =>
      enhancedTimeOffRequests.filter(
        (r) => r.departmentId === selectedDepartment.id,
      ),
    [selectedDepartment.id],
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
        departmentId: selectedDepartment.id,
        departmentName: selectedDepartment.name,
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
    [deptEmployees, deptPositions, selectedDepartment, user.id, user.name],
  );

  const diffShifts = useCallback(
    (
      before: ScheduleShift,
      after: Partial<ScheduleShift>,
    ): { field: string; oldValue: string; newValue: string }[] => {
      const out: { field: string; oldValue: string; newValue: string }[] = [];
      if (after.date && after.date !== before.date) {
        out.push({ field: "Date", oldValue: before.date, newValue: after.date });
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
    setEditingShift(shift);
    setAddShiftOpen(true);
  };

  const handleCellClick = (employeeId: string | undefined, date: string) => {
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

  const handleSaveShift = (shiftsData: Omit<ScheduleShift, "id">[]) => {
    if (editingShift) {
      const shiftData = shiftsData[0];
      const changes = diffShifts(editingShift, shiftData);
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id ? { ...s, ...shiftData } : s,
        ),
      );
      logShiftUpdated({
        ...buildShiftCtx({ ...editingShift, ...shiftData }),
        changes,
      });
      toast.success("Shift updated");
    } else {
      const timestamp = Date.now();
      const newShifts: ScheduleShift[] = shiftsData.map((s, i) => ({
        ...s,
        id: `shift-new-${timestamp}-${i}`,
        status: "draft" as const,
      }));
      setShifts((prev) => [...prev, ...newShifts]);
      newShifts.forEach((s) => {
        if (s.employeeId) {
          logShiftCreated(buildShiftCtx(s));
        } else {
          logOpenShiftPosted(buildShiftCtx(s));
        }
      });
      if (newShifts.length === 1) {
        toast.success("Draft shift added");
      } else {
        toast.success(`${newShifts.length} recurring shifts added`, {
          description: "All shifts added as drafts.",
        });
      }
    }
  };

  const handleDeleteShift = (shiftId: string) => {
    const target = shifts.find((s) => s.id === shiftId);
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    if (target) logShiftDeleted(buildShiftCtx(target));
    toast.success("Shift deleted");
  };

  const handleMoveShift = useCallback(
    (shiftId: string, newEmployeeId: string | undefined, newDate: string) => {
      const original = shifts.find((s) => s.id === shiftId);
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId
            ? { ...s, employeeId: newEmployeeId, date: newDate }
            : s,
        ),
      );
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
    [shifts, deptEmployees, buildShiftCtx, diffShifts],
  );

  const handleCopyShift = useCallback(
    (shiftId: string, newEmployeeId: string | undefined, newDate: string) => {
      const copyId = `shift-copy-${Date.now()}`;
      let copied: ScheduleShift | null = null;
      setShifts((prev) => {
        const original = prev.find((s) => s.id === shiftId);
        if (!original) return prev;
        copied = {
          ...original,
          id: copyId,
          employeeId: newEmployeeId,
          date: newDate,
          status: "draft",
          recurrenceId: undefined,
        };
        return [...prev, copied];
      });
      if (copied) logShiftCopied(buildShiftCtx(copied));
      toast.success("Shift copied");
    },
    [buildShiftCtx],
  );

  const handleAssignShift = useCallback(
    (shiftId: string, employeeId: string | undefined) => {
      const original = shifts.find((s) => s.id === shiftId);
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, employeeId } : s)),
      );
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
    [shifts, deptEmployees, buildShiftCtx],
  );

  // ─── Publish / Draft handlers ──────────────────────────────────────────

  const handlePublish = () => {
    const publishedCount = draftShifts.length;
    setShifts((prev) =>
      prev.map((s) =>
        s.departmentId === selectedDepartment.id && s.status === "draft"
          ? { ...s, status: "published" as const }
          : s,
      ),
    );
    logSchedulePublished({
      departmentId: selectedDepartment.id,
      departmentName: selectedDepartment.name,
      count: publishedCount,
      weekStart: dateRange.start,
      actorId: user.id,
      actorName: user.name,
    });
    toast.success("Schedule published! Staff will be notified.", {
      description: `${publishedCount} shifts have been published.`,
    });
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved");
  };

  const handleDiscard = () => {
    const discardedCount = draftShifts.length;
    setShifts((prev) =>
      prev.filter(
        (s) =>
          !(s.departmentId === selectedDepartment.id && s.status === "draft"),
      ),
    );
    logDraftDiscarded({
      departmentId: selectedDepartment.id,
      departmentName: selectedDepartment.name,
      count: discardedCount,
      actorId: user.id,
      actorName: user.name,
    });
    toast.info("Draft changes discarded");
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
        onDepartmentChange={setSelectedDepartment}
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
        laborCost={laborCost.totalCost}
        pendingTimeOff={pendingTimeOff}
        pendingSwaps={pendingSwaps}
        overtimeAlerts={0}
      />

      <div className="bg-muted/20 min-w-0 space-y-2 border-t px-4 py-2">
        <DraftReviewSummary
          shifts={filteredShifts}
          employees={deptEmployees}
          availabilities={employeeAvailabilities}
          timeOffRequests={enhancedTimeOffRequests}
          settings={schedulingSettings}
        />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden border-t">
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
      </div>

      <DraftPublishBar
        draftCount={draftShifts.length}
        hasChanges={draftShifts.length > 0}
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
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
        departmentId={selectedDepartment.id}
        defaultDate={defaultShiftDate}
        defaultEmployeeId={defaultShiftEmployee}
        editingShift={editingShift}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        allShifts={shifts}
        availabilities={employeeAvailabilities}
        timeOffRequests={enhancedTimeOffRequests}
        schedulingSettings={schedulingSettings}
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
        defaultDepartmentId={selectedDepartment.id}
        onPost={(opp) => {
          setShiftOpportunities((prev) => [opp, ...prev]);
          // Add an unassigned draft shift so it shows in the calendar
          const oppShift: ScheduleShift = {
            id: `shift-opp-${opp.id}`,
            departmentId: opp.departmentId,
            positionId: opp.positionId,
            date: opp.date,
            startTime: opp.startTime,
            endTime: opp.endTime,
            breakMinutes: opp.breakMinutes,
            status: "draft",
            urgent: opp.urgency !== "normal",
            notes: opp.reason || undefined,
          };
          setShifts((prev) => [...prev, oppShift]);
          // Navigate the calendar to the department and week of the new shift
          const oppDept = departments.find((d) => d.id === opp.departmentId);
          if (oppDept) setSelectedDepartment(oppDept);
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
