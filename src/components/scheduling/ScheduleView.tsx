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
import {
  departments,
  scheduleEmployees,
  scheduleShifts as initialShifts,
  enhancedTimeOffRequests,
  enhancedShiftSwaps,
  getPositionsForDepartment,
  getDepartmentEmployees,
  calculateLaborCost,
} from "@/data/scheduling";
import type {
  Department,
  ScheduleShift,
} from "@/types/scheduling";

export function ScheduleView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(
    departments[0],
  );
  const [shifts, setShifts] = useState<ScheduleShift[]>(initialShifts);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [defaultShiftDate, setDefaultShiftDate] = useState<string>();
  const [defaultShiftEmployee, setDefaultShiftEmployee] = useState<string>();

  // Get date range for current view
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

  // Draft shifts
  const draftShifts = useMemo(
    () => filteredShifts.filter((s) => s.status === "draft"),
    [filteredShifts],
  );

  // Stats
  const todayStr = new Date().toISOString().split("T")[0];
  const scheduledToday = useMemo(
    () =>
      new Set(
        shifts
          .filter(
            (s) =>
              s.departmentId === selectedDepartment.id && s.date === todayStr,
          )
          .map((s) => s.employeeId),
      ).size,
    [shifts, selectedDepartment.id, todayStr],
  );

  const totalHours = useMemo(() => {
    return filteredShifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      return sum + (eh - sh + (em - sm) / 60 - s.breakMinutes / 60);
    }, 0);
  }, [filteredShifts]);

  const laborCost = useMemo(
    () =>
      calculateLaborCost(
        selectedDepartment.id,
        dateRange.start,
        dateRange.end,
      ),
    [selectedDepartment.id, dateRange],
  );

  const pendingTimeOff = enhancedTimeOffRequests.filter(
    (r) =>
      r.departmentId === selectedDepartment.id && r.status === "pending",
  ).length;

  const pendingSwaps = enhancedShiftSwaps.filter(
    (r) =>
      r.departmentId === selectedDepartment.id && r.status === "pending",
  ).length;

  // Compute employee hours for the current view period
  const getEmployeeHours = useCallback(
    (employeeId: string) => {
      return filteredShifts
        .filter((s) => s.employeeId === employeeId)
        .reduce((sum, s) => {
          const [sh, sm] = s.startTime.split(":").map(Number);
          const [eh, em] = s.endTime.split(":").map(Number);
          return sum + (eh - sh + (em - sm) / 60 - s.breakMinutes / 60);
        }, 0);
    },
    [filteredShifts],
  );

  // Handlers
  const handleShiftClick = (shift: ScheduleShift) => {
    setEditingShift(shift);
    setAddShiftOpen(true);
  };

  const handleCellClick = (employeeId: string, date: string) => {
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

  const handleSaveShift = (
    shiftData: Omit<ScheduleShift, "id">,
  ) => {
    if (editingShift) {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id ? { ...s, ...shiftData } : s,
        ),
      );
      toast.success("Shift updated");
    } else {
      const newShift: ScheduleShift = {
        ...shiftData,
        id: `shift-new-${Date.now()}`,
        status: "draft",
      };
      setShifts((prev) => [...prev, newShift]);
      toast.success("Draft shift added");
    }
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    toast.success("Shift deleted");
  };

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
        (s) =>
          !(
            s.departmentId === selectedDepartment.id && s.status === "draft"
          ),
      ),
    );
    toast.info("Draft changes discarded");
  };

  const handlePrint = () => {
    window.print();
  };

  // Time off for the department
  const deptTimeOff = useMemo(
    () =>
      enhancedTimeOffRequests.filter(
        (r) => r.departmentId === selectedDepartment.id,
      ),
    [selectedDepartment.id],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header with nav, date selector, view toggle */}
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
      />

      {/* Stats Row */}
      <ScheduleStats
        totalEmployees={deptEmployees.length}
        scheduledToday={scheduledToday}
        totalHoursThisWeek={totalHours}
        laborCost={laborCost.totalCost}
        pendingTimeOff={pendingTimeOff}
        pendingSwaps={pendingSwaps}
        overtimeAlerts={0}
      />

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden border-t">
        <ScheduleCalendar
          viewMode={viewMode}
          currentDate={currentDate}
          employees={deptEmployees}
          shifts={filteredShifts}
          positions={deptPositions}
          timeOffRequests={deptTimeOff}
          onShiftClick={handleShiftClick}
          onCellClick={handleCellClick}
          getEmployeeHours={getEmployeeHours}
        />
      </div>

      {/* Draft/Publish Bar */}
      <DraftPublishBar
        draftCount={draftShifts.length}
        hasChanges={draftShifts.length > 0}
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscard}
      />

      {/* Add/Edit Shift Dialog */}
      <AddShiftDialog
        open={addShiftOpen}
        onOpenChange={setAddShiftOpen}
        employees={deptEmployees}
        positions={deptPositions}
        defaultDate={defaultShiftDate}
        defaultEmployeeId={defaultShiftEmployee}
        editingShift={editingShift}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
      />
    </div>
  );
}
