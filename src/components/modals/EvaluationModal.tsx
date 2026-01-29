import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
}

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const evaluatorOptions = [
  { value: "Mike Chen", label: "Mike Chen" },
  { value: "Emily Davis", label: "Emily Davis" },
  { value: "David Wilson", label: "David Wilson" },
  { value: "Lisa Rodriguez", label: "Lisa Rodriguez" },
  { value: "Tom Anderson", label: "Tom Anderson" },
  { value: "Manager One", label: "Manager One" },
  { value: "Admin User", label: "Admin User" },
];

export function EvaluationModal({ isOpen, onClose, bookingId }: EvaluationModalProps) {
  const [evaluator, setEvaluator] = useState("");
  const [startDate, setStartDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { hours, rules, evaluation } = useSettings();
  const durationOptions = evaluation.schedule.durationOptionsMinutes;
  const defaultDuration =
    evaluation.schedule.defaultDurationMinutes ?? durationOptions[0] ?? 60;
  const [selectedDuration, setSelectedDuration] = useState<number>(
    defaultDuration,
  );

  const selectedDates = useMemo(() => {
    if (!startDate) return [];
    const [year, month, day] = startDate.split("-").map(Number);
    return [new Date(year, month - 1, day)];
  }, [startDate]);

  const dateTimes = useMemo(() => {
    return [];
  }, []);

  const handleSelectionChange = (dates: Date[]) => {
    if (dates.length > 0) {
      const dateStr = formatDateString(dates[0]);
      setStartDate(dateStr);
      setSelectedSlot(null);
      setCheckInTime("");
      setCheckOutTime("");
    } else {
      setStartDate("");
      setSelectedSlot(null);
      setCheckInTime("");
      setCheckOutTime("");
    }
  };

  const timeToMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const timeWindows =
    evaluation.schedule.timeWindows.length > 0
      ? evaluation.schedule.timeWindows
      : [{ id: "all-day", label: "All day", startTime: "00:00", endTime: "23:59" }];

  const slots = useMemo(() => {
    const duration = selectedDuration || defaultDuration;
    const windows = timeWindows;
    if (evaluation.schedule.slotMode === "fixed") {
      return evaluation.schedule.fixedStartTimes
        .map((startTime) => {
          const start = timeToMinutes(startTime);
          const end = start + duration;
          const withinWindow = windows.some(
            (w) =>
              start >= timeToMinutes(w.startTime) &&
              end <= timeToMinutes(w.endTime),
          );
          if (!withinWindow) return null;
          return {
            startTime,
            endTime: minutesToTime(end),
            duration,
          };
        })
        .filter(Boolean) as Array<{ startTime: string; endTime: string; duration: number }>;
    }

    const generated: Array<{ startTime: string; endTime: string; duration: number }> = [];
    windows.forEach((window) => {
      const start = timeToMinutes(window.startTime);
      const end = timeToMinutes(window.endTime);
      let current = start;
      while (current + duration <= end) {
        generated.push({
          startTime: minutesToTime(current),
          endTime: minutesToTime(current + duration),
          duration,
        });
        current += duration;
      }
    });
    return generated;
  }, [evaluation.schedule, selectedDuration, defaultDuration, timeWindows]);

  const handleSlotSelect = (slotStartTime: string) => {
    const slot = slots.find((s) => s.startTime === slotStartTime);
    if (!slot) return;
    setSelectedSlot(slotStartTime);
    setCheckInTime(slot.startTime);
    setCheckOutTime(slot.endTime);
  };

  const handleSave = () => {
    // TODO: call API to save evaluation
    console.log({
      bookingId,
      evaluator,
      startDate,
      checkInTime,
      checkOutTime,
      status: "pending",
    });
    onClose();
  };

  return (
    <Modal
      type="form"
      title="Add Evaluation"
      open={isOpen}
      onOpenChange={onClose}
      size="md"
    >
      <div className="p-6 space-y-4 max-w-md mx-auto">
        <div>
          <Label className="text-base">Select Evaluation Date</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Choose a date for this evaluation.
          </p>
          <DateSelectionCalendar
            mode="single"
            selectedDates={selectedDates}
            onSelectionChange={handleSelectionChange}
            showTimeSelection={false}
            dateTimes={dateTimes}
            facilityHours={hours}
            bookingRules={{
              minimumAdvanceBooking: rules.minimumAdvanceBooking,
              maximumAdvanceBooking: rules.maximumAdvanceBooking,
            }}
          />
        </div>

        {startDate && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {durationOptions.length > 1 && (
                  <div className="grid gap-2">
                    <Label className="text-sm">Duration</Label>
                    <Select
                      value={String(selectedDuration)}
                      onValueChange={(value) => {
                        const next = Number(value);
                        setSelectedDuration(next);
                        setSelectedSlot(null);
                        setCheckInTime("");
                        setCheckOutTime("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((opt) => (
                          <SelectItem key={opt} value={String(opt)}>
                            {opt / 60}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base">
                    Select Available Time Slot
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose from the available evaluation time slots below
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.startTime;
                    return (
                      <Button
                        key={slot.startTime}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className="h-auto p-3 flex flex-col items-center gap-2"
                        onClick={() => handleSlotSelect(slot.startTime)}
                      >
                        <span className="font-medium text-sm">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <Badge
                          variant={isSelected ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {slot.duration} min
                        </Badge>
                      </Button>
                    );
                  })}
                </div>

                {slots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No time slots available for evaluation.
                  </p>
                )}

                {selectedSlot && (
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary">
                      Selected:{" "}
                      {
                        slots.find(
                          (s) => s.startTime === selectedSlot,
                        )?.startTime
                      }{" "}
                      -{" "}
                      {
                        slots.find(
                          (s) => s.startTime === selectedSlot,
                        )?.endTime
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Assign Evaluator</label>
          <Select value={evaluator} onValueChange={setEvaluator}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {evaluatorOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={
              !evaluator ||
              !startDate ||
              !checkInTime ||
              !checkOutTime
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
