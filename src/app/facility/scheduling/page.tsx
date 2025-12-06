"use client";

import { useState } from "react";
import { users } from "@/data/users";
import { schedules } from "@/data/schedules";
import { facilities } from "@/data/facilities";
import {
  shiftTemplates,
  shiftTasks,
  shiftSwapRequests,
  sickCallIns,
  staffAvailability,
  type ShiftTask,
  type SickCallIn,
  getPendingSwapRequests,
  getSickCallInsNeedingCoverage,
} from "@/data/staff-availability";
import {
  GenericCalendar,
  CalendarItem,
  CalendarRowData,
} from "@/components/ui/GenericCalendar";
import { StaffConflictDetector } from "@/components/additional-features/StaffConflictDetector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  Phone,
  ArrowLeftRight,
  ClipboardList,
  UserX,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon,
  User,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Example staff data for testing (matching staff page)
const exampleStaff = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@pawsplay.com",
    role: "Admin",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0101",
    hireDate: "2025-01-15",
    permissions: [
      "manage_users",
      "manage_facilities",
      "view_reports",
      "manage_billing",
    ],
    pets: [
      { name: "Buddy", type: "Dog", age: 3 },
      { name: "Whiskers", type: "Cat", age: 2 },
    ],
  },
  {
    id: 2,
    name: "Manager One",
    email: "manager1@pawsplay.com",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0102",
    hireDate: "2025-06-10",
    permissions: ["manage_staff", "view_reports", "schedule_appointments"],
    pets: [{ name: "Max", type: "Dog", age: 5 }],
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah@pawsplay.com",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0104",
    hireDate: "2025-02-15",
    permissions: [
      "manage_staff",
      "view_reports",
      "schedule_appointments",
      "manage_inventory",
      "handle_bookings",
    ],
    pets: [{ name: "Coco", type: "Dog", age: 2 }],
  },
  {
    id: 4,
    name: "Mike Chen",
    email: "mike@pawsplay.com",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-15",
    phone: "+1-555-0105",
    hireDate: "2025-04-10",
    permissions: [
      "view_schedule",
      "update_pet_records",
      "assist_clients",
      "perform_grooming",
      "manage_pet_care",
    ],
    pets: [
      { name: "Rex", type: "Dog", age: 4 },
      { name: "Mittens", type: "Cat", age: 1 },
    ],
  },
  {
    id: 5,
    name: "Emily Davis",
    email: "emily@pawsplay.com",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "active",
    lastLogin: "2025-11-14",
    phone: "+1-555-0106",
    hireDate: "2025-07-22",
    permissions: [
      "view_schedule",
      "update_pet_records",
      "assist_clients",
      "care_for_cats",
      "update_records",
    ],
    pets: [{ name: "Whiskers", type: "Cat", age: 3 }],
  },
  {
    id: 6,
    name: "Lisa Rodriguez",
    email: "lisa@pawsplay.com",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "inactive",
    lastLogin: "2025-11-10",
    phone: "+1-555-0108",
    hireDate: "2025-01-30",
    permissions: [
      "view_schedule",
      "update_pet_records",
      "assist_clients",
      "perform_grooming",
    ],
    pets: [{ name: "Bruno", type: "Dog", age: 6 }],
  },
];

// Example schedule data for testing
const exampleSchedules = [
  // Current Week (Nov 15-21, 2025)
  // Admin User (ID: 1) - Standard admin hours
  {
    id: 1,
    staffId: 1,
    staffName: "Admin User",
    date: "2025-11-15",
    startTime: "09:00",
    endTime: "17:00",
    role: "Admin",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 2,
    staffId: 1,
    staffName: "Admin User",
    date: "2025-11-16",
    startTime: "09:00",
    endTime: "17:00",
    role: "Admin",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 3,
    staffId: 1,
    staffName: "Admin User",
    date: "2025-11-17",
    startTime: "09:00",
    endTime: "17:00",
    role: "Admin",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  // Manager One (ID: 2) - Early morning shifts
  {
    id: 4,
    staffId: 2,
    staffName: "Manager One",
    date: "2025-11-15",
    startTime: "08:00",
    endTime: "16:00",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 5,
    staffId: 2,
    staffName: "Manager One",
    date: "2025-11-16",
    startTime: "08:00",
    endTime: "16:00",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  // Sarah Johnson (ID: 3) - Manager with varied schedule
  {
    id: 6,
    staffId: 3,
    staffName: "Sarah Johnson",
    date: "2025-11-15",
    startTime: "07:00",
    endTime: "15:00",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 7,
    staffId: 3,
    staffName: "Sarah Johnson",
    date: "2025-11-16",
    startTime: "07:00",
    endTime: "15:00",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 8,
    staffId: 3,
    staffName: "Sarah Johnson",
    date: "2025-11-17",
    startTime: "12:00",
    endTime: "20:00",
    role: "Manager",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  // Mike Chen (ID: 4) - Full-time staff
  {
    id: 9,
    staffId: 4,
    staffName: "Mike Chen",
    date: "2025-11-15",
    startTime: "09:00",
    endTime: "17:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 10,
    staffId: 4,
    staffName: "Mike Chen",
    date: "2025-11-16",
    startTime: "09:00",
    endTime: "17:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 11,
    staffId: 4,
    staffName: "Mike Chen",
    date: "2025-11-17",
    startTime: "09:00",
    endTime: "17:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  // Emily Davis (ID: 5) - Morning shifts
  {
    id: 12,
    staffId: 5,
    staffName: "Emily Davis",
    date: "2025-11-15",
    startTime: "08:00",
    endTime: "16:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 13,
    staffId: 5,
    staffName: "Emily Davis",
    date: "2025-11-16",
    startTime: "08:00",
    endTime: "16:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  // Lisa Rodriguez (ID: 6) - Inactive, occasional shifts
  {
    id: 14,
    staffId: 6,
    staffName: "Lisa Rodriguez",
    date: "2025-11-15",
    startTime: "11:00",
    endTime: "19:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  {
    id: 15,
    staffId: 6,
    staffName: "Lisa Rodriguez",
    date: "2025-11-17",
    startTime: "11:00",
    endTime: "19:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "scheduled",
  },
  // Completed shifts for testing
  {
    id: 16,
    staffId: 4,
    staffName: "Mike Chen",
    date: "2025-11-14",
    startTime: "09:00",
    endTime: "17:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "completed",
  },
  // Cancelled shift example
  {
    id: 17,
    staffId: 5,
    staffName: "Emily Davis",
    date: "2025-11-20",
    startTime: "08:00",
    endTime: "16:00",
    role: "Staff",
    facility: "Paws & Play Daycare",
    status: "cancelled",
  },
];
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  Copy,
  Repeat,
  FileDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const exportSchedulesToCSV = (scheduleData: typeof schedules) => {
  const headers = [
    "ID",
    "Staff Name",
    "Date",
    "Start Time",
    "End Time",
    "Role",
    "Status",
  ];

  const csvContent = [
    headers.join(","),
    ...scheduleData.map((schedule) =>
      [
        schedule.id,
        `"${schedule.staffName.replace(/"/g, '""')}"`,
        schedule.date,
        schedule.startTime,
        schedule.endTime,
        schedule.role,
        schedule.status,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `schedules_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export schedules to ICS format
const exportSchedulesToICS = (
  scheduleData: typeof schedules,
  facilityName: string,
) => {
  const icsEvents = scheduleData
    .map((schedule) => {
      const startDate = schedule.date.replace(/-/g, "");
      const startTime = schedule.startTime.replace(":", "") + "00";
      const endTime = schedule.endTime.replace(":", "") + "00";

      return `BEGIN:VEVENT
DTSTART:${startDate}T${startTime}
DTEND:${startDate}T${endTime}
SUMMARY:${schedule.staffName} - ${schedule.role}
DESCRIPTION:Shift at ${facilityName}
STATUS:${schedule.status === "scheduled" ? "CONFIRMED" : "TENTATIVE"}
UID:${schedule.id}-${startDate}@doggieville.com
END:VEVENT`;
    })
    .join("\n");

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Doggieville//Staff Scheduling//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${facilityName} Staff Schedule
${icsEvents}
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `schedule_${new Date().toISOString().split("T")[0]}.ics`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to get week dates

// Helper function to format date
const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const timeSlots = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

export default function FacilitySchedulingPage() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [currentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(today.setDate(diff));
  });

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<
    (typeof schedules)[number] | null
  >(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<
    (typeof schedules)[number] | null
  >(null);

  // Form state
  const [formData, setFormData] = useState({
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    status: "scheduled",
    isRecurring: false,
    recurringPattern: "weekly" as "daily" | "weekly" | "biweekly",
    recurringEndDate: "",
  });

  // Shift template modal
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Copy week modal
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);
  const [copyTargetDate, setCopyTargetDate] = useState("");

  // Sick call-in modal
  const [isSickCallModalOpen, setIsSickCallModalOpen] = useState(false);
  const [sickCallData, setSickCallData] = useState({
    staffId: "",
    shiftId: "",
    reason: "",
    expectedReturnDate: "",
  });

  // Shift swap modal
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapData, setSwapData] = useState({
    requestingStaffId: "",
    requestingShiftId: "",
    targetStaffId: "",
    targetShiftId: "",
    reason: "",
  });

  // Shift task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskData, setTaskData] = useState({
    taskName: "",
    description: "",
    category: "other" as ShiftTask["category"],
    priority: "medium" as ShiftTask["priority"],
    scheduleDate: new Date().toISOString().split("T")[0],
    shiftStartTime: "",
    shiftEndTime: "",
    assignedToStaffId: "",
    requiresPhoto: false,
  });

  // Shift report modal
  const [isShiftReportModalOpen, setIsShiftReportModalOpen] = useState(false);
  const [selectedShiftForReport, setSelectedShiftForReport] = useState<
    (typeof schedules)[number] | null
  >(null);

  // Find coverage modal
  const [isFindCoverageModalOpen, setIsFindCoverageModalOpen] = useState(false);
  const [selectedSickCallIn, setSelectedSickCallIn] =
    useState<SickCallIn | null>(null);
  const [selectedCoverageStaffId, setSelectedCoverageStaffId] =
    useState<string>("");

  // Get available staff for coverage
  const getAvailableStaffForCoverage = (sickCall: SickCallIn | null) => {
    if (!sickCall) return [];

    const shiftDate = new Date(sickCall.shiftDate);
    const dayOfWeek = shiftDate.getDay();
    const [shiftStart] = sickCall.shiftTime.split(" - ");

    // Find staff who are available on this day and not the sick staff member
    const availableStaffIds = staffAvailability
      .filter((av) => {
        if (av.staffId === sickCall.staffId) return false;
        if (av.dayOfWeek !== dayOfWeek) return false;
        if (!av.isAvailable) return false;
        // Check if their availability window covers the shift
        return av.startTime <= shiftStart;
      })
      .map((av) => av.staffId);

    // Get unique staff members who are available
    const uniqueStaffIds = [...new Set(availableStaffIds)];

    // Check if they're already scheduled for that date
    const alreadyScheduledIds = facilitySchedules
      .filter((s) => s.date === sickCall.shiftDate)
      .map((s) => s.staffId);

    return facilityStaff.filter(
      (staff) =>
        uniqueStaffIds.includes(staff.id) &&
        !alreadyScheduledIds.includes(staff.id),
    );
  };

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Use example schedule data for testing (no filter), fallback to imported data with filter
  const facilitySchedules =
    exampleSchedules.length > 0
      ? exampleSchedules
      : schedules.filter((schedule) => schedule.facility === facility.name);

  // Use example staff data for testing
  const facilityStaff =
    exampleStaff.length > 0
      ? exampleStaff
      : users.filter((user) => user.facility === facility.name);

  const handleAddNew = (date?: string) => {
    setEditingSchedule(null);
    setFormData({
      staffId: "",
      date: date || new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "17:00",
      status: "scheduled",
      isRecurring: false,
      recurringPattern: "weekly",
      recurringEndDate: "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (schedule: (typeof schedules)[number]) => {
    setEditingSchedule(schedule);
    setFormData({
      staffId: schedule.staffId.toString(),
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
      isRecurring: false,
      recurringPattern: "weekly",
      recurringEndDate: "",
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveSchedule = () => {
    // TODO: Save to backend
    setIsAddEditModalOpen(false);
  };

  const handleDeleteClick = (schedule: (typeof schedules)[number]) => {
    setDeletingSchedule(schedule);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    // TODO: Delete from backend
    setIsDeleteModalOpen(false);
    setDeletingSchedule(null);
  };

  // Get schedules for a specific date and staff member
  const getScheduleForDateAndStaff = (date: Date, staffId: number) => {
    const dateStr = formatDate(date);
    return facilitySchedules.find(
      (s) => s.date === dateStr && s.staffId === staffId,
    );
  };

  // Calculate stats
  const today = new Date().toISOString().split("T")[0];
  const todaySchedules = facilitySchedules.filter((s) => s.date === today);
  const upcomingSchedules = facilitySchedules.filter((s) => s.date > today);
  const totalHours = facilitySchedules.reduce((sum, s) => {
    const start = new Date(`2000-01-01T${s.startTime}`);
    const end = new Date(`2000-01-01T${s.endTime}`);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  // Copy week schedules
  const handleCopyWeek = () => {
    // In a real app, this would copy all schedules from current week to target week
    setIsCopyWeekModalOpen(false);
    setCopyTargetDate("");
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Staff Scheduling - {facility.name}
          </h2>
          <p className="text-muted-foreground">
            Manage staff schedules and shifts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => handleAddNew()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shift
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCopyWeekModalOpen(true)}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Week
          </Button>
          <Button
            variant="outline"
            onClick={() => exportSchedulesToCSV(facilitySchedules)}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportSchedulesToICS(facilitySchedules, facility.name)
            }
          >
            <FileDown className="mr-2 h-4 w-4" />
            ICS
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Today's Shifts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySchedules.length}</div>
            <p className="text-xs text-muted-foreground">Active today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Upcoming Shifts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSchedules.length}</div>
            <p className="text-xs text-muted-foreground">Future shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Scheduled hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Staff Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(facilitySchedules.map((s) => s.staffId)).size}
            </div>
            <p className="text-xs text-muted-foreground">Staff members</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Schedule and Conflicts */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-4 w-4 mr-2" />
            Shift Tasks
          </TabsTrigger>
          <TabsTrigger value="sick">
            <Phone className="h-4 w-4 mr-2" />
            Sick Call-ins
            {getSickCallInsNeedingCoverage().length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {getSickCallInsNeedingCoverage().length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="swaps">
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Shift Swaps
            {getPendingSwapRequests().length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {getPendingSwapRequests().length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflicts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendar View
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                <Clock className="mr-2 h-4 w-4" />
                List View
              </Button>
            </div>

            {viewMode === "calendar" && (
              <div className="flex items-center gap-1">
                <Button
                  variant={calendarView === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("week")}
                >
                  Week
                </Button>
                <Button
                  variant={calendarView === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("month")}
                >
                  Month
                </Button>
              </div>
            )}
          </div>

          {/* Calendar View - Week/Month */}
          {viewMode === "calendar" && (
            <GenericCalendar<(typeof facilitySchedules)[0] & CalendarItem>
              items={facilitySchedules}
              config={{
                title:
                  calendarView === "week"
                    ? "Weekly Schedule"
                    : "Monthly Calendar",
                onItemClick: handleEdit,
                onAddClick: handleAddNew,
                showAddButton: true,
                rowData:
                  calendarView === "week"
                    ? facilityStaff.map(
                        (staff) =>
                          ({
                            id: staff.id,
                            name: staff.name,
                            role: staff.role,
                          }) as CalendarRowData,
                      )
                    : undefined,
                getItemsForDateAndRow:
                  calendarView === "week"
                    ? (date, staffId) => {
                        return getScheduleForDateAndStaff(date, Number(staffId))
                          ? [getScheduleForDateAndStaff(date, Number(staffId))!]
                          : [];
                      }
                    : undefined,
                renderRowHeader:
                  calendarView === "week"
                    ? (row) => (
                        <div>
                          <div>{row.name}</div>
                          <Badge variant="outline" className="text-xs">
                            {String(row.role || "")}
                          </Badge>
                        </div>
                      )
                    : undefined,
                renderWeekCell:
                  calendarView === "week"
                    ? ({ items, date }) => (
                        <>
                          {items.length > 0 ? (
                            items.map((schedule) => (
                              <div key={schedule.id} className="group relative">
                                <Badge
                                  variant="secondary"
                                  className="cursor-pointer hover:bg-secondary/80"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  {schedule.startTime} - {schedule.endTime}
                                </Badge>
                                <div className="absolute hidden group-hover:flex gap-1 top-full left-1/2 transform -translate-x-1/2 mt-1 z-10">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(schedule);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedShiftForReport(schedule);
                                      setIsShiftReportModalOpen(true);
                                    }}
                                  >
                                    <ClipboardList className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(schedule);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-full text-xs"
                              onClick={() => handleAddNew(formatDate(date))}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )
                    : ({ items }) => (
                        <>
                          {items.slice(0, 3).map((schedule) => (
                            <div
                              key={schedule.id}
                              className="group relative text-xs bg-secondary/50 rounded px-1.5 py-0.5 cursor-pointer hover:bg-secondary/80"
                              onClick={() => handleEdit(schedule)}
                            >
                              <div className="font-medium truncate">
                                {schedule.staffName}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {schedule.startTime}-{schedule.endTime}
                              </div>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{items.length - 3} more
                            </div>
                          )}
                        </>
                      ),
              }}
              view={calendarView}
              initialDate={currentWeekStart}
            />
          )}

          {/* List View */}
          {viewMode === "list" && (
            <Card>
              <CardHeader>
                <CardTitle>All Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilitySchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          {schedule.staffName}
                        </TableCell>
                        <TableCell>{schedule.date}</TableCell>
                        <TableCell>{schedule.startTime}</TableCell>
                        <TableCell>{schedule.endTime}</TableCell>
                        <TableCell>
                          <StatusBadge type="role" value={schedule.role} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="status" value={schedule.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(schedule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedShiftForReport(schedule);
                                setIsShiftReportModalOpen(true);
                              }}
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(schedule)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Add/Edit Schedule Modal */}
          <Dialog
            open={isAddEditModalOpen}
            onOpenChange={setIsAddEditModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? "Edit Shift" : "Add New Shift"}
                </DialogTitle>
                <DialogDescription>
                  {editingSchedule
                    ? "Update shift details for staff member."
                    : "Schedule a new shift for a staff member."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="staffId">Staff Member</Label>
                  <Select
                    value={formData.staffId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, staffId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id.toString()}>
                          {staff.name} ({staff.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Apply Shift Template</Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={(value) => {
                      setSelectedTemplate(value);
                      const template = shiftTemplates.find(
                        (t) => t.id.toString() === value,
                      );
                      if (template) {
                        setFormData({
                          ...formData,
                          startTime: template.startTime,
                          endTime: template.endTime,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {shiftTemplates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name} ({template.startTime} -{" "}
                          {template.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Select
                      value={formData.startTime}
                      onValueChange={(value) =>
                        setFormData({ ...formData, startTime: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time *</Label>
                    <Select
                      value={formData.endTime}
                      onValueChange={(value) =>
                        setFormData({ ...formData, endTime: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!editingSchedule && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isRecurring"
                        checked={formData.isRecurring}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isRecurring: !!checked })
                        }
                      />
                      <Label
                        htmlFor="isRecurring"
                        className="font-normal flex items-center gap-2"
                      >
                        <Repeat className="h-4 w-4" />
                        Create recurring shift
                      </Label>
                    </div>

                    {formData.isRecurring && (
                      <div className="grid grid-cols-2 gap-4 pl-6">
                        <div className="space-y-2">
                          <Label htmlFor="recurringPattern">Repeat</Label>
                          <Select
                            value={formData.recurringPattern}
                            onValueChange={(
                              value: "daily" | "weekly" | "biweekly",
                            ) =>
                              setFormData({
                                ...formData,
                                recurringPattern: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">
                                Bi-weekly
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recurringEndDate">Until</Label>
                          <Input
                            id="recurringEndDate"
                            type="date"
                            value={formData.recurringEndDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                recurringEndDate: e.target.value,
                              })
                            }
                            min={formData.date}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveSchedule}>
                  {editingSchedule ? "Update Shift" : "Add Shift"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Modal */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this shift for{" "}
                  {deletingSchedule?.staffName} on {deletingSchedule?.date}?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirm}>
                  Delete Shift
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Copy Week Modal */}
          <Dialog
            open={isCopyWeekModalOpen}
            onOpenChange={setIsCopyWeekModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy Week Schedule</DialogTitle>
                <DialogDescription>
                  Copy all shifts from the current week to another week.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="copyTarget">
                    Target Week Start Date (Monday)
                  </Label>
                  <Input
                    id="copyTarget"
                    type="date"
                    value={copyTargetDate}
                    onChange={(e) => setCopyTargetDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    All shifts from the current week will be copied to the
                    selected week.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCopyWeekModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCopyWeek}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Shifts
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Shift Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shift Tasks</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tasks assigned to shifts - can be assigned to specific
                    personnel or anyone on shift
                  </p>
                </div>
                <Button onClick={() => setIsTaskModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Shift Time</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.taskName}</div>
                          <div className="text-sm text-muted-foreground">
                            {task.description}
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {task.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{task.scheduleDate}</div>
                          <div className="text-muted-foreground">
                            {task.shiftStartTime} - {task.shiftEndTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assignedToStaffName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {task.assignedToStaffName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {task.assignedToStaffName}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary">
                            <User className="h-3 w-3 mr-1" />
                            Anyone on shift
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.priority === "urgent"
                              ? "destructive"
                              : task.priority === "high"
                                ? "default"
                                : task.priority === "medium"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "in_progress"
                                ? "secondary"
                                : task.status === "skipped"
                                  ? "destructive"
                                  : "outline"
                          }
                          className={
                            task.status === "completed" ? "bg-green-600" : ""
                          }
                        >
                          {task.status === "completed" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.completedByStaffName ? (
                          <div className="text-sm">
                            <div>{task.completedByStaffName}</div>
                            {task.completedAt && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(
                                  task.completedAt,
                                ).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sick Call-ins Tab */}
        <TabsContent value="sick" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5" />
                    Sick Call-ins
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage staff sick calls and find coverage
                  </p>
                </div>
                <Button onClick={() => setIsSickCallModalOpen(true)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Record Sick Call
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Called In</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Coverage Status</TableHead>
                    <TableHead>Covered By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sickCallIns.map((callIn) => (
                    <TableRow key={callIn.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {callIn.staffName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {callIn.staffName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{callIn.shiftDate}</div>
                          <div className="text-muted-foreground">
                            {callIn.shiftTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(callIn.calledInAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{callIn.reason}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            callIn.coverageStatus === "covered"
                              ? "default"
                              : callIn.coverageStatus === "needs_coverage"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            callIn.coverageStatus === "covered"
                              ? "bg-green-600"
                              : ""
                          }
                        >
                          {callIn.coverageStatus === "covered" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {callIn.coverageStatus === "needs_coverage" && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {callIn.coverageStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {callIn.coveredByStaffName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {callIn.coveredByStaffName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {callIn.coveredByStaffName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {callIn.coverageStatus === "needs_coverage" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSickCallIn(callIn);
                              setSelectedCoverageStaffId("");
                              setIsFindCoverageModalOpen(true);
                            }}
                          >
                            Find Coverage
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shift Swaps Tab */}
        <TabsContent value="swaps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5" />
                    Shift Swap Requests
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review and manage shift swap requests between staff
                  </p>
                </div>
                <Button onClick={() => setIsSwapModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Swap Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requesting Staff</TableHead>
                    <TableHead>Their Shift</TableHead>
                    <TableHead>Swap With</TableHead>
                    <TableHead>Target Shift</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftSwapRequests.map((swap) => (
                    <TableRow key={swap.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {swap.requestingStaffName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {swap.requestingStaffName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{swap.requestingShiftDate}</div>
                          <div className="text-muted-foreground">
                            {swap.requestingShiftTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {swap.targetStaffName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {swap.targetStaffName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {swap.targetStaffName}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            Anyone available
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {swap.targetShiftDate ? (
                          <div className="text-sm">
                            <div>{swap.targetShiftDate}</div>
                            {swap.targetShiftTime && (
                              <div className="text-muted-foreground">
                                {swap.targetShiftTime}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Any shift
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm max-w-[200px] truncate block">
                          {swap.reason}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            swap.status === "approved"
                              ? "default"
                              : swap.status === "denied"
                                ? "destructive"
                                : swap.status === "pending"
                                  ? "secondary"
                                  : "outline"
                          }
                          className={
                            swap.status === "approved" ? "bg-green-600" : ""
                          }
                        >
                          {swap.status === "approved" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {swap.status === "denied" && (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {swap.status === "pending" && (
                            <ClockIcon className="h-3 w-3 mr-1" />
                          )}
                          {swap.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {swap.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="default">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="outline">
                              <XCircle className="h-4 w-4 mr-1" />
                              Deny
                            </Button>
                          </div>
                        )}
                        {swap.status !== "pending" && swap.reviewNotes && (
                          <span className="text-xs text-muted-foreground max-w-[150px] truncate block">
                            {swap.reviewNotes}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-4">
          <StaffConflictDetector />
        </TabsContent>
      </Tabs>

      {/* Sick Call-in Modal */}
      <Dialog open={isSickCallModalOpen} onOpenChange={setIsSickCallModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Record Sick Call-in
            </DialogTitle>
            <DialogDescription>
              Record a staff member calling in sick and manage shift coverage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sickStaffId">Staff Member</Label>
              <Select
                value={sickCallData.staffId}
                onValueChange={(value) =>
                  setSickCallData({ ...sickCallData, staffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {facilityStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sickShiftId">Shift</Label>
              <Select
                value={sickCallData.shiftId}
                onValueChange={(value) =>
                  setSickCallData({ ...sickCallData, shiftId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift to cover" />
                </SelectTrigger>
                <SelectContent>
                  {facilitySchedules
                    .filter(
                      (s) =>
                        s.staffId.toString() === sickCallData.staffId &&
                        s.status === "scheduled",
                    )
                    .map((schedule) => (
                      <SelectItem
                        key={schedule.id}
                        value={schedule.id.toString()}
                      >
                        {schedule.date} ({schedule.startTime} -{" "}
                        {schedule.endTime})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sickReason">Reason</Label>
              <Textarea
                id="sickReason"
                placeholder="e.g., Flu symptoms, migraine..."
                value={sickCallData.reason}
                onChange={(e) =>
                  setSickCallData({ ...sickCallData, reason: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">Expected Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                value={sickCallData.expectedReturnDate}
                onChange={(e) =>
                  setSickCallData({
                    ...sickCallData,
                    expectedReturnDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSickCallModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsSickCallModalOpen(false)}>
              Record Call-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Swap Modal */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Request Shift Swap
            </DialogTitle>
            <DialogDescription>
              Request to swap shifts with another staff member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Requesting Staff Member</Label>
              <Select
                value={swapData.requestingStaffId}
                onValueChange={(value) =>
                  setSwapData({ ...swapData, requestingStaffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {facilityStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Their Shift to Swap</Label>
              <Select
                value={swapData.requestingShiftId}
                onValueChange={(value) =>
                  setSwapData({ ...swapData, requestingShiftId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {facilitySchedules
                    .filter(
                      (s) =>
                        s.staffId.toString() === swapData.requestingStaffId &&
                        s.status === "scheduled",
                    )
                    .map((schedule) => (
                      <SelectItem
                        key={schedule.id}
                        value={schedule.id.toString()}
                      >
                        {schedule.date} ({schedule.startTime} -{" "}
                        {schedule.endTime})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Swap With (Optional)</Label>
              <Select
                value={swapData.targetStaffId}
                onValueChange={(value) =>
                  setSwapData({ ...swapData, targetStaffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anyone available" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anyone">Anyone available</SelectItem>
                  {facilityStaff
                    .filter(
                      (s) => s.id.toString() !== swapData.requestingStaffId,
                    )
                    .map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {swapData.targetStaffId && (
              <div className="space-y-2">
                <Label>Target Shift</Label>
                <Select
                  value={swapData.targetShiftId}
                  onValueChange={(value) =>
                    setSwapData({ ...swapData, targetShiftId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilitySchedules
                      .filter(
                        (s) =>
                          s.staffId.toString() === swapData.targetStaffId &&
                          s.status === "scheduled",
                      )
                      .map((schedule) => (
                        <SelectItem
                          key={schedule.id}
                          value={schedule.id.toString()}
                        >
                          {schedule.date} ({schedule.startTime} -{" "}
                          {schedule.endTime})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason for Swap</Label>
              <Textarea
                placeholder="Why do you need to swap this shift?"
                value={swapData.reason}
                onChange={(e) =>
                  setSwapData({ ...swapData, reason: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSwapModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsSwapModalOpen(false)}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Add Shift Task
            </DialogTitle>
            <DialogDescription>
              Create a task for a shift. Assign to specific personnel or leave
              unassigned for anyone on shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Name</Label>
              <Input
                placeholder="e.g., Morning Feeding"
                value={taskData.taskName}
                onChange={(e) =>
                  setTaskData({ ...taskData, taskName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the task..."
                value={taskData.description}
                onChange={(e) =>
                  setTaskData({ ...taskData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={taskData.category}
                  onValueChange={(value: ShiftTask["category"]) =>
                    setTaskData({ ...taskData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feeding">Feeding</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="exercise">Exercise</SelectItem>
                    <SelectItem value="grooming">Grooming</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskData.priority}
                  onValueChange={(value: ShiftTask["priority"]) =>
                    setTaskData({ ...taskData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={taskData.scheduleDate}
                onChange={(e) =>
                  setTaskData({ ...taskData, scheduleDate: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift Start Time</Label>
                <Select
                  value={taskData.shiftStartTime}
                  onValueChange={(value) =>
                    setTaskData({ ...taskData, shiftStartTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Shift End Time</Label>
                <Select
                  value={taskData.shiftEndTime}
                  onValueChange={(value) =>
                    setTaskData({ ...taskData, shiftEndTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assign To (Optional)</Label>
              <Select
                value={taskData.assignedToStaffId}
                onValueChange={(value) =>
                  setTaskData({ ...taskData, assignedToStaffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anyone on shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anyone">Anyone on shift</SelectItem>
                  {facilityStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave unassigned if any staff member on the shift can complete
                this task.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresPhoto"
                checked={taskData.requiresPhoto}
                onCheckedChange={(checked) =>
                  setTaskData({ ...taskData, requiresPhoto: !!checked })
                }
              />
              <Label htmlFor="requiresPhoto" className="font-normal">
                Requires photo proof
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsTaskModalOpen(false)}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Find Coverage Modal */}
      <Dialog
        open={isFindCoverageModalOpen}
        onOpenChange={setIsFindCoverageModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Find Coverage
            </DialogTitle>
            {selectedSickCallIn && (
              <DialogDescription>
                Find a replacement for {selectedSickCallIn.staffName}&apos;s
                shift on {selectedSickCallIn.shiftDate} (
                {selectedSickCallIn.shiftTime})
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedSickCallIn && (
              <>
                {/* Shift Details */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Shift Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <p className="font-medium">
                          {selectedSickCallIn.shiftDate}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <p className="font-medium">
                          {selectedSickCallIn.shiftTime}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reason:</span>
                        <p className="font-medium">
                          {selectedSickCallIn.reason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Available Staff */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Available Staff
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Staff members available on this day who are not already
                    scheduled
                  </p>

                  {getAvailableStaffForCoverage(selectedSickCallIn).length >
                  0 ? (
                    <div className="space-y-2 mt-3">
                      {getAvailableStaffForCoverage(selectedSickCallIn).map(
                        (staff) => {
                          const availability = staffAvailability.find(
                            (av) =>
                              av.staffId === staff.id &&
                              av.dayOfWeek ===
                                new Date(selectedSickCallIn.shiftDate).getDay(),
                          );
                          return (
                            <div
                              key={staff.id}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedCoverageStaffId === staff.id.toString()
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() =>
                                setSelectedCoverageStaffId(staff.id.toString())
                              }
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {staff.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{staff.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {staff.role}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {availability && (
                                  <p className="text-sm text-muted-foreground">
                                    Available: {availability.startTime} -{" "}
                                    {availability.endTime}
                                  </p>
                                )}
                                {selectedCoverageStaffId ===
                                  staff.id.toString() && (
                                  <Badge className="mt-1 bg-green-600">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <Card className="bg-muted/50">
                      <CardContent className="py-8 text-center">
                        <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          No available staff found for this shift
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          All available staff are already scheduled or
                          unavailable
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Send Request Options */}
                {getAvailableStaffForCoverage(selectedSickCallIn).length >
                  0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">
                      Coverage Options
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          // Would send to all available staff
                          setIsFindCoverageModalOpen(false);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Notify All Available
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!selectedCoverageStaffId}
                        onClick={() => {
                          // Would assign to selected staff
                          setIsFindCoverageModalOpen(false);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Assign Selected
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFindCoverageModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Report Modal */}
      <Dialog
        open={isShiftReportModalOpen}
        onOpenChange={setIsShiftReportModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Shift Report
            </DialogTitle>
            {selectedShiftForReport && (
              <DialogDescription>
                Task report for {selectedShiftForReport.staffName} on{" "}
                {selectedShiftForReport.date} (
                {selectedShiftForReport.startTime} -{" "}
                {selectedShiftForReport.endTime})
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-4">
            {selectedShiftForReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {
                          shiftTasks.filter(
                            (t) =>
                              t.scheduleDate === selectedShiftForReport.date &&
                              t.shiftStartTime ===
                                selectedShiftForReport.startTime,
                          ).length
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total Tasks
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          shiftTasks.filter(
                            (t) =>
                              t.scheduleDate === selectedShiftForReport.date &&
                              t.shiftStartTime ===
                                selectedShiftForReport.startTime &&
                              t.status === "completed",
                          ).length
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {
                          shiftTasks.filter(
                            (t) =>
                              t.scheduleDate === selectedShiftForReport.date &&
                              t.shiftStartTime ===
                                selectedShiftForReport.startTime &&
                              t.status === "pending",
                          ).length
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold text-red-600">
                        {
                          shiftTasks.filter(
                            (t) =>
                              t.scheduleDate === selectedShiftForReport.date &&
                              t.shiftStartTime ===
                                selectedShiftForReport.startTime &&
                              t.status === "skipped",
                          ).length
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftTasks
                      .filter(
                        (t) =>
                          t.scheduleDate === selectedShiftForReport.date &&
                          t.shiftStartTime === selectedShiftForReport.startTime,
                      )
                      .map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{task.taskName}</div>
                              <div className="text-sm text-muted-foreground">
                                {task.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                task.priority === "urgent"
                                  ? "destructive"
                                  : task.priority === "high"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                task.status === "completed"
                                  ? "default"
                                  : task.status === "skipped"
                                    ? "destructive"
                                    : "outline"
                              }
                              className={
                                task.status === "completed"
                                  ? "bg-green-600"
                                  : ""
                              }
                            >
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.completedByStaffName || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsShiftReportModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
