"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  CalendarDays,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { schedules, type Schedule } from "@/data/schedules";
import { timeOffRequests, defaultTimeOffReasons, type TimeOffRequest, type TimeOffReason } from "@/data/staff-availability";
import { shiftSwapRequests, type ShiftSwapRequest } from "@/data/staff-availability";
import { getCurrentUserId } from "@/lib/role-utils";
import { users } from "@/data/users";

// Schedule update acknowledgment interface
interface ScheduleUpdate {
  id: string;
  publishedAt: string;
  weekStart: string;
  weekEnd: string;
  acknowledgedBy: string[];
  facility: string;
}

// Mock schedule updates (in production, this would come from backend)
const mockScheduleUpdates: ScheduleUpdate[] = [
  {
    id: "update-1",
    publishedAt: new Date().toISOString(),
    weekStart: "2025-11-17",
    weekEnd: "2025-11-23",
    acknowledgedBy: [],
    facility: "Paws & Play Daycare",
  },
];

export default function StaffSchedulePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [mySchedules, setMySchedules] = useState<Schedule[]>([]);
  const [selectedShift, setSelectedShift] = useState<Schedule | null>(null);
  const [isShiftDetailModalOpen, setIsShiftDetailModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<ScheduleUpdate[]>([]);

  // Time off request state
  const [timeOffData, setTimeOffData] = useState({
    type: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Swap request state
  const [swapData, setSwapData] = useState({
    shiftId: "",
    swapType: "specific" as "specific" | "anyone",
    targetStaffId: "",
    reason: "",
  });

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    // If no user ID, use first staff member as default for demo
    const defaultStaff = users.find((u) => u.role === "Staff");
    setUserId(currentUserId || defaultStaff?.id.toString() || "4");
  }, []);

  // Get staff member info
  const staffMember = useMemo(() => {
    if (!userId) return null;
    return users.find((u) => u.id.toString() === userId || u.email === userId) || null;
  }, [userId]);

  // Get schedules for this staff member
  useEffect(() => {
    if (!userId) return;
    const staffId = parseInt(userId);
    const today = new Date().toISOString().split("T")[0];
    
    // Get all future and today's schedules
    const allSchedules = schedules.filter(
      (s) => s.staffId === staffId && s.date >= today
    );
    
    // Sort by date and time
    allSchedules.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
    
    setMySchedules(allSchedules);
  }, [userId]);

  // Get pending schedule updates
  useEffect(() => {
    if (!staffMember) return;
    const unacknowledged = mockScheduleUpdates.filter(
      (update) => !update.acknowledgedBy.includes(staffMember.id.toString())
    );
    setPendingUpdates(unacknowledged);
  }, [staffMember]);

  // Get time off reasons
  const timeOffReasons = useMemo(() => {
    return defaultTimeOffReasons.filter((r) => r.isActive);
  }, []);

  // Get my pending time off requests
  const myTimeOffRequests = useMemo(() => {
    if (!userId) return [];
    const staffId = parseInt(userId);
    return timeOffRequests.filter((r) => r.staffId === staffId);
  }, [userId]);

  // Get my pending swap requests
  const mySwapRequests = useMemo(() => {
    if (!userId) return [];
    const staffId = parseInt(userId);
    return shiftSwapRequests.filter((r) => r.requestingStaffId === staffId);
  }, [userId]);

  // Handle shift detail view
  const handleViewShift = (shift: Schedule) => {
    setSelectedShift(shift);
    setIsShiftDetailModalOpen(true);
  };

  // Handle time off request
  const handleTimeOffSubmit = () => {
    if (!timeOffData.type || !timeOffData.startDate || !timeOffData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // In production, this would make an API call
    toast.success("Time off request submitted successfully");
    setIsTimeOffModalOpen(false);
    setTimeOffData({ type: "", startDate: "", endDate: "", reason: "" });
  };

  // Handle swap request
  const handleSwapSubmit = () => {
    if (!swapData.shiftId || !swapData.reason) {
      toast.error("Please select a shift and provide a reason");
      return;
    }

    if (swapData.swapType === "specific" && !swapData.targetStaffId) {
      toast.error("Please select a coworker to swap with");
      return;
    }

    // In production, this would make an API call
    toast.success("Shift swap request submitted successfully");
    setIsSwapModalOpen(false);
    setSwapData({ shiftId: "", swapType: "specific", targetStaffId: "", reason: "" });
  };

  // Handle schedule update acknowledgment
  const handleAcknowledgeUpdate = (updateId: string) => {
    if (!staffMember) return;
    
    // In production, this would make an API call
    setPendingUpdates((prev) => prev.filter((u) => u.id !== updateId));
    toast.success("Schedule update acknowledged");
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get status badge color
  const getStatusBadge = (status: Schedule["status"]) => {
    const variants: Record<Schedule["status"], "default" | "secondary" | "destructive" | "outline"> = {
      scheduled: "default",
      confirmed: "secondary",
      completed: "outline",
      absent: "destructive",
      sick: "destructive",
    };
    return variants[status] || "outline";
  };

  if (!staffMember) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Staff Member Found</h2>
              <p className="text-muted-foreground">
                Please log in to view your schedule.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {staffMember.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsTimeOffModalOpen(true)} variant="outline" size="sm">
            <CalendarDays className="mr-2 h-4 w-4" />
            Request Time Off
          </Button>
          <Button onClick={() => setIsSwapModalOpen(true)} variant="outline" size="sm">
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Request Swap
          </Button>
        </div>
      </div>

      {/* Schedule Updates Notification */}
      {pendingUpdates.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              New Schedule Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingUpdates.map((update) => (
              <div
                key={update.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div>
                  <p className="font-medium">
                    Schedule published for {formatDate(update.weekStart)} - {formatDate(update.weekEnd)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Published {new Date(update.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAcknowledgeUpdate(update.id)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{mySchedules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming Shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {mySchedules.filter((s) => s.status === "scheduled" || s.status === "confirmed").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {myTimeOffRequests.filter((r) => r.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {mySwapRequests.filter((r) => r.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending Swaps</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {mySchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming shifts scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySchedules.map((shift) => (
                <div
                  key={shift.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleViewShift(shift)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(shift.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {shift.startTime} - {shift.endTime}
                        </span>
                      </div>
                      <Badge variant={getStatusBadge(shift.status)}>
                        {shift.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                      <span className="font-medium">{shift.role}</span>
                      {shift.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{shift.location}</span>
                        </div>
                      )}
                    </div>
                    {shift.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {shift.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 sm:mt-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewShift(shift);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      <Dialog open={isShiftDetailModalOpen} onOpenChange={setIsShiftDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>
              View complete information about this shift
            </DialogDescription>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(selectedShift.date)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedShift.startTime} - {selectedShift.endTime}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Badge variant={getStatusBadge(selectedShift.status)}>
                  {selectedShift.role}
                </Badge>
              </div>
              {selectedShift.location && (
                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedShift.location}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Badge variant={getStatusBadge(selectedShift.status)}>
                  {selectedShift.status}
                </Badge>
              </div>
              {selectedShift.notes && (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {selectedShift.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShiftDetailModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setSwapData({ ...swapData, shiftId: selectedShift?.id.toString() || "" });
                setIsShiftDetailModalOpen(false);
                setIsSwapModalOpen(true);
              }}
            >
              Request Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Off Request Modal */}
      <Dialog open={isTimeOffModalOpen} onOpenChange={setIsTimeOffModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>
              Submit a request for time off. Your manager will review and respond.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type of Request</Label>
              <Select
                value={timeOffData.type}
                onValueChange={(value) => setTimeOffData({ ...timeOffData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {timeOffReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={timeOffData.startDate}
                  onChange={(e) => setTimeOffData({ ...timeOffData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={timeOffData.endDate}
                  onChange={(e) => setTimeOffData({ ...timeOffData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                value={timeOffData.reason}
                onChange={(e) => setTimeOffData({ ...timeOffData, reason: e.target.value })}
                placeholder="Provide additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimeOffModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTimeOffSubmit}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap Request Modal */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Shift Swap</DialogTitle>
            <DialogDescription>
              Request to swap a shift with a coworker or open it up for anyone qualified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Shift</Label>
              <Select
                value={swapData.shiftId}
                onValueChange={(value) => setSwapData({ ...swapData, shiftId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shift" />
                </SelectTrigger>
                <SelectContent>
                  {mySchedules
                    .filter((s) => s.status === "scheduled" || s.status === "confirmed")
                    .map((shift) => (
                      <SelectItem key={shift.id} value={shift.id.toString()}>
                        {formatDate(shift.date)} - {shift.startTime} to {shift.endTime} ({shift.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Swap Type</Label>
              <Select
                value={swapData.swapType}
                onValueChange={(value) =>
                  setSwapData({ ...swapData, swapType: value as "specific" | "anyone" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific">Specific Coworker</SelectItem>
                  <SelectItem value="anyone">Open to Anyone Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {swapData.swapType === "specific" && (
              <div className="space-y-2">
                <Label>Select Coworker</Label>
                <Select
                  value={swapData.targetStaffId}
                  onValueChange={(value) => setSwapData({ ...swapData, targetStaffId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a coworker" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => u.id.toString() !== userId && u.role === "Staff")
                      .map((staff, index) => (
                        <SelectItem key={`staff-${staff.id}-${staff.email}-${index}`} value={staff.id.toString()}>
                          {staff.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={swapData.reason}
                onChange={(e) => setSwapData({ ...swapData, reason: e.target.value })}
                placeholder="Why do you need to swap this shift?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwapModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSwapSubmit}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
