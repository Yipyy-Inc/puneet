"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, PawPrint, Bed } from "lucide-react";
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
import type { ServiceAddOn } from "@/types/facility";

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

const BOARDING_TYPES = [
  {
    id: "standard",
    name: "Standard Room",
    price: 45,
    description: "Comfortable indoor kennel with bedding",
    image: "/rooms/room-1.jpg",
    totalRooms: 10,
    bookedRooms: 7,
    allowedPetTypes: ["Dog", "Cat"],
    included: ["Bedding", "Daily feeding", "Potty breaks"],
  },
  {
    id: "deluxe",
    name: "Deluxe Suite",
    price: 75,
    description: "Spacious suite with play area and webcam",
    image: "/rooms/room-2.jpg",
    totalRooms: 5,
    bookedRooms: 2,
    allowedPetTypes: ["Dog", "Cat"],
    included: ["Luxury bedding", "Play area", "Webcam access"],
  },
  {
    id: "vip",
    name: "VIP Suite",
    price: 120,
    description: "Luxury suite with private outdoor access",
    image: "/rooms/room-3.jpg",
    totalRooms: 3,
    bookedRooms: 1,
    allowedPetTypes: ["Dog", "Cat"],
    included: ["Premium bedding", "Private outdoor run", "One-on-one time"],
  },
];

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
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Select Room Type</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Select a pet, then click a room type — or drag & drop pets into
                room types
              </p>
            </div>

            {!isStepAccessible(1) && (
              <div className="bg-muted/50 rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Please complete the Schedule step first
                </p>
              </div>
            )}

            {isStepAccessible(1) && (
              <>
                {/* Unassigned Pets */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unassigned Pets</Label>
                  <div className="bg-muted/20 flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed p-3">
                    {selectedPets
                      .filter(
                        (pet) =>
                          !roomAssignments.find((a) => a.petId === pet.id),
                      )
                      .map((pet) => (
                        <div
                          key={pet.id}
                          draggable
                          onDragStart={() => setDraggedPet(pet)}
                          onDragEnd={() => setDraggedPet(null)}
                          onClick={() =>
                            setSelectedPet(
                              selectedPet?.id === pet.id ? null : pet,
                            )
                          }
                          onDoubleClick={() =>
                            setSelectedPet(
                              selectedPet?.id === pet.id ? null : pet,
                            )
                          }
                          className={cn(
                            "bg-background flex cursor-move items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all",
                            selectedPet?.id === pet.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/50",
                          )}
                        >
                          {/* #4 — pet initial avatar */}
                          <div className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                            {pet.name[0]}
                          </div>
                          <span className="text-sm font-medium">
                            {pet.name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({pet.type})
                          </span>
                        </div>
                      ))}
                    {selectedPets.filter(
                      (pet) => !roomAssignments.find((a) => a.petId === pet.id),
                    ).length === 0 && (
                      <p className="text-muted-foreground py-1 text-sm">
                        All pets assigned
                      </p>
                    )}
                  </div>
                </div>

                {/* Rooms */}
                <div className="grid grid-cols-2 gap-3">
                  {BOARDING_TYPES.map((type) => {
                    const availableRooms = type.totalRooms - type.bookedRooms;
                    const assignedPets = selectedPets.filter((pet) =>
                      roomAssignments.find(
                        (a) => a.petId === pet.id && a.roomId === type.id,
                      ),
                    );
                    const isDraggedPetAllowed = draggedPet
                      ? type.allowedPetTypes.includes(draggedPet.type)
                      : true;
                    const isSelectedPetAllowed = selectedPet
                      ? type.allowedPetTypes.includes(selectedPet.type)
                      : true;
                    const isPetAllowed =
                      isDraggedPetAllowed && isSelectedPetAllowed;
                    const isRoomFull = availableRooms <= 0;
                    const isRoomDisabled = isRoomFull || !isPetAllowed;
                    const hasAssigned = assignedPets.length > 0;
                    const remaining = availableRooms - assignedPets.length;
                    // #1 — reactive drag-over state
                    const isDragOver =
                      dragOverRoomId === type.id && !isRoomDisabled;
                    // #2/#3 — invite state
                    const showInvite =
                      !isRoomDisabled &&
                      !hasAssigned &&
                      remaining > 0 &&
                      ((draggedPet && isDraggedPetAllowed) ||
                        (selectedPet && isSelectedPetAllowed));

                    return (
                      <div
                        key={type.id}
                        // #1 — reactive state
                        onDragOver={(e) => {
                          if (!isRoomDisabled) {
                            e.preventDefault();
                            setDragOverRoomId(type.id);
                          }
                        }}
                        onDragLeave={() => setDragOverRoomId(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverRoomId(null);
                          if (
                            draggedPet &&
                            availableRooms > assignedPets.length &&
                            isPetAllowed
                          ) {
                            setRoomAssignments([
                              ...roomAssignments.filter(
                                (a) => a.petId !== draggedPet.id,
                              ),
                              { petId: draggedPet.id, roomId: type.id },
                            ]);
                            if (!serviceType) {
                              setServiceType(type.id);
                            }
                          }
                        }}
                        onClick={() => {
                          const unassigned = selectedPets.filter(
                            (pet) =>
                              !roomAssignments.find((a) => a.petId === pet.id),
                          );
                          const petToAssign =
                            selectedPet ??
                            (selectedPets.length === 1
                              ? selectedPets[0]
                              : null) ??
                            (unassigned.length === 1 ? unassigned[0] : null);

                          if (
                            petToAssign &&
                            availableRooms > assignedPets.length &&
                            type.allowedPetTypes.includes(petToAssign.type)
                          ) {
                            setRoomAssignments([
                              ...roomAssignments.filter(
                                (a) => a.petId !== petToAssign.id,
                              ),
                              { petId: petToAssign.id, roomId: type.id },
                            ]);
                            setSelectedPet(null);
                            if (!serviceType) {
                              setServiceType(type.id);
                            }
                          }
                        }}
                        className={cn(
                          "group flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 select-none",
                          isRoomDisabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
                          isDragOver && "ring-primary ring-2 ring-offset-2",
                          hasAssigned
                            ? "border-primary ring-primary/20 shadow-md ring-2 ring-offset-2"
                            : showInvite
                              ? "border-primary/40 border-dashed"
                              : "border-border hover:border-primary/40",
                        )}
                      >
                        {/* Image area — #6: consistent unoptimized */}
                        <div className="relative h-36 w-full overflow-hidden">
                          {type.image ? (
                            <Image
                              src={type.image}
                              alt={type.name}
                              fill
                              className={cn(
                                "object-cover transition-transform duration-300",
                                !isRoomDisabled && "group-hover:scale-105",
                              )}
                              unoptimized
                            />
                          ) : (
                            <div className="bg-muted flex size-full items-center justify-center">
                              <PawPrint className="text-muted-foreground/30 size-12" />
                            </div>
                          )}

                          {/* Price badge — top left */}
                          <div className="bg-foreground/80 text-background absolute top-2.5 left-2.5 rounded-lg px-2 py-1 text-xs font-bold backdrop-blur-sm">
                            ${type.price}
                            <span className="font-normal opacity-70">
                              /night
                            </span>
                          </div>

                          {/* Assigned pet count badge */}
                          {hasAssigned && (
                            <div className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-md">
                              {assignedPets.length}
                            </div>
                          )}

                          {/* Fully booked overlay */}
                          {isRoomFull && (
                            <div className="bg-background/75 absolute inset-0 flex items-center justify-center">
                              <span className="bg-destructive/10 text-destructive rounded-full border border-red-200 px-3 py-1 text-xs font-semibold">
                                Fully Booked
                              </span>
                            </div>
                          )}

                          {/* Pet type blocked overlay */}
                          {draggedPet && !isDraggedPetAllowed && (
                            <div className="bg-background/75 absolute inset-0 flex items-center justify-center">
                              <span className="text-muted-foreground text-xs font-semibold">
                                Not allowed for {draggedPet.type}s
                              </span>
                            </div>
                          )}
                          {selectedPet &&
                            !isSelectedPetAllowed &&
                            !(draggedPet && !isDraggedPetAllowed) && (
                              <div className="bg-background/75 absolute inset-0 flex items-center justify-center">
                                <span className="text-muted-foreground text-xs font-semibold">
                                  Not allowed for {selectedPet.type}s
                                </span>
                              </div>
                            )}
                        </div>

                        {/* Content strip */}
                        <div className="p-3.5">
                          <p className="text-sm/tight font-semibold">
                            {type.name}
                          </p>
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {type.description}
                          </p>

                          {/* #5 — included amenities */}
                          {type.included.length > 0 && !hasAssigned && (
                            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                              {type.included.map((item) => (
                                <span
                                  key={item}
                                  className="text-muted-foreground text-[10px]"
                                >
                                  · {item}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Assigned pets with #4 — avatars */}
                          {hasAssigned && (
                            <div className="mt-2 flex flex-wrap gap-1">
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
                                      setRoomAssignments(
                                        roomAssignments.filter(
                                          (a) => a.petId !== pet.id,
                                        ),
                                      );
                                    }}
                                    className="hover:text-destructive ml-0.5 transition-colors"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Availability + pet types */}
                          <div className="mt-2.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {type.allowedPetTypes.join(", ")}
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                remaining <= 0 && "text-destructive",
                                remaining > 0 &&
                                  remaining <= 2 &&
                                  "text-orange-600",
                                remaining > 2 && "text-emerald-600",
                              )}
                            >
                              {remaining}/{type.totalRooms}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {currentSubStep === 2 && (
          <BoardingAddOnsSubStep
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
// Boarding Add-Ons Sub-Step (uses configured add-ons from settings)
// ============================================================================

function BoardingAddOnsSubStep({
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
        <div className="grid grid-cols-2 gap-3">
          {boardingAddOns.map((service) => {
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
