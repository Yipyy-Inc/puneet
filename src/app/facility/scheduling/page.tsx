"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { schedules } from "@/data/schedules";
import { users } from "@/data/users";
import { facilities } from "@/data/facilities";
import { GenericCalendar } from "@/components/calendar";
import type { CalendarItem, CalendarRowData } from "@/components/calendar";

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
import { StatusBadge } from "@/components/StatusBadge";
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
} from "lucide-react";

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
  const t = useTranslations("scheduling");
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
  });

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
            onClick={() => exportSchedulesToCSV(facilitySchedules)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("todayShifts")}
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
              {t("upcomingShifts")}
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
              calendarView === "week" ? "Weekly Schedule" : "Monthly Calendar",
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
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
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
              <Label htmlFor="staffId">Staff Member *</Label>
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
                      {staff.name} - {staff.role}
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {deletingSchedule?.staffName} on {deletingSchedule?.date}? This
              action cannot be undone.
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
    </div>
  );
}
