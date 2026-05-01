"use client";

import React, { useEffect, useRef } from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PawPrint, Check, Sun, Gift } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type { Pet } from "@/types/pet";
import { SimpleFeedingForm } from "@/components/booking/shared/SimpleFeedingForm";
import { SimpleMedicationForm } from "@/components/booking/shared/SimpleMedicationForm";
import {
  FeedingAutoPopulate,
  MedicationAutoPopulate,
} from "@/components/booking/shared/PetCareAutoPopulate";
import { defaultServiceAddOns } from "@/data/service-addons";
import { getDaycareAvailabilitySummary } from "@/lib/capacity-engine";
import { bookings as allBookings } from "@/data/bookings";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import type { ServiceAddOn } from "@/types/facility";
import { daycareRates } from "@/data/daycare";

interface DaycareDetailsProps {
  currentSubStep: number;
  isSubStepComplete?: (stepIndex: number) => boolean;
  daycareSelectedDates: Date[];
  setDaycareSelectedDates: (dates: Date[]) => void;
  daycareDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  setDaycareDateTimes: (
    times: Array<{ date: string; checkInTime: string; checkOutTime: string }>,
  ) => void;
  setServiceType: (type: string) => void;
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
  medications: MedicationItem[];
  setMedications: (medications: MedicationItem[]) => void;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (
    assignments: Array<{ petId: number; roomId: string }>,
  ) => void;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
  skipEligibility?: boolean;
}

function getAddonPriceLabel(addon: ServiceAddOn): string {
  switch (addon.pricingType) {
    case "flat": return `$${addon.price}`;
    case "per_day": return `$${addon.price}/day`;
    case "per_session": return `$${addon.price}/${addon.unitLabel || "session"}`;
    case "per_hour": return `$${addon.price}/${addon.unitLabel || "hr"}`;
    case "per_item": return `$${addon.price}/${addon.unitLabel || "item"}`;
    case "percentage_of_booking": return `${addon.price}% of booking`;
  }
}

function getStoredAddOns(): ServiceAddOn[] {
  if (typeof window === "undefined") return defaultServiceAddOns;
  try {
    const stored = localStorage.getItem("settings-service-addons");
    if (stored) return JSON.parse(stored) as ServiceAddOn[];
  } catch {
    // ignore
  }
  return defaultServiceAddOns;
}

// Sections are loaded dynamically from daycare-areas.ts and the capacity engine

export function DaycareDetails({
  currentSubStep,
  isSubStepComplete,
  daycareSelectedDates,
  setDaycareSelectedDates,
  daycareDateTimes,
  setDaycareDateTimes,
  setServiceType,
  feedingSchedule,
  setFeedingSchedule,
  medications,
  setMedications,
  roomAssignments,
  setRoomAssignments,
  extraServices,
  setExtraServices,
  selectedPets,
  skipEligibility,
}: DaycareDetailsProps) {
  const {
    hours,
    rules,
    serviceDateBlocks,
    scheduleTimeOverrides,
    dropOffPickUpOverrides,
    holidays,
  } = useSettings();
  const scheduleTimeOverridesForDaycare = React.useMemo(() => {
    return scheduleTimeOverrides.filter(
      (o) => !o.services?.length || o.services.includes("daycare"),
    );
  }, [scheduleTimeOverrides]);

  const dropOffPickUpWindowsByDateForDaycare = React.useMemo(() => {
    const map: Record<
      string,
      {
        dropOffStart: string;
        dropOffEnd: string;
        pickUpStart: string;
        pickUpEnd: string;
      }
    > = {};
    dropOffPickUpOverrides
      .filter((o) => o.services.includes("daycare"))
      .forEach((o) => {
        map[o.date] = {
          dropOffStart: o.dropOffStart,
          dropOffEnd: o.dropOffEnd,
          pickUpStart: o.pickUpStart,
          pickUpEnd: o.pickUpEnd,
        };
      });
    return map;
  }, [dropOffPickUpOverrides]);

  const { blockedDatesForDaycare, blockedDateMessagesForDaycare } =
    React.useMemo(() => {
      const blocks = serviceDateBlocks.filter(
        (b) => b.closed && b.services.includes("daycare"),
      );
      const dates = blocks.map((b) => {
        const [y, m, d] = b.date.split("-").map(Number);
        return new Date(y, m - 1, d);
      });
      const messages: Record<string, string> = {};
      blocks.forEach(
        (b) => b.closureMessage && (messages[b.date] = b.closureMessage),
      );
      return {
        blockedDatesForDaycare: dates,
        blockedDateMessagesForDaycare: messages,
      };
    }, [serviceDateBlocks]);

  const allPreviousCompleted = (stepIndex: number) => {
    if (!isSubStepComplete) return true;
    return Array.from({ length: stepIndex }, (_, i) => i).every((i) =>
      isSubStepComplete(i),
    );
  };

  const isStepAccessible = (stepIndex: number) => {
    return stepIndex === 0 || allPreviousCompleted(stepIndex);
  };

  return (
    <div className="space-y-6">
      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentSubStep === 0 && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <Sun className="size-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Select Daycare Days</h3>
                <p className="text-muted-foreground text-sm">
                  Pick one or more days and set drop-off/pick-up times. Half Day
                  or Full Day is determined automatically.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border shadow-sm">
              <DateSelectionCalendar
                mode="multi"
                selectedDates={daycareSelectedDates}
                onSelectionChange={setDaycareSelectedDates}
                showTimeSelection
                dateTimes={daycareDateTimes}
                onDateTimesChange={(times) => {
                  setDaycareDateTimes(times);
                  if (times.length > 0) {
                    const firstTime = times[0];
                    const checkIn = firstTime.checkInTime.split(":");
                    const checkOut = firstTime.checkOutTime.split(":");
                    const checkInMinutes =
                      parseInt(checkIn[0]) * 60 + parseInt(checkIn[1]);
                    const checkOutMinutes =
                      parseInt(checkOut[0]) * 60 + parseInt(checkOut[1]);
                    const hoursSpent = (checkOutMinutes - checkInMinutes) / 60;

                    if (hoursSpent <= 5) {
                      setServiceType("half_day");
                    } else {
                      setServiceType("full_day");
                    }
                  }
                }}
                facilityHours={hours}
                scheduleTimeOverrides={scheduleTimeOverridesForDaycare}
                dropOffPickUpWindowsByDate={
                  dropOffPickUpWindowsByDateForDaycare
                }
                bookingRules={{
                  minimumAdvanceBooking: rules.minimumAdvanceBooking,
                  maximumAdvanceBooking: rules.maximumAdvanceBooking,
                }}
                disabledDates={blockedDatesForDaycare}
                disabledDateMessages={blockedDateMessagesForDaycare}
                holidays={holidays}
              />
            </div>
          </div>
        )}

        {currentSubStep === 1 && (
          <DaycareSectionAssignmentStep
            isStepAccessible={isStepAccessible}
            selectedPets={selectedPets}
            roomAssignments={roomAssignments}
            setRoomAssignments={setRoomAssignments}
            daycareSelectedDates={daycareSelectedDates}
            skipEligibility={skipEligibility}
            daycareDateTimes={daycareDateTimes}
          />
        )}

        {currentSubStep === 2 && (
          <DaycareAddOnsSubStep
            isStepAccessible={isStepAccessible}
            extraServices={extraServices}
            setExtraServices={setExtraServices}
            selectedPets={selectedPets}
            daycareDateTimes={daycareDateTimes}
          />
        )}

        {currentSubStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Feeding Schedule</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Add feeding times, portions, and dietary notes for your pet
                (optional)
              </p>
            </div>

            {!isStepAccessible(3) && (
              <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Please complete the previous steps first
                </p>
              </div>
            )}

            {isStepAccessible(3) && (
              <div className="space-y-4">
                <FeedingAutoPopulate
                  selectedPets={selectedPets.map((p) => ({
                    id: p.id,
                    name: p.name,
                  }))}
                  feedingSchedule={feedingSchedule}
                  setFeedingSchedule={setFeedingSchedule}
                />
                <SimpleFeedingForm
                  feedingSchedule={feedingSchedule}
                  setFeedingSchedule={setFeedingSchedule}
                  selectedPets={selectedPets.map((p) => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                  }))}
                  serviceType="daycare"
                />
              </div>
            )}
          </div>
        )}

        {currentSubStep === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Medication</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Add any medications your pet needs during their stay (optional)
              </p>
            </div>

            {!isStepAccessible(4) && (
              <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Please complete the previous steps first
                </p>
              </div>
            )}

            {isStepAccessible(4) && (
              <div className="space-y-4">
                <MedicationAutoPopulate
                  selectedPets={selectedPets.map((p) => ({
                    id: p.id,
                    name: p.name,
                  }))}
                  medications={medications}
                  setMedications={setMedications}
                />
                <SimpleMedicationForm
                  medications={medications}
                  setMedications={setMedications}
                  selectedPets={selectedPets.map((p) => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                  }))}
                  serviceType="daycare"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section Assignment Sub-Step (play areas → sections with live capacity)
// ============================================================================

function DaycareSectionAssignmentStep({
  isStepAccessible,
  selectedPets,
  roomAssignments,
  setRoomAssignments,
  daycareSelectedDates,
  skipEligibility,
  daycareDateTimes,
}: {
  isStepAccessible: (step: number) => boolean;
  selectedPets: Pet[];
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (a: Array<{ petId: number; roomId: string }>) => void;
  daycareSelectedDates: Date[];
  skipEligibility?: boolean;
  daycareDateTimes: Array<{ date: string; checkInTime: string; checkOutTime: string }>;
}) {
  // Derive which sections the selected rate allows (empty = all sections allowed)
  const allowedSectionIds = React.useMemo<string[]>(() => {
    const firstDt = daycareDateTimes[0];
    if (!firstDt) return [];
    const [inH, inM] = firstDt.checkInTime.split(":").map(Number);
    const [outH, outM] = firstDt.checkOutTime.split(":").map(Number);
    const durationHrs = (outH * 60 + outM - (inH * 60 + inM)) / 60;
    const rateType = durationHrs <= 5 ? "half-day" : "full-day";
    const matchingRate = daycareRates.find((r) => r.type === rateType && r.isActive);
    return matchingRate?.allowedSectionIds ?? [];
  }, [daycareDateTimes]);

  const hasRoomRestriction = allowedSectionIds.length > 0;
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = React.useState<
    string | null
  >(null);

  const { areas: daycarePlayAreas, sections: daycareSections } =
    useDaycareAreas();

  // Compute availability for the first selected pet (or no pet)
  const focusPet = selectedPet ?? draggedPet ?? selectedPets[0] ?? null;
  const dates = daycareSelectedDates.map((d) => d.toISOString().split("T")[0]);

  const availabilitySummary = React.useMemo(() => {
    const base = focusPet
      ? getDaycareAvailabilitySummary(
          focusPet,
          dates.length > 0 ? dates : [new Date().toISOString().split("T")[0]],
          daycareSections,
          allBookings,
        )
      : getDaycareAvailabilitySummary(
          { weight: 0, type: "Dog" } as Pet,
          dates.length > 0 ? dates : [new Date().toISOString().split("T")[0]],
          daycareSections,
          allBookings,
        );
    if (skipEligibility) {
      return base.map((item) => ({
        ...item,
        eligible: true,
        eligibilityMessage: null,
      }));
    }
    return base;
  }, [focusPet, dates, daycareSections, skipEligibility]);

  const availabilityBySectionId = React.useMemo(() => {
    const map: Record<string, (typeof availabilitySummary)[number]> = {};
    for (const item of availabilitySummary) map[item.section.id] = item;
    return map;
  }, [availabilitySummary]);

  const assignPetToSection = (pet: Pet, sectionId: string) => {
    const avail = availabilityBySectionId[sectionId];
    if (!avail || !avail.eligible || avail.minRemaining <= 0) return;
    setRoomAssignments([
      ...roomAssignments.filter((a) => a.petId !== pet.id),
      { petId: pet.id, roomId: sectionId },
    ]);
    setSelectedPet(null);
  };

  if (!isStepAccessible(1)) {
    return (
      <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Please complete the Schedule step first
        </p>
      </div>
    );
  }

  const COLOR_BAR: Record<string, string> = {
    amber: "bg-amber-400",
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    orange: "bg-orange-400",
    indigo: "bg-indigo-500",
    slate: "bg-slate-400",
  };
  const COLOR_DOT: Record<string, string> = {
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    orange: "bg-orange-500",
    indigo: "bg-indigo-500",
    slate: "bg-slate-500",
  };
  const COLOR_BADGE: Record<string, string> = {
    amber: "bg-amber-50 text-amber-800 ring-amber-200/60",
    violet: "bg-violet-50 text-violet-800 ring-violet-200/60",
    blue: "bg-blue-50 text-blue-800 ring-blue-200/60",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200/60",
    rose: "bg-rose-50 text-rose-800 ring-rose-200/60",
    orange: "bg-orange-50 text-orange-800 ring-orange-200/60",
    indigo: "bg-indigo-50 text-indigo-800 ring-indigo-200/60",
    slate: "bg-slate-50 text-slate-800 ring-slate-200/60",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <PawPrint className="text-primary size-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Section Assignment
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            Drag a pet onto a section, or click to assign. The system
            auto-matches by eligibility &amp; capacity on booking creation.
          </p>
        </div>
      </div>

      {hasRoomRestriction && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
          <Sun className="mt-0.5 size-3.5 shrink-0 text-blue-600" />
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Rate restriction:</span> The selected rate is configured for specific rooms. Rooms outside the rate are dimmed — you can still assign them manually.
          </p>
        </div>
      )}

      {/* Unassigned pets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Unassigned Pets
          </Label>
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {
              selectedPets.filter(
                (p) => !roomAssignments.find((a) => a.petId === p.id),
              ).length
            }{" "}
            of {selectedPets.length}
          </span>
        </div>
        <div className="from-muted/40 to-muted/10 flex min-h-16 flex-wrap items-center gap-2 rounded-2xl bg-gradient-to-br p-3 ring-1 ring-inset ring-border/40">
          {selectedPets
            .filter((pet) => !roomAssignments.find((a) => a.petId === pet.id))
            .map((pet) => (
              <div
                key={pet.id}
                draggable
                onDragStart={() => {
                  setDraggedPet(pet);
                  setSelectedPet(null);
                }}
                onDragEnd={() => setDraggedPet(null)}
                onClick={() =>
                  setSelectedPet(selectedPet?.id === pet.id ? null : pet)
                }
                className={cn(
                  "bg-card flex cursor-grab items-center gap-2 rounded-full px-3 py-1.5 shadow-xs ring-1 transition-all select-none active:cursor-grabbing",
                  selectedPet?.id === pet.id
                    ? "bg-primary text-primary-foreground ring-primary shadow-md"
                    : "ring-border/60 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
                )}
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    selectedPet?.id === pet.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {pet.name[0]}
                </div>
                <span className="text-sm font-medium">{pet.name}</span>
                <span
                  className={cn(
                    "text-xs",
                    selectedPet?.id === pet.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {pet.type} · {pet.weight}lb
                </span>
              </div>
            ))}
          {selectedPets.filter(
            (p) => !roomAssignments.find((a) => a.petId === p.id),
          ).length === 0 && (
            <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-sm">
              <Check className="size-3.5 text-emerald-500" />
              All pets assigned
            </p>
          )}
        </div>
      </div>

      {/* Play areas → sections */}
      <div className="space-y-6">
        {daycarePlayAreas
          .filter((area) => area.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((area) => {
            const areaSections = daycareSections.filter(
              (s) => s.playAreaId === area.id && s.isActive,
            );
            if (areaSections.length === 0) return null;

            return (
              <div key={area.id} className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {area.name}
                  </h4>
                  {area.description && (
                    <span className="text-muted-foreground text-xs">
                      {area.description}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {areaSections
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((section) => {
                      const avail = availabilityBySectionId[section.id];
                      const assignedPets = selectedPets.filter((pet) =>
                        roomAssignments.find(
                          (a) => a.petId === pet.id && a.roomId === section.id,
                        ),
                      );
                      const eligible = avail?.eligible ?? true;
                      const remaining = avail?.minRemaining ?? section.capacity;
                      const isFull = remaining <= 0;
                      const isDisabled = isFull || !eligible;
                      const isDragOver =
                        dragOverSectionId === section.id && !isDisabled;
                      const hasAssigned = assignedPets.length > 0;
                      const pct =
                        section.capacity > 0
                          ? Math.min(
                              ((section.capacity - remaining) /
                                section.capacity) *
                                100,
                              100,
                            )
                          : 0;
                      const showInvite =
                        !isDisabled &&
                        !hasAssigned &&
                        remaining > 0 &&
                        ((draggedPet &&
                          (availabilityBySectionId[section.id]?.eligible ??
                            true)) ||
                          (selectedPet &&
                            (availabilityBySectionId[section.id]?.eligible ??
                              true)));

                      // Rate room restriction — dimmed but still assignable by staff
                      const isOutsideRate =
                        hasRoomRestriction &&
                        !allowedSectionIds.includes(section.id);

                      return (
                        <div
                          key={section.id}
                          onDragOver={(e) => {
                            if (!isDisabled) {
                              e.preventDefault();
                              setDragOverSectionId(section.id);
                            }
                          }}
                          onDragLeave={() => setDragOverSectionId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverSectionId(null);
                            if (draggedPet && !isDisabled)
                              assignPetToSection(draggedPet, section.id);
                          }}
                          onClick={() => {
                            const petToAssign =
                              selectedPet ??
                              (selectedPets.length === 1
                                ? selectedPets[0]
                                : null) ??
                              selectedPets.find(
                                (p) =>
                                  !roomAssignments.find(
                                    (a) => a.petId === p.id,
                                  ),
                              ) ??
                              null;
                            if (petToAssign && !isDisabled)
                              assignPetToSection(petToAssign, section.id);
                          }}
                          className={cn(
                            "group bg-card relative overflow-hidden rounded-2xl ring-1 transition-all duration-300 select-none",
                            isDisabled
                              ? "cursor-not-allowed opacity-60 ring-border/50"
                              : "ring-border/60 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:ring-border",
                            isOutsideRate && !isDisabled && "opacity-50 grayscale-[40%]",
                            isDragOver &&
                              "ring-2 ring-primary shadow-2xl scale-[1.02]",
                            hasAssigned &&
                              "ring-2 ring-primary/70 shadow-lg",
                            showInvite && "ring-primary/40 ring-dashed",
                          )}
                        >
                          {/* Image header with gradient overlay */}
                          <div className="relative h-28 w-full overflow-hidden">
                            {section.imageUrl ? (
                              <>
                                <Image
                                  src={section.imageUrl}
                                  alt={section.name}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                              </>
                            ) : (
                              <div
                                className={cn(
                                  "size-full bg-gradient-to-br",
                                  section.color === "amber" &&
                                    "from-amber-100 to-amber-300",
                                  section.color === "violet" &&
                                    "from-violet-100 to-violet-300",
                                  section.color === "blue" &&
                                    "from-blue-100 to-blue-300",
                                  section.color === "emerald" &&
                                    "from-emerald-100 to-emerald-300",
                                  section.color === "rose" &&
                                    "from-rose-100 to-rose-300",
                                  section.color === "orange" &&
                                    "from-orange-100 to-orange-300",
                                  section.color === "indigo" &&
                                    "from-indigo-100 to-indigo-300",
                                  section.color === "slate" &&
                                    "from-slate-100 to-slate-300",
                                )}
                              />
                            )}
                            {/* Color dot (top-right) — subtle brand accent */}
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 shadow-xs backdrop-blur-md">
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  COLOR_DOT[section.color],
                                )}
                              />
                              <span className="text-[10px] font-semibold text-slate-700">
                                {area.name}
                              </span>
                            </div>
                            {/* Title over image */}
                            <p className="absolute bottom-2 left-3 text-sm font-semibold text-white drop-shadow-md">
                              {section.name}
                            </p>
                          </div>

                          <div className="space-y-2.5 p-3.5">
                            {section.description && (
                              <p className="text-muted-foreground line-clamp-1 text-xs">
                                {section.description}
                              </p>
                            )}

                            {/* Rate restriction badge */}
                            {isOutsideRate && (
                              <p className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                Not in selected rate's rooms
                              </p>
                            )}

                            {/* Rules chips */}
                            {avail?.eligibilityMessage && !eligible ? (
                              <p className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
                                {avail.eligibilityMessage}
                              </p>
                            ) : (
                              section.rules.filter((r) => r.enabled).length >
                                0 && (
                                <div className="flex flex-wrap gap-1">
                                  {section.rules
                                    .filter((r) => r.enabled)
                                    .map((rule) => (
                                      <span
                                        key={rule.id}
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                          COLOR_BADGE[section.color],
                                        )}
                                      >
                                        {rule.type === "max_weight"
                                          ? `≤${rule.value} lbs`
                                          : rule.type === "min_weight"
                                            ? `≥${rule.value} lbs`
                                            : rule.type === "pet_type"
                                              ? `${rule.value}s only`
                                              : "Rule"}
                                      </span>
                                    ))}
                                </div>
                              )
                            )}

                            {/* Capacity bar */}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="bg-muted/80 h-1.5 overflow-hidden rounded-full">
                                <div
                                  className={cn(
                                    "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                                    section.color === "amber" &&
                                      "from-amber-300 to-amber-500",
                                    section.color === "violet" &&
                                      "from-violet-400 to-violet-600",
                                    section.color === "blue" &&
                                      "from-blue-400 to-blue-600",
                                    section.color === "emerald" &&
                                      "from-emerald-400 to-emerald-600",
                                    section.color === "rose" &&
                                      "from-rose-400 to-rose-600",
                                    section.color === "orange" &&
                                      "from-orange-400 to-orange-600",
                                    section.color === "indigo" &&
                                      "from-indigo-400 to-indigo-600",
                                    section.color === "slate" &&
                                      "from-slate-400 to-slate-600",
                                    !COLOR_BAR[section.color] &&
                                      COLOR_BAR.slate,
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground tabular-nums">
                                  {section.capacity - remaining} of{" "}
                                  {section.capacity} used
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold tabular-nums",
                                    isFull
                                      ? "text-destructive"
                                      : remaining <= 3
                                        ? "text-orange-500"
                                        : "text-emerald-600",
                                  )}
                                >
                                  {isFull ? "Full" : `${remaining} open`}
                                </span>
                              </div>
                            </div>

                            {/* Assigned pets */}
                            {hasAssigned && (
                              <div className="flex flex-wrap gap-1 border-t border-border/50 pt-2.5">
                                {assignedPets.map((pet) => (
                                  <span
                                    key={pet.id}
                                    className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full py-0.5 pr-2 pl-1 text-[11px] font-medium ring-1 ring-inset ring-primary/20"
                                  >
                                    <span className="bg-primary/20 flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
                                      {pet.name[0]}
                                    </span>
                                    {pet.name}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRoomAssignments(
                                          roomAssignments.filter(
                                            (a) => a.petId !== pet.id,
                                          ),
                                        );
                                      }}
                                      className="hover:text-destructive ml-0.5 text-sm leading-none transition-colors"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Full / blocked overlays */}
                            {isFull && !hasAssigned && (
                              <p className="text-destructive flex items-center gap-1 text-[10px] font-semibold">
                                Section full — waitlist only
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ============================================================================
// Daycare Add-Ons Sub-Step (uses configured add-ons from settings)
// ============================================================================

function DaycareAddOnsSubStep({
  isStepAccessible,
  extraServices,
  setExtraServices,
  selectedPets,
  daycareDateTimes,
}: {
  isStepAccessible: (step: number) => boolean;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
  daycareDateTimes: Array<{ date: string; checkInTime: string; checkOutTime: string }>;
}) {
  // Derive rate type from session duration to find included free add-ons
  const injectedRef = useRef(false);
  useEffect(() => {
    if (injectedRef.current || !isStepAccessible(2) || selectedPets.length === 0) return;
    injectedRef.current = true;

    // Determine duration from first date-time entry
    const firstDt = daycareDateTimes[0];
    if (!firstDt) return;
    const [inH, inM] = firstDt.checkInTime.split(":").map(Number);
    const [outH, outM] = firstDt.checkOutTime.split(":").map(Number);
    const durationHrs = (outH * 60 + outM - (inH * 60 + inM)) / 60;
    const rateType = durationHrs <= 5 ? "half-day" : "full-day";

    // Find the matching rate and its included add-on IDs
    const matchingRate = daycareRates.find((r) => r.type === rateType && r.isActive);
    const includedIds: string[] = matchingRate?.includedAddOnIds ?? [];
    if (includedIds.length === 0) return;

    // Inject one entry per pet per included add-on (quantity = 0 signals "free/included")
    const toInject = selectedPets.flatMap((pet) =>
      includedIds.map((id) => ({ serviceId: id, quantity: 0, petId: pet.id }))
    );
    // Only add entries that don't already exist
    const existing = new Set(extraServices.map((es) => `${es.serviceId}:${es.petId}`));
    const novel = toInject.filter((e) => !existing.has(`${e.serviceId}:${e.petId}`));
    if (novel.length > 0) setExtraServices([...extraServices, ...novel]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStepAccessible, selectedPets.length]);

  const daycareAddOns = getStoredAddOns().filter((a) => {
    if (!a.isActive || !a.applicableServices.includes("daycare")) return false;
    // Pet eligibility filter
    if (a.petTypeFilter && selectedPets.length > 0) {
      const pf = a.petTypeFilter;
      const allMatch = selectedPets.every((pet) => {
        if (pf.types?.length && !pf.types.includes(pet.type)) return false;
        if (pf.weightMin != null && pet.weight < pf.weightMin) return false;
        if (pf.weightMax != null && pet.weight > pf.weightMax) return false;
        return true;
      });
      if (!allMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Add-ons</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Add optional services to enhance your pet&apos;s daycare experience
        </p>
      </div>

      {!isStepAccessible(2) && (
        <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Please complete the previous steps first
          </p>
        </div>
      )}

      {isStepAccessible(2) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {daycareAddOns.map((service) => {
            // quantity=0 entries are "included free" injected from the rate
            const includedEntries = extraServices.filter(
              (es) => es.serviceId === service.id && es.quantity === 0,
            );
            const isIncludedFree = includedEntries.length > 0;
            const totalQuantity = extraServices
              .filter((es) => es.serviceId === service.id && es.quantity > 0)
              .reduce((sum, es) => sum + es.quantity, 0);
            const isAdded = isIncludedFree || totalQuantity > 0;
            const priceLabel = getAddonPriceLabel(service);
            const hasUnits = service.pricingType !== "flat";

            return (
              <div
                key={service.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 select-none",
                  isIncludedFree
                    ? "border-emerald-400 bg-emerald-50/60 shadow-md"
                    : isAdded
                      ? "border-transparent bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg",
                )}
              >
                {/* Image area */}
                <div className="relative h-32 w-full overflow-hidden">
                  {service.image ? (
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="bg-muted flex size-full items-center justify-center">
                      <PawPrint className="text-muted-foreground/30 size-12" />
                    </div>
                  )}
                  {/* Price badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {isIncludedFree ? (
                      <div className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
                        <Gift className="size-3" /> Included Free
                      </div>
                    ) : (
                      <div className="bg-foreground/80 text-background rounded-lg px-2 py-1 text-xs font-bold backdrop-blur-sm">
                        {priceLabel}
                      </div>
                    )}
                    {service.isDefault && !isIncludedFree && (
                      <div className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                        Default
                      </div>
                    )}
                    {service.duration && (
                      <div className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 backdrop-blur-sm">
                        {service.duration}min
                      </div>
                    )}
                  </div>
                  {/* Added count badge */}
                  {isAdded && !isIncludedFree && (
                    <div className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-md">
                      {totalQuantity}
                    </div>
                  )}
                  {isIncludedFree && (
                    <div className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-emerald-600 shadow-md">
                      <Check className="size-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Content strip */}
                <div className="p-3.5">
                  <p className="text-sm/tight font-semibold">{service.name}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {service.description}
                  </p>

                  {/* Per-pet controls */}
                  <div className="mt-3 space-y-1.5">
                    {isIncludedFree ? (
                      // Show locked "Included" row for all pets when free
                      <div className="flex items-center justify-between rounded-md bg-emerald-50 px-2 py-1.5">
                        <span className="flex items-center gap-1 text-xs text-emerald-700">
                          <Gift className="size-3" />
                          Included with this rate
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Check className="size-3" /> Free
                        </span>
                      </div>
                    ) : (
                    selectedPets.map((pet) => {
                      const petService = extraServices.find(
                        (es) =>
                          es.serviceId === service.id && es.petId === pet.id && es.quantity > 0,
                      );
                      const quantity = petService?.quantity || 0;

                      return (
                        <div
                          key={pet.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="bg-primary/10 text-primary flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
                              {pet.name[0]}
                            </span>
                            <span className="text-xs font-medium">
                              {pet.name}
                            </span>
                          </div>

                          {hasUnits ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (quantity > 0) {
                                    const updated = extraServices
                                      .map((es) =>
                                        es.serviceId === service.id &&
                                        es.petId === pet.id
                                          ? {
                                              ...es,
                                              quantity: es.quantity - 1,
                                            }
                                          : es,
                                      )
                                      .filter((es) => es.quantity > 0);
                                    setExtraServices(updated);
                                  }
                                }}
                                disabled={quantity === 0}
                                className="size-6 p-0 text-xs"
                              >
                                -
                              </Button>
                              <span className="min-w-[2ch] text-center font-[tabular-nums] text-xs font-semibold">
                                {quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (petService) {
                                    const updated = extraServices.map((es) =>
                                      es.serviceId === service.id &&
                                      es.petId === pet.id
                                        ? {
                                            ...es,
                                            quantity: es.quantity + 1,
                                          }
                                        : es,
                                    );
                                    setExtraServices(updated);
                                  } else {
                                    setExtraServices([
                                      ...extraServices,
                                      {
                                        serviceId: service.id,
                                        quantity: 1,
                                        petId: pet.id,
                                      },
                                    ]);
                                  }
                                }}
                                disabled={
                                  service.maxQuantity !== undefined &&
                                  quantity >= service.maxQuantity
                                }
                                className="size-6 p-0 text-xs"
                              >
                                +
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant={quantity > 0 ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                if (quantity > 0) {
                                  setExtraServices(
                                    extraServices.filter(
                                      (es) =>
                                        !(
                                          es.serviceId === service.id &&
                                          es.petId === pet.id
                                        ),
                                    ),
                                  );
                                } else {
                                  setExtraServices([
                                    ...extraServices,
                                    {
                                      serviceId: service.id,
                                      quantity: 1,
                                      petId: pet.id,
                                    },
                                  ]);
                                }
                              }}
                              className="h-6 gap-1 px-2.5 text-[11px]"
                            >
                              {quantity > 0 ? (
                                <>
                                  <Check className="size-3" />
                                  Added
                                </>
                              ) : (
                                "Add"
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
