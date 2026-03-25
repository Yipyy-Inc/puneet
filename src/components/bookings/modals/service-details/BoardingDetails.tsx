"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { Pet, FeedingScheduleItem, MedicationItem } from "@/lib/types";
import { FeedingScheduleForm } from "@/components/booking/shared/FeedingScheduleForm";
import { MedicationForm } from "@/components/booking/shared/MedicationForm";

interface ExtraService {
  id: string;
  name: string;
  description: string;
  image: string;
  hasUnits: boolean;
  pricePerUnit?: number;
  unit?: string;
  basePrice?: number;
}

const EXTRA_SERVICES: ExtraService[] = [
  {
    id: "extended-walk",
    name: "Extended Walk",
    description:
      "Additional 30-minute walk session for your pet to burn extra energy and explore",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop",
    hasUnits: true,
    pricePerUnit: 15,
    unit: "walk",
  },
  {
    id: "playtime-plus",
    name: "Playtime Plus",
    description:
      "Extra supervised play session with interactive toys and games",
    image:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop",
    hasUnits: true,
    pricePerUnit: 12,
    unit: "session",
  },
  {
    id: "one-on-one",
    name: "One-on-One Attention",
    description:
      "Dedicated individual time with a staff member for personalized care and attention",
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=300&fit=crop",
    hasUnits: true,
    pricePerUnit: 20,
    unit: "hour",
  },
  {
    id: "bath-groom",
    name: "Bath & Groom",
    description:
      "Full bathing and grooming service before checkout to keep your pet fresh",
    image:
      "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=300&fit=crop",
    hasUnits: false,
    basePrice: 35,
  },
  {
    id: "video-call",
    name: "Daily Video Call",
    description:
      "Scheduled daily video call to check in on your pet during their stay",
    image:
      "https://images.unsplash.com/photo-1587559070757-f72da2f829a8?w=400&h=300&fit=crop",
    hasUnits: false,
    basePrice: 10,
  },
  {
    id: "treat-time",
    name: "Premium Treat Time",
    description:
      "Special gourmet treats and enrichment activities throughout the day",
    image:
      "https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=400&h=300&fit=crop",
    hasUnits: false,
    basePrice: 10,
  },
];

const BOARDING_TYPES = [
  {
    id: "standard",
    name: "Standard Room",
    price: 45,
    description: "Comfortable indoor kennel with bedding",
    image: "/rooms/room-1.jpg",
    totalRooms: 10,
    bookedRooms: 7, // This would come from future bookings data
    allowedPetTypes: ["Dog", "Cat"],
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
  } = useSettings();
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);

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
          <div className="space-y-4">
            <div>
              <Label className="text-base">Select Boarding Dates</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Choose check-in and check-out dates for boarding
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> Click on the start date and
                  drag or click on the end date to select a range for boarding.
                  Set check-in and check-out times for the stay.
                </p>
              </div>
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
              />
            </div>
          </div>
        )}

        {currentSubStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Select Room Type</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select a pet, then click a room type — or drag & drop pets into
                room types
              </p>
            </div>

            {!isStepAccessible(1) && (
              <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
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
                  <div className="flex flex-wrap gap-2 p-3 border-2 border-dashed rounded-lg min-h-20 bg-muted/30">
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
                          className={`flex items-center gap-2 px-3 py-2 bg-background border-2 rounded-lg cursor-move hover:border-primary/50 transition-colors ${
                            selectedPet?.id === pet.id
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <PawPrint className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {pet.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({pet.type})
                          </span>
                        </div>
                      ))}
                    {selectedPets.filter(
                      (pet) => !roomAssignments.find((a) => a.petId === pet.id),
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        All pets assigned
                      </p>
                    )}
                  </div>
                </div>

                {/* Rooms */}
                <div className="grid grid-cols-2 gap-4">
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
                    const isRoomDisabled =
                      availableRooms === 0 || !isPetAllowed;

                    return (
                      <div
                        key={type.id}
                        onDragOver={(e) => {
                          if (!isRoomDisabled) {
                            e.preventDefault();
                            e.currentTarget.classList.add(
                              "ring-2",
                              "ring-primary",
                            );
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove(
                            "ring-2",
                            "ring-primary",
                          );
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove(
                            "ring-2",
                            "ring-primary",
                          );
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
                            // Set serviceType to first assigned room type
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
                            (selectedPets.length === 1 ? selectedPets[0] : null) ??
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
                            // Set serviceType to first assigned room type
                            if (!serviceType) {
                              setServiceType(type.id);
                            }
                          }
                        }}
                        className={`flex flex-col border-2 rounded-lg transition-all overflow-hidden ${
                          isRoomDisabled
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer"
                        } ${assignedPets.length > 0 ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className="relative w-full h-48 overflow-hidden bg-muted">
                          {type.image ? (
                            <>
                              <img
                                src={type.image}
                                alt={type.name}
                                className="w-full h-full object-cover"
                              />
                              {assignedPets.length > 0 && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-semibold">
                                  {assignedPets.length}
                                </div>
                              )}
                              {availableRooms === 0 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-sm font-semibold">
                                    Fully Booked
                                  </span>
                                </div>
                              )}
                              {draggedPet && !isDraggedPetAllowed && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-sm font-semibold">
                                    Not allowed for {draggedPet.type}s
                                  </span>
                                </div>
                              )}
                              {selectedPet && !isSelectedPetAllowed && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-sm font-semibold">
                                    Not allowed for {selectedPet.type}s
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-muted-foreground text-sm">
                                No image available
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-base">
                              {type.name}
                            </p>
                            <p className="font-bold text-lg">
                              ${type.price}
                              <span className="text-sm text-muted-foreground font-normal">
                                /night
                              </span>
                            </p>
                          </div>
                          <div className="mb-2">
                            <p className="text-sm text-muted-foreground">
                              {type.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Allowed: {type.allowedPetTypes.join(", ")}
                            </p>
                          </div>

                          {/* Assigned Pets in this room */}
                          {assignedPets.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                              {assignedPets.map((pet) => (
                                <div
                                  key={pet.id}
                                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs"
                                >
                                  <span>{pet.name}</span>
                                  <button
                                    onClick={() => {
                                      setRoomAssignments(
                                        roomAssignments.filter(
                                          (a) => a.petId !== pet.id,
                                        ),
                                      );
                                    }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Availability:
                              </span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  availableRooms - assignedPets.length === 0 &&
                                    "text-destructive",
                                  availableRooms - assignedPets.length > 0 &&
                                    availableRooms - assignedPets.length <= 2 &&
                                    "text-orange-600",
                                  availableRooms - assignedPets.length > 2 &&
                                    "text-green-600",
                                )}
                              >
                                {availableRooms - assignedPets.length}/
                                {type.totalRooms}
                              </span>
                            </div>
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
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Add-ons</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add optional services to enhance your pet&apos;s boarding
                experience
              </p>
            </div>

            {!isStepAccessible(2) && (
              <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  Please complete the previous steps first
                </p>
              </div>
            )}

            {isStepAccessible(2) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXTRA_SERVICES.map((service) => {
                    const totalQuantity = extraServices
                      .filter((es) => es.serviceId === service.id)
                      .reduce((sum, es) => sum + es.quantity, 0);

                    return (
                      <Card
                        key={service.id}
                        className={cn(
                          "overflow-hidden transition-all",
                          totalQuantity > 0 && "ring-2 ring-primary",
                        )}
                      >
                        <img
                          src={service.image}
                          alt={service.name}
                          className="w-full h-32 object-cover"
                        />
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm">
                              {service.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {service.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {service.hasUnits ? (
                                <>
                                  ${service.pricePerUnit} / {service.unit}
                                </>
                              ) : (
                                <>${service.basePrice}</>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {selectedPets.map((pet) => {
                              const petService = extraServices.find(
                                (es) =>
                                  es.serviceId === service.id &&
                                  es.petId === pet.id,
                              );
                              const quantity = petService?.quantity || 0;

                              return (
                                <div
                                  key={pet.id}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm text-muted-foreground">
                                    {pet.name}
                                  </span>

                                  {service.hasUnits ? (
                                    <div className="flex items-center gap-2">
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
                                        className="h-7 w-7 p-0"
                                      >
                                        -
                                      </Button>
                                      <span className="text-sm font-medium min-w-[2ch] text-center">
                                        {quantity}
                                      </span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (petService) {
                                            const updated = extraServices.map(
                                              (es) =>
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
                                        className="h-7 w-7 p-0"
                                      >
                                        +
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant={
                                        quantity > 0 ? "default" : "outline"
                                      }
                                      size="sm"
                                      onClick={() => {
                                        if (quantity > 0) {
                                          const updated = extraServices.filter(
                                            (es) =>
                                              !(
                                                es.serviceId === service.id &&
                                                es.petId === pet.id
                                              ),
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
                                      className="h-7"
                                    >
                                      {quantity > 0 ? (
                                        <>
                                          <Check className="h-3 w-3 mr-1" />
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {currentSubStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Feeding & Medication</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add feeding schedules and medication details for your pet
                (optional)
              </p>
            </div>

            {!isStepAccessible(3) && (
              <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  Please complete the previous steps first
                </p>
              </div>
            )}

            {isStepAccessible(3) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Feeding Section */}
                  <FeedingScheduleForm
                    feedingSchedule={feedingSchedule}
                    setFeedingSchedule={setFeedingSchedule}
                    selectedPets={selectedPets.map((p) => ({ id: p.id, name: p.name, type: p.type }))}
                  />

                  {/* Medication Section */}
                  <MedicationForm
                    medications={medications}
                    setMedications={setMedications}
                    selectedPets={selectedPets.map((p) => ({ id: p.id, name: p.name, type: p.type }))}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
