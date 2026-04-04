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
import { Clock, MapPin, Users, CalendarDays } from "lucide-react";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useSettings } from "@/hooks/use-settings";
import type { CustomServiceModule } from "@/types/facility";
import type { Pet } from "@/types/pet";
import { resolveIcon, isBuiltinService } from "@/lib/service-registry";
import { SERVICE_CATEGORIES } from "../constants";

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
  const serviceModule = getModuleBySlug(serviceId);

  // For built-in services (grooming, training, etc.) that don't have a
  // custom module, show a basic scheduling form instead of "not found."
  if (!serviceModule) {
    if (isBuiltinService(serviceId) && currentSubStep === 0) {
      return (
        <BuiltinServiceSchedule
          serviceId={serviceId}
          startDate={startDate}
          setStartDate={setStartDate}
          checkInTime={checkInTime}
          setCheckInTime={setCheckInTime}
          checkOutTime={checkOutTime}
          setCheckOutTime={setCheckOutTime}
        />
      );
    }
    return (
      <div className="text-muted-foreground py-8 text-center">
        Service configuration not found.
      </div>
    );
  }

  const Icon = resolveIcon(serviceModule.icon);

  if (currentSubStep === 0) {
    return (
      <ScheduleStep
        serviceModule={serviceModule}
        startDate={startDate}
        setStartDate={setStartDate}
        checkInTime={checkInTime}
        setCheckInTime={setCheckInTime}
        checkOutTime={checkOutTime}
        setCheckOutTime={setCheckOutTime}
        selectedPets={selectedPets}
        Icon={Icon}
      />
    );
  }

  return null;
}

// ========================================
// SCHEDULE SUB-STEP
// ========================================

function ScheduleStep({
  serviceModule,
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
  selectedPets,
  Icon,
}: {
  serviceModule: CustomServiceModule;
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
    serviceModule.calendar.durationOptions[0]?.minutes.toString() ?? "60",
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
      <Card className="bg-muted/50 border-none">
        <CardContent className="flex items-center gap-3 py-3">
          <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
            <Icon className="text-primary size-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{serviceModule.name}</p>
            <p className="text-muted-foreground text-xs">
              {serviceModule.description}
            </p>
          </div>
          {selectedPets.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Users className="size-3" />
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
          {serviceModule.calendar.durationMode === "variable" &&
            serviceModule.calendar.durationOptions.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Duration</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {serviceModule.calendar.durationOptions.map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() =>
                        handleDurationChange(opt.minutes.toString())
                      }
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
                        selectedDuration === opt.minutes.toString()
                          ? "border-primary bg-primary/5 text-primary"
                          : `border-border hover:border-primary/50`
                      } `}
                    >
                      <Clock className="size-4" />
                      <span className="font-medium">{opt.label}</span>
                      {opt.price !== undefined && (
                        <span className="text-muted-foreground text-xs">
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
              <Select
                value={checkInTime}
                onValueChange={(val) => {
                  setCheckInTime(val);
                  setCheckOutTime(
                    calcCheckoutTime(val, parseInt(selectedDuration)),
                  );
                }}
              >
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
          {serviceModule.category === "transport" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="size-4" />
                Pickup Address
              </Label>
              <Textarea placeholder="Enter pickup address..." rows={2} />
            </div>
          )}

          {/* Event-specific: participant count */}
          {serviceModule.category === "event_based" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="size-4" />
                Number of Pets Attending
              </Label>
              <Input
                type="number"
                min={1}
                max={serviceModule.onlineBooking.maxDogsPerSession}
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
                  {new Date(startDate + "T12:00:00").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {checkInTime} — {checkOutTime}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="text-primary font-medium">
                  ${serviceModule.pricing.basePrice}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ========================================
// BUILT-IN SERVICE SCHEDULE (grooming, training, etc.)
// ========================================

function BuiltinServiceSchedule({
  serviceId,
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  checkOutTime,
  setCheckOutTime,
}: {
  serviceId: string;
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
}) {
  const { hours, rules, serviceDateBlocks, scheduleTimeOverrides } =
    useSettings();

  const serviceInfo = SERVICE_CATEGORIES.find((s) => s.id === serviceId);
  const ServiceIcon = serviceInfo?.icon ?? CalendarDays;

  const scheduleOverrides = React.useMemo(
    () =>
      scheduleTimeOverrides.filter(
        (o) => !o.services?.length || o.services.includes(serviceId),
      ),
    [scheduleTimeOverrides, serviceId],
  );

  const { blockedDates, blockedMessages } = React.useMemo(() => {
    const blocks = serviceDateBlocks.filter(
      (b) => b.closed && b.services.includes(serviceId),
    );
    const dates = blocks.map((b) => {
      const [y, m, d] = b.date.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
    const messages: Record<string, string> = {};
    blocks.forEach(
      (b) => b.closureMessage && (messages[b.date] = b.closureMessage),
    );
    return { blockedDates: dates, blockedMessages: messages };
  }, [serviceDateBlocks, serviceId]);

  const selectedDates = React.useMemo(() => {
    if (!startDate) return [];
    const [y, m, d] = startDate.split("-").map(Number);
    return [new Date(y, m - 1, d)];
  }, [startDate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <ServiceIcon className="text-primary size-5" />
        </div>
        <div>
          <h3 className="font-semibold">
            Schedule {serviceInfo?.name ?? "Service"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {serviceInfo?.description ??
              "Choose a date and time for your appointment."}
          </p>
        </div>
      </div>

      {/* Two-column: Calendar + Time */}
      <div className="flex gap-5">
        {/* Calendar */}
        <div className="min-w-[280px] flex-1">
          <div className="mb-2 flex items-center gap-1.5">
            <CalendarDays className="text-muted-foreground size-3.5" />
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Pick a date
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <DateSelectionCalendar
              mode="single"
              selectedDates={selectedDates}
              onSelectionChange={(dates) => {
                if (dates.length > 0) {
                  setStartDate(formatDateString(dates[0]));
                } else {
                  setStartDate("");
                }
              }}
              showTimeSelection={false}
              dateTimes={[]}
              facilityHours={hours}
              scheduleTimeOverrides={scheduleOverrides}
              bookingRules={{
                minimumAdvanceBooking: rules.minimumAdvanceBooking,
                maximumAdvanceBooking: rules.maximumAdvanceBooking,
              }}
              disabledDates={blockedDates}
              disabledDateMessages={blockedMessages}
            />
          </div>
        </div>

        {/* Time selectors */}
        <div className="flex w-56 shrink-0 flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="text-muted-foreground size-3.5" />
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Time
            </p>
          </div>

          {!startDate ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground px-6 py-12 text-center text-xs leading-relaxed">
                Select a date to set the time
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Start time</Label>
                <Select value={checkInTime} onValueChange={setCheckInTime}>
                  <SelectTrigger className="h-9 text-sm">
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
              <div className="space-y-1.5">
                <Label className="text-[11px]">End time</Label>
                <Select value={checkOutTime} onValueChange={setCheckOutTime}>
                  <SelectTrigger className="h-9 text-sm">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
