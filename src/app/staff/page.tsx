"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3x3,
  Calendar as CalendarIcon,
  PhoneCall,
  Mail,
} from "lucide-react";
import { schedules, type Schedule } from "@/data/schedules";
import {
  timeOffRequests,
  defaultTimeOffReasons,
  type TimeOffRequest,
  type TimeOffReason,
  shiftSwapRequests,
  type ShiftSwapRequest,
  shiftTasks,
  type ShiftTask,
} from "@/data/staff-availability";
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
  const [viewMode, setViewMode] = useState<"week" | "list" | "day">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(today.setDate(diff));
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedShift, setSelectedShift] = useState<Schedule | null>(null);
  const [isShiftDetailModalOpen, setIsShiftDetailModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isSickCallModalOpen, setIsSickCallModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isSwapResponseModalOpen, setIsSwapResponseModalOpen] = useState(false);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<ShiftSwapRequest | null>(null);
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

  // Sick call state
  const [sickCallData, setSickCallData] = useState({
    shiftId: "",
    reason: "",
  });

  // Message state
  const [messageData, setMessageData] = useState({
    subject: "",
    message: "",
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

  // Get swap requests I can respond to (targeted at me or open to anyone)
  const availableSwapRequests = useMemo(() => {
    if (!userId) return [];
    const staffId = parseInt(userId);
    return shiftSwapRequests.filter(
      (r) =>
        r.status === "pending" &&
        // Open to anyone (no targetStaffId) OR specifically targeted at me
        (!r.targetStaffId || r.targetStaffId === staffId) &&
        r.requestingStaffId !== staffId
    );
  }, [userId]);

  // Get tasks for a specific shift
  const getShiftTasks = (shift: Schedule): ShiftTask[] => {
    return shiftTasks.filter(
      (t) =>
        t.shiftId === shift.id ||
        (t.scheduleDate === shift.date &&
          t.shiftStartTime === shift.startTime &&
          t.shiftEndTime === shift.endTime)
    );
  };

  // Get tasks assigned to me for a shift
  const getMyShiftTasks = (shift: Schedule): ShiftTask[] => {
    if (!userId) return [];
    const staffId = parseInt(userId);
    return getShiftTasks(shift).filter(
      (t) => t.assignedToStaffId === staffId || t.assignedToStaffId === null
    );
  };

  // Week view helpers
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  const getSchedulesForDate = (date: Date): Schedule[] => {
    const dateStr = date.toISOString().split("T")[0];
    return mySchedules.filter((s) => s.date === dateStr);
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
    setSelectedDate(today.toISOString().split("T")[0]);
  };

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

  // Handle sick call
  const handleSickCallSubmit = () => {
    if (!sickCallData.shiftId || !sickCallData.reason) {
      toast.error("Please select a shift and provide a reason");
      return;
    }

    // In production, this would make an API call
    toast.success("Sick call reported. Managers have been notified.");
    setIsSickCallModalOpen(false);
    setSickCallData({ shiftId: "", reason: "" });
  };

  // Handle message to manager
  const handleMessageSubmit = () => {
    if (!messageData.subject || !messageData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    // In production, this would make an API call
    toast.success("Message sent to manager");
    setIsMessageModalOpen(false);
    setMessageData({ subject: "", message: "" });
  };

  // Handle swap response
  const handleSwapResponse = (accept: boolean) => {
    if (!selectedSwapRequest) return;

    // In production, this would make an API call
    toast.success(accept ? "Swap request accepted" : "Swap request declined");
    setIsSwapResponseModalOpen(false);
    setSelectedSwapRequest(null);
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

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  // Get today's shifts
  const todayShifts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return mySchedules.filter((s) => s.date === today);
  }, [mySchedules]);

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
    <div className="p-3 sm:p-4 space-y-4">
      {/* Minimal Header - Mobile First */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {staffMember.name}
          </p>
        </div>
        {/* Mobile: Single menu button, Desktop: Essential actions only */}
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsTimeOffModalOpen(true)} 
            variant="outline" 
            size="sm"
            className="hidden sm:flex"
          >
            <CalendarDays className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Time Off</span>
          </Button>
          <Button 
            onClick={() => setIsSwapModalOpen(true)} 
            variant="outline" 
            size="sm"
            className="hidden sm:flex"
          >
            <ArrowRightLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Swap</span>
          </Button>
          {/* Mobile menu button */}
          <Button 
            variant="outline" 
            size="sm"
            className="sm:hidden"
            onClick={() => {
              // Simple dropdown would go here - for now just show time off
              setIsTimeOffModalOpen(true);
            }}
          >
            <CalendarDays className="h-4 w-4" />
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

      {/* Swap Requests I Can Respond To */}
      {availableSwapRequests.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-green-600" />
              Available Swap Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableSwapRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium">
                    {request.requestingStaffName} wants to swap
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.requestingShiftDate} - {request.requestingShiftTime}
                    {(() => {
                      // Find the shift to get the role (search in all schedules, not just mySchedules)
                      const shift = schedules.find(s => s.id === request.requestingShiftId);
                      return shift ? ` (${shift.role})` : '';
                    })()}
                  </p>
                  {request.reason && (
                    <p className="text-sm text-muted-foreground mt-1">Reason: {request.reason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedSwapRequest(request);
                    setIsSwapResponseModalOpen(true);
                  }}
                >
                  View & Respond
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Minimal Stats - Only show if there are pending items */}
      {(myTimeOffRequests.filter((r) => r.status === "pending").length > 0 || 
        mySwapRequests.filter((r) => r.status === "pending").length > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {myTimeOffRequests.filter((r) => r.status === "pending").length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-3 pb-3">
                <div className="text-lg font-bold">
                  {myTimeOffRequests.filter((r) => r.status === "pending").length}
                </div>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
              </CardContent>
            </Card>
          )}
          {mySwapRequests.filter((r) => r.status === "pending").length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-3 pb-3">
                <div className="text-lg font-bold">
                  {mySwapRequests.filter((r) => r.status === "pending").length}
                </div>
                <p className="text-xs text-muted-foreground">Pending Swaps</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "list" | "day")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="week">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-2 h-4 w-4" />
              My Shifts
            </TabsTrigger>
            <TabsTrigger value="day">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Today
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Week View */}
        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Week View</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const daySchedules = getSchedulesForDate(day);
                  const isToday = day.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                  
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-2 min-h-[200px] ${
                        isToday ? "bg-blue-50 border-blue-300" : ""
                      }`}
                    >
                      <div className="font-semibold text-sm mb-2">
                        {formatDateShort(day)}
                      </div>
                      <div className="space-y-1">
                        {daySchedules.map((shift) => (
                          <div
                            key={shift.id}
                            className="text-xs p-1.5 bg-primary/10 rounded cursor-pointer hover:bg-primary/20"
                            onClick={() => handleViewShift(shift)}
                          >
                            <div className="font-medium">{shift.startTime} - {shift.endTime}</div>
                            <div className="text-muted-foreground">{shift.role}</div>
                            {shift.location && (
                              <div className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {shift.location}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {mySchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming shifts scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySchedules.map((shift) => {
                    const myTasks = getMyShiftTasks(shift);
                    return (
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
                          {myTasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">My Tasks:</p>
                              {myTasks.slice(0, 2).map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-xs">
                                  <Checkbox
                                    checked={task.status === "completed"}
                                    disabled
                                    className="h-3 w-3"
                                  />
                                  <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                                    {task.taskName}
                                  </span>
                                </div>
                              ))}
                              {myTasks.length > 2 && (
                                <p className="text-xs text-muted-foreground">+{myTasks.length - 2} more tasks</p>
                              )}
                            </div>
                          )}
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Day View */}
        <TabsContent value="day" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {todayShifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No shifts scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayShifts.map((shift) => {
                    const myTasks = getMyShiftTasks(shift);
                    return (
                      <Card key={shift.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {shift.startTime} - {shift.endTime}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getStatusBadge(shift.status)}>
                                  {shift.status}
                                </Badge>
                                <Badge variant="outline">{shift.role}</Badge>
                                {shift.location && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {shift.location}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewShift(shift)}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {shift.notes && (
                            <div>
                              <Label className="text-sm font-medium">Notes</Label>
                              <p className="text-sm text-muted-foreground mt-1">{shift.notes}</p>
                            </div>
                          )}
                          {myTasks.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium mb-2 block">My Tasks</Label>
                              <div className="space-y-2">
                                {myTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="flex items-start gap-3 p-2 border rounded-lg"
                                  >
                                    <Checkbox
                                      checked={task.status === "completed"}
                                      disabled
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                        {task.taskName}
                                      </p>
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {task.priority}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shift Detail Modal */}
      <Dialog open={isShiftDetailModalOpen} onOpenChange={setIsShiftDetailModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
              {/* Tasks for this shift */}
              {getMyShiftTasks(selectedShift).length > 0 && (
                <div className="space-y-2">
                  <Label>My Tasks</Label>
                  <div className="space-y-2 border rounded-lg p-3 bg-muted/50">
                    {getMyShiftTasks(selectedShift).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-2 bg-background rounded"
                      >
                        <Checkbox
                          checked={task.status === "completed"}
                          disabled
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {task.taskName}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setSickCallData({ ...sickCallData, shiftId: selectedShift?.id.toString() || "" });
                setIsShiftDetailModalOpen(false);
                setIsSickCallModalOpen(true);
              }}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              I Can't Make This Shift
            </Button>
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

      {/* Sick Call Modal */}
      <Dialog open={isSickCallModalOpen} onOpenChange={setIsSickCallModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Absence / Sick</DialogTitle>
            <DialogDescription>
              Report that you cannot make this shift. Managers will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Shift</Label>
              <Select
                value={sickCallData.shiftId}
                onValueChange={(value) => setSickCallData({ ...sickCallData, shiftId: value })}
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
              <Label>Reason</Label>
              <Textarea
                value={sickCallData.reason}
                onChange={(e) => setSickCallData({ ...sickCallData, reason: e.target.value })}
                placeholder="Please provide a reason (e.g., sick, emergency, family issue)..."
                rows={4}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                This will flag your shift as needing coverage and notify managers immediately.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSickCallModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSickCallSubmit}>
              Report Absence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Manager Modal */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message Manager</DialogTitle>
            <DialogDescription>
              Send a message to your manager about your schedule or shifts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={messageData.subject}
                onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                placeholder="e.g., Question about my shift..."
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMessageSubmit}>Send Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap Response Modal */}
      <Dialog open={isSwapResponseModalOpen} onOpenChange={setIsSwapResponseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Swap Request</DialogTitle>
            <DialogDescription>
              Review the swap request and decide if you can take this shift.
            </DialogDescription>
          </DialogHeader>
          {selectedSwapRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Requested By</Label>
                <p className="text-sm font-medium">{selectedSwapRequest.requestingStaffName}</p>
              </div>
              <div className="space-y-2">
                <Label>Shift Details</Label>
                <div className="text-sm space-y-1">
                  <p><strong>Date:</strong> {formatDate(selectedSwapRequest.requestingShiftDate)}</p>
                  <p><strong>Time:</strong> {selectedSwapRequest.requestingShiftTime}</p>
                  {(() => {
                    const shift = schedules.find(s => s.id === selectedSwapRequest.requestingShiftId);
                    return shift ? <p><strong>Role:</strong> {shift.role}</p> : null;
                  })()}
                </div>
              </div>
              {selectedSwapRequest.reason && (
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {selectedSwapRequest.reason}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwapResponseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSwapResponse(false)}
            >
              Decline
            </Button>
            <Button onClick={() => handleSwapResponse(true)}>
              Accept Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
