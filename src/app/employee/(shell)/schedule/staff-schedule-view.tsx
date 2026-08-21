"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3x3,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { Schedule } from "@/types/staff";
// Leave, swaps and the reason list all come from Postgres now. What is left
// from this fixture is `shiftTasks` — the checklist attached to a shift, which
// has no table yet and is flagged on screen as such.
import { shiftTasks, type ShiftTask } from "@/data/staff-availability";
import { useMyShifts } from "@/lib/employee-schedule";
import {
  swapQueries,
  timeOffQueries,
  useRequestSwap,
  useRequestTimeOff,
} from "@/lib/api/scheduling";
import { staffQueries } from "@/lib/api/staff";
import { useQuery } from "@tanstack/react-query";
import type { TimeOffType } from "@/lib/api/mappers/scheduling";
import { useFacilityViewer } from "@/hooks/use-facility-rbac";

// The seven values `time_off_type` actually holds. The dropdown used to be
// driven by `defaultTimeOffReasons` — a fixture whose ids ("annual-leave",
// "family-emergency") are not members of the enum, so every one of them would
// have been refused by the column had the form ever reached it.
const TIME_OFF_LABELS: Record<TimeOffType, string> = {
  vacation: "Vacation",
  sick_leave: "Sick leave",
  personal: "Personal",
  bereavement: "Bereavement",
  parental: "Parental",
  unpaid: "Unpaid",
  other: "Other",
};

// Status pill for a time-off / swap request (Pending / Approved / Declined …).
function requestStatusBadge(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
      };
    case "denied":
      return {
        label: "Declined",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
      };
    case "changes_requested":
      return {
        label: "Changes requested",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className:
          "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
      };
    case "pending":
    default:
      return {
        label: "Pending",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
      };
  }
}

export function StaffScheduleView() {
  // The signed-in employee. Shifts, time-off, swaps and shift tasks are all
  // keyed by facility staff id, so every panel on this screen is the viewer's.
  const { viewer } = useFacilityViewer();
  const userId = viewer.id;
  const [viewMode, setViewMode] = useState<"week" | "list" | "day">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(today.setDate(diff));
  });
  const [_selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [selectedShift, setSelectedShift] = useState<Schedule | null>(null);
  const [isShiftDetailModalOpen, setIsShiftDetailModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isSickCallModalOpen, setIsSickCallModalOpen] = useState(false);

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

  // The signed-in staff profile.
  const staffMember = viewer;

  // Section 5E — the grid shows the SIGNED-IN employee's own shifts, read from
  // `staff_shifts` and scoped to this caller by the server (`?mine=1`).
  //
  // The "upcoming" cut used to be made here against `new Date()` — the READER's
  // date. It now happens inside the hook in the FACILITY's timezone, which is
  // the only clock a shift's date means anything in.
  const {
    shifts: mySchedules,
    isPending: shiftsPending,
    error: shiftsError,
  } = useMyShifts();

  // ── MY REQUESTS, FROM POSTGRES ─────────────────────────────────────────
  //
  // `?mine=1` on both. RLS alone would widen these for anyone holding an
  // approval permission — a manager's personal panel would list the whole
  // facility's leave — so "mine" is decided server-side from their staff row.
  const { data: myTimeOff } = useQuery(timeOffQueries.mine());
  const { data: mySwaps } = useQuery(swapQueries.mine());

  const myTimeOffRequests = myTimeOff?.requests ?? [];

  // Both sides come back in one list, so the payload names which staff row is
  // the caller. Without it a screen cannot tell "I offered this shift" from
  // "somebody offered me theirs".
  const myStaffId = mySwaps?.myStaffId;

  const mySwapRequests = useMemo(
    () =>
      (mySwaps?.swaps ?? []).filter(
        (r) => r.requestingEmployeeId === myStaffId,
      ),
    [mySwaps, myStaffId],
  );

  // Offers pointed AT me and still open.
  const incomingSwaps = useMemo(
    () =>
      (mySwaps?.swaps ?? []).filter(
        (r) => r.targetEmployeeId === myStaffId && r.status === "pending",
      ),
    [mySwaps, myStaffId],
  );

  // Get tasks for a specific shift
  const getShiftTasks = (shift: Schedule): ShiftTask[] => {
    return shiftTasks.filter(
      (t) =>
        t.shiftId === shift.id ||
        (t.scheduleDate === shift.date &&
          t.shiftStartTime === shift.startTime &&
          t.shiftEndTime === shift.endTime),
    );
  };

  // Get tasks assigned to me for a shift
  const getMyShiftTasks = (shift: Schedule): ShiftTask[] => {
    return getShiftTasks(shift).filter(
      (t) => t.assignedToStaffId === userId || t.assignedToStaffId === null,
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

  // ── THE THREE REQUESTS BELOW NOW REACH POSTGRES ────────────────────────
  //
  // Each of these ended in `toast.success(...)` over a comment reading "in
  // production, this would make an API call". The facility side of all three
  // was converted on 2026-08-21 — so there were three approval queues that
  // nothing could file into, and a staff member who was told their leave was
  // booked while no row existed anywhere.
  //
  // The INSERT policies were written for exactly this caller: own staff row
  // plus a personal permission (`request_time_off`, `request_shift_swap`). The
  // server resolves which staff row is "me"; this screen never sends an id.

  const requestTimeOff = useRequestTimeOff();
  const requestSwap = useRequestSwap();

  // Who a shift can be offered to. Only people with a `rowId` — somebody with
  // no staff row cannot hold a shift, so offering them one would be refused by
  // the foreign key after the person had already been told it was sent.
  const { data: allStaff } = useQuery(staffQueries.profiles());
  const coworkers = useMemo(
    () =>
      (allStaff ?? []).filter(
        (s) => Boolean(s.rowId) && s.id !== userId && s.status === "active",
      ),
    [allStaff, userId],
  );

  const handleTimeOffSubmit = () => {
    if (!timeOffData.type || !timeOffData.startDate || !timeOffData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    requestTimeOff.mutate(
      {
        type: timeOffData.type as TimeOffType,
        startDate: timeOffData.startDate,
        endDate: timeOffData.endDate,
        reason: timeOffData.reason,
      },
      {
        // The toast moves INSIDE the callback. Announcing it beside the call
        // rather than after it is what let the old version claim a booking that
        // never happened.
        onSuccess: () => {
          toast.success("Time off requested. Your manager will review it.");
          setIsTimeOffModalOpen(false);
          setTimeOffData({ type: "", startDate: "", endDate: "", reason: "" });
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleSwapSubmit = () => {
    if (!swapData.shiftId || !swapData.reason) {
      toast.error("Please select a shift and provide a reason");
      return;
    }

    if (swapData.swapType === "specific" && !swapData.targetStaffId) {
      toast.error("Please select a coworker to swap with");
      return;
    }

    requestSwap.mutate(
      {
        requestingShiftId: swapData.shiftId,
        targetStaffId: swapData.targetStaffId,
        reason: swapData.reason,
      },
      {
        onSuccess: () => {
          toast.success("Swap requested. Your manager will review it.");
          setIsSwapModalOpen(false);
          setSwapData({
            shiftId: "",
            swapType: "specific",
            targetStaffId: "",
            reason: "",
          });
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  // Calling in sick IS leave, of type `sick_leave`, for the day of the shift.
  // Modelling it as its own thing would have given the facility two tables
  // holding "who is not coming in" and no rule about which the roster believes.
  const handleSickCallSubmit = () => {
    if (!sickCallData.shiftId || !sickCallData.reason) {
      toast.error("Please select a shift and provide a reason");
      return;
    }

    const shift = mySchedules.find((s) => s.shiftId === sickCallData.shiftId);
    if (!shift) {
      toast.error("Pick the shift you are calling in for.");
      return;
    }

    requestTimeOff.mutate(
      {
        type: "sick_leave",
        startDate: shift.date,
        endDate: shift.date,
        reason: sickCallData.reason,
      },
      {
        onSuccess: () => {
          toast.success("Sick leave filed for that shift.");
          setIsSickCallModalOpen(false);
          setSickCallData({ shiftId: "", reason: "" });
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
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
    const variants: Record<
      Schedule["status"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
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
              <AlertCircle className="mx-auto mb-4 size-12 text-yellow-500" />
              <h2 className="mb-2 text-xl font-semibold">
                No Staff Member Found
              </h2>
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
    <div className="space-y-4 p-3 sm:p-4">
      {/* Minimal Header - Mobile First */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">My Schedule</h1>
          <p className="text-muted-foreground text-sm">{`${staffMember.firstName} ${staffMember.lastName}`}</p>
        </div>
        {/* Mobile: Single menu button, Desktop: Essential actions only */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsTimeOffModalOpen(true)}
            variant="outline"
            size="sm"
            className="hidden sm:flex"
          >
            <CalendarDays className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Time Off</span>
          </Button>
          <Button
            onClick={() => setIsSwapModalOpen(true)}
            variant="outline"
            size="sm"
            className="hidden sm:flex"
          >
            <ArrowRightLeft className="size-4 sm:mr-2" />
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
            <CalendarDays className="size-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Updates Notification */}
      {/* ── OFFERS AIMED AT ME ────────────────────────────────────────────
          These are real rows now. What is NOT here is the "Accept" button that
          used to sit on them: `shift_swap_update` admits an approver, or the
          REQUESTER cancelling — there is no transition by which the person
          being asked accepts. The old button toasted "Swap request accepted"
          and changed nothing, on a fixture, for a request that did not exist.

          Showing the offer and not the button is the honest half: the person
          knows they were asked, and the decision genuinely is their manager's.
          Giving the target a real say is a schema change and its own piece of
          work. */}
      {incomingSwaps.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="size-5 text-green-600" />
              Swaps offered to you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingSwaps.map((request) => (
              <div
                key={request.id}
                className="bg-background rounded-lg border p-3"
              >
                <p className="font-medium">
                  {request.requestingEmployeeName} wants to swap
                </p>
                <p className="text-muted-foreground text-sm">
                  {request.requestingShiftDate} · {request.requestingShiftTime}
                </p>
                {request.reason && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    Reason: {request.reason}
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  Waiting on your manager to approve it.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My Requests — time-off + outgoing swaps with status (spec Table 2) */}
      {(myTimeOffRequests.length > 0 || mySwapRequests.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myTimeOffRequests.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  Time off
                </p>
                {myTimeOffRequests.map((req) => {
                  const badge = requestStatusBadge(req.status);
                  const reason = TIME_OFF_LABELS[req.type] ?? req.type;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{reason}</p>
                        <p className="text-muted-foreground text-xs">
                          {req.startDate}
                          {req.endDate !== req.startDate
                            ? ` – ${req.endDate}`
                            : ""}
                        </p>
                        {req.status !== "pending" && req.reviewedByName && (
                          <p className="text-muted-foreground text-[11px]">
                            Reviewed by {req.reviewedByName}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {mySwapRequests.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  Shift swaps
                </p>
                {mySwapRequests.map((req) => {
                  const badge = requestStatusBadge(req.status);
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {req.requestingShiftDate} · {req.requestingShiftTime}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {req.targetEmployeeName
                            ? `With ${req.targetEmployeeName}`
                            : "Open to anyone"}
                          {req.status === "pending"
                            ? " · awaiting approval"
                            : req.status === "approved" && req.reviewedByName
                              ? ` · approved by ${req.reviewedByName}`
                              : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Tabs */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "week" | "list" | "day")}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="week">
              <Grid3x3 className="mr-2 size-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-2 size-4" />
              My Shifts
            </TabsTrigger>
            <TabsTrigger value="day">
              <CalendarIcon className="mr-2 size-4" />
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousWeek}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const daySchedules = getSchedulesForDate(day);
                  const isToday =
                    day.toISOString().split("T")[0] ===
                    new Date().toISOString().split("T")[0];

                  return (
                    <div
                      key={index}
                      className={`min-h-[200px] rounded-lg border p-2 ${isToday ? "border-blue-300 bg-blue-50" : ""} `}
                    >
                      <div className="mb-2 text-sm font-semibold">
                        {formatDateShort(day)}
                      </div>
                      <div className="space-y-1">
                        {daySchedules.map((shift) => (
                          <div
                            key={shift.id}
                            className="bg-primary/10 hover:bg-primary/20 cursor-pointer rounded-sm p-1.5 text-xs"
                            onClick={() => handleViewShift(shift)}
                          >
                            <div className="font-medium">
                              {shift.startTime} - {shift.endTime}
                            </div>
                            <div className="text-muted-foreground">
                              {shift.role}
                            </div>
                            {shift.location && (
                              <div className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-3" />
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
              {/* "No upcoming shifts" is a CLAIM about the roster. Saying it
                  while the request is still in flight, or after it failed, is
                  telling somebody they are not working when nobody has looked
                  — so both cases get their own answer. */}
              {shiftsPending ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={row} className="h-20 w-full" />
                  ))}
                </div>
              ) : shiftsError ? (
                <div className="py-8 text-center text-sm text-rose-600 dark:text-rose-400">
                  <AlertCircle className="mx-auto mb-3 size-10 opacity-70" />
                  <p className="font-medium">Could not load your shifts.</p>
                  <p className="text-muted-foreground mt-1">
                    {shiftsError.message}
                  </p>
                </div>
              ) : mySchedules.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Calendar className="mx-auto mb-4 size-12 opacity-50" />
                  <p>No upcoming shifts scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySchedules.map((shift) => {
                    const myTasks = getMyShiftTasks(shift);
                    return (
                      <div
                        key={shift.id}
                        className="hover:bg-accent/50 flex cursor-pointer flex-col items-start justify-between rounded-lg border p-4 transition-colors sm:flex-row sm:items-center"
                        onClick={() => handleViewShift(shift)}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="text-muted-foreground size-4" />
                              <span className="font-medium">
                                {formatDate(shift.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="text-muted-foreground size-4" />
                              <span className="text-sm">
                                {shift.startTime} - {shift.endTime}
                              </span>
                            </div>
                            <Badge variant={getStatusBadge(shift.status)}>
                              {shift.status}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                            <span className="font-medium">{shift.role}</span>
                            {shift.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                <span>{shift.location}</span>
                              </div>
                            )}
                          </div>
                          {myTasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-muted-foreground text-xs font-medium">
                                My Tasks:
                              </p>
                              {myTasks.slice(0, 2).map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Checkbox
                                    checked={task.status === "completed"}
                                    disabled
                                    className="size-3"
                                  />
                                  <span
                                    className={
                                      task.status === "completed"
                                        ? "text-muted-foreground line-through"
                                        : ""
                                    }
                                  >
                                    {task.taskName}
                                  </span>
                                </div>
                              ))}
                              {myTasks.length > 2 && (
                                <p className="text-muted-foreground text-xs">
                                  +{myTasks.length - 2} more tasks
                                </p>
                              )}
                            </div>
                          )}
                          {shift.notes && (
                            <p className="text-muted-foreground line-clamp-2 text-sm">
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
                          <FileText className="mr-2 size-4" />
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
              <CardTitle>Today&apos;s Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {todayShifts.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  <Calendar className="mx-auto mb-4 size-12 opacity-50" />
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
                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant={getStatusBadge(shift.status)}>
                                  {shift.status}
                                </Badge>
                                <Badge variant="outline">{shift.role}</Badge>
                                {shift.location && (
                                  <Badge
                                    variant="outline"
                                    className="flex items-center gap-1"
                                  >
                                    <MapPin className="size-3" />
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
                              <Label className="text-sm font-medium">
                                Notes
                              </Label>
                              <p className="text-muted-foreground mt-1 text-sm">
                                {shift.notes}
                              </p>
                            </div>
                          )}
                          {myTasks.length > 0 && (
                            <div>
                              <Label className="mb-2 block text-sm font-medium">
                                My Tasks
                              </Label>
                              <div className="space-y-2">
                                {myTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="flex items-start gap-3 rounded-lg border p-2"
                                  >
                                    <Checkbox
                                      checked={task.status === "completed"}
                                      disabled
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <p
                                        className={`text-sm font-medium ${
                                          task.status === "completed"
                                            ? `text-muted-foreground line-through`
                                            : ""
                                        } `}
                                      >
                                        {task.taskName}
                                      </p>
                                      {task.description && (
                                        <p className="text-muted-foreground mt-1 text-xs">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
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
      <Dialog
        open={isShiftDetailModalOpen}
        onOpenChange={setIsShiftDetailModalOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
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
                  <Calendar className="text-muted-foreground size-4" />
                  <span>{formatDate(selectedShift.date)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground size-4" />
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
                    <MapPin className="text-muted-foreground size-4" />
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
                  <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
                    {selectedShift.notes}
                  </p>
                </div>
              )}
              {/* Tasks for this shift */}
              {getMyShiftTasks(selectedShift).length > 0 && (
                <div className="space-y-2">
                  <Label>My Tasks</Label>
                  <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
                    {getMyShiftTasks(selectedShift).map((task) => (
                      <div
                        key={task.id}
                        className="bg-background flex items-start gap-3 rounded-sm p-2"
                      >
                        <Checkbox
                          checked={task.status === "completed"}
                          disabled
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${
                              task.status === "completed"
                                ? `text-muted-foreground line-through`
                                : ""
                            } `}
                          >
                            {task.taskName}
                          </p>
                          {task.description && (
                            <p className="text-muted-foreground mt-1 text-xs">
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
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="destructive"
              onClick={() => {
                setSickCallData({
                  ...sickCallData,
                  shiftId: selectedShift?.id.toString() || "",
                });
                setIsShiftDetailModalOpen(false);
                setIsSickCallModalOpen(true);
              }}
            >
              <AlertCircle className="mr-2 size-4" />I Can&apos;t Make This
              Shift
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsShiftDetailModalOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setSwapData({
                  ...swapData,
                  shiftId: selectedShift?.id.toString() || "",
                });
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
              Submit a request for time off. Your manager will review and
              respond.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type of Request</Label>
              <Select
                value={timeOffData.type}
                onValueChange={(value) =>
                  setTimeOffData({ ...timeOffData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIME_OFF_LABELS) as TimeOffType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {TIME_OFF_LABELS[type]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={timeOffData.startDate}
                  onChange={(e) =>
                    setTimeOffData({
                      ...timeOffData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={timeOffData.endDate}
                  onChange={(e) =>
                    setTimeOffData({ ...timeOffData, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                value={timeOffData.reason}
                onChange={(e) =>
                  setTimeOffData({ ...timeOffData, reason: e.target.value })
                }
                placeholder="Provide additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTimeOffModalOpen(false)}
            >
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
              Request to swap a shift with a coworker or open it up for anyone
              qualified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Shift</Label>
              <Select
                value={swapData.shiftId}
                onValueChange={(value) =>
                  setSwapData({ ...swapData, shiftId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shift" />
                </SelectTrigger>
                <SelectContent>
                  {mySchedules
                    .filter(
                      (s) =>
                        s.status === "scheduled" || s.status === "confirmed",
                    )
                    .map((shift) => (
                      <SelectItem key={shift.shiftId} value={shift.shiftId}>
                        {formatDate(shift.date)} - {shift.startTime} to{" "}
                        {shift.endTime} ({shift.role})
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
                  setSwapData({
                    ...swapData,
                    swapType: value as "specific" | "anyone",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific">Specific Coworker</SelectItem>
                  <SelectItem value="anyone">
                    Open to Anyone Qualified
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {swapData.swapType === "specific" && (
              <div className="space-y-2">
                <Label>Select Coworker</Label>
                <Select
                  value={swapData.targetStaffId}
                  onValueChange={(value) =>
                    setSwapData({ ...swapData, targetStaffId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a coworker" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Real colleagues, and addressed by `rowId` — the staff
                        row uuid the swap's foreign key needs. The fixture's
                        `id` is a legacy "fs-003" string that names no row, so
                        a swap built from it could never have been inserted. */}
                    {coworkers.map((s) => (
                      <SelectItem key={s.rowId} value={s.rowId!}>
                        {s.firstName} {s.lastName}
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
                onChange={(e) =>
                  setSwapData({ ...swapData, reason: e.target.value })
                }
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
              Report that you cannot make this shift. Managers will be notified
              immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Shift</Label>
              <Select
                value={sickCallData.shiftId}
                onValueChange={(value) =>
                  setSickCallData({ ...sickCallData, shiftId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shift" />
                </SelectTrigger>
                <SelectContent>
                  {mySchedules
                    .filter(
                      (s) =>
                        s.status === "scheduled" || s.status === "confirmed",
                    )
                    .map((shift) => (
                      <SelectItem key={shift.shiftId} value={shift.shiftId}>
                        {formatDate(shift.date)} - {shift.startTime} to{" "}
                        {shift.endTime} ({shift.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={sickCallData.reason}
                onChange={(e) =>
                  setSickCallData({ ...sickCallData, reason: e.target.value })
                }
                placeholder="Please provide a reason (e.g., sick, emergency, family issue)..."
                rows={4}
              />
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                <AlertCircle className="mr-1 inline size-4" />
                This will flag your shift as needing coverage and notify
                managers immediately.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSickCallModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSickCallSubmit}>
              Report Absence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
