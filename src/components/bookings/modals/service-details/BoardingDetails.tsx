"use client";

import React, { useEffect, useRef } from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Button } from "@/components/ui/button";
import { Check, PawPrint, Bed, X, AlertCircle, Gift } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { FeedingScheduleItem, MedicationItem } from "@/types/booking";
import type { Pet } from "@/types/pet";
import { SimpleFeedingForm } from "@/components/booking/shared/SimpleFeedingForm";
import { SimpleMedicationForm } from "@/components/booking/shared/SimpleMedicationForm";
import {
  FeedingAutoPopulate,
  MedicationAutoPopulate,
} from "@/components/booking/shared/PetCareAutoPopulate";
import { defaultServiceAddOns } from "@/data/service-addons";
import { getBoardingCategoryAvailability } from "@/lib/capacity-engine";
import { bookings as allBookings } from "@/data/bookings";
import { useRooms } from "@/hooks/use-rooms";
import type { ServiceAddOn } from "@/types/facility";
import { boardingRates } from "@/data/boarding";

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

// Boarding categories are rendered dynamically inside the component
// with live availability via getBoardingCategoryAvailability()

interface BoardingDetailsProps {
  currentSubStep: number;
  isSubStepComplete?: (stepIndex: number) => boolean;
  boardingRangeStart: Date | null;
  boardingRangeEnd: Date | null;
  setBoardingRangeStart: (date: Date | null) => void;
  setBoardingRangeEnd: (date: Date | null) => void;
  boardingDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  setBoardingDateTimes: (
    times: Array<{ date: string; checkInTime: string; checkOutTime: string }>,
  ) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setCheckInTime: (time: string) => void;
  setCheckOutTime: (time: string) => void;
  serviceType: string;
  setServiceType: (type: string) => void;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (
    assignments: Array<{ petId: number; roomId: string }>,
  ) => void;
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
  medications: MedicationItem[];
  setMedications: (medications: MedicationItem[]) => void;

  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
  skipEligibility?: boolean;
}

export function BoardingDetails({
  currentSubStep,
  isSubStepComplete,
  boardingRangeStart,
  setBoardingRangeStart,
  boardingRangeEnd,
  setBoardingRangeEnd,
  boardingDateTimes,
  setBoardingDateTimes,
  setStartDate,
  setEndDate,
  setCheckInTime,
  setCheckOutTime,
  serviceType,
  setServiceType,
  roomAssignments,
  setRoomAssignments,
  feedingSchedule,
  setFeedingSchedule,
  medications,
  setMedications,
  extraServices,
  setExtraServices,
  selectedPets,
  skipEligibility,
}: BoardingDetailsProps) {
  const {
    hours,
    rules,
    serviceDateBlocks,
    scheduleTimeOverrides,
    dropOffPickUpOverrides,
    holidays,
  } = useSettings();
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = React.useState<string | null>(
    null,
  );

  const scheduleTimeOverridesForBoarding = React.useMemo(() => {
    return scheduleTimeOverrides.filter(
      (o) => !o.services?.length || o.services.includes("boarding"),
    );
  }, [scheduleTimeOverrides]);

  const dropOffPickUpWindowsByDateForBoarding = React.useMemo(() => {
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
      .filter((o) => o.services.includes("boarding"))
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

  const {
    blockedStartDatesForBoarding,
    blockedEndDatesForBoarding,
    blockedDateMessagesForBoarding,
  } = React.useMemo(() => {
    const boardingBlocks = serviceDateBlocks.filter((b) =>
      b.services.includes("boarding"),
    );
    const startDates: Date[] = [];
    const endDates: Date[] = [];
    const messages: Record<string, string> = {};
    boardingBlocks.forEach((b) => {
      const [y, m, d] = b.date.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const isStartBlocked = b.closed || b.blockCheckIn;
      const isEndBlocked = b.closed || b.blockCheckOut;
      if (isStartBlocked) startDates.push(date);
      if (isEndBlocked) endDates.push(date);
      if (b.closureMessage && (isStartBlocked || isEndBlocked))
        messages[b.date] = b.closureMessage;
    });
    return {
      blockedStartDatesForBoarding: startDates,
      blockedEndDatesForBoarding: endDates,
      blockedDateMessagesForBoarding: messages,
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                <Bed className="size-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold">Select Boarding Dates</h3>
                <p className="text-muted-foreground text-sm">
                  Click the check-in date, then click the check-out date to
                  select a range. Set drop-off and pick-up times for the stay.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border shadow-sm">
              <DateSelectionCalendar
                mode="range"
                rangeStart={boardingRangeStart}
                rangeEnd={boardingRangeEnd}
                onRangeChange={(start, end) => {
                  setBoardingRangeStart(start);
                  setBoardingRangeEnd(end);
                  if (start) {
                    setStartDate(start.toISOString().split("T")[0]);
                  }
                  if (end) {
                    setEndDate(end.toISOString().split("T")[0]);
                  }
                }}
                showTimeSelection
                dateTimes={boardingDateTimes}
                onDateTimesChange={(times) => {
                  setBoardingDateTimes(times);
                  if (times.length > 0) {
                    setCheckInTime(times[0].checkInTime);
                    setCheckOutTime(times[times.length - 1].checkOutTime);
                  }
                }}
                facilityHours={hours}
                scheduleTimeOverrides={scheduleTimeOverridesForBoarding}
                dropOffPickUpWindowsByDate={
                  dropOffPickUpWindowsByDateForBoarding
                }
                bookingRules={{
                  minimumAdvanceBooking: rules.minimumAdvanceBooking,
                  maximumAdvanceBooking: rules.maximumAdvanceBooking,
                }}
                disabledStartDates={blockedStartDatesForBoarding}
                disabledEndDates={blockedEndDatesForBoarding}
                disabledDateMessages={blockedDateMessagesForBoarding}
                holidays={holidays}
              />
            </div>
          </div>
        )}

        {currentSubStep === 1 && (
          <BoardingRoomSelectionStep
            isStepAccessible={isStepAccessible}
            selectedPets={selectedPets}
            roomAssignments={roomAssignments}
            setRoomAssignments={setRoomAssignments}
            serviceType={serviceType}
            setServiceType={setServiceType}
            boardingRangeStart={boardingRangeStart}
            boardingRangeEnd={boardingRangeEnd}
            skipEligibility={skipEligibility}
          />
        )}

        {currentSubStep === 2 && (
          <BoardingAddOnsSubStep
            isStepAccessible={isStepAccessible}
            extraServices={extraServices}
            setExtraServices={setExtraServices}
            selectedPets={selectedPets}
            serviceType={serviceType}
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
                  serviceType="boarding"
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
                  serviceType="boarding"
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
// Boarding Room Selection Sub-Step
// ============================================================================

interface BoardingRoomSelectionStepProps {
  isStepAccessible: (step: number) => boolean;
  selectedPets: Pet[];
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (
    assignments: Array<{ petId: number; roomId: string }>,
  ) => void;
  serviceType: string;
  setServiceType: (type: string) => void;
  boardingRangeStart: Date | null;
  boardingRangeEnd: Date | null;
  skipEligibility?: boolean;
}

function BoardingRoomSelectionStep({
  isStepAccessible,
  selectedPets,
  roomAssignments,
  setRoomAssignments,
  setServiceType,
  boardingRangeStart,
  boardingRangeEnd,
  skipEligibility,
}: BoardingRoomSelectionStepProps) {
  const [activePet, setActivePet] = React.useState<Pet | null>(null);
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [dragOverCatId, setDragOverCatId] = React.useState<string | null>(null);

  const { categories: allCategories, rooms: allRooms } = useRooms();
  const boardingCategories = React.useMemo(
    () =>
      allCategories.filter(
        (c) => c.service === "boarding" && c.visibleToClients,
      ),
    [allCategories],
  );
  const boardingRooms = React.useMemo(() => {
    const ids = new Set(boardingCategories.map((c) => c.id));
    return allRooms.filter((r) => ids.has(r.categoryId));
  }, [allRooms, boardingCategories]);

  const startDate = boardingRangeStart?.toISOString().split("T")[0] ?? "";
  const endDate = boardingRangeEnd?.toISOString().split("T")[0] ?? "";

  // When checking eligibility, use the currently active (selected) pet, or first pet.
  // For guest estimates we don't know the pet's weight/type, so skip eligibility entirely
  // and let any room be picked.
  const focusPet = skipEligibility
    ? undefined
    : (activePet ?? selectedPets[0] ?? undefined);

  const availability = React.useMemo(() => {
    if (!startDate || !endDate) return [];
    return getBoardingCategoryAvailability(
      startDate,
      endDate,
      boardingCategories,
      boardingRooms,
      allBookings,
      focusPet,
    );
  }, [startDate, endDate, focusPet, boardingCategories, boardingRooms]);

  function assignPet(pet: Pet, categoryId: string) {
    const newAssignments = [
      ...roomAssignments.filter((ra) => ra.petId !== pet.id),
      { petId: pet.id, roomId: categoryId },
    ];
    setRoomAssignments(newAssignments);
    setServiceType(categoryId);
    setActivePet(null);
    setDraggedPet(null);
  }

  function unassignPet(petId: number) {
    setRoomAssignments(roomAssignments.filter((ra) => ra.petId !== petId));
  }

  if (!isStepAccessible(1)) {
    return (
      <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Please complete the previous steps first
        </p>
      </div>
    );
  }

  if (!startDate || !endDate) {
    return (
      <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Please select boarding dates first
        </p>
      </div>
    );
  }

  const allAssigned = selectedPets.every((p) =>
    roomAssignments.some((ra) => ra.petId === p.id),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
          <Bed className="size-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold">Select Room Type</h3>
          <p className="text-muted-foreground text-sm">
            {selectedPets.length > 1
              ? "Click a pet below, then click a room to assign it. You can also drag pets onto rooms."
              : "Choose the room type for your pet's stay."}
          </p>
        </div>
      </div>

      {/* Pet chips */}
      <div className="flex flex-wrap gap-2">
        {selectedPets.map((pet) => {
          const assignment = roomAssignments.find((ra) => ra.petId === pet.id);
          const assignedCat = assignment
            ? availability.find((a) => a.category.id === assignment.roomId)
                ?.category
            : null;
          const isActive = activePet?.id === pet.id;

          return (
            <button
              key={pet.id}
              type="button"
              draggable
              onDragStart={() => {
                setDraggedPet(pet);
                setActivePet(pet);
              }}
              onDragEnd={() => setDraggedPet(null)}
              onClick={() => setActivePet(isActive ? null : pet)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : assignedCat
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-border bg-card hover:border-primary/50",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary",
                )}
              >
                {pet.name[0]}
              </span>
              <span className="font-medium">{pet.name}</span>
              {assignedCat && !isActive && (
                <span className="text-[10px] opacity-70">
                  · {assignedCat.name}
                </span>
              )}
              {assignment && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    unassignPet(pet.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      unassignPet(pet.id);
                    }
                  }}
                  className={cn(
                    "ml-0.5 rounded-full p-0.5 transition-colors",
                    isActive
                      ? "hover:bg-white/20"
                      : "text-muted-foreground hover:bg-red-100 hover:text-red-600",
                  )}
                >
                  <X className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active pet prompt */}
      {activePet && (
        <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
            {activePet.name[0]}
          </span>
          <span>
            Select a room for <strong>{activePet.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => setActivePet(null)}
            className="ml-auto rounded-sm p-0.5 hover:bg-black/5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {allAssigned && selectedPets.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Check className="size-4 shrink-0" />
          All pets assigned — you can continue to the next step.
        </div>
      )}

      {/* Room category cards */}
      {availability.length === 0 ? (
        <div className="bg-muted/30 rounded-xl border border-dashed p-8 text-center">
          <div className="bg-muted mx-auto mb-3 flex size-12 items-center justify-center rounded-xl">
            <Bed className="text-muted-foreground/60 size-6" />
          </div>
          <p className="text-sm font-semibold">No room categories set up yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Add categories in Boarding → Rooms & Suites to enable bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {availability.map(
            ({
              category,
              totalActive,
              availableUnits,
              eligible,
              eligibilityMessage,
            }) => {
              const petsHere = roomAssignments
                .filter((ra) => ra.roomId === category.id)
                .map((ra) => selectedPets.find((p) => p.id === ra.petId))
                .filter(Boolean) as Pet[];

              const isFullyBooked = availableUnits === 0;
              const isDragOver = dragOverCatId === category.id;
              const canDrop =
                !isFullyBooked &&
                (eligible || !activePet) &&
                (draggedPet || activePet);
              const pct =
                totalActive > 0
                  ? ((totalActive - availableUnits) / totalActive) * 100
                  : 0;

              return (
                <div
                  key={category.id}
                  onClick={() => {
                    if (activePet && !isFullyBooked && eligible) {
                      assignPet(activePet, category.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCatId(category.id);
                  }}
                  onDragLeave={() => setDragOverCatId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCatId(null);
                    if (draggedPet && !isFullyBooked && eligible) {
                      assignPet(draggedPet, category.id);
                    }
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border-2 transition-all duration-200",
                    activePet && !isFullyBooked && eligible
                      ? "cursor-pointer"
                      : activePet && (isFullyBooked || !eligible)
                        ? "cursor-not-allowed"
                        : "",
                    isDragOver && canDrop
                      ? "border-primary/70 shadow-lg scale-[1.02]"
                      : petsHere.length > 0
                        ? "border-primary/70 shadow-md"
                        : "border-border hover:border-primary/30 hover:shadow-sm",
                    (isFullyBooked || (!eligible && activePet)) && "opacity-70",
                  )}
                >
                  {/* Image area */}
                  <div className="bg-muted relative h-36 w-full overflow-hidden">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Bed className="text-muted-foreground/20 size-14" />
                      </div>
                    )}

                    {/* Price badge */}
                    {category.defaultBasePrice != null && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-foreground/80 text-background rounded-lg px-2 py-1 text-xs font-bold backdrop-blur-sm">
                          ${category.defaultBasePrice}/night
                        </span>
                      </div>
                    )}

                    {/* Assigned pet avatars */}
                    {petsHere.length > 0 && (
                      <div className="absolute top-2.5 right-2.5 flex gap-1">
                        {petsHere.map((pet) => (
                          <div
                            key={pet.id}
                            className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-sm"
                          >
                            {pet.name[0]}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Fully booked overlay */}
                    {isFullyBooked && (
                      <div className="bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm">
                          No rooms available
                        </span>
                      </div>
                    )}

                    {/* Drop-zone highlight */}
                    {isDragOver && canDrop && (
                      <div className="border-primary/60 absolute inset-0 flex items-center justify-center border-4 border-dashed bg-white/20">
                        <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-sm">
                          Drop here
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="space-y-3 p-4">
                    <div>
                      <h4 className="leading-tight font-semibold">
                        {category.name}
                      </h4>
                      {category.description && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Availability bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Availability
                        </span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            isFullyBooked
                              ? "text-red-600"
                              : availableUnits <= 1
                                ? "text-orange-500"
                                : "text-emerald-600",
                          )}
                        >
                          {availableUnits} / {totalActive} rooms free
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            pct >= 100
                              ? "bg-red-500"
                              : pct >= 70
                                ? "bg-orange-400"
                                : "bg-emerald-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Ineligibility notice (only when a pet is selected and it doesn't qualify) */}
                    {!eligible && eligibilityMessage && activePet && (
                      <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                        <p className="text-[11px] text-amber-700">
                          {eligibilityMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Boarding Add-Ons Sub-Step (uses configured add-ons from settings)
// ============================================================================

function BoardingAddOnsSubStep({
  isStepAccessible,
  extraServices,
  setExtraServices,
  selectedPets,
  serviceType,
}: {
  isStepAccessible: (step: number) => boolean;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
  serviceType: string;
}) {
  // Auto-inject included add-ons from the selected boarding rate on first render
  const injectedRef = useRef(false);
  useEffect(() => {
    if (injectedRef.current || !isStepAccessible(2) || selectedPets.length === 0) return;
    injectedRef.current = true;

    // Match the rate by category keyword in name (standard/deluxe/vip/premium/luxury)
    const needle = serviceType.toLowerCase();
    const matchingRate = boardingRates.find(
      (r) => r.isActive && r.name.toLowerCase().includes(needle),
    ) ?? boardingRates.find((r) => r.isActive);

    const includedIds: string[] = matchingRate?.includedAddOnIds ?? [];
    if (includedIds.length === 0) return;

    const toInject = selectedPets.flatMap((pet) =>
      includedIds.map((id) => ({ serviceId: id, quantity: 0, petId: pet.id })),
    );
    const existing = new Set(extraServices.map((es) => `${es.serviceId}:${es.petId}`));
    const novel = toInject.filter((e) => !existing.has(`${e.serviceId}:${e.petId}`));
    if (novel.length > 0) setExtraServices([...extraServices, ...novel]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStepAccessible, selectedPets.length]);

  const boardingAddOns = getStoredAddOns().filter((a) => {
    if (!a.isActive || !a.applicableServices.includes("boarding")) return false;
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
          Add optional services to enhance your pet&apos;s boarding experience
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
          {boardingAddOns.map((service) => {
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
