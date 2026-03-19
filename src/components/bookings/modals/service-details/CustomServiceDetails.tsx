"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MapPin, Users } from "lucide-react";
import { useCustomServices } from "@/hooks/use-custom-services";
import type { CustomServiceModule, Pet } from "@/lib/types";
import { resolveIcon } from "@/lib/service-registry";

// Module-level constants
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function calcCheckoutTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface CustomServiceDetailsProps {
  serviceId: string;
  currentSubStep: number;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  selectedPets: Pet[];
  specialRequests?: string;
  setSpecialRequests?: (value: string) => void;
}

export function CustomServiceDetails({
  serviceId,
  currentSubStep,
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  selectedPets,
}: CustomServiceDetailsProps) {
  const { getModuleBySlug } = useCustomServices();
  const module = getModuleBySlug(serviceId);

  if (!module) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Service configuration not found.
      </div>
    );
  }

  const Icon = resolveIcon(module.icon);

  if (currentSubStep === 0) {
    return <ScheduleStep module={module} startDate={startDate} setStartDate={setStartDate} checkInTime={checkInTime} setCheckInTime={setCheckInTime} checkOutTime={checkOutTime} setCheckOutTime={setCheckOutTime} selectedPets={selectedPets} Icon={Icon} />;
  }

  return null;
}

// ========================================
// SCHEDULE SUB-STEP
// ========================================

function ScheduleStep({
  module,
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  selectedPets,
  Icon,
}: {
  module: CustomServiceModule;
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  selectedPets: Pet[];
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const [selectedDuration, setSelectedDuration] = React.useState<string>(
    module.calendar.durationOptions[0]?.minutes.toString() ?? "60",
  );

  const handleDateSelect = (date: Date) => {
    setStartDate(formatDateString(date));
  };

  const handleDurationChange = (minutes: string) => {
    setSelectedDuration(minutes);
    if (checkInTime) {
      setCheckOutTime(calcCheckoutTime(checkInTime, parseInt(minutes)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Service info banner */}
      <Card className="border-none bg-muted/50">
        <CardContent className="flex items-center gap-3 py-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{module.name}</p>
            <p className="text-xs text-muted-foreground">{module.description}</p>
          </div>
          {selectedPets.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {selectedPets.length} pet{selectedPets.length > 1 ? "s" : ""}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Date selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select Date</Label>
        <DateSelectionCalendar
          mode="single"
          selectedDates={startDate ? [new Date(startDate + "T12:00:00")] : []}
          onSelectionChange={(dates) => {
            if (dates.length > 0) handleDateSelect(dates[0]);
          }}
        />
      </div>

      {startDate && (
        <div className="space-y-4">
          {/* Duration selection (if variable) */}
          {module.calendar.durationMode === "variable" &&
            module.calendar.durationOptions.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Duration</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {module.calendar.durationOptions.map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() =>
                        handleDurationChange(opt.minutes.toString())
                      }
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
                        selectedDuration === opt.minutes.toString()
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{opt.label}</span>
                      {opt.price !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          ${opt.price}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Time selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Time</Label>
              <Select value={checkInTime} onValueChange={(val) => {
                setCheckInTime(val);
                setCheckOutTime(calcCheckoutTime(val, parseInt(selectedDuration)));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Time</Label>
              <Input value={checkOutTime} disabled className="bg-muted" />
            </div>
          </div>

          {/* Transport-specific: address input */}
          {module.category === "transport" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pickup Address
              </Label>
              <Textarea
                placeholder="Enter pickup address..."
                rows={2}
              />
            </div>
          )}

          {/* Event-specific: participant count */}
          {module.category === "event_based" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Number of Pets Attending
              </Label>
              <Input
                type="number"
                min={1}
                max={module.onlineBooking.maxDogsPerSession}
                defaultValue={selectedPets.length}
              />
            </div>
          )}

          {/* Summary */}
          <Card className="border-dashed">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {new Date(startDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {checkInTime} — {checkOutTime}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium text-primary">
                  ${module.pricing.basePrice}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
