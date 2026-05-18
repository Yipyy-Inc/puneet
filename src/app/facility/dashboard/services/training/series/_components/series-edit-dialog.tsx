"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { toast } from "sonner";
import { defaultTrainingCourseTypes } from "@/lib/training-config";
import { trainers } from "@/data/training";
import {
  calculateSessionDates,
  generateSeriesSessions,
  getDayName,
  type TrainingSeries,
} from "@/lib/training-series";

const TRAINING_LOCATIONS = [
  "Training Room A",
  "Training Room B",
  "Outdoor Training Area",
  "Indoor Arena",
  "Agility Course",
];

interface FormState {
  courseTypeId: string;
  seriesName: string;
  startDate: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  location: string;
  instructorId: string;
  maxCapacity: number;
  numberOfWeeks: number;
  bookingOpensDate: string;
  bookingClosesDate: string;
  depositRequired: number;
  fullPaymentAmount: number;
  waitlistEnabled: boolean;
  allowDropIns: boolean;
}

function emptyForm(): FormState {
  const today = new Date().toISOString().split("T")[0];
  return {
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
  };
}

function seedFromSeries(series: TrainingSeries): FormState {
  return {
    courseTypeId: series.courseTypeId,
    seriesName: series.seriesName,
    startDate: series.startDate,
    dayOfWeek: series.dayOfWeek,
    startTime: series.startTime,
    duration: series.duration,
    location: series.location,
    instructorId: series.instructorId,
    maxCapacity: series.maxCapacity,
    numberOfWeeks: series.numberOfWeeks,
    bookingOpensDate: series.enrollmentRules.bookingOpensDate,
    bookingClosesDate: series.enrollmentRules.bookingClosesDate,
    depositRequired: series.enrollmentRules.depositRequired,
    fullPaymentAmount: series.enrollmentRules.fullPaymentAmount,
    waitlistEnabled: series.enrollmentRules.waitlistEnabled,
    allowDropIns: series.enrollmentRules.allowDropIns,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** When non-null, the dialog opens in edit mode pre-filled from this series. */
  editing: TrainingSeries | null;
  onSave: (series: TrainingSeries) => void;
}

export function SeriesEditDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: Props) {
  const [form, setForm] = useState<FormState>(() => emptyForm());

  // Re-sync the form whenever the dialog opens with a new "editing" target.
  useEffect(() => {
    if (!open) return;
    setForm(editing ? seedFromSeries(editing) : emptyForm());
  }, [open, editing]);

  const selectedCourseType = useMemo(
    () =>
      defaultTrainingCourseTypes.find((ct) => ct.id === form.courseTypeId),
    [form.courseTypeId],
  );

  const endTime = useMemo(() => {
    if (!form.startTime || !form.duration) return "";
    const [h, m] = form.startTime.split(":").map(Number);
    const total = h * 60 + m + form.duration;
    const eh = Math.floor(total / 60);
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  }, [form.startTime, form.duration]);

  const sessionDatesPreview = useMemo(() => {
    if (!form.startDate || !form.numberOfWeeks) return [];
    return calculateSessionDates(
      form.startDate,
      form.dayOfWeek,
      form.numberOfWeeks,
    );
  }, [form.startDate, form.dayOfWeek, form.numberOfWeeks]);

  function handleCourseTypeChange(courseTypeId: string) {
    const ct = defaultTrainingCourseTypes.find((c) => c.id === courseTypeId);
    if (!ct) {
      setForm({ ...form, courseTypeId });
      return;
    }
    setForm({
      ...form,
      courseTypeId,
      numberOfWeeks: ct.defaultWeeks,
      seriesName:
        form.seriesName ||
        `${ct.name} — ${getDayName(form.dayOfWeek)} ${new Date(
          form.startDate || new Date(),
        ).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    });
  }

  function handleSave() {
    if (
      !form.courseTypeId ||
      !form.seriesName ||
      !form.startDate ||
      !form.location ||
      !form.instructorId ||
      !form.bookingOpensDate ||
      !form.bookingClosesDate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    const courseType = defaultTrainingCourseTypes.find(
      (c) => c.id === form.courseTypeId,
    );
    const instructor = trainers.find((t) => t.id === form.instructorId);
    if (!courseType || !instructor) {
      toast.error("Invalid course type or instructor");
      return;
    }

    const base: Omit<TrainingSeries, "sessions" | "id" | "createdAt" | "updatedAt"> = {
      courseTypeId: form.courseTypeId,
      courseTypeName: courseType.name,
      seriesName: form.seriesName,
      startDate: form.startDate,
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime,
      duration: form.duration,
      numberOfWeeks: form.numberOfWeeks,
      location: form.location,
      instructorId: form.instructorId,
      instructorName: instructor.name,
      maxCapacity: form.maxCapacity,
      enrollmentRules: {
        bookingOpensDate: form.bookingOpensDate,
        bookingClosesDate: form.bookingClosesDate,
        depositRequired: form.depositRequired,
        fullPaymentAmount: form.fullPaymentAmount,
        waitlistEnabled: form.waitlistEnabled,
        allowDropIns: form.allowDropIns,
      },
      status: editing?.status ?? "draft",
    };

    const id = editing?.id ?? `series-${Date.now()}`;
    const sessions = generateSeriesSessions(base).map((s) => ({
      ...s,
      seriesId: id,
    }));

    const next: TrainingSeries = {
      ...base,
      id,
      sessions,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(next);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Series" : "Create New Series"}
          </DialogTitle>
          <DialogDescription>
            Create a scheduled occurrence of a course type with auto-generated
            sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Course Type ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>
              Course Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.courseTypeId}
              onValueChange={handleCourseTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course type…" />
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
              <p className="text-muted-foreground text-sm">
                {selectedCourseType.description}
              </p>
            )}
          </div>

          {/* Details ───────────────────────────────────────────────────── */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Series Details</h3>

            <div className="space-y-2">
              <Label>
                Series Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.seriesName}
                onChange={(e) =>
                  setForm({ ...form, seriesName: e.target.value })
                }
                placeholder="e.g., Basic Obedience — Saturday Morning February"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={form.startDate}
                  onValueChange={(v) =>
                    setForm({ ...form, startDate: v ?? "" })
                  }
                  placeholder="Pick a date"
                  displayMode="dialog"
                  popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                  calendarClassName="p-1"
                  showQuickPresets={false}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Day of Week <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={String(form.dayOfWeek)}
                  onValueChange={(v) =>
                    setForm({ ...form, dayOfWeek: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {getDayName(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <TimePickerLux
                  value={form.startTime}
                  onValueChange={(v) => setForm({ ...form, startTime: v })}
                  displayMode="dialog"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Duration (minutes){" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({
                      ...form,
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
                <Label>
                  Number of Weeks{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={form.numberOfWeeks}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      numberOfWeeks: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Max Capacity <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxCapacity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxCapacity: parseInt(e.target.value) || 8,
                    })
                  }
                />
              </div>
            </div>

            {sessionDatesPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Session Dates (auto-calculated)</Label>
                <div className="bg-muted rounded-md p-3">
                  <p className="mb-2 text-sm font-medium">
                    {sessionDatesPreview.length} sessions:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sessionDatesPreview.map((date, i) => (
                      <Badge key={date} variant="outline">
                        Session {i + 1}:{" "}
                        {new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Location <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.location}
                  onValueChange={(v) => setForm({ ...form, location: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location…" />
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
                <Label>
                  Instructor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.instructorId}
                  onValueChange={(v) => setForm({ ...form, instructorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select instructor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers
                      .filter((t) => t.status === "active")
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Enrollment rules ──────────────────────────────────────────── */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Enrollment Rules</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Booking Opens <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={form.bookingOpensDate}
                  onValueChange={(v) =>
                    setForm({ ...form, bookingOpensDate: v ?? "" })
                  }
                  placeholder="Pick a date"
                  displayMode="dialog"
                  popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                  calendarClassName="p-1"
                  showQuickPresets={false}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Booking Closes <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={form.bookingClosesDate}
                  onValueChange={(v) =>
                    setForm({ ...form, bookingClosesDate: v ?? "" })
                  }
                  placeholder="Pick a date"
                  displayMode="dialog"
                  popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                  calendarClassName="p-1"
                  showQuickPresets={false}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deposit Required ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={form.depositRequired}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      depositRequired: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Full Payment Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={form.fullPaymentAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fullPaymentAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Waitlist Enabled</Label>
                  <p className="text-muted-foreground text-sm">
                    Allow clients to join waitlist when series is full.
                  </p>
                </div>
                <Switch
                  checked={form.waitlistEnabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, waitlistEnabled: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Allow Drop-Ins</Label>
                  <p className="text-muted-foreground text-sm">
                    Allow single-session enrollments (not full series).
                  </p>
                </div>
                <Switch
                  checked={form.allowDropIns}
                  onCheckedChange={(v) =>
                    setForm({ ...form, allowDropIns: v })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editing ? "Update Series" : "Create Series"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
