"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PawPrint, Check } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import type { FeedingScheduleItem, MedicationItem } from "@/lib/types";
import { Pet } from "@/lib/types";
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
    id: "training-session",
    name: "Mini Training Session",
    description:
      "Quick 15-minute basic obedience training session during daycare",
    image:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=300&fit=crop",
    hasUnits: false,
    basePrice: 25,
  },
  {
    id: "spa-treatment",
    name: "Quick Spa Treatment",
    description:
      "Relaxing paw massage and aromatherapy session to help your pet unwind",
    image:
      "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400&h=300&fit=crop",
    hasUnits: false,
    basePrice: 18,
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

const DAYCARE_ROOMS = [
  {
    id: "playroom-a",
    name: "Playroom A",
    description: "Main playroom for active dogs",
    capacity: 15,
    currentBookings: 12, // Would come from future bookings data
    imageUrl: "/rooms/room-1.jpg",
    allowedPetTypes: ["Dog"],
  },
  {
    id: "playroom-b",
    name: "Playroom B",
    description: "Smaller dogs and calm play",
    capacity: 10,
    currentBookings: 6,
    imageUrl: "/rooms/room-2.jpg",
    allowedPetTypes: ["Dog"],
  },
  {
    id: "quiet-zone",
    name: "Quiet Zone",
    description: "Low-energy pets and seniors",
    capacity: 8,
    currentBookings: 3,
    imageUrl: "/rooms/room-3.jpg",
    allowedPetTypes: ["Dog", "Cat"],
  },
  {
    id: "outdoor-yard",
    name: "Outdoor Yard",
    description: "Outdoor supervised play area",
    capacity: 20,
    currentBookings: 15,
    allowedPetTypes: ["Dog"],
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
  } = useSettings();
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);

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
          <div>
            <Label className="text-base">Select Daycare Days</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Daycare type (Half Day or Full Day) will be automatically
              determined based on check-in/out times
            </p>
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
              dropOffPickUpWindowsByDate={dropOffPickUpWindowsByDateForDaycare}
              bookingRules={{
                minimumAdvanceBooking: rules.minimumAdvanceBooking,
                maximumAdvanceBooking: rules.maximumAdvanceBooking,
              }}
              disabledDates={blockedDatesForDaycare}
              disabledDateMessages={blockedDateMessagesForDaycare}
            />
          </div>
        )}

        {currentSubStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Room Assignment</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop pets into rooms or double-click pets and click on
                rooms
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
                    const isRoomDisabled =
                      availableSpots === 0 || !isPetAllowed;

                    return (
                      <div
                        key={room.id}
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
                        className={`flex flex-col border-2 rounded-lg transition-all overflow-hidden ${
                          isRoomDisabled
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-pointer"
                        } ${assignedPets.length > 0 ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <div className="relative w-full h-48 overflow-hidden bg-muted">
                          {room.imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={room.imageUrl}
                                alt={room.name}
                                className="w-full h-full object-cover"
                              />
                              {assignedPets.length > 0 && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-semibold">
                                  {assignedPets.length}
                                </div>
                              )}
                              {availableSpots === 0 && (
                                <div className="absolute top-2 right-2">
                                  <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded backdrop-blur-sm">
                                    Full
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
                          <div className="mb-2">
                            <p className="font-semibold text-base">
                              {room.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {room.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Allowed: {room.allowedPetTypes.join(", ")}
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

                          <div className="flex items-center gap-4 text-xs mt-2">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Available:
                              </span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  availableSpots - assignedPets.length === 0 &&
                                    "text-destructive",
                                  availableSpots - assignedPets.length > 0 &&
                                    availableSpots - assignedPets.length <= 2 &&
                                    "text-orange-600",
                                  availableSpots - assignedPets.length > 2 &&
                                    "text-green-600",
                                )}
                              >
                                {availableSpots - assignedPets.length}/
                                {room.capacity}
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
                Add optional services to enhance your pet&apos;s daycare
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
                  <FeedingScheduleForm
                    feedingSchedule={feedingSchedule}
                    setFeedingSchedule={setFeedingSchedule}
                    selectedPets={selectedPets.map((p) => ({ id: p.id, name: p.name, type: p.type }))}
                  />
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
