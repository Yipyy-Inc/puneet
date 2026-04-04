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

const DAYCARE_ROOMS = [
  {
    id: "playroom-a",
    name: "Playroom A",
    description: "Main playroom for active dogs",
    capacity: 15,
    currentBookings: 12,
    imageUrl: "/rooms/room-1.jpg",
    allowedPetTypes: ["Dog"],
    included: ["Supervised play", "Water station", "Soft flooring"],
  },
  {
    id: "playroom-b",
    name: "Playroom B",
    description: "Smaller dogs and calm play",
    capacity: 10,
    currentBookings: 6,
    imageUrl: "/rooms/room-2.jpg",
    allowedPetTypes: ["Dog"],
    included: ["Calm environment", "Small-breed friendly", "Toys provided"],
  },
  {
    id: "quiet-zone",
    name: "Quiet Zone",
    description: "Low-energy pets and seniors",
    capacity: 8,
    currentBookings: 3,
    imageUrl: "/rooms/room-3.jpg",
    allowedPetTypes: ["Dog", "Cat"],
    included: ["Low noise", "Senior-friendly", "Cozy bedding"],
  },
  {
    id: "outdoor-yard",
    name: "Outdoor Yard",
    description: "Outdoor supervised play area",
    capacity: 20,
    currentBookings: 15,
    allowedPetTypes: ["Dog"],
    included: ["Open air", "Agility obstacles", "Shade area"],
  },
];

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
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = React.useState<string | null>(
    null,
  );

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
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Room Assignment</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Drag and drop pets into rooms or double-click pets and click on
                rooms
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
                  {DAYCARE_ROOMS.map((room) => {
                    const availableSpots = room.capacity - room.currentBookings;
                    const assignedPets = selectedPets.filter((pet) =>
                      roomAssignments.find(
                        (a) => a.petId === pet.id && a.roomId === room.id,
                      ),
                    );
                    const isDraggedPetAllowed = draggedPet
                      ? room.allowedPetTypes.includes(draggedPet.type)
                      : true;
                    const isSelectedPetAllowed = selectedPet
                      ? room.allowedPetTypes.includes(selectedPet.type)
                      : true;
                    const isPetAllowed =
                      isDraggedPetAllowed && isSelectedPetAllowed;
                    const isRoomFull = availableSpots <= 0;
                    const isRoomDisabled = isRoomFull || !isPetAllowed;
                    const hasAssigned = assignedPets.length > 0;
                    const remaining = availableSpots - assignedPets.length;
                    // #1 — reactive drag-over state
                    const isDragOver =
                      dragOverRoomId === room.id && !isRoomDisabled;
                    // #2/#3 — invite state: glow when a pet is being dragged/selected and room is compatible
                    const showInvite =
                      !isRoomDisabled &&
                      !hasAssigned &&
                      remaining > 0 &&
                      ((draggedPet && isDraggedPetAllowed) ||
                        (selectedPet && isSelectedPetAllowed));

                    return (
                      <div
                        key={room.id}
                        // #1 — reactive state instead of imperative classList
                        onDragOver={(e) => {
                          if (!isRoomDisabled) {
                            e.preventDefault();
                            setDragOverRoomId(room.id);
                          }
                        }}
                        onDragLeave={() => setDragOverRoomId(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverRoomId(null);
                          if (
                            draggedPet &&
                            availableSpots > assignedPets.length &&
                            isPetAllowed
                          ) {
                            setRoomAssignments([
                              ...roomAssignments.filter(
                                (a) => a.petId !== draggedPet.id,
                              ),
                              { petId: draggedPet.id, roomId: room.id },
                            ]);
                          }
                        }}
                        onClick={() => {
                          if (
                            selectedPet &&
                            availableSpots > assignedPets.length &&
                            room.allowedPetTypes.includes(selectedPet.type)
                          ) {
                            setRoomAssignments([
                              ...roomAssignments.filter(
                                (a) => a.petId !== selectedPet.id,
                              ),
                              { petId: selectedPet.id, roomId: room.id },
                            ]);
                            setSelectedPet(null);
                          }
                        }}
                        className={cn(
                          "group flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 select-none",
                          isRoomDisabled
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
                          // #1 — drag-over highlight via state
                          isDragOver && "ring-primary ring-2 ring-offset-2",
                          hasAssigned
                            ? "border-primary ring-primary/20 shadow-md ring-2 ring-offset-2"
                            : // #2/#3 — invite pulsing border
                              showInvite
                              ? "border-primary/40 border-dashed"
                              : "border-border hover:border-primary/40",
                        )}
                      >
                        {/* Image area */}
                        <div className="relative h-36 w-full overflow-hidden">
                          {room.imageUrl ? (
                            <Image
                              src={room.imageUrl}
                              alt={room.name}
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

                          {/* Assigned pet count badge */}
                          {hasAssigned && (
                            <div className="bg-primary text-primary-foreground absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-xs font-bold shadow-md">
                              {assignedPets.length}
                            </div>
                          )}

                          {/* Full overlay */}
                          {isRoomFull && (
                            <div className="bg-background/75 absolute inset-0 flex items-center justify-center">
                              <span className="bg-destructive/10 text-destructive rounded-full border border-red-200 px-3 py-1 text-xs font-semibold">
                                Full
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
                            {room.name}
                          </p>
                          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                            {room.description}
                          </p>

                          {/* #5 — included amenities */}
                          {room.included.length > 0 && !hasAssigned && (
                            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                              {room.included.map((item) => (
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

                          {/* Availability */}
                          <div className="mt-2.5 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {room.allowedPetTypes.join(", ")}
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
                              {remaining}/{room.capacity}
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
        <div className="grid grid-cols-2 gap-3">
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
