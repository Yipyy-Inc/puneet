"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
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
import {
  departments,
  scheduleShifts as initialShifts,
  enhancedTimeOffRequests,
  enhancedShiftSwaps,
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
};

export function ScheduleView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(departments[0]);
  const [shifts, setShifts] = useState<ScheduleShift[]>(initialShifts);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [defaultShiftDate, setDefaultShiftDate] = useState<string>();
  const [defaultShiftEmployee, setDefaultShiftEmployee] = useState<string | undefined>();
  const [holidayRates] = useState<HolidayRate[]>(initialHolidayRates);
  const [timeClockOpen, setTimeClockOpen] = useState(false);
  const [timeClockEntries, setTimeClockEntries] = useState<TimeClockEntry[]>([]);

  // Date range for the current view
  const dateRange = useMemo(() => {
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
        (sum, s) => sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
        0,
      ),
    [filteredShifts],
  );

  const laborCost = useMemo(
    () => calculateLaborCost(selectedDepartment.id, dateRange.start, dateRange.end),
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
          (sum, s) => sum + computeShiftHours(s.startTime, s.endTime, s.breakMinutes),
          0,
        ),
    [filteredShifts],
  );

  // Date range label
  const dateRangeLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const yearOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return `${new Date(dateRange.start + "T00:00:00").toLocaleDateString("en-US", opts)} – ${new Date(dateRange.end + "T00:00:00").toLocaleDateString("en-US", yearOpts)}`;
  }, [dateRange]);

  const deptTimeOff = useMemo(
    () => enhancedTimeOffRequests.filter((r) => r.departmentId === selectedDepartment.id),
    [selectedDepartment.id],
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
      setShifts((prev) =>
        prev.map((s) => (s.id === editingShift.id ? { ...s, ...shiftData } : s)),
      );
      toast.success("Shift updated");
    } else {
      const newShifts: ScheduleShift[] = shiftsData.map((s, i) => ({
        ...s,
        id: `shift-new-${Date.now()}-${i}`,
        status: "draft" as const,
      }));
      setShifts((prev) => [...prev, ...newShifts]);
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
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    toast.success("Shift deleted");
  };

  const handleMoveShift = useCallback(
    (shiftId: string, newEmployeeId: string | undefined, newDate: string) => {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === shiftId ? { ...s, employeeId: newEmployeeId, date: newDate } : s,
        ),
      );
      toast.success("Shift moved");
    },
    [],
  );

  const handleCopyShift = useCallback(
    (shiftId: string, newEmployeeId: string | undefined, newDate: string) => {
      setShifts((prev) => {
        const original = prev.find((s) => s.id === shiftId);
        if (!original) return prev;
        const copy: ScheduleShift = {
          ...original,
          id: `shift-copy-${Date.now()}`,
          employeeId: newEmployeeId,
          date: newDate,
          status: "draft",
          recurrenceId: undefined,
        };
        return [...prev, copy];
      });
      toast.success("Shift copied");
    },
    [],
  );

  const handleAssignShift = useCallback(
    (shiftId: string, employeeId: string | undefined) => {
      setShifts((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, employeeId } : s)),
      );
      if (employeeId) {
        toast.success("Employee assigned");
      } else {
        toast.success("Shift made open");
      }
    },
    [],
  );

  // ─── Publish / Draft handlers ──────────────────────────────────────────

  const handlePublish = () => {
    setShifts((prev) =>
      prev.map((s) =>
        s.departmentId === selectedDepartment.id && s.status === "draft"
          ? { ...s, status: "published" as const }
          : s,
      ),
    );
    toast.success("Schedule published! Staff will be notified.", {
      description: `${draftShifts.length} shifts have been published.`,
    });
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved");
  };

  const handleDiscard = () => {
    setShifts((prev) =>
      prev.filter(
        (s) => !(s.departmentId === selectedDepartment.id && s.status === "draft"),
      ),
    );
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
          ? Math.round((new Date(clockedOutAt).getTime() - new Date(e.clockedInAt).getTime()) / 60000)
          : 0;
        return { ...e, clockedOutAt, actualMinutes, status: "clocked_out" as const };
      }),
    );
    toast.success("Clocked out");
  }, []);

  return (
    <div className="flex h-full flex-col">
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

      <div className="flex-1 overflow-hidden border-t">
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
        key={editingShift?.id ?? `new-${defaultShiftDate ?? ""}-${defaultShiftEmployee ?? ""}`}
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
    </div>
  );
}
