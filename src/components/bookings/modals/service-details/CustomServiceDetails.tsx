"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { CalendarDays } from "lucide-react";
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
  const { hours, rules, serviceDateBlocks, scheduleTimeOverrides, holidays } =
    useSettings();

  const [dateTimes, setDateTimes] = React.useState<
    Array<{ date: string; checkInTime: string; checkOutTime: string }>
  >(
    startDate && checkInTime
      ? [{ date: startDate, checkInTime, checkOutTime }]
      : [],
  );

  const scheduleOverrides = React.useMemo(
    () =>
      scheduleTimeOverrides.filter(
        (o) => !o.services?.length || o.services.includes(serviceModule.slug),
      ),
    [scheduleTimeOverrides, serviceModule.slug],
  );

  const { blockedDates, blockedMessages } = React.useMemo(() => {
    const blocks = serviceDateBlocks.filter(
      (b) => b.closed && b.services.includes(serviceModule.slug),
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
  }, [serviceDateBlocks, serviceModule.slug]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="text-primary size-5" />
        </div>
        <div>
          <h3 className="font-semibold">Schedule {serviceModule.name}</h3>
          <p className="text-muted-foreground text-sm">
            {serviceModule.description}
          </p>
        </div>
      </div>

      {/* Calendar with integrated time slider — same as boarding/daycare */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <DateSelectionCalendar
          mode="single"
          selectedDates={startDate ? [new Date(startDate + "T12:00:00")] : []}
          onSelectionChange={(dates) => {
            if (dates.length > 0) {
              setStartDate(formatDateString(dates[0]));
            } else {
              setStartDate("");
              setCheckInTime("");
              setCheckOutTime("");
            }
          }}
          showTimeSelection
          dateTimes={dateTimes}
          onDateTimesChange={(times) => {
            setDateTimes(times);
            if (times.length > 0) {
              setCheckInTime(times[0].checkInTime);
              setCheckOutTime(times[0].checkOutTime);
            }
          }}
          facilityHours={hours}
          scheduleTimeOverrides={scheduleOverrides}
          bookingRules={{
            minimumAdvanceBooking: rules.minimumAdvanceBooking,
            maximumAdvanceBooking: rules.maximumAdvanceBooking,
          }}
          disabledDates={blockedDates}
          disabledDateMessages={blockedMessages}
          holidays={holidays}
        />
      </div>
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
  const { hours, rules, serviceDateBlocks, scheduleTimeOverrides, holidays } =
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

  const [dateTimes, setDateTimes] = React.useState<
    Array<{ date: string; checkInTime: string; checkOutTime: string }>
  >(
    startDate && checkInTime
      ? [{ date: startDate, checkInTime, checkOutTime }]
      : [],
  );

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

      {/* Calendar with integrated time slider — same as boarding/daycare */}
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <DateSelectionCalendar
          mode="single"
          selectedDates={selectedDates}
          onSelectionChange={(dates) => {
            if (dates.length > 0) {
              setStartDate(formatDateString(dates[0]));
            } else {
              setStartDate("");
              setCheckInTime("");
              setCheckOutTime("");
            }
          }}
          showTimeSelection
          dateTimes={dateTimes}
          onDateTimesChange={(times) => {
            setDateTimes(times);
            if (times.length > 0) {
              setCheckInTime(times[0].checkInTime);
              setCheckOutTime(times[0].checkOutTime);
            }
          }}
          facilityHours={hours}
          scheduleTimeOverrides={scheduleOverrides}
          bookingRules={{
            minimumAdvanceBooking: rules.minimumAdvanceBooking,
            maximumAdvanceBooking: rules.maximumAdvanceBooking,
          }}
          disabledDates={blockedDates}
          disabledDateMessages={blockedMessages}
          holidays={holidays}
        />
      </div>
    </div>
  );
}
