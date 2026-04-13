"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PawPrint, Check, Sun } from "lucide-react";
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
import { daycarePlayAreas, daycareSections } from "@/data/daycare-areas";
import { getDaycareAvailabilitySummary } from "@/lib/capacity-engine";
import { bookings as allBookings } from "@/data/bookings";
import type { ServiceAddOn } from "@/types/facility";

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
}

function getAddonPriceLabel(addon: ServiceAddOn): string {
  switch (addon.pricingType) {
    case "flat":
      return `$${addon.price}`;
    case "per_day":
      return `$${addon.price}/day`;
    case "per_session":
      return `$${addon.price}/${addon.unitLabel || "session"}`;
    case "per_hour":
      return `$${addon.price}/${addon.unitLabel || "hr"}`;
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
          />
        )}

        {currentSubStep === 2 && (
          <DaycareAddOnsSubStep
            isStepAccessible={isStepAccessible}
            extraServices={extraServices}
            setExtraServices={setExtraServices}
            selectedPets={selectedPets}
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
}: {
  isStepAccessible: (step: number) => boolean;
  selectedPets: Pet[];
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (a: Array<{ petId: number; roomId: string }>) => void;
  daycareSelectedDates: Date[];
}) {
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = React.useState<string | null>(null);

  // Compute availability for the first selected pet (or no pet)
  const focusPet = selectedPet ?? draggedPet ?? selectedPets[0] ?? null;
  const dates = daycareSelectedDates.map((d) => d.toISOString().split("T")[0]);

  const availabilitySummary = React.useMemo(
    () =>
      focusPet
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
          ),
    [focusPet, dates],
  );

  const availabilityBySectionId = React.useMemo(() => {
    const map: Record<string, typeof availabilitySummary[number]> = {};
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
        <p className="text-muted-foreground">Please complete the Schedule step first</p>
      </div>
    );
  }

  const COLOR_BAR: Record<string, string> = {
    amber: "bg-amber-400", violet: "bg-violet-500", blue: "bg-blue-500",
    emerald: "bg-emerald-500", rose: "bg-rose-500", orange: "bg-orange-400",
    indigo: "bg-indigo-500", slate: "bg-slate-400",
  };
  const COLOR_BORDER: Record<string, string> = {
    amber: "border-l-amber-400", violet: "border-l-violet-400", blue: "border-l-blue-400",
    emerald: "border-l-emerald-400", rose: "border-l-rose-400", orange: "border-l-orange-400",
    indigo: "border-l-indigo-400", slate: "border-l-slate-400",
  };
  const COLOR_BADGE: Record<string, string> = {
    amber: "bg-amber-100 text-amber-800", violet: "bg-violet-100 text-violet-800",
    blue: "bg-blue-100 text-blue-800", emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-800", orange: "bg-orange-100 text-orange-800",
    indigo: "bg-indigo-100 text-indigo-800", slate: "bg-slate-100 text-slate-800",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Section Assignment</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Select a pet, then click a section — or drag &amp; drop pets into sections.
          The system will auto-assign on booking creation.
        </p>
      </div>

      {/* Unassigned pets */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Unassigned Pets</Label>
        <div className="bg-muted/20 flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed p-3">
          {selectedPets
            .filter((pet) => !roomAssignments.find((a) => a.petId === pet.id))
            .map((pet) => (
              <div
                key={pet.id}
                draggable
                onDragStart={() => { setDraggedPet(pet); setSelectedPet(null); }}
                onDragEnd={() => setDraggedPet(null)}
                onClick={() => setSelectedPet(selectedPet?.id === pet.id ? null : pet)}
                className={cn(
                  "bg-background flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all select-none",
                  selectedPet?.id === pet.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  {pet.name[0]}
                </div>
                <span className="text-sm font-medium">{pet.name}</span>
                <span className="text-muted-foreground text-xs">({pet.type}, {pet.weight} lbs)</span>
              </div>
            ))}
          {selectedPets.filter((p) => !roomAssignments.find((a) => a.petId === p.id)).length === 0 && (
            <p className="text-muted-foreground py-1 text-sm">All pets assigned ✓</p>
          )}
        </div>
      </div>

      {/* Play areas → sections */}
      <div className="space-y-4">
        {daycarePlayAreas
          .filter((area) => area.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((area) => {
            const areaSections = daycareSections.filter(
              (s) => s.playAreaId === area.id && s.isActive,
            );
            if (areaSections.length === 0) return null;

            return (
              <div key={area.id} className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <span className="bg-muted inline-flex size-5 items-center justify-center rounded text-[10px]">🌳</span>
                  {area.name}
                  {area.description && (
                    <span className="text-muted-foreground text-xs font-normal">— {area.description}</span>
                  )}
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {areaSections
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((section) => {
                      const avail = availabilityBySectionId[section.id];
                      const assignedPets = selectedPets.filter((pet) =>
                        roomAssignments.find((a) => a.petId === pet.id && a.roomId === section.id),
                      );
                      const eligible = avail?.eligible ?? true;
                      const remaining = avail?.minRemaining ?? section.capacity;
                      const isFull = remaining <= 0;
                      const isDisabled = isFull || !eligible;
                      const isDragOver = dragOverSectionId === section.id && !isDisabled;
                      const hasAssigned = assignedPets.length > 0;
                      const pct = section.capacity > 0
                        ? Math.min(((section.capacity - remaining) / section.capacity) * 100, 100)
                        : 0;
                      const showInvite = !isDisabled && !hasAssigned && remaining > 0 &&
                        ((draggedPet && (availabilityBySectionId[section.id]?.eligible ?? true)) ||
                          (selectedPet && (availabilityBySectionId[section.id]?.eligible ?? true)));

                      return (
                        <div
                          key={section.id}
                          onDragOver={(e) => { if (!isDisabled) { e.preventDefault(); setDragOverSectionId(section.id); } }}
                          onDragLeave={() => setDragOverSectionId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverSectionId(null);
                            if (draggedPet && !isDisabled) assignPetToSection(draggedPet, section.id);
                          }}
                          onClick={() => {
                            const petToAssign = selectedPet ??
                              (selectedPets.length === 1 ? selectedPets[0] : null) ??
                              selectedPets.find((p) => !roomAssignments.find((a) => a.petId === p.id)) ?? null;
                            if (petToAssign && !isDisabled) assignPetToSection(petToAssign, section.id);
                          }}
                          className={cn(
                            "group relative overflow-hidden rounded-xl border-l-4 border border-border bg-card transition-all duration-200 select-none",
                            COLOR_BORDER[section.color],
                            isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                            isDragOver && "ring-primary ring-2 ring-offset-1",
                            hasAssigned && "ring-primary/30 shadow-md ring-2",
                            showInvite && "border-dashed border-primary/40",
                          )}
                        >
                          {section.imageUrl && (
                            <div className="relative h-24 w-full overflow-hidden">
                              <Image src={section.imageUrl} alt={section.name} fill className="object-cover" unoptimized />
                              <div className="from-card absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-2 pt-6">
                                <p className="text-sm font-semibold">{section.name}</p>
                              </div>
                            </div>
                          )}

                          <div className="p-3 space-y-2">
                            {!section.imageUrl && (
                              <p className="text-sm font-semibold">{section.name}</p>
                            )}
                            {section.description && (
                              <p className="text-muted-foreground line-clamp-1 text-xs">{section.description}</p>
                            )}

                            {/* Rules chips */}
                            {avail?.eligibilityMessage && !eligible ? (
                              <p className="text-[10px] text-amber-600 font-medium">{avail.eligibilityMessage}</p>
                            ) : (
                              section.rules.filter((r) => r.enabled).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {section.rules.filter((r) => r.enabled).map((rule) => (
                                    <span key={rule.id} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", COLOR_BADGE[section.color])}>
                                      {rule.type === "max_weight" ? `≤${rule.value} lbs` :
                                       rule.type === "min_weight" ? `≥${rule.value} lbs` :
                                       rule.type === "pet_type" ? `${rule.value}s only` : "Rule"}
                                    </span>
                                  ))}
                                </div>
                              )
                            )}

                            {/* Capacity bar */}
                            <div className="space-y-1">
                              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                <div
                                  className={cn("h-full rounded-full transition-all", COLOR_BAR[section.color])}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">{section.capacity - remaining} used</span>
                                <span className={cn("font-semibold tabular-nums",
                                  isFull ? "text-destructive" : remaining <= 3 ? "text-orange-500" : "text-emerald-600",
                                )}>
                                  {isFull ? "Full" : `${remaining} / ${section.capacity} open`}
                                </span>
                              </div>
                            </div>

                            {/* Assigned pets */}
                            {hasAssigned && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {assignedPets.map((pet) => (
                                  <span
                                    key={pet.id}
                                    className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md py-0.5 pr-2 pl-1 text-[11px] font-medium"
                                  >
                                    <span className="bg-primary/20 flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
                                      {pet.name[0]}
                                    </span>
                                    {pet.name}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRoomAssignments(roomAssignments.filter((a) => a.petId !== pet.id));
                                      }}
                                      className="hover:text-destructive ml-0.5 transition-colors"
                                    >×</button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Full / blocked overlays */}
                            {isFull && !hasAssigned && (
                              <p className="text-destructive text-[10px] font-semibold">Section full — waitlist only</p>
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
}: {
  isStepAccessible: (step: number) => boolean;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
}) {
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
            const totalQuantity = extraServices
              .filter((es) => es.serviceId === service.id)
              .reduce((sum, es) => sum + es.quantity, 0);
            const isAdded = totalQuantity > 0;
            const priceLabel = getAddonPriceLabel(service);
            const hasUnits = service.pricingType !== "flat";

            return (
              <div
                key={service.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 select-none",
                  isAdded
                    ? "border-primary ring-primary/20 shadow-md ring-2 ring-offset-2"
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
                    <div className="bg-foreground/80 text-background rounded-lg px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      {priceLabel}
                    </div>
                    {service.isDefault && (
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
                  {isAdded && (
                    <div className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-md">
                      {totalQuantity}
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
                    {selectedPets.map((pet) => {
                      const petService = extraServices.find(
                        (es) =>
                          es.serviceId === service.id && es.petId === pet.id,
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
                    })}
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
