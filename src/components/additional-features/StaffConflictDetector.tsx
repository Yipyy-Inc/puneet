"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  UserX,
  Clock,
  Users,
  Ban,
  Edit,
  ArrowRightLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Schedule } from "@/data/schedules";
import type { TimeOffRequest } from "@/data/staff-availability";

interface StaffConflictDetectorProps {
  schedules: Schedule[];
  staff: Array<{ id: number; name: string; role: string }>;
  timeOffRequests: TimeOffRequest[];
  onReassign?: (shiftId: number, newStaffId: number) => void;
  onEditShift?: (shiftId: number) => void;
  onIgnore?: (shiftId: number, reason: string) => void;
}

interface Conflict {
  id: string;
  shiftId: number;
  staffId: number;
  staffName: string;
  conflictType: "double_booking" | "overlapping" | "time_off" | "role_mismatch" | "max_hours" | "min_rest";
  severity: "critical" | "warning" | "info";
  date: string;
  timeSlot: string;
  message: string;
  conflictingShiftId?: number;
  conflictingShift?: Schedule;
  timeOffRequestId?: number;
  details?: any;
}

export function StaffConflictDetector({
  schedules,
  staff,
  timeOffRequests,
  onReassign,
  onEditShift,
  onIgnore,
}: StaffConflictDetectorProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isEditShiftModalOpen, setIsEditShiftModalOpen] = useState(false);
  const [isIgnoreModalOpen, setIsIgnoreModalOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [selectedNewStaffId, setSelectedNewStaffId] = useState<string>("");
  const [ignoreReason, setIgnoreReason] = useState("");

  // Detect all conflicts
  const detectAllConflicts = (): Conflict[] => {
    const allConflicts: Conflict[] = [];

    schedules
      .filter((s) => s.status === "scheduled")
      .forEach((shift) => {
        // 1. Check for double-booking and overlapping
        const overlapping = schedules.filter((s) => {
          if (s.staffId !== shift.staffId || s.date !== shift.date) return false;
          if (s.id === shift.id || s.status !== "scheduled") return false;

          const [startHour, startMin] = shift.startTime.split(":").map(Number);
          const [endHour, endMin] = shift.endTime.split(":").map(Number);
          const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
          const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
          const shiftStart = startHour * 60 + startMin;
          const shiftEnd = endHour * 60 + endMin;
          const sStart = sStartHour * 60 + sStartMin;
          const sEnd = sEndHour * 60 + sEndMin;

          return shiftStart < sEnd && shiftEnd > sStart;
        });

        if (overlapping.length > 0) {
          const isDoubleBooking = overlapping.some(
            (s) => s.startTime === shift.startTime && s.endTime === shift.endTime
          );

          const staffMember = staff.find((s) => s.id === shift.staffId);
          allConflicts.push({
            id: `conflict-${shift.id}-${isDoubleBooking ? "double" : "overlap"}`,
            shiftId: shift.id,
            staffId: shift.staffId,
            staffName: staffMember?.name || `Staff ${shift.staffId}`,
            conflictType: isDoubleBooking ? "double_booking" : "overlapping",
            severity: "critical",
            date: shift.date,
            timeSlot: `${shift.startTime} - ${shift.endTime}`,
            message: isDoubleBooking
              ? `${staffMember?.name || "Staff"} is double-booked for the same time slot`
              : `${staffMember?.name || "Staff"} has overlapping shifts`,
            conflictingShiftId: overlapping[0].id,
            conflictingShift: overlapping[0],
            details: { overlappingShifts: overlapping },
          });
        }

        // 2. Check for time off overlap
        const approvedTimeOff = timeOffRequests.find((to) => {
          if (to.staffId !== shift.staffId || to.status !== "approved") return false;
          const startDate = new Date(to.startDate);
          const endDate = new Date(to.endDate);
          const shiftDate = new Date(shift.date);
          return shiftDate >= startDate && shiftDate <= endDate;
        });

        if (approvedTimeOff) {
          const staffMember = staff.find((s) => s.id === shift.staffId);
          allConflicts.push({
            id: `conflict-${shift.id}-timeoff`,
            shiftId: shift.id,
            staffId: shift.staffId,
            staffName: staffMember?.name || `Staff ${shift.staffId}`,
            conflictType: "time_off",
            severity: "critical",
            date: shift.date,
            timeSlot: `${shift.startTime} - ${shift.endTime}`,
            message: `${staffMember?.name || "Staff"} has approved time off from ${approvedTimeOff.startDate} to ${approvedTimeOff.endDate}`,
            timeOffRequestId: approvedTimeOff.id,
            details: { timeOffRequest: approvedTimeOff },
          });
        }

        // 3. Check for role mismatch
        const staffMember = staff.find((s) => s.id === shift.staffId);
        if (shift.role && staffMember?.role && shift.role !== staffMember.role) {
          allConflicts.push({
            id: `conflict-${shift.id}-role`,
            shiftId: shift.id,
            staffId: shift.staffId,
            staffName: staffMember.name,
            conflictType: "role_mismatch",
            severity: "warning",
            date: shift.date,
            timeSlot: `${shift.startTime} - ${shift.endTime}`,
            message: `${staffMember.name} is assigned to ${shift.role} role but their primary role is ${staffMember.role}`,
            details: { assignedRole: shift.role, staffRole: staffMember.role },
          });
        }

        // 4. Check max hours per day
        const sameDayShifts = schedules.filter((s) => {
          if (s.staffId !== shift.staffId || s.date !== shift.date) return false;
          if (s.id === shift.id || s.status !== "scheduled") return false;
          return true;
        });

        const [startHour, startMin] = shift.startTime.split(":").map(Number);
        const [endHour, endMin] = shift.endTime.split(":").map(Number);
        const shiftDuration = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;

        const dailyHours = sameDayShifts.reduce((total, s) => {
          const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
          const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
          const hours = (sEndHour * 60 + sEndMin - (sStartHour * 60 + sStartMin)) / 60;
          return total + hours;
        }, shiftDuration);

        const maxHoursPerDay = 12;
        if (dailyHours > maxHoursPerDay) {
          allConflicts.push({
            id: `conflict-${shift.id}-maxhours`,
            shiftId: shift.id,
            staffId: shift.staffId,
            staffName: staffMember?.name || `Staff ${shift.staffId}`,
            conflictType: "max_hours",
            severity: "warning",
            date: shift.date,
            timeSlot: `${shift.startTime} - ${shift.endTime}`,
            message: `${staffMember?.name || "Staff"} would work ${dailyHours.toFixed(1)} hours on ${shift.date}, exceeding the ${maxHoursPerDay}-hour daily limit`,
            details: { dailyHours, maxHoursPerDay },
          });
        }

        // 5. Check min rest between shifts
        const previousDay = new Date(shift.date);
        previousDay.setDate(previousDay.getDate() - 1);
        const previousDayStr = previousDay.toISOString().split("T")[0];

        const nextDay = new Date(shift.date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split("T")[0];

        const previousDayShifts = schedules.filter((s) => {
          if (s.staffId !== shift.staffId || s.date !== previousDayStr) return false;
          return s.status === "scheduled";
        });

        const minRestHours = 8;
        const minRestMinutes = minRestHours * 60;
        const shiftStart = startHour * 60 + startMin;
        const shiftEnd = endHour * 60 + endMin;

        if (previousDayShifts.length > 0) {
          const lastShift = previousDayShifts.reduce((latest, s) => {
            const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
            const sEndMinutes = sEndHour * 60 + sEndMin;
            const [latestEndHour, latestEndMin] = latest.endTime.split(":").map(Number);
            const latestEndMinutes = latestEndHour * 60 + latestEndMin;
            return sEndMinutes > latestEndMinutes ? s : latest;
          }, previousDayShifts[0]);

          const [lastEndHour, lastEndMin] = lastShift.endTime.split(":").map(Number);
          const lastEndMinutes = lastEndHour * 60 + lastEndMin;
          const restMinutes = (24 * 60 - lastEndMinutes) + shiftStart;

          if (restMinutes < minRestMinutes) {
            allConflicts.push({
              id: `conflict-${shift.id}-minrest`,
              shiftId: shift.id,
              staffId: shift.staffId,
              staffName: staffMember?.name || `Staff ${shift.staffId}`,
              conflictType: "min_rest",
              severity: "warning",
              date: shift.date,
              timeSlot: `${shift.startTime} - ${shift.endTime}`,
              message: `${staffMember?.name || "Staff"} has only ${(restMinutes / 60).toFixed(1)} hours rest between shifts (minimum: ${minRestHours} hours)`,
              conflictingShiftId: lastShift.id,
              conflictingShift: lastShift,
              details: { restHours: restMinutes / 60, minRestHours },
            });
          }
        }
      });

    // Remove duplicates
    const uniqueConflicts = allConflicts.filter((conflict, index, self) =>
      index === self.findIndex((c) =>
        c.shiftId === conflict.shiftId &&
        c.conflictType === conflict.conflictType &&
        c.conflictingShiftId === conflict.conflictingShiftId
      )
    );

    return uniqueConflicts;
  };

  const allConflicts = useMemo(() => detectAllConflicts(), [schedules, staff, timeOffRequests]);
  const activeConflicts = allConflicts.filter((conflict) => !resolvedIds.has(conflict.id));

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800";
      case "warning":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800";
      case "info":
        return "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800";
      default:
        return "";
    }
  };

  const getConflictTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      double_booking: "Double Booking",
      overlapping: "Overlapping Shifts",
      time_off: "Time Off Conflict",
      role_mismatch: "Role Mismatch",
      max_hours: "Max Hours Exceeded",
      min_rest: "Insufficient Rest",
    };
    return labels[type] || type;
  };

  const criticalCount = activeConflicts.filter((c) => c.severity === "critical").length;
  const warningCount = activeConflicts.filter((c) => c.severity === "warning").length;

  // Get available staff for reassignment (same role preferred)
  const getAvailableStaffForReassign = (conflict: Conflict) => {
    const shift = schedules.find((s) => s.id === conflict.shiftId);
    if (!shift) return [];

    return staff
      .filter((s) => {
        // Exclude the current staff
        if (s.id === conflict.staffId) return false;

        // Check if they have availability (simplified - would check actual availability)
        const hasConflict = schedules.some((sch) => {
          if (sch.staffId !== s.id || sch.date !== shift.date || sch.status !== "scheduled") return false;
          const [startHour, startMin] = shift.startTime.split(":").map(Number);
          const [endHour, endMin] = shift.endTime.split(":").map(Number);
          const [sStartHour, sStartMin] = sch.startTime.split(":").map(Number);
          const [sEndHour, sEndMin] = sch.endTime.split(":").map(Number);
          const shiftStart = startHour * 60 + startMin;
          const shiftEnd = endHour * 60 + endMin;
          const sStart = sStartHour * 60 + sStartMin;
          const sEnd = sEndHour * 60 + sEndMin;
          return shiftStart < sEnd && shiftEnd > sStart;
        });

        return !hasConflict;
      })
      .sort((a, b) => {
        // Prefer same role
        if (shift.role && a.role === shift.role && b.role !== shift.role) return -1;
        if (shift.role && b.role === shift.role && a.role !== shift.role) return 1;
        return 0;
      });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Conflicts
                </p>
                <p className="text-2xl font-bold">{activeConflicts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Critical
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {criticalCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Warnings
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {warningCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts List */}
      <div className="space-y-3">
        {activeConflicts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Conflicts Detected
              </h3>
              <p className="text-sm text-muted-foreground">
                All staff schedules are optimized with no conflicts.
              </p>
            </CardContent>
          </Card>
        ) : (
          activeConflicts.map((conflict) => (
            <Card
              key={conflict.id}
              className={`border-2 ${getSeverityColor(conflict.severity)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(conflict.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <CardTitle className="text-base">
                          {conflict.staffName}
                        </CardTitle>
                        <Badge variant="outline">
                          {getConflictTypeBadge(conflict.conflictType)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📅 {conflict.date}</span>
                        <span>•</span>
                        <span>⏰ {conflict.timeSlot}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResolvedIds((prev) => new Set(prev).add(conflict.id))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium mb-1">⚠️ Issue</p>
                  <p className="text-sm text-muted-foreground">
                    {conflict.message}
                  </p>
                </div>

                {/* Conflicting Shift Details */}
                {conflict.conflictingShift && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Conflicting Shift:</p>
                    <div className="p-2 bg-muted/50 rounded border text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {conflict.conflictingShift.staffName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Shift #{conflict.conflictingShift.id}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {conflict.conflictingShift.date} ({conflict.conflictingShift.startTime} - {conflict.conflictingShift.endTime})
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedConflict(conflict);
                      setSelectedNewStaffId("");
                      setIsReassignModalOpen(true);
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Reassign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedConflict(conflict);
                      if (onEditShift) {
                        onEditShift(conflict.shiftId);
                      }
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Shift Time
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedConflict(conflict);
                      setIgnoreReason("");
                      setIsIgnoreModalOpen(true);
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Ignore
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reassign Modal */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Reassign Shift
            </DialogTitle>
            <DialogDescription>
              Reassign this shift to another staff member to resolve the conflict.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Current Shift</p>
                <p className="text-sm text-muted-foreground">
                  {selectedConflict.staffName} - {selectedConflict.date} ({selectedConflict.timeSlot})
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newStaff">Select New Staff Member *</Label>
                <Select
                  value={selectedNewStaffId}
                  onValueChange={setSelectedNewStaffId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStaffForReassign(selectedConflict).map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getAvailableStaffForReassign(selectedConflict).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No available staff found for this shift
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReassignModalOpen(false);
                setSelectedConflict(null);
                setSelectedNewStaffId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedConflict || !selectedNewStaffId) {
                  toast.error("Please select a staff member");
                  return;
                }

                if (onReassign) {
                  onReassign(selectedConflict.shiftId, parseInt(selectedNewStaffId));
                }

                toast.success("Shift reassigned successfully");
                setResolvedIds((prev) => new Set(prev).add(selectedConflict.id));
                setIsReassignModalOpen(false);
                setSelectedConflict(null);
                setSelectedNewStaffId("");
              }}
              disabled={!selectedNewStaffId}
            >
              Reassign Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Conflict Modal */}
      <Dialog open={isIgnoreModalOpen} onOpenChange={setIsIgnoreModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Ignore Conflict
            </DialogTitle>
            <DialogDescription>
              Ignore this conflict with a reason. This will mark it as resolved.
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Conflict Details</p>
                <p className="text-sm text-muted-foreground">
                  {selectedConflict.staffName} - {selectedConflict.date} ({selectedConflict.timeSlot})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedConflict.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ignoreReason">Reason for Ignoring *</Label>
                <Textarea
                  id="ignoreReason"
                  placeholder="Explain why this conflict can be ignored..."
                  value={ignoreReason}
                  onChange={(e) => setIgnoreReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsIgnoreModalOpen(false);
                setSelectedConflict(null);
                setIgnoreReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!ignoreReason.trim()) {
                  toast.error("Please provide a reason");
                  return;
                }

                if (onIgnore && selectedConflict) {
                  onIgnore(selectedConflict.shiftId, ignoreReason);
                }

                toast.success("Conflict ignored");
                setResolvedIds((prev) => new Set(prev).add(selectedConflict!.id));
                setIsIgnoreModalOpen(false);
                setSelectedConflict(null);
                setIgnoreReason("");
              }}
              disabled={!ignoreReason.trim()}
            >
              Ignore Conflict
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
