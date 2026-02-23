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
  timeOffRequests,
  defaultTimeOffReasons,
  type ShiftTask,
  type SickCallIn,
  type TimeOffRequest,
  type TimeOffReason,
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
  User,
  Settings,
  FileText,
  CalendarDays,
  Users,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Map,
  Scissors,
  GraduationCap,
  Building2,
  AlertCircle,
  Users2,
  Split,
  Info,
  ArrowRightLeft,
} from "lucide-react";
import SchedulingSettings from "@/components/scheduling/SchedulingSettings";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  calculateWorkloadForDate,
  calculateWorkloadForTimeBlock,
  type WorkloadMetrics,
  type TimeBlockWorkload,
} from "@/lib/scheduling-workload";
import { Activity, TrendingUp, Users as UsersIcon, Home, Scissors as ScissorsIcon, GraduationCap as GraduationCapIcon } from "lucide-react";

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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

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

  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(today.setDate(diff));
  });

  const [viewMode, setViewMode] = useState<"calendar" | "list" | "role">("calendar");
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
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
    status: "scheduled" as "scheduled" | "confirmed" | "completed" | "absent" | "sick",
    location: "",
    notes: "",
    isRecurring: false,
    recurringPattern: "weekly" as "daily" | "weekly" | "biweekly",
    recurringEndDate: "",
  });

  // Shift template modal
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Copy week modal
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);
  const [copyTargetDate, setCopyTargetDate] = useState("");

  // Same-Day Sick / Call-Out modal
  const [isSickCallModalOpen, setIsSickCallModalOpen] = useState(false);
  const [selectedShiftForSickCall, setSelectedShiftForSickCall] = useState<
    (typeof schedules)[number] | null
  >(null);
  const [sickCallReason, setSickCallReason] = useState("");
  const [sickCallAction, setSickCallAction] = useState<"assign" | "split" | "volunteers" | null>(null);
  const [selectedReplacementStaffId, setSelectedReplacementStaffId] = useState<string>("");
  const [splitShiftStaffIds, setSplitShiftStaffIds] = useState<string[]>([]);
  const [notifyDepartments, setNotifyDepartments] = useState<string[]>([]);

  // Shift swap modal
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapData, setSwapData] = useState({
    requestingShiftId: "",
    swapType: "specific" as "specific" | "anyone",
    targetStaffId: "",
    targetShiftId: "",
    reason: "",
  });
  const [swapValidationErrors, setSwapValidationErrors] = useState<string[]>([]);

  // Shift swap approval modal (for managers)
  const [isSwapApprovalModalOpen, setIsSwapApprovalModalOpen] = useState(false);
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<typeof shiftSwapRequests[number] | null>(null);
  const [swapApprovalAction, setSwapApprovalAction] = useState<"approve" | "deny">("approve");
  const [swapApprovalNotes, setSwapApprovalNotes] = useState("");

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

  // Time off request modal
  const [isTimeOffRequestModalOpen, setIsTimeOffRequestModalOpen] = useState(false);
  const [timeOffRequestData, setTimeOffRequestData] = useState({
    type: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Time off review modal (for managers)
  const [isTimeOffReviewModalOpen, setIsTimeOffReviewModalOpen] = useState(false);
  const [selectedTimeOffRequest, setSelectedTimeOffRequest] = useState<TimeOffRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "deny" | "request_changes">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [requestedChanges, setRequestedChanges] = useState("");

  // Get time off reasons (default + custom)
  const getTimeOffReasons = (): TimeOffReason[] => {
    // In production, this would fetch from settings/database
    // For now, use defaults
    return defaultTimeOffReasons.map(r => ({ ...r, facility: facility.name }));
  };

  // Check for coverage gaps when time off is approved
  const checkCoverageGaps = (request: TimeOffRequest): boolean => {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const affectedDates: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      affectedDates.push(d.toISOString().split("T")[0]);
    }

    // Check if there are scheduled shifts during this period
    const affectedShifts = facilitySchedules.filter(
      (s) => s.staffId === request.staffId && affectedDates.includes(s.date)
    );

    return affectedShifts.length > 0;
  };

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
    const shiftStart = sickCall.shiftTime.split(" - ")[0];

    const availableStaffIds = staffAvailability
      .filter((av) => {
        if (av.dayOfWeek !== dayOfWeek || !av.isAvailable) return false;
        return av.startTime <= shiftStart;
      })
      .map((av) => av.staffId);

    const uniqueStaffIds = [...new Set(availableStaffIds)];

    const alreadyScheduledIds = facilitySchedules
      .filter((s) => s.date === sickCall.shiftDate)
      .map((s) => s.staffId);

    return facilityStaff.filter(
      (staff) =>
        uniqueStaffIds.includes(staff.id) &&
        !alreadyScheduledIds.includes(staff.id) &&
        staff.id !== sickCall.staffId,
    );
  };

  // Calculate coverage impact when a shift is marked as sick
  const calculateCoverageImpact = (shift: (typeof schedules)[number] | null) => {
    if (!shift) return { status: "ok", currentCount: 0, minNeeded: 0, impact: "none" };

    const dateStr = shift.date;
    const [startHour, startMin] = shift.startTime.split(":").map(Number);
    const [endHour, endMin] = shift.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Get all active shifts for the same role and date
    const sameRoleShifts = facilitySchedules.filter(
      (s) => s.date === dateStr && s.role === shift.role && s.status === "scheduled" && s.id !== shift.id
    );

    // Count staff for each time block (every 30 minutes)
    const timeBlocks: { time: number; count: number }[] = [];
    for (let time = startMinutes; time < endMinutes; time += 30) {
      const count = sameRoleShifts.filter((s) => {
        const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
        const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
        const sStartMinutes = sStartHour * 60 + sStartMin;
        const sEndMinutes = sEndHour * 60 + sEndMin;
        return time >= sStartMinutes && time < sEndMinutes;
      }).length;
      timeBlocks.push({ time, count });
    }

    // Define minimum staff needed per role (this would come from settings)
    const minStaffByRole: Record<string, number> = {
      "Boarding": 2,
      "Daycare": 3,
      "Grooming": 1,
      "Training": 1,
      "Admin": 1,
    };
    const minNeeded = minStaffByRole[shift.role] || 1;

    // Find the minimum count across all time blocks
    const minCount = Math.min(...timeBlocks.map((b) => b.count));

    if (minCount < minNeeded) {
      return {
        status: "understaffed",
        currentCount: minCount,
        minNeeded,
        impact: "critical",
        affectedTimeBlocks: timeBlocks.filter((b) => b.count < minNeeded).length,
      };
    } else if (minCount === minNeeded) {
      return {
        status: "at_minimum",
        currentCount: minCount,
        minNeeded,
        impact: "warning",
      };
    } else {
      return {
        status: "ok",
        currentCount: minCount,
        minNeeded,
        impact: "none",
      };
    }
  };

  // Get suggested replacements for a shift
  const getSuggestedReplacements = (shift: (typeof schedules)[number] | null) => {
    if (!shift) return [];

    const shiftDate = new Date(shift.date);
    const dayOfWeek = shiftDate.getDay();
    const [startHour, startMin] = shift.startTime.split(":").map(Number);
    const [endHour, endMin] = shift.endTime.split(":").map(Number);

    // Get staff available on this day and time
    const availableStaffIds = staffAvailability
      .filter((av) => {
        if (av.dayOfWeek !== dayOfWeek || !av.isAvailable) return false;
        const [avStartHour, avStartMin] = av.startTime.split(":").map(Number);
        const [avEndHour, avEndMin] = av.endTime.split(":").map(Number);
        const avStartMinutes = avStartHour * 60 + avStartMin;
        const avEndMinutes = avEndHour * 60 + avEndMin;
        const shiftStartMinutes = startHour * 60 + startMin;
        const shiftEndMinutes = endHour * 60 + endMin;
        return avStartMinutes <= shiftStartMinutes && avEndMinutes >= shiftEndMinutes;
      })
      .map((av) => av.staffId);

    const uniqueStaffIds = [...new Set(availableStaffIds)];

    // Exclude already scheduled staff and the sick staff
    const alreadyScheduledIds = facilitySchedules
      .filter((s) => s.date === shift.date && s.status === "scheduled")
      .map((s) => s.staffId);

    const suggested = facilityStaff
      .filter(
        (staff) =>
          uniqueStaffIds.includes(staff.id) &&
          !alreadyScheduledIds.includes(staff.id) &&
          staff.id !== shift.staffId &&
          staff.role === shift.role, // Same role preferred
      )
      .map((staff) => {
        const availability = staffAvailability.find(
          (av) => av.staffId === staff.id && av.dayOfWeek === dayOfWeek
        );
        return {
          ...staff,
          availability: availability
            ? `${availability.startTime} - ${availability.endTime}`
            : "Unknown",
        };
      });

    // Also include staff from other roles as backup
    const backupStaff = facilityStaff
      .filter(
        (staff) =>
          uniqueStaffIds.includes(staff.id) &&
          !alreadyScheduledIds.includes(staff.id) &&
          staff.id !== shift.staffId &&
          staff.role !== shift.role,
      )
      .map((staff) => {
        const availability = staffAvailability.find(
          (av) => av.staffId === staff.id && av.dayOfWeek === dayOfWeek
        );
        return {
          ...staff,
          availability: availability
            ? `${availability.startTime} - ${availability.endTime}`
            : "Unknown",
          isBackup: true,
        };
      });

    return [...suggested, ...backupStaff];
  };

  // Validate shift swap request
  const validateShiftSwap = (
    requestingShiftId: string,
    targetStaffId: string,
    targetShiftId: string,
    swapType: "specific" | "anyone"
  ): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!requestingShiftId) {
      errors.push("Please select your shift to swap");
      return { isValid: false, errors, warnings };
    }

    const requestingShift = facilitySchedules.find(
      (s) => s.id.toString() === requestingShiftId
    );
    if (!requestingShift) {
      errors.push("Requesting shift not found");
      return { isValid: false, errors, warnings };
    }

    if (swapType === "specific") {
      if (!targetStaffId || targetStaffId === "anyone") {
        errors.push("Please select a specific coworker to swap with");
        return { isValid: false, errors, warnings };
      }

      if (!targetShiftId) {
        errors.push("Please select the target shift to swap");
        return { isValid: false, errors, warnings };
      }

      const targetShift = facilitySchedules.find(
        (s) => s.id.toString() === targetShiftId
      );
      if (!targetShift) {
        errors.push("Target shift not found");
        return { isValid: false, errors, warnings };
      }

      const targetStaff = facilityStaff.find(
        (s) => s.id.toString() === targetStaffId
      );
      if (!targetStaff) {
        errors.push("Target staff member not found");
        return { isValid: false, errors, warnings };
      }

      // Check role compatibility
      if (requestingShift.role !== targetShift.role) {
        // Check if cross-role swaps are allowed (from settings - would need to fetch)
        // For now, we'll allow it but show a warning
        warnings.push(
          `Role mismatch: ${requestingShift.role} ↔ ${targetShift.role}. Cross-role swaps may require manager approval.`
        );
      }

      // Check for conflicts
      const targetStaffOtherShifts = facilitySchedules.filter(
        (s) =>
          s.staffId.toString() === targetStaffId &&
          s.id.toString() !== targetShiftId &&
          s.status === "scheduled"
      );

      // Check if requesting shift conflicts with target staff's other shifts
      const hasConflict = targetStaffOtherShifts.some((shift) => {
        if (shift.date !== requestingShift.date) return false;
        const [reqStartHour, reqStartMin] = requestingShift.startTime.split(":").map(Number);
        const [reqEndHour, reqEndMin] = requestingShift.endTime.split(":").map(Number);
        const [shiftStartHour, shiftStartMin] = shift.startTime.split(":").map(Number);
        const [shiftEndHour, shiftEndMin] = shift.endTime.split(":").map(Number);
        const reqStart = reqStartHour * 60 + reqStartMin;
        const reqEnd = reqEndHour * 60 + reqEndMin;
        const shiftStart = shiftStartHour * 60 + shiftStartMin;
        const shiftEnd = shiftEndHour * 60 + shiftEndMin;
        return (reqStart < shiftEnd && reqEnd > shiftStart);
      });

      if (hasConflict) {
        errors.push("The target staff member has a conflicting shift on the same day");
      }

      // Check overtime rules (simplified - would need settings)
      const targetStaffWeeklyHours = targetStaffOtherShifts.reduce((total, shift) => {
        const [startHour, startMin] = shift.startTime.split(":").map(Number);
        const [endHour, endMin] = shift.endTime.split(":").map(Number);
        const hours = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;
        return total + hours;
      }, 0);

      const [reqStartHour, reqStartMin] = requestingShift.startTime.split(":").map(Number);
      const [reqEndHour, reqEndMin] = requestingShift.endTime.split(":").map(Number);
      const reqHours = (reqEndHour * 60 + reqEndMin - (reqStartHour * 60 + reqStartMin)) / 60;

      const newWeeklyHours = targetStaffWeeklyHours + reqHours;
      if (newWeeklyHours > 40) {
        warnings.push(
          `This swap would result in ${newWeeklyHours.toFixed(1)} hours for the target staff member (overtime threshold: 40 hours). Manager approval may be required.`
        );
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  };

  // Get qualified staff for "open to anyone" swap
  const getQualifiedStaffForSwap = (requestingShiftId: string) => {
    if (!requestingShiftId) return [];

    const requestingShift = facilitySchedules.find(
      (s) => s.id.toString() === requestingShiftId
    );
    if (!requestingShift) return [];

    const shiftDate = new Date(requestingShift.date);
    const dayOfWeek = shiftDate.getDay();
    const [startHour, startMin] = requestingShift.startTime.split(":").map(Number);
    const [endHour, endMin] = requestingShift.endTime.split(":").map(Number);

    // Get staff available on this day and time
    const availableStaffIds = staffAvailability
      .filter((av) => {
        if (av.dayOfWeek !== dayOfWeek || !av.isAvailable) return false;
        const [avStartHour, avStartMin] = av.startTime.split(":").map(Number);
        const [avEndHour, avEndMin] = av.endTime.split(":").map(Number);
        const avStartMinutes = avStartHour * 60 + avStartMin;
        const avEndMinutes = avEndHour * 60 + avEndMin;
        const shiftStartMinutes = startHour * 60 + startMin;
        const shiftEndMinutes = endHour * 60 + endMin;
        return avStartMinutes <= shiftStartMinutes && avEndMinutes >= shiftEndMinutes;
      })
      .map((av) => av.staffId);

    const uniqueStaffIds = [...new Set(availableStaffIds)];

    // Exclude already scheduled staff and the requesting staff
    const alreadyScheduledIds = facilitySchedules
      .filter(
        (s) =>
          s.date === requestingShift.date &&
          s.status === "scheduled" &&
          s.id.toString() !== requestingShiftId
      )
      .map((s) => s.staffId);

    return facilityStaff
      .filter(
        (staff) =>
          uniqueStaffIds.includes(staff.id) &&
          !alreadyScheduledIds.includes(staff.id) &&
          staff.id !== requestingShift.staffId &&
          (staff.role === requestingShift.role || true) // Allow cross-role if enabled in settings
      )
      .map((staff) => {
        const availability = staffAvailability.find(
          (av) => av.staffId === staff.id && av.dayOfWeek === dayOfWeek
        );
        const staffShifts = facilitySchedules.filter(
          (s) => s.staffId === staff.id && s.status === "scheduled"
        );
        const weeklyHours = staffShifts.reduce((total, shift) => {
          const [sStartHour, sStartMin] = shift.startTime.split(":").map(Number);
          const [sEndHour, sEndMin] = shift.endTime.split(":").map(Number);
          const hours = (sEndHour * 60 + sEndMin - (sStartHour * 60 + sStartMin)) / 60;
          return total + hours;
        }, 0);

        const [reqStartHour, reqStartMin] = requestingShift.startTime.split(":").map(Number);
        const [reqEndHour, reqEndMin] = requestingShift.endTime.split(":").map(Number);
        const reqHours = (reqEndHour * 60 + reqEndMin - (reqStartHour * 60 + reqStartMin)) / 60;

        return {
          ...staff,
          availability: availability
            ? `${availability.startTime} - ${availability.endTime}`
            : "Unknown",
          weeklyHours,
          wouldExceedOvertime: weeklyHours + reqHours > 40,
          roleMatch: staff.role === requestingShift.role,
        };
      })
      .sort((a, b) => {
        // Sort by: role match first, then by weekly hours (less is better)
        if (a.roleMatch !== b.roleMatch) return a.roleMatch ? -1 : 1;
        return a.weeklyHours - b.weeklyHours;
      });
  };

  // Comprehensive conflict detection function
  const detectShiftConflicts = (
    shift: {
      staffId: number;
      date: string;
      startTime: string;
      endTime: string;
      role: string;
    },
    excludeShiftId?: number
  ): Array<{
    type: "double_booking" | "overlapping" | "time_off" | "role_mismatch" | "max_hours" | "min_rest";
    severity: "critical" | "warning" | "info";
    message: string;
    conflictingShiftId?: number;
    conflictingShift?: (typeof schedules)[number];
    timeOffRequestId?: number;
    details?: any;
  }> => {
    const conflicts: Array<{
      type: "double_booking" | "overlapping" | "time_off" | "role_mismatch" | "max_hours" | "min_rest";
      severity: "critical" | "warning" | "info";
      message: string;
      conflictingShiftId?: number;
      conflictingShift?: (typeof schedules)[number];
      timeOffRequestId?: number;
      details?: any;
    }> = [];

    // Get staff member
    const staff = facilityStaff.find((s) => s.id === shift.staffId);
    if (!staff) return conflicts;

    // Convert times to minutes for comparison
    const [startHour, startMin] = shift.startTime.split(":").map(Number);
    const [endHour, endMin] = shift.endTime.split(":").map(Number);
    const shiftStartMinutes = startHour * 60 + startMin;
    const shiftEndMinutes = endHour * 60 + endMin;
    const shiftDuration = (shiftEndMinutes - shiftStartMinutes) / 60;

    // 1. Check for double-booking (same staff, same time)
    const doubleBooked = facilitySchedules.find((s) => {
      if (s.staffId !== shift.staffId || s.date !== shift.date) return false;
      if (excludeShiftId && s.id === excludeShiftId) return false;
      if (s.status !== "scheduled") return false;

      const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
      const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
      const sStartMinutes = sStartHour * 60 + sStartMin;
      const sEndMinutes = sEndHour * 60 + sEndMin;

      // Exact overlap
      return shiftStartMinutes === sStartMinutes && shiftEndMinutes === sEndMinutes;
    });

    if (doubleBooked) {
      conflicts.push({
        type: "double_booking",
        severity: "critical",
        message: `${staff.name} is already scheduled for the exact same time slot`,
        conflictingShiftId: doubleBooked.id,
        conflictingShift: doubleBooked,
      });
    }

    // 2. Check for overlapping shifts
    const overlapping = facilitySchedules.filter((s) => {
      if (s.staffId !== shift.staffId || s.date !== shift.date) return false;
      if (excludeShiftId && s.id === excludeShiftId) return false;
      if (s.status !== "scheduled") return false;

      const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
      const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
      const sStartMinutes = sStartHour * 60 + sStartMin;
      const sEndMinutes = sEndHour * 60 + sEndMin;

      // Time ranges overlap
      return shiftStartMinutes < sEndMinutes && shiftEndMinutes > sStartMinutes;
    });

    if (overlapping.length > 0) {
      conflicts.push({
        type: "overlapping",
        severity: "critical",
        message: `${staff.name} has ${overlapping.length} overlapping shift(s) on ${shift.date}`,
        conflictingShiftId: overlapping[0].id,
        conflictingShift: overlapping[0],
        details: { overlappingShifts: overlapping },
      });
    }

    // 3. Check for scheduling during approved time off
    const approvedTimeOff = timeOffRequests.find((to) => {
      if (to.staffId !== shift.staffId || to.status !== "approved") return false;
      const startDate = new Date(to.startDate);
      const endDate = new Date(to.endDate);
      const shiftDate = new Date(shift.date);
      return shiftDate >= startDate && shiftDate <= endDate;
    });

    if (approvedTimeOff) {
      conflicts.push({
        type: "time_off",
        severity: "critical",
        message: `${staff.name} has approved time off from ${approvedTimeOff.startDate} to ${approvedTimeOff.endDate}`,
        timeOffRequestId: approvedTimeOff.id,
        details: { timeOffRequest: approvedTimeOff },
      });
    }

    // 4. Check for role mismatch (if role is required)
    if (shift.role && staff.role && shift.role !== staff.role) {
      conflicts.push({
        type: "role_mismatch",
        severity: "warning",
        message: `${staff.name} is assigned to ${shift.role} role but their primary role is ${staff.role}`,
        details: { assignedRole: shift.role, staffRole: staff.role },
      });
    }

    // 5. Check facility-defined rules (max hours/day, min rest between shifts)
    // Max hours per day
    const sameDayShifts = facilitySchedules.filter((s) => {
      if (s.staffId !== shift.staffId || s.date !== shift.date) return false;
      if (excludeShiftId && s.id === excludeShiftId) return false;
      if (s.status !== "scheduled") return false;
      return true;
    });

    const dailyHours = sameDayShifts.reduce((total, s) => {
      const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
      const [sEndHour, sEndMin] = s.endTime.split(":").map(Number);
      const hours = (sEndHour * 60 + sEndMin - (sStartHour * 60 + sStartMin)) / 60;
      return total + hours;
    }, shiftDuration);

    // Default max hours per day: 12 (would come from settings)
    const maxHoursPerDay = 12;
    if (dailyHours > maxHoursPerDay) {
      conflicts.push({
        type: "max_hours",
        severity: "warning",
        message: `${staff.name} would work ${dailyHours.toFixed(1)} hours on ${shift.date}, exceeding the ${maxHoursPerDay}-hour daily limit`,
        details: { dailyHours, maxHoursPerDay },
      });
    }

    // Min rest between shifts (check previous and next day)
    const previousDay = new Date(shift.date);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayStr = previousDay.toISOString().split("T")[0];

    const nextDay = new Date(shift.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];

    const previousDayShifts = facilitySchedules.filter((s) => {
      if (s.staffId !== shift.staffId || s.date !== previousDayStr) return false;
      if (s.status !== "scheduled") return false;
      return true;
    });

    const nextDayShifts = facilitySchedules.filter((s) => {
      if (s.staffId !== shift.staffId || s.date !== nextDayStr) return false;
      if (s.status !== "scheduled") return false;
      return true;
    });

    // Check min rest between shifts (default: 8 hours)
    const minRestHours = 8;
    const minRestMinutes = minRestHours * 60;

    // Check rest after previous day's last shift
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
      const restMinutes = (24 * 60 - lastEndMinutes) + shiftStartMinutes;

      if (restMinutes < minRestMinutes) {
        conflicts.push({
          type: "min_rest",
          severity: "warning",
          message: `${staff.name} has only ${(restMinutes / 60).toFixed(1)} hours rest between shifts (minimum: ${minRestHours} hours)`,
          conflictingShiftId: lastShift.id,
          conflictingShift: lastShift,
          details: { restHours: restMinutes / 60, minRestHours },
        });
      }
    }

    // Check rest before next day's first shift
    if (nextDayShifts.length > 0) {
      const firstShift = nextDayShifts.reduce((earliest, s) => {
        const [sStartHour, sStartMin] = s.startTime.split(":").map(Number);
        const sStartMinutes = sStartHour * 60 + sStartMin;
        const [earliestStartHour, earliestStartMin] = earliest.startTime.split(":").map(Number);
        const earliestStartMinutes = earliestStartHour * 60 + earliestStartMin;
        return sStartMinutes < earliestStartMinutes ? s : earliest;
      }, nextDayShifts[0]);

      const [firstStartHour, firstStartMin] = firstShift.startTime.split(":").map(Number);
      const firstStartMinutes = firstStartHour * 60 + firstStartMin;
      const restMinutes = (24 * 60 - shiftEndMinutes) + firstStartMinutes;

      if (restMinutes < minRestMinutes) {
        conflicts.push({
          type: "min_rest",
          severity: "warning",
          message: `${staff.name} will have only ${(restMinutes / 60).toFixed(1)} hours rest before next shift (minimum: ${minRestHours} hours)`,
          conflictingShiftId: firstShift.id,
          conflictingShift: firstShift,
          details: { restHours: restMinutes / 60, minRestHours },
        });
      }
    }

    return conflicts;
  };

  // Detect all conflicts in the current schedule
  const detectAllConflicts = (): Array<{
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
    conflictingShift?: (typeof schedules)[number];
    timeOffRequestId?: number;
    details?: any;
  }> => {
    const allConflicts: Array<{
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
      conflictingShift?: (typeof schedules)[number];
      timeOffRequestId?: number;
      details?: any;
    }> = [];

    // Scan all scheduled shifts
    facilitySchedules
      .filter((s) => s.status === "scheduled")
      .forEach((shift) => {
        const conflicts = detectShiftConflicts(shift, shift.id);
        conflicts.forEach((conflict) => {
          const staff = facilityStaff.find((s) => s.id === shift.staffId);
          allConflicts.push({
            id: `conflict-${shift.id}-${conflict.type}`,
            shiftId: shift.id,
            staffId: shift.staffId,
            staffName: staff?.name || `Staff ${shift.staffId}`,
            conflictType: conflict.type,
            severity: conflict.severity,
            date: shift.date,
            timeSlot: `${shift.startTime} - ${shift.endTime}`,
            message: conflict.message,
            conflictingShiftId: conflict.conflictingShiftId,
            conflictingShift: conflict.conflictingShift,
            timeOffRequestId: conflict.timeOffRequestId,
            details: conflict.details,
          });
        });
      });

    // Remove duplicates (same conflict from different perspectives)
    const uniqueConflicts = allConflicts.filter((conflict, index, self) =>
      index === self.findIndex((c) =>
        c.shiftId === conflict.shiftId &&
        c.conflictType === conflict.conflictType &&
        c.conflictingShiftId === conflict.conflictingShiftId
      )
    );

    return uniqueConflicts;
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
      role: "",
      status: "scheduled",
      location: "",
      notes: "",
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
      role: schedule.role,
      status: schedule.status,
      location: schedule.location || "",
      notes: schedule.notes || "",
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

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return facilitySchedules.filter((s) => s.date === dateStr);
  };

  // Get schedules grouped by role
  const getSchedulesByRole = (role?: string) => {
    const filtered = role
      ? facilitySchedules.filter((s) => s.role === role)
      : facilitySchedules;
    
    const grouped = filtered.reduce((acc, schedule) => {
      const role = schedule.role || "Other";
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(schedule);
      return acc;
    }, {} as Record<string, typeof facilitySchedules>);

    return grouped;
  };

  // Coverage rules (from settings - in real app, these would come from SchedulingSettings)
  const coverageRules = {
    daycareStaffPerDogs: 10,
    daycareMinStaff: 1,
    boardingMorningMinStaff: 1,
    boardingAfternoonMinStaff: 1,
    boardingEveningMinStaff: 1,
    frontDeskCoverageWindows: [
      { start: "08:00", end: "10:00", minStaff: 1 },
      { start: "16:00", end: "18:00", minStaff: 1 },
    ],
    understaffedThreshold: 0.7,
    overstaffedThreshold: 1.3,
  };

  // Calculate coverage status for a time block using facility-defined rules
  const getCoverageStatus = (date: Date, timeSlot: string) => {
    const dateStr = formatDate(date);
    const [hour, minute] = timeSlot.split(":").map(Number);
    const timeInMinutes = hour * 60 + minute;
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    // Get active shifts for this time slot
    const activeShifts = facilitySchedules.filter((s) => {
      if (s.date !== dateStr || s.status !== "scheduled") return false;
      const [startHour, startMin] = s.startTime.split(":").map(Number);
      const [endHour, endMin] = s.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return timeInMinutes >= startMinutes && timeInMinutes < endMinutes;
    });

    // Get workload for this time block
    let workload: TimeBlockWorkload | null = null;
    try {
      const timeBlock = `${timeStr}-${String(hour + 1).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      workload = calculateWorkloadForTimeBlock(dateStr, timeBlock, facility.id);
    } catch (e) {
      // If time block calculation fails, use daily workload
      const dailyWorkload = calculateWorkloadForDate(dateStr, facility.id);
      workload = {
        timeBlock: timeStr,
        checkIns: dailyWorkload.checkInTimes.filter((t) => t.startsWith(timeStr.split(":")[0])).length,
        checkOuts: dailyWorkload.checkOutTimes.filter((t) => t.startsWith(timeStr.split(":")[0])).length,
        daycareCount: dailyWorkload.daycareAttendance,
        boardingCount: dailyWorkload.boardingOccupancy,
        groomingCount: dailyWorkload.groomingAppointmentsCount,
        evaluations: dailyWorkload.evaluationsCount,
        trainingCount: dailyWorkload.trainingSessionsCount,
        busyMeter: dailyWorkload.busyMeter,
      };
    }

    // Calculate required staff based on workload and rules
    let minStaffNeeded = 1; // Base minimum

    // Daycare requirement: 1 staff per X dogs
    const daycareStaffNeeded = Math.max(
      coverageRules.daycareMinStaff,
      Math.ceil((workload?.daycareCount || 0) / coverageRules.daycareStaffPerDogs)
    );

    // Boarding requirement: based on shift time
    let boardingStaffNeeded = 1;
    if (hour >= 6 && hour < 14) {
      boardingStaffNeeded = coverageRules.boardingMorningMinStaff;
    } else if (hour >= 14 && hour < 22) {
      boardingStaffNeeded = coverageRules.boardingAfternoonMinStaff;
    } else {
      boardingStaffNeeded = coverageRules.boardingEveningMinStaff;
    }

    // Front desk requirement: check coverage windows
    let frontDeskNeeded = 0;
    for (const window of coverageRules.frontDeskCoverageWindows) {
      if (timeStr >= window.start && timeStr < window.end) {
        frontDeskNeeded = Math.max(frontDeskNeeded, window.minStaff);
      }
    }

    // Grooming: count active grooming shifts
    const groomingStaffCount = activeShifts.filter((s) => s.role.toLowerCase().includes("groom")).length;

    // Total minimum staff needed
    minStaffNeeded = Math.max(
      daycareStaffNeeded,
      boardingStaffNeeded,
      frontDeskNeeded,
      groomingStaffCount > 0 ? 1 : 0
    );

    // Count staff by role
    const staffByRole = activeShifts.reduce((acc, s) => {
      const role = s.role.toLowerCase();
      if (role.includes("daycare")) acc.daycare++;
      if (role.includes("boarding")) acc.boarding++;
      if (role.includes("groom")) acc.grooming++;
      if (role.includes("front") || role.includes("admin") || role.includes("desk")) acc.frontDesk++;
      return acc;
    }, { daycare: 0, boarding: 0, grooming: 0, frontDesk: 0 });

    const totalStaffCount = activeShifts.length;

    // Calculate coverage ratio
    const coverageRatio = minStaffNeeded > 0 ? totalStaffCount / minStaffNeeded : 1;

    // Determine status based on thresholds
    let status: "understaffed" | "ok" | "overstaffed";
    if (coverageRatio < coverageRules.understaffedThreshold) {
      status = "understaffed";
    } else if (coverageRatio > coverageRules.overstaffedThreshold) {
      status = "overstaffed";
    } else {
      status = "ok";
    }

    return {
      status,
      count: totalStaffCount,
      min: minStaffNeeded,
      ratio: coverageRatio,
      byRole: staffByRole,
      workload: workload?.busyMeter || 0,
    };
  };

  // Role categories
  const roleCategories = [
    { id: "Boarding", label: "Boarding Attendants", icon: Building2 },
    { id: "Daycare", label: "Daycare Attendants", icon: Users },
    { id: "Grooming", label: "Groomers", icon: Scissors },
    { id: "Training", label: "Trainers", icon: GraduationCap },
    { id: "Admin", label: "Front Desk / Admin", icon: User },
  ];

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
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <Button onClick={() => handleAddNew()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shift
        </Button>
        <Button variant="outline" onClick={() => setIsCopyWeekModalOpen(true)}>
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
          onClick={() => exportSchedulesToICS(facilitySchedules, facility.name)}
        >
          <FileDown className="mr-2 h-4 w-4" />
          ICS
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="inline-flex h-auto gap-1 rounded-lg bg-muted p-1">
          <TabsTrigger
            value="schedule"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Requests
            {(getSickCallInsNeedingCoverage().length > 0 || getPendingSwapRequests().length > 0) && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {getSickCallInsNeedingCoverage().length + getPendingSwapRequests().length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="coverage"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4" />
            Coverage & Conflicts
            {getSickCallInsNeedingCoverage().length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {getSickCallInsNeedingCoverage().length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <CalendarDays className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* Stats Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {"Today's Shifts"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {todaySchedules.length}
                </div>
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
                <div className="text-2xl font-bold">
                  {upcomingSchedules.length}
                </div>
                <p className="text-xs text-muted-foreground">Future shifts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalHours.toFixed(1)}
                </div>
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

          {/* View Toggle */}
          <div className="space-y-4">
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
                <Button
                  variant={viewMode === "role" ? "default" : "outline"}
                  onClick={() => setViewMode("role")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Role View
                </Button>
              </div>

              {viewMode === "calendar" && (
                <div className="flex items-center gap-2">
                  {/* Date Navigation */}
                  <div className="flex items-center gap-1 border rounded-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        if (calendarView === "day") {
                          newDate.setDate(newDate.getDate() - 1);
                        } else if (calendarView === "week") {
                          newDate.setDate(newDate.getDate() - 7);
                        } else {
                          newDate.setMonth(newDate.getMonth() - 1);
                        }
                        setCurrentDate(newDate);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      type="date"
                      value={
                        calendarView === "day"
                          ? formatDate(currentDate)
                          : calendarView === "week"
                            ? formatDate(currentDate)
                            : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`
                      }
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (calendarView === "week") {
                          const day = newDate.getDay();
                          const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
                          newDate.setDate(diff);
                        }
                        setCurrentDate(newDate);
                      }}
                      className="w-auto border-0 h-8 px-2"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        if (calendarView === "day") {
                          newDate.setDate(newDate.getDate() + 1);
                        } else if (calendarView === "week") {
                          newDate.setDate(newDate.getDate() + 7);
                        } else {
                          newDate.setMonth(newDate.getMonth() + 1);
                        }
                        setCurrentDate(newDate);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const day = today.getDay();
                        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                        setCurrentDate(new Date(today.setDate(diff)));
                      }}
                    >
                      Today
                    </Button>
                  </div>
                  {/* View Type Buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant={calendarView === "day" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCalendarView("day")}
                    >
                      Day
                    </Button>
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
                          return getScheduleForDateAndStaff(
                            date,
                            Number(staffId),
                          )
                            ? [
                                getScheduleForDateAndStaff(
                                  date,
                                  Number(staffId),
                                )!,
                              ]
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
                      ? ({ items, date }) => {
                          const dayTasks = shiftTasks.filter(
                            (t) => t.scheduleDate === formatDate(date)
                          );
                          return (
                            <>
                              {items.length > 0 ? (
                                items.map((schedule) => {
                                  const shiftTasksForSchedule = dayTasks.filter(
                                    (t) =>
                                      t.shiftId === schedule.id ||
                                      (t.shiftStartTime === schedule.startTime &&
                                        t.shiftEndTime === schedule.endTime)
                                  );
                                  return (
                                    <div
                                      key={schedule.id}
                                      className="group relative"
                                    >
                                      <Badge
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-secondary/80"
                                        onClick={() => handleEdit(schedule)}
                                      >
                                        {schedule.startTime} - {schedule.endTime}
                                      </Badge>
                                      {/* Afficher les tasks attachées au shift */}
                                      {shiftTasksForSchedule.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                          {shiftTasksForSchedule.slice(0, 2).map((task) => (
                                            <div
                                              key={task.id}
                                              className={`text-[10px] px-1 py-0.5 rounded ${
                                                task.status === "completed"
                                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                  : task.priority === "urgent"
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : task.priority === "high"
                                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                              }`}
                                              title={task.taskName}
                                            >
                                              {task.taskName.length > 15
                                                ? task.taskName.substring(0, 15) + "..."
                                                : task.taskName}
                                            </div>
                                          ))}
                                          {shiftTasksForSchedule.length > 2 && (
                                            <div className="text-[10px] text-muted-foreground">
                                              +{shiftTasksForSchedule.length - 2} more
                                            </div>
                                          )}
                                        </div>
                                      )}
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
                                  );
                                })
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
                        );
                      }
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
                view={calendarView === "day" ? "week" : calendarView}
                initialDate={currentDate}
              />
            )}

            {/* Day View */}
            {viewMode === "calendar" && calendarView === "day" && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {currentDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Coverage Heatmap */}
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Map className="h-4 w-4" />
                          Coverage Heatmap
                        </h3>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500"></div>
                            <span>Understaffed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500"></div>
                            <span>OK</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-yellow-500"></div>
                            <span>Overstaffed</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        {timeSlots.map((timeSlot) => {
                          const coverage = getCoverageStatus(currentDate, timeSlot);
                          return (
                            <div
                              key={timeSlot}
                              className={`p-2 rounded text-center text-xs ${
                                coverage.status === "understaffed"
                                  ? "bg-red-500/20 border border-red-500"
                                  : coverage.status === "overstaffed"
                                    ? "bg-yellow-500/20 border border-yellow-500"
                                    : "bg-green-500/20 border border-green-500"
                              }`}
                              title={`${timeSlot}: ${coverage.count} staff (${coverage.status}) | Required: ${coverage.min} | Busy: ${coverage.workload}%`}
                            >
                              <div className="font-medium">{timeSlot}</div>
                              <div className="text-xs mt-1">{coverage.count}/{coverage.min}</div>
                              {coverage.workload > 0 && (
                                <div className="text-[10px] mt-0.5 opacity-75">
                                  {coverage.workload}% busy
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Workload Indicators */}
                    {(() => {
                      const dateStr = formatDate(currentDate);
                      const workload = calculateWorkloadForDate(dateStr, facility.id);
                      return (
                        <div className="border rounded-lg p-4 bg-muted/50">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Workload Indicators
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium">Busy Meter:</div>
                              <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      workload.busyMeter >= 80
                                        ? "bg-red-500"
                                        : workload.busyMeter >= 50
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                    }`}
                                    style={{ width: `${workload.busyMeter}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold">{workload.busyMeter}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <UsersIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Check-ins</p>
                                <p className="text-lg font-bold">{workload.checkInsCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Check-outs</p>
                                <p className="text-lg font-bold">{workload.checkOutsCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <UsersIcon className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Daycare</p>
                                <p className="text-lg font-bold">
                                  {workload.daycareAttendance} / {workload.daycareForecast}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <Home className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Boarding</p>
                                <p className="text-lg font-bold">{workload.boardingOccupancy}</p>
                                {(workload.boardingArrivals > 0 || workload.boardingDepartures > 0) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {workload.boardingArrivals} in, {workload.boardingDepartures} out
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-pink-100 rounded-lg">
                                <ScissorsIcon className="h-4 w-4 text-pink-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Grooming</p>
                                <p className="text-lg font-bold">{workload.groomingAppointmentsCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-indigo-100 rounded-lg">
                                <FileText className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Evaluations</p>
                                <p className="text-lg font-bold">{workload.evaluationsCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="p-2 bg-teal-100 rounded-lg">
                                <GraduationCapIcon className="h-4 w-4 text-teal-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Training</p>
                                <p className="text-lg font-bold">{workload.trainingSessionsCount}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Day Schedule */}
                    <div className="space-y-2">
                      <h3 className="font-semibold">Scheduled Shifts</h3>
                      <div className="space-y-2">
                        {getSchedulesForDate(currentDate)
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map((schedule) => (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {schedule.staffName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{schedule.staffName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {schedule.role}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {schedule.startTime} - {schedule.endTime}
                                </p>
                                {schedule.location && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    📍 {schedule.location}
                                  </p>
                                )}
                                <Badge variant="outline" className="mt-1">
                                  {schedule.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        {getSchedulesForDate(currentDate).length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            No shifts scheduled for this day
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Day Tasks Section */}
                    <div className="space-y-2 mt-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Day Tasks
                      </h3>
                      <div className="space-y-2">
                        {shiftTasks
                          .filter(
                            (t) =>
                              t.scheduleDate === formatDate(currentDate) &&
                              !t.shiftId // Tasks attachées au jour, pas à un shift
                          )
                          .map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={task.status === "completed"}
                                  disabled
                                />
                                <div>
                                  <p className="font-medium">{task.taskName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {task.description}
                                  </p>
                                  {task.assignedToStaffName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Assigned to: {task.assignedToStaffName}
                                    </p>
                                  )}
                                  {task.shiftStartTime && (
                                    <p className="text-xs text-muted-foreground">
                                      Time: {task.shiftStartTime}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
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
                                <Badge
                                  variant={
                                    task.status === "completed"
                                      ? "default"
                                      : task.status === "in_progress"
                                        ? "secondary"
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
                              </div>
                            </div>
                          ))}
                        {shiftTasks.filter(
                          (t) =>
                            t.scheduleDate === formatDate(currentDate) && !t.shiftId
                        ).length === 0 && (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            No day-level tasks for this date
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role/Department View */}
            {viewMode === "role" && (
              <div className="space-y-6">
                {/* Role Filter */}
                <Card>
                  <CardHeader>
                    <CardTitle>View by Role / Department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedRole === null ? "default" : "outline"}
                        onClick={() => setSelectedRole(null)}
                      >
                        All Roles
                      </Button>
                      {roleCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <Button
                            key={category.id}
                            variant={selectedRole === category.id ? "default" : "outline"}
                            onClick={() => setSelectedRole(category.id)}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {category.label}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Role Grouped Schedules */}
                {Object.entries(getSchedulesByRole(selectedRole || undefined)).map(
                  ([role, schedules]) => {
                    const category = roleCategories.find((c) => c.id === role);
                    const Icon = category?.icon || User;
                    return (
                      <Card key={role}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            {category?.label || role} ({schedules.length} shifts)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Staff Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Start Time</TableHead>
                                <TableHead>End Time</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schedules
                                .sort((a, b) => {
                                  const dateCompare = a.date.localeCompare(b.date);
                                  if (dateCompare !== 0) return dateCompare;
                                  return a.startTime.localeCompare(b.startTime);
                                })
                                .map((schedule) => (
                                  <TableRow key={schedule.id}>
                                    <TableCell className="font-medium">
                                      {schedule.staffName}
                                    </TableCell>
                                    <TableCell>{schedule.date}</TableCell>
                                    <TableCell>{schedule.startTime}</TableCell>
                                    <TableCell>{schedule.endTime}</TableCell>
                                    <TableCell>
                                      <StatusBadge
                                        type="status"
                                        value={schedule.status}
                                      />
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
                                          onClick={() => handleDeleteClick(schedule)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  },
                )}
              </div>
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
                            <StatusBadge
                              type="status"
                              value={schedule.status}
                            />
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
          </div>

          {/* Add/Edit Schedule Modal */}
          <Dialog
            open={isAddEditModalOpen}
            onOpenChange={setIsAddEditModalOpen}
          >
            <DialogContent className="max-h-[85vh] flex flex-col">
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

              <div className="space-y-3 py-4 overflow-y-auto flex-1 pr-2">
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
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boarding">Boarding</SelectItem>
                      <SelectItem value="Daycare">Daycare</SelectItem>
                      <SelectItem value="Grooming">Grooming</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Admin">Front Desk / Admin</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location/Zone (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Daycare Floor, Boarding Wing A, Grooming Room 1"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        status: value as typeof formData.status,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Internal notes about this shift..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {/* Shift Tasks Section */}
                {editingSchedule && (
                  <div className="space-y-2 border-t pt-3">
                    <Label>Shift Tasks</Label>
                    <div className="space-y-1.5 border rounded-lg p-2 bg-muted/50 max-h-[200px] overflow-y-auto">
                      {shiftTasks
                        .filter(
                          (t) =>
                            t.shiftId === editingSchedule.id ||
                            (t.scheduleDate === editingSchedule.date &&
                              t.shiftStartTime === editingSchedule.startTime &&
                              t.shiftEndTime === editingSchedule.endTime)
                        )
                        .map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-1.5 bg-background rounded text-sm"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Checkbox
                                checked={task.status === "completed"}
                                disabled
                                className="h-3 w-3"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-xs truncate">{task.taskName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {task.description}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      {shiftTasks.filter(
                        (t) =>
                          editingSchedule &&
                          (t.shiftId === editingSchedule.id ||
                            (t.scheduleDate === editingSchedule.date &&
                              t.shiftStartTime === editingSchedule.startTime &&
                              t.shiftEndTime === editingSchedule.endTime))
                      ).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No tasks assigned to this shift
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-1.5 text-xs h-7"
                        onClick={() => {
                          // TODO: Open modal to add task to this shift
                          toast.info("Task assignment feature coming soon");
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        Add Task to Shift
                      </Button>
                    </div>
                  </div>
                )}

                {!editingSchedule && (
                  <div className="space-y-3 border-t pt-3">
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

                {/* Conflict Detection */}
                {formData.staffId && formData.date && formData.startTime && formData.endTime && formData.role && (() => {
                  const conflicts = detectShiftConflicts(
                    {
                      staffId: parseInt(formData.staffId),
                      date: formData.date,
                      startTime: formData.startTime,
                      endTime: formData.endTime,
                      role: formData.role,
                    },
                    editingSchedule?.id
                  );

                  if (conflicts.length === 0) return null;

                  return (
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <Label className="text-sm font-semibold">Detected Conflicts</Label>
                      </div>
                      <div className="space-y-2">
                        {conflicts.map((conflict, idx) => (
                          <Card
                            key={idx}
                            className={`border-2 ${
                              conflict.severity === "critical"
                                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                                : conflict.severity === "warning"
                                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                                  : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            }`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {conflict.severity === "critical" && (
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                    )}
                                    {conflict.severity === "warning" && (
                                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                                    )}
                                    {conflict.severity === "info" && (
                                      <Info className="h-4 w-4 text-blue-600" />
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={
                                        conflict.severity === "critical"
                                          ? "border-red-600 text-red-700"
                                          : conflict.severity === "warning"
                                            ? "border-yellow-600 text-yellow-700"
                                            : "border-blue-600 text-blue-700"
                                      }
                                    >
                                      {conflict.type === "double_booking" && "Double Booking"}
                                      {conflict.type === "overlapping" && "Overlapping"}
                                      {conflict.type === "time_off" && "Time Off Conflict"}
                                      {conflict.type === "role_mismatch" && "Role Mismatch"}
                                      {conflict.type === "max_hours" && "Max Hours Exceeded"}
                                      {conflict.type === "min_rest" && "Insufficient Rest"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {conflict.message}
                                  </p>
                                  {conflict.conflictingShift && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Conflicting shift: {conflict.conflictingShift.staffName} - {conflict.conflictingShift.date} ({conflict.conflictingShift.startTime} - {conflict.conflictingShift.endTime})
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                                {(conflict.type === "double_booking" || conflict.type === "overlapping") && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-xs h-7"
                                      onClick={() => {
                                        toast.info("Reassign feature - select a different staff member");
                                      }}
                                    >
                                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                                      Reassign
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 text-xs h-7"
                                      onClick={() => {
                                        if (conflict.conflictingShift) {
                                          const [confStartHour, confStartMin] = conflict.conflictingShift.endTime.split(":").map(Number);
                                          const newStartTime = `${String(confStartHour).padStart(2, "0")}:${String(confStartMin).padStart(2, "0")}`;
                                          setFormData({ ...formData, startTime: newStartTime });
                                          toast.success("Start time adjusted to avoid conflict");
                                        }
                                      }}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Adjust Time
                                    </Button>
                                  </>
                                )}
                                {conflict.severity === "warning" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 text-xs h-7"
                                    onClick={() => {
                                      toast.info("This is a warning. You can proceed, but consider reviewing.");
                                    }}
                                  >
                                    <Info className="h-3 w-3 mr-1" />
                                    Continue Anyway
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSchedule}
                  disabled={
                    formData.staffId &&
                    formData.date &&
                    formData.startTime &&
                    formData.endTime &&
                    detectShiftConflicts(
                      {
                        staffId: parseInt(formData.staffId),
                        date: formData.date,
                        startTime: formData.startTime,
                        endTime: formData.endTime,
                        role: formData.role || "",
                      },
                      editingSchedule?.id
                    ).some((c) => c.severity === "critical")
                  }
                >
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

        {/* Requests Tab - Time Off + Shift Swap */}
        <TabsContent value="requests" className="space-y-6">
          <Tabs defaultValue="time-off" className="space-y-4">
            <TabsList>
              <TabsTrigger value="time-off">
                <FileText className="h-4 w-4 mr-2" />
                Time Off
                {getSickCallInsNeedingCoverage().length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                    {getSickCallInsNeedingCoverage().length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="shift-swap">
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Shift Swap
                {getPendingSwapRequests().length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {getPendingSwapRequests().length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Time Off Sub-tab (includes Sick Call-ins) */}
            <TabsContent value="time-off" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Time Off Requests
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage time off requests including sick calls, vacation, and other absences
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          setSelectedShiftForSickCall(null);
                          setSickCallReason("");
                          setSickCallAction(null);
                          setSelectedReplacementStaffId("");
                          setSplitShiftStaffIds([]);
                          setNotifyDepartments([]);
                          setIsSickCallModalOpen(true);
                        }} 
                        variant="outline"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Same-Day Sick / Call-Out
                      </Button>
                      <Button onClick={() => {
                        setTimeOffRequestData({
                          type: "",
                          startDate: "",
                          endDate: "",
                          reason: "",
                        });
                        setIsTimeOffRequestModalOpen(true);
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Request Time Off
                      </Button>
                    </div>
                  </div>
                </CardHeader>
            <CardContent>
              <Tabs defaultValue="requests" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="requests">
                    Time Off Requests
                    {timeOffRequests.filter(r => r.status === "pending" && r.facility === facility.name).length > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        {timeOffRequests.filter(r => r.status === "pending" && r.facility === facility.name).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sick-calls">
                    Sick Call-ins
                    {getSickCallInsNeedingCoverage().length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                        {getSickCallInsNeedingCoverage().length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeOffRequests
                        .filter((r) => r.facility === facility.name)
                        .map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {request.staffName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{request.staffName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {request.customTypeName || 
                                 defaultTimeOffReasons.find(r => r.id === request.type)?.name || 
                                 request.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {request.startDate === request.endDate
                                  ? request.startDate
                                  : `${request.startDate} - ${request.endDate}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{request.reason || "-"}</span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  request.status === "approved"
                                    ? "default"
                                    : request.status === "denied"
                                      ? "destructive"
                                      : request.status === "changes_requested"
                                        ? "secondary"
                                        : "outline"
                                }
                                className={
                                  request.status === "approved" ? "bg-green-600" : ""
                                }
                              >
                                {request.status === "changes_requested"
                                  ? "Changes Requested"
                                  : request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(request.requestedAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {request.status === "pending" && (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setSelectedTimeOffRequest(request);
                                      setReviewAction("approve");
                                      setReviewNotes("");
                                      setIsTimeOffReviewModalOpen(true);
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTimeOffRequest(request);
                                      setReviewAction("request_changes");
                                      setRequestedChanges("");
                                      setIsTimeOffReviewModalOpen(true);
                                    }}
                                  >
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Request Changes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedTimeOffRequest(request);
                                      setReviewAction("deny");
                                      setReviewNotes("");
                                      setIsTimeOffReviewModalOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Deny
                                  </Button>
                                </div>
                              )}
                              {request.status === "changes_requested" && request.requestedChanges && (
                                <div className="text-xs text-muted-foreground max-w-[200px]">
                                  {request.requestedChanges}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="sick-calls">
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
            </TabsContent>

            {/* Shift Swap Sub-tab */}
            <TabsContent value="shift-swap" className="space-y-6">
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
                    <Button 
                      onClick={() => {
                        setSwapData({
                          requestingShiftId: "",
                          swapType: "specific",
                          targetStaffId: "",
                          targetShiftId: "",
                          reason: "",
                        });
                        setSwapValidationErrors([]);
                        setIsSwapModalOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Request Shift Swap
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
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {swap.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {swap.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => {
                                setSelectedSwapRequest(swap);
                                setSwapApprovalAction("approve");
                                setSwapApprovalNotes("");
                                setIsSwapApprovalModalOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedSwapRequest(swap);
                                setSwapApprovalAction("deny");
                                setSwapApprovalNotes("");
                                setIsSwapApprovalModalOpen(true);
                              }}
                            >
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
          </Tabs>
        </TabsContent>

        {/* Coverage & Conflicts Tab */}
        <TabsContent value="coverage" className="space-y-6">
          <div className="space-y-6">
            {/* Coverage Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Coverage Needs
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Shifts that need coverage and available staff
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getSickCallInsNeedingCoverage().length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Sick Calls Needing Coverage
                        </span>
                        <Badge variant="destructive">
                          {getSickCallInsNeedingCoverage().length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {getSickCallInsNeedingCoverage().map((callIn) => (
                          <div
                            key={callIn.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                          >
                            <div>
                              <p className="font-medium">{callIn.staffName}</p>
                              <p className="text-sm text-muted-foreground">
                                {callIn.shiftDate} - {callIn.shiftTime}
                              </p>
                            </div>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No coverage needs at this time
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conflicts Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Schedule Conflicts
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Detect and resolve scheduling conflicts
                </p>
              </CardHeader>
              <CardContent>
                <StaffConflictDetector
                  schedules={facilitySchedules}
                  staff={facilityStaff}
                  timeOffRequests={timeOffRequests.filter((to) => to.facility === facility.name)}
                  onReassign={(shiftId, newStaffId) => {
                    // TODO: Reassign shift in backend
                    toast.success("Shift reassigned successfully");
                  }}
                  onEditShift={(shiftId) => {
                    const shift = facilitySchedules.find((s) => s.id === shiftId);
                    if (shift) {
                      handleEdit(shift);
                    }
                  }}
                  onIgnore={(shiftId, reason) => {
                    // TODO: Mark conflict as ignored in backend
                    toast.success("Conflict ignored", { description: reason });
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Shift Templates
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create and manage reusable shift templates for quick scheduling
                  </p>
                </div>
                <Button onClick={() => {/* TODO: Open template creation modal */}}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shiftTemplates.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {shiftTemplates.map((template) => (
                      <Card key={template.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <CardHeader>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {template.startTime} - {template.endTime}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">
                                {template.durationMinutes} min
                              </span>
                            </div>
                            {template.description && (
                              <p className="text-muted-foreground text-xs">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No templates yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first shift template to get started
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SchedulingSettings />
        </TabsContent>
      </Tabs>

      {/* Same-Day Sick / Call-Out Modal */}
      <Dialog open={isSickCallModalOpen} onOpenChange={setIsSickCallModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Same-Day Sick / Call-Out
            </DialogTitle>
            <DialogDescription>
              Mark a staff member as absent (sick) for a shift and manage coverage immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Select Shift */}
            <div className="space-y-2">
              <Label htmlFor="sickShiftSelect">Select Shift *</Label>
              <Select
                value={selectedShiftForSickCall?.id.toString() || ""}
                onValueChange={(value) => {
                  const shift = facilitySchedules.find(
                    (s) => s.id.toString() === value && s.status === "scheduled"
                  );
                  setSelectedShiftForSickCall(shift || null);
                  setSickCallAction(null);
                  setSelectedReplacementStaffId("");
                  setSplitShiftStaffIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the shift to mark as sick" />
                </SelectTrigger>
                <SelectContent>
                  {facilitySchedules
                    .filter((s) => s.status === "scheduled")
                    .map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id.toString()}>
                        {schedule.staffName} - {schedule.date} ({schedule.startTime} - {schedule.endTime}) - {schedule.role}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedShiftForSickCall && (
              <>
                {/* Step 2: Reason */}
                <div className="space-y-2">
                  <Label htmlFor="sickReason">Reason (Optional)</Label>
                  <Textarea
                    id="sickReason"
                    placeholder="e.g., Flu symptoms, migraine, family emergency..."
                    value={sickCallReason}
                    onChange={(e) => setSickCallReason(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Step 3: Coverage Impact Display */}
                {(() => {
                  const impact = calculateCoverageImpact(selectedShiftForSickCall);
                  return (
                    <Card className={impact.impact === "critical" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : impact.impact === "warning" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : ""}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {impact.impact === "critical" && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {impact.impact === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {impact.impact === "none" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          Coverage Impact
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className={`font-medium ${
                              impact.status === "understaffed" ? "text-red-600" :
                              impact.status === "at_minimum" ? "text-yellow-600" :
                              "text-green-600"
                            }`}>
                              {impact.status === "understaffed" ? "Understaffed" :
                               impact.status === "at_minimum" ? "At Minimum" :
                               "OK"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Current Staff</p>
                            <p className="font-medium">{impact.currentCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Minimum Needed</p>
                            <p className="font-medium">{impact.minNeeded}</p>
                          </div>
                        </div>
                        {impact.impact === "critical" && (
                          <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-900 dark:text-red-200">
                            <strong>Critical:</strong> This shift removal will leave {impact.currentCount} staff member(s), which is below the minimum of {impact.minNeeded} for {selectedShiftForSickCall.role}.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Step 4: Suggested Replacements */}
                {(() => {
                  const suggestions = getSuggestedReplacements(selectedShiftForSickCall);
                  return (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Suggested Replacements</Label>
                      <p className="text-sm text-muted-foreground">
                        Staff members available for this shift based on availability
                      </p>
                      {suggestions.length > 0 ? (
                        <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                          {suggestions.map((staff) => (
                            <div
                              key={staff.id}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedReplacementStaffId === staff.id.toString() || splitShiftStaffIds.includes(staff.id.toString())
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              }`}
                              onClick={() => {
                                if (sickCallAction === "split") {
                                  if (splitShiftStaffIds.includes(staff.id.toString())) {
                                    setSplitShiftStaffIds(splitShiftStaffIds.filter(id => id !== staff.id.toString()));
                                  } else if (splitShiftStaffIds.length < 2) {
                                    setSplitShiftStaffIds([...splitShiftStaffIds, staff.id.toString()]);
                                  }
                                } else {
                                  setSelectedReplacementStaffId(staff.id.toString());
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {staff.name.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{staff.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {staff.role} {staff.isBackup && <Badge variant="outline" className="ml-1 text-xs">Backup</Badge>}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  Available: {staff.availability}
                                </p>
                                {(selectedReplacementStaffId === staff.id.toString() || splitShiftStaffIds.includes(staff.id.toString())) && (
                                  <Badge className="mt-1 bg-green-600">Selected</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Card className="bg-muted/50">
                          <CardContent className="py-8 text-center">
                            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No available staff found for this shift</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              All available staff are already scheduled or unavailable
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}

                {/* Step 5: Manager Actions */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold">Coverage Options</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={sickCallAction === "assign" ? "default" : "outline"}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => {
                        setSickCallAction("assign");
                        setSplitShiftStaffIds([]);
                      }}
                      disabled={!selectedReplacementStaffId && sickCallAction === "assign"}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm">Assign Replacement</span>
                    </Button>
                    <Button
                      variant={sickCallAction === "split" ? "default" : "outline"}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => {
                        setSickCallAction("split");
                        setSelectedReplacementStaffId("");
                      }}
                      disabled={splitShiftStaffIds.length === 0 && sickCallAction === "split"}
                    >
                      <Split className="h-5 w-5" />
                      <span className="text-sm">Split Shift</span>
                    </Button>
                    <Button
                      variant={sickCallAction === "volunteers" ? "default" : "outline"}
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => {
                        setSickCallAction("volunteers");
                        setSelectedReplacementStaffId("");
                        setSplitShiftStaffIds([]);
                      }}
                    >
                      <Users2 className="h-5 w-5" />
                      <span className="text-sm">Request Volunteers</span>
                    </Button>
                  </div>

                  {sickCallAction === "assign" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Assign Replacement</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedReplacementStaffId
                          ? `Selected: ${facilityStaff.find(s => s.id.toString() === selectedReplacementStaffId)?.name}`
                          : "Please select a replacement from the suggestions above"}
                      </p>
                    </div>
                  )}

                  {sickCallAction === "split" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Split Shift</p>
                      <p className="text-xs text-muted-foreground">
                        {splitShiftStaffIds.length > 0
                          ? `Selected: ${splitShiftStaffIds.map(id => facilityStaff.find(s => s.id.toString() === id)?.name).join(", ")}`
                          : "Select up to 2 staff members to split this shift"}
                      </p>
                    </div>
                  )}

                  {sickCallAction === "volunteers" && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Request Volunteers</p>
                      <p className="text-xs text-muted-foreground">
                        Eligible staff will be notified to volunteer for this shift
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 6: Notification Options */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold">Notifications</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyReplacement"
                        checked={true}
                        disabled
                      />
                      <Label htmlFor="notifyReplacement" className="text-sm font-normal cursor-pointer">
                        Notify replacement staff
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyManagers"
                        checked={true}
                        disabled
                      />
                      <Label htmlFor="notifyManagers" className="text-sm font-normal cursor-pointer">
                        Notify manager team
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Notify Affected Departments (Optional)</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Daycare", "Boarding", "Grooming", "Training", "Front Desk"].map((dept) => (
                          <div key={dept} className="flex items-center space-x-2">
                            <Checkbox
                              id={`notify-${dept}`}
                              checked={notifyDepartments.includes(dept)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNotifyDepartments([...notifyDepartments, dept]);
                                } else {
                                  setNotifyDepartments(notifyDepartments.filter(d => d !== dept));
                                }
                              }}
                            />
                            <Label htmlFor={`notify-${dept}`} className="text-sm font-normal cursor-pointer">
                              {dept}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSickCallModalOpen(false);
                setSelectedShiftForSickCall(null);
                setSickCallReason("");
                setSickCallAction(null);
                setSelectedReplacementStaffId("");
                setSplitShiftStaffIds([]);
                setNotifyDepartments([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedShiftForSickCall) {
                  toast.error("Please select a shift");
                  return;
                }

                // Mark shift as sick
                // TODO: Update shift status in backend
                toast.success("Shift marked as sick", {
                  description: `${selectedShiftForSickCall.staffName}'s shift has been marked as "Absent (Sick)"`,
                });

                // Handle coverage action
                if (sickCallAction === "assign" && selectedReplacementStaffId) {
                  // TODO: Assign replacement in backend
                  toast.success("Replacement assigned", {
                    description: `${facilityStaff.find(s => s.id.toString() === selectedReplacementStaffId)?.name} has been assigned to cover this shift`,
                  });
                } else if (sickCallAction === "split" && splitShiftStaffIds.length > 0) {
                  // TODO: Split shift in backend
                  toast.success("Shift split", {
                    description: `Shift has been split between ${splitShiftStaffIds.map(id => facilityStaff.find(s => s.id.toString() === id)?.name).join(" and ")}`,
                  });
                } else if (sickCallAction === "volunteers") {
                  // TODO: Send volunteer request notifications in backend
                  toast.success("Volunteer request sent", {
                    description: "Eligible staff have been notified to volunteer for this shift",
                  });
                }

                // TODO: Send notifications
                if (notifyDepartments.length > 0) {
                  toast.info("Notifications sent", {
                    description: `Notified: ${notifyDepartments.join(", ")}`,
                  });
                }

                setIsSickCallModalOpen(false);
                setSelectedShiftForSickCall(null);
                setSickCallReason("");
                setSickCallAction(null);
                setSelectedReplacementStaffId("");
                setSplitShiftStaffIds([]);
                setNotifyDepartments([]);
              }}
              disabled={!selectedShiftForSickCall || (sickCallAction === "assign" && !selectedReplacementStaffId) || (sickCallAction === "split" && splitShiftStaffIds.length === 0)}
            >
              Mark as Sick & {sickCallAction === "assign" ? "Assign" : sickCallAction === "split" ? "Split" : sickCallAction === "volunteers" ? "Request Volunteers" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Swap Request Modal */}
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Request Shift Swap
            </DialogTitle>
            <DialogDescription>
              Select your shift and choose to swap with a specific coworker or open to anyone qualified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Select Your Shift */}
            <div className="space-y-2">
              <Label htmlFor="requestingShift">Your Shift to Swap *</Label>
              <Select
                value={swapData.requestingShiftId}
                onValueChange={(value) => {
                  setSwapData({ ...swapData, requestingShiftId: value, targetStaffId: "", targetShiftId: "" });
                  setSwapValidationErrors([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your shift" />
                </SelectTrigger>
                <SelectContent>
                  {facilitySchedules
                    .filter((s) => s.status === "scheduled")
                    .map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id.toString()}>
                        {schedule.staffName} - {schedule.date} ({schedule.startTime} - {schedule.endTime}) - {schedule.role}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {swapData.requestingShiftId && (
              <>
                {/* Step 2: Choose Swap Type */}
                <div className="space-y-3">
                  <Label>Swap With</Label>
                  <RadioGroup
                    value={swapData.swapType}
                    onValueChange={(value: "specific" | "anyone") => {
                      setSwapData({ ...swapData, swapType: value, targetStaffId: "", targetShiftId: "" });
                      setSwapValidationErrors([]);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="specific" id="swap-specific" />
                      <Label htmlFor="swap-specific" className="font-normal cursor-pointer">
                        Specific coworker
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="anyone" id="swap-anyone" />
                      <Label htmlFor="swap-anyone" className="font-normal cursor-pointer">
                        Open to anyone qualified
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Step 3: Specific Coworker Selection */}
                {swapData.swapType === "specific" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetStaff">Select Coworker *</Label>
                      <Select
                        value={swapData.targetStaffId}
                        onValueChange={(value) => {
                          setSwapData({ ...swapData, targetStaffId: value, targetShiftId: "" });
                          setSwapValidationErrors([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select coworker" />
                        </SelectTrigger>
                        <SelectContent>
                          {facilityStaff
                            .filter((s) => {
                              const requestingShift = facilitySchedules.find(
                                (shift) => shift.id.toString() === swapData.requestingShiftId
                              );
                              return requestingShift ? s.id !== requestingShift.staffId : true;
                            })
                            .map((staff) => (
                              <SelectItem key={staff.id} value={staff.id.toString()}>
                                {staff.name} ({staff.role})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {swapData.targetStaffId && (
                      <div className="space-y-2">
                        <Label htmlFor="targetShift">Their Shift to Swap *</Label>
                        <Select
                          value={swapData.targetShiftId}
                          onValueChange={(value) => {
                            setSwapData({ ...swapData, targetShiftId: value });
                            setSwapValidationErrors([]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select target shift" />
                          </SelectTrigger>
                          <SelectContent>
                            {facilitySchedules
                              .filter(
                                (s) =>
                                  s.staffId.toString() === swapData.targetStaffId &&
                                  s.status === "scheduled"
                              )
                              .map((schedule) => (
                                <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                  {schedule.date} ({schedule.startTime} - {schedule.endTime})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Validation Results */}
                    {swapData.targetStaffId && swapData.targetShiftId && (() => {
                      const validation = validateShiftSwap(
                        swapData.requestingShiftId,
                        swapData.targetStaffId,
                        swapData.targetShiftId,
                        swapData.swapType
                      );
                      return (
                        <div className="space-y-2">
                          {validation.errors.length > 0 && (
                            <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm text-red-900 dark:text-red-200">
                                      Validation Errors
                                    </p>
                                    <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                                      {validation.errors.map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {validation.warnings.length > 0 && (
                            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm text-yellow-900 dark:text-yellow-200">
                                      Warnings
                                    </p>
                                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                                      {validation.warnings.map((warning, idx) => (
                                        <li key={idx}>{warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {validation.isValid && validation.warnings.length === 0 && (
                            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                              <CardContent className="pt-4">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  <p className="text-sm text-green-900 dark:text-green-200 font-medium">
                                    Swap is valid and ready to submit
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Step 4: Open to Anyone - Show Qualified Staff */}
                {swapData.swapType === "anyone" && (() => {
                  const qualifiedStaff = getQualifiedStaffForSwap(swapData.requestingShiftId);
                  return (
                    <div className="space-y-2">
                      <Label>Qualified Staff Available</Label>
                      <p className="text-sm text-muted-foreground">
                        Staff members who are qualified and available for this swap
                      </p>
                      {qualifiedStaff.length > 0 ? (
                        <div className="space-y-2 mt-3 max-h-64 overflow-y-auto">
                          {qualifiedStaff.map((staff) => (
                            <Card
                              key={staff.id}
                              className={`${
                                staff.wouldExceedOvertime
                                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                                  : staff.roleMatch
                                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                    : ""
                              }`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback>
                                        {staff.name.split(" ").map((n) => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{staff.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {staff.role} {!staff.roleMatch && <Badge variant="outline" className="ml-1 text-xs">Cross-role</Badge>}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p className="text-muted-foreground">
                                      Available: {staff.availability}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Weekly hours: {staff.weeklyHours.toFixed(1)}h
                                    </p>
                                    {staff.wouldExceedOvertime && (
                                      <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-600">
                                        Would exceed overtime
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card className="bg-muted/50">
                          <CardContent className="py-8 text-center">
                            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No qualified staff found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              All available staff are already scheduled or unavailable
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}

                {/* Step 5: Reason */}
                <div className="space-y-2">
                  <Label htmlFor="swapReason">Reason for Swap *</Label>
                  <Textarea
                    id="swapReason"
                    placeholder="Why do you need to swap this shift?"
                    value={swapData.reason}
                    onChange={(e) => setSwapData({ ...swapData, reason: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSwapModalOpen(false);
                setSwapData({
                  requestingShiftId: "",
                  swapType: "specific",
                  targetStaffId: "",
                  targetShiftId: "",
                  reason: "",
                });
                setSwapValidationErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!swapData.requestingShiftId) {
                  toast.error("Please select your shift");
                  return;
                }

                if (swapData.swapType === "specific") {
                  if (!swapData.targetStaffId || !swapData.targetShiftId) {
                    toast.error("Please select a coworker and their shift");
                    return;
                  }

                  const validation = validateShiftSwap(
                    swapData.requestingShiftId,
                    swapData.targetStaffId,
                    swapData.targetShiftId,
                    swapData.swapType
                  );

                  if (!validation.isValid) {
                    setSwapValidationErrors(validation.errors);
                    toast.error("Please fix validation errors before submitting");
                    return;
                  }
                }

                if (!swapData.reason.trim()) {
                  toast.error("Please provide a reason for the swap");
                  return;
                }

                // TODO: Submit swap request to backend
                const requestingShift = facilitySchedules.find(
                  (s) => s.id.toString() === swapData.requestingShiftId
                );

                toast.success("Shift swap request submitted", {
                  description: swapData.swapType === "specific"
                    ? `Request sent to ${facilityStaff.find(s => s.id.toString() === swapData.targetStaffId)?.name}. Awaiting approval.`
                    : "Request posted. Qualified staff can respond.",
                });

                setIsSwapModalOpen(false);
                setSwapData({
                  requestingShiftId: "",
                  swapType: "specific",
                  targetStaffId: "",
                  targetShiftId: "",
                  reason: "",
                });
                setSwapValidationErrors([]);
              }}
              disabled={
                !swapData.requestingShiftId ||
                !swapData.reason.trim() ||
                (swapData.swapType === "specific" && (!swapData.targetStaffId || !swapData.targetShiftId))
              }
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Swap Approval Modal (for managers) */}
      <Dialog open={isSwapApprovalModalOpen} onOpenChange={setIsSwapApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {swapApprovalAction === "approve" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {swapApprovalAction === "deny" && <XCircle className="h-5 w-5 text-red-600" />}
              Review Shift Swap Request
            </DialogTitle>
            {selectedSwapRequest && (
              <DialogDescription>
                {swapApprovalAction === "approve" && "Approve this shift swap request"}
                {swapApprovalAction === "deny" && "Deny this shift swap request"}
                {" "}from {selectedSwapRequest.requestingStaffName}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedSwapRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Requesting Staff</p>
                  <p className="font-medium">{selectedSwapRequest.requestingStaffName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSwapRequest.requestingShiftDate} ({selectedSwapRequest.requestingShiftTime})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedSwapRequest.targetStaffName ? "Target Staff" : "Open Request"}
                  </p>
                  {selectedSwapRequest.targetStaffName ? (
                    <>
                      <p className="font-medium">{selectedSwapRequest.targetStaffName}</p>
                      {selectedSwapRequest.targetShiftDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedSwapRequest.targetShiftDate} ({selectedSwapRequest.targetShiftTime})
                        </p>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline">Open to anyone qualified</Badge>
                  )}
                </div>
                {selectedSwapRequest.reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedSwapRequest.reason}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="approvalNotes">
                  Notes {swapApprovalAction === "deny" ? "(Required)" : "(Optional)"}
                </Label>
                <Textarea
                  id="approvalNotes"
                  placeholder={
                    swapApprovalAction === "deny"
                      ? "Please provide a reason for denial..."
                      : "Add any notes about this decision..."
                  }
                  value={swapApprovalNotes}
                  onChange={(e) => setSwapApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSwapApprovalModalOpen(false);
                setSwapApprovalNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (swapApprovalAction === "deny" && !swapApprovalNotes.trim()) {
                  toast.error("Please provide a reason for denial");
                  return;
                }

                // TODO: Update swap request status in backend
                // TODO: If approved, update schedules automatically
                if (swapApprovalAction === "approve" && selectedSwapRequest) {
                  // Update schedules
                  // TODO: Implement schedule update logic
                  toast.success("Shift swap approved", {
                    description: "Schedules have been updated automatically",
                  });
                } else {
                  toast.success("Shift swap denied");
                }

                setIsSwapApprovalModalOpen(false);
                setSwapApprovalNotes("");
              }}
              variant={swapApprovalAction === "deny" ? "destructive" : "default"}
              disabled={swapApprovalAction === "deny" && !swapApprovalNotes.trim()}
            >
              {swapApprovalAction === "approve" && "Approve Swap"}
              {swapApprovalAction === "deny" && "Deny Request"}
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

                  {getAvailableStaffForCoverage(selectedSickCallIn).length > 0 ? (
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
                {getAvailableStaffForCoverage(selectedSickCallIn).length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">
                      Coverage Options
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-4 gap-4 min-w-[800px]">
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

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[300px]">Task</TableHead>
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

      {/* Time Off Request Modal */}
      <Dialog
        open={isTimeOffRequestModalOpen}
        onOpenChange={setIsTimeOffRequestModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Request Time Off
            </DialogTitle>
            <DialogDescription>
              Submit a time off request for manager approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="timeOffType">Type of Time Off *</Label>
              <Select
                value={timeOffRequestData.type}
                onValueChange={(value) =>
                  setTimeOffRequestData({ ...timeOffRequestData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {getTimeOffReasons()
                    .filter((r) => r.isActive)
                    .map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeOffStartDate">Start Date *</Label>
                <Input
                  id="timeOffStartDate"
                  type="date"
                  value={timeOffRequestData.startDate}
                  onChange={(e) =>
                    setTimeOffRequestData({
                      ...timeOffRequestData,
                      startDate: e.target.value,
                    })
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeOffEndDate">End Date *</Label>
                <Input
                  id="timeOffEndDate"
                  type="date"
                  value={timeOffRequestData.endDate}
                  onChange={(e) =>
                    setTimeOffRequestData({
                      ...timeOffRequestData,
                      endDate: e.target.value,
                    })
                  }
                  min={timeOffRequestData.startDate || new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeOffReason">Additional Details (Optional)</Label>
              <Textarea
                id="timeOffReason"
                placeholder="Provide any additional details about your time off request..."
                value={timeOffRequestData.reason}
                onChange={(e) =>
                  setTimeOffRequestData({
                    ...timeOffRequestData,
                    reason: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTimeOffRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Submit to backend
                toast.success("Time off request submitted successfully");
                setIsTimeOffRequestModalOpen(false);
                setTimeOffRequestData({
                  type: "",
                  startDate: "",
                  endDate: "",
                  reason: "",
                });
              }}
              disabled={
                !timeOffRequestData.type ||
                !timeOffRequestData.startDate ||
                !timeOffRequestData.endDate
              }
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Off Review Modal (Manager) */}
      <Dialog
        open={isTimeOffReviewModalOpen}
        onOpenChange={setIsTimeOffReviewModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === "approve" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {reviewAction === "deny" && <XCircle className="h-5 w-5 text-red-600" />}
              {reviewAction === "request_changes" && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
              Review Time Off Request
            </DialogTitle>
            {selectedTimeOffRequest && (
              <DialogDescription>
                {reviewAction === "approve" && "Approve this time off request"}
                {reviewAction === "deny" && "Deny this time off request"}
                {reviewAction === "request_changes" && "Request changes to this time off request"}
                {" "}for {selectedTimeOffRequest.staffName}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedTimeOffRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {selectedTimeOffRequest.customTypeName ||
                      defaultTimeOffReasons.find((r) => r.id === selectedTimeOffRequest.type)
                        ?.name ||
                      selectedTimeOffRequest.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date Range</p>
                  <p className="font-medium">
                    {selectedTimeOffRequest.startDate === selectedTimeOffRequest.endDate
                      ? selectedTimeOffRequest.startDate
                      : `${selectedTimeOffRequest.startDate} - ${selectedTimeOffRequest.endDate}`}
                  </p>
                </div>
                {selectedTimeOffRequest.reason && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedTimeOffRequest.reason}</p>
                  </div>
                )}
              </div>

              {reviewAction === "approve" && checkCoverageGaps(selectedTimeOffRequest) && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-yellow-900 dark:text-yellow-200">
                        Coverage Gap Detected
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        This staff member has scheduled shifts during this time off period.
                        A coverage alert will be automatically triggered upon approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {reviewAction === "request_changes" ? (
                <div className="space-y-2">
                  <Label htmlFor="requestedChanges">Requested Changes *</Label>
                  <Textarea
                    id="requestedChanges"
                    placeholder="Specify what changes you'd like the staff member to make..."
                    value={requestedChanges}
                    onChange={(e) => setRequestedChanges(e.target.value)}
                    rows={4}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">
                    Notes {reviewAction === "deny" ? "(Required)" : "(Optional)"}
                  </Label>
                  <Textarea
                    id="reviewNotes"
                    placeholder={
                      reviewAction === "deny"
                        ? "Please provide a reason for denial..."
                        : "Add any notes about this decision..."
                    }
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTimeOffReviewModalOpen(false);
                setReviewNotes("");
                setRequestedChanges("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Save review to backend
                if (reviewAction === "approve") {
                  toast.success("Time off request approved", {
                    description: checkCoverageGaps(selectedTimeOffRequest!)
                      ? "Coverage alert has been triggered."
                      : undefined,
                  });
                } else if (reviewAction === "deny") {
                  toast.success("Time off request denied");
                } else {
                  toast.success("Changes requested");
                }
                setIsTimeOffReviewModalOpen(false);
                setReviewNotes("");
                setRequestedChanges("");
              }}
              variant={
                reviewAction === "deny" ? "destructive" : reviewAction === "request_changes" ? "secondary" : "default"
              }
              disabled={
                (reviewAction === "deny" || reviewAction === "request_changes") &&
                !reviewNotes &&
                !requestedChanges
              }
            >
              {reviewAction === "approve" && "Approve Request"}
              {reviewAction === "deny" && "Deny Request"}
              {reviewAction === "request_changes" && "Request Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}