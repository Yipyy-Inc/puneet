"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  MapPin,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  type TrainingCourseType,
  defaultTrainingCourseTypes,
} from "@/lib/training-config";
import { trainers } from "@/data/training";
import {
  type TrainingSeries,
  type EnrollmentRules,
  calculateSessionDates,
  generateSeriesSessions,
  getDayName,
  type SeriesStatus,
} from "@/lib/training-series";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Date formatting helper
const formatDate = (date: Date | string, format: "short" | "long" = "short"): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "long") {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
import { cn } from "@/lib/utils";

// Mock locations
const TRAINING_LOCATIONS = [
  "Training Room A",
  "Training Room B",
  "Outdoor Training Area",
  "Indoor Arena",
  "Agility Course",
];

export default function TrainingSeriesPage() {
  const [series, setSeries] = useState<TrainingSeries[]>([]);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<TrainingSeries | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSeriesId, setDeletingSeriesId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    courseTypeId: "",
    seriesName: "",
    startDate: "",
    dayOfWeek: 1, // Monday
    startTime: "10:00",
    duration: 60, // minutes
    location: "",
    instructorId: "",
    maxCapacity: 8,
    numberOfWeeks: 6,
    bookingOpensDate: "",
    bookingClosesDate: "",
    depositRequired: 50,
    fullPaymentAmount: 300,
    waitlistEnabled: true,
    allowDropIns: false,
  });

  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [bookingOpensPickerOpen, setBookingOpensPickerOpen] = useState(false);
  const [bookingClosesPickerOpen, setBookingClosesPickerOpen] = useState(false);

  // Get selected course type
  const selectedCourseType = useMemo(() => {
    return defaultTrainingCourseTypes.find(
      (ct) => ct.id === formData.courseTypeId
    );
  }, [formData.courseTypeId]);

  // Calculate end time
  const endTime = useMemo(() => {
    if (!formData.startTime || !formData.duration) return "";
    const [hours, minutes] = formData.startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + formData.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  }, [formData.startTime, formData.duration]);

  // Calculate session dates preview
  const sessionDatesPreview = useMemo(() => {
    if (!formData.startDate || !formData.numberOfWeeks) return [];
    return calculateSessionDates(
      formData.startDate,
      formData.dayOfWeek,
      formData.numberOfWeeks
    );
  }, [formData.startDate, formData.dayOfWeek, formData.numberOfWeeks]);

  // Auto-fill series name when course type is selected
  const handleCourseTypeChange = (courseTypeId: string) => {
    const courseType = defaultTrainingCourseTypes.find((ct) => ct.id === courseTypeId);
    if (courseType) {
      setFormData({
        ...formData,
        courseTypeId,
        numberOfWeeks: courseType.defaultWeeks,
        seriesName: `${courseType.name} - ${getDayName(formData.dayOfWeek)} ${new Date(formData.startDate || new Date()).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      });
    }
  };

  const handleAddNew = () => {
    setEditingSeries(null);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      courseTypeId: "",
      seriesName: "",
      startDate: "",
      dayOfWeek: 1,
      startTime: "10:00",
      duration: 60,
      location: "",
      instructorId: "",
      maxCapacity: 8,
      numberOfWeeks: 6,
      bookingOpensDate: today,
      bookingClosesDate: "",
      depositRequired: 50,
      fullPaymentAmount: 300,
      waitlistEnabled: true,
      allowDropIns: false,
    });
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (seriesItem: TrainingSeries) => {
    setEditingSeries(seriesItem);
    setFormData({
      courseTypeId: seriesItem.courseTypeId,
      seriesName: seriesItem.seriesName,
      startDate: seriesItem.startDate,
      dayOfWeek: seriesItem.dayOfWeek,
      startTime: seriesItem.startTime,
      duration: seriesItem.duration,
      location: seriesItem.location,
      instructorId: seriesItem.instructorId,
      maxCapacity: seriesItem.maxCapacity,
      numberOfWeeks: seriesItem.numberOfWeeks,
      bookingOpensDate: seriesItem.enrollmentRules.bookingOpensDate,
      bookingClosesDate: seriesItem.enrollmentRules.bookingClosesDate,
      depositRequired: seriesItem.enrollmentRules.depositRequired,
      fullPaymentAmount: seriesItem.enrollmentRules.fullPaymentAmount,
      waitlistEnabled: seriesItem.enrollmentRules.waitlistEnabled,
      allowDropIns: seriesItem.enrollmentRules.allowDropIns,
    });
    setIsAddEditModalOpen(true);
  };

  const handleDelete = (seriesId: string) => {
    setDeletingSeriesId(seriesId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingSeriesId) return;
    setSeries(series.filter((s) => s.id !== deletingSeriesId));
    toast.success("Series deleted successfully");
    setIsDeleteModalOpen(false);
    setDeletingSeriesId(null);
  };

  const handleSave = () => {
    if (
      !formData.courseTypeId ||
      !formData.seriesName ||
      !formData.startDate ||
      !formData.location ||
      !formData.instructorId ||
      !formData.bookingOpensDate ||
      !formData.bookingClosesDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const courseType = defaultTrainingCourseTypes.find(
      (ct) => ct.id === formData.courseTypeId
    );
    const instructor = trainers.find((t) => t.id === formData.instructorId);

    if (!courseType || !instructor) {
      toast.error("Invalid course type or instructor");
      return;
    }

    // Generate sessions
    const tempSeries: Omit<TrainingSeries, "sessions" | "id" | "createdAt" | "updatedAt"> = {
      courseTypeId: formData.courseTypeId,
      courseTypeName: courseType.name,
      seriesName: formData.seriesName,
      startDate: formData.startDate,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: endTime,
      duration: formData.duration,
      numberOfWeeks: formData.numberOfWeeks,
      location: formData.location,
      instructorId: formData.instructorId,
      instructorName: instructor.name,
      maxCapacity: formData.maxCapacity,
      enrollmentRules: {
        bookingOpensDate: formData.bookingOpensDate,
        bookingClosesDate: formData.bookingClosesDate,
        depositRequired: formData.depositRequired,
        fullPaymentAmount: formData.fullPaymentAmount,
        waitlistEnabled: formData.waitlistEnabled,
        allowDropIns: formData.allowDropIns,
      },
      status: "draft" as SeriesStatus,
    };

    const sessions = generateSeriesSessions(tempSeries);
    sessions.forEach((s) => {
      s.seriesId = editingSeries?.id || `series-${Date.now()}`;
    });

    const seriesData: TrainingSeries = {
      ...tempSeries,
      id: editingSeries?.id || `series-${Date.now()}`,
      sessions,
      createdAt: editingSeries?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSeries) {
      setSeries(series.map((s) => (s.id === editingSeries.id ? seriesData : s)));
      toast.success("Series updated successfully");
    } else {
      setSeries([...series, seriesData]);
      toast.success("Series created successfully");
    }

    setIsAddEditModalOpen(false);
    setEditingSeries(null);
  };

  const getStatusBadge = (status: SeriesStatus) => {
    const variants: Record<SeriesStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "outline", label: "Draft" },
      open: { variant: "default", label: "Open" },
      closed: { variant: "secondary", label: "Closed" },
      "in-progress": { variant: "default", label: "In Progress" },
      completed: { variant: "secondary", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant}>{config.label}</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Training Series</h2>
          <p className="text-muted-foreground">
            Create and manage scheduled training class series
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Series
        </Button>
      </div>

      {/* Series Table */}
      <Card>
        <CardHeader>
          <CardTitle>Series List</CardTitle>
          <CardDescription>
            All training series (scheduled occurrences of course types)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series Name</TableHead>
                <TableHead>Course Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No series created yet. Click "Create Series" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                series.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.seriesName}</TableCell>
                    <TableCell>{s.courseTypeName}</TableCell>
                    <TableCell>{formatDate(s.startDate)}</TableCell>
                    <TableCell>
                      {getDayName(s.dayOfWeek)} {s.startTime}
                    </TableCell>
                    <TableCell>{s.instructorName}</TableCell>
                    <TableCell>
                      {s.sessions.reduce((sum, sess) => sum + sess.enrolledCount, 0)} / {s.maxCapacity}
                    </TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(s)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? "Edit Series" : "Create New Series"}
            </DialogTitle>
            <DialogDescription>
              Create a scheduled occurrence of a course type with auto-generated sessions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Select Course Type */}
            <div className="space-y-2">
              <Label htmlFor="courseType">
                Course Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.courseTypeId}
                onValueChange={handleCourseTypeChange}
              >
                <SelectTrigger id="courseType">
                  <SelectValue placeholder="Select a course type..." />
                </SelectTrigger>
                <SelectContent>
                  {defaultTrainingCourseTypes
                    .filter((ct) => ct.isActive)
                    .map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedCourseType && (
                <p className="text-sm text-muted-foreground">
                  {selectedCourseType.description}
                </p>
              )}
            </div>

            {/* Step 2: Define Series Details */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Series Details</h3>

              <div className="space-y-2">
                <Label htmlFor="seriesName">
                  Series Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="seriesName"
                  value={formData.seriesName}
                  onChange={(e) =>
                    setFormData({ ...formData, seriesName: e.target.value })
                  }
                  placeholder="e.g., Basic Obedience - Saturday Morning February"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date <span className="text-destructive">*</span></Label>
                  <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.startDate ? (
                          formatDate(formData.startDate, "long")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.startDate ? new Date(formData.startDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData({
                              ...formData,
                              startDate: date.toISOString().split("T")[0],
                            });
                            setStartDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day of Week <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.dayOfWeek.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dayOfWeek: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {getDayName(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">
                    Start Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration (minutes) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value) || 60,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input value={endTime} disabled className="bg-muted" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfWeeks">
                    Number of Weeks <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="numberOfWeeks"
                    type="number"
                    min="1"
                    value={formData.numberOfWeeks}
                    onChange={(e) => {
                      const weeks = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, numberOfWeeks: weeks });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCapacity">
                    Max Capacity <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="maxCapacity"
                    type="number"
                    min="1"
                    value={formData.maxCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxCapacity: parseInt(e.target.value) || 8,
                      })
                    }
                  />
                </div>
              </div>

              {/* Session Dates Preview */}
              {sessionDatesPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Session Dates (Auto-calculated)</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">
                      {sessionDatesPreview.length} sessions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sessionDatesPreview.map((date, index) => (
                        <Badge key={date} variant="outline">
                          Session {index + 1}: {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) =>
                      setFormData({ ...formData, location: value })
                    }
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructor">
                    Instructor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.instructorId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, instructorId: value })
                    }
                  >
                    <SelectTrigger id="instructor">
                      <SelectValue placeholder="Select instructor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers
                        .filter((t) => t.status === "active")
                        .map((trainer) => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Step 3: Enrollment Rules */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Enrollment Rules</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Booking Opens <span className="text-destructive">*</span></Label>
                  <Popover open={bookingOpensPickerOpen} onOpenChange={setBookingOpensPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.bookingOpensDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.bookingOpensDate ? (
                          formatDate(formData.bookingOpensDate, "long")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.bookingOpensDate ? new Date(formData.bookingOpensDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData({
                              ...formData,
                              bookingOpensDate: date.toISOString().split("T")[0],
                            });
                            setBookingOpensPickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Booking Closes <span className="text-destructive">*</span></Label>
                  <Popover open={bookingClosesPickerOpen} onOpenChange={setBookingClosesPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.bookingClosesDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.bookingClosesDate ? (
                          formatDate(formData.bookingClosesDate, "long")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={formData.bookingClosesDate ? new Date(formData.bookingClosesDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData({
                              ...formData,
                              bookingClosesDate: date.toISOString().split("T")[0],
                            });
                            setBookingClosesPickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depositRequired">Deposit Required ($)</Label>
                  <Input
                    id="depositRequired"
                    type="number"
                    min="0"
                    step="5"
                    value={formData.depositRequired}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        depositRequired: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullPaymentAmount">Full Payment Amount ($)</Label>
                  <Input
                    id="fullPaymentAmount"
                    type="number"
                    min="0"
                    step="5"
                    value={formData.fullPaymentAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fullPaymentAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="waitlistEnabled">Waitlist Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to join waitlist when series is full
                    </p>
                  </div>
                  <Switch
                    id="waitlistEnabled"
                    checked={formData.waitlistEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, waitlistEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="allowDropIns">Allow Drop-Ins</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow single-session enrollments (not full series)
                    </p>
                  </div>
                  <Switch
                    id="allowDropIns"
                    checked={formData.allowDropIns}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowDropIns: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddEditModalOpen(false);
                setEditingSeries(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSeries ? "Update Series" : "Create Series"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Series</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this series? This will also delete all associated sessions.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingSeriesId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
