"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pet } from "@/lib/types";

interface FeedingScheduleItem {
  id: string;
  petId?: number;
  name: string;
  time: string;
  amount: string;
  unit: string;
  type: string;
  source: string;
  instructions: string;
  notes: string;
}

interface MedicationItem {
  id: string;
  petId?: number;
  name: string;
  time: string;
  amount: string;
  unit: string;
  type: string;
  source: string;
  instructions: string;
  notes: string;
}

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
  const [draggedPet, setDraggedPet] = React.useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null);

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
                minDate={new Date()}
                showTimeSelection
                dateTimes={boardingDateTimes}
                onDateTimesChange={(times) => {
                  setBoardingDateTimes(times);
                  if (times.length > 0) {
                    setCheckInTime(times[0].checkInTime);
                    setCheckOutTime(times[times.length - 1].checkOutTime);
                  }
                }}
                defaultCheckInTime="14:00"
                defaultCheckOutTime="11:00"
              />
            </div>
          </div>
        )}

        {currentSubStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Select Room Type</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop pets into room types or double-click pets and
                click on rooms
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
                          if (
                            selectedPet &&
                            availableRooms > assignedPets.length &&
                            type.allowedPetTypes.includes(selectedPet.type)
                          ) {
                            setRoomAssignments([
                              ...roomAssignments.filter(
                                (a) => a.petId !== selectedPet.id,
                              ),
                              { petId: selectedPet.id, roomId: type.id },
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
              <h3 className="text-base font-semibold">Extra Services</h3>
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
                <div className="grid grid-cols-2 gap-6">
                  {/* Feeding Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Feeding Instructions
                    </h4>
                    <div className="space-y-3">
                      {feedingSchedule.map((item, index) => (
                        <Card key={item.id}>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <Label className="text-sm font-medium">
                                Schedule #{index + 1}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFeedingSchedule(
                                    feedingSchedule.filter(
                                      (_, i) => i !== index,
                                    ),
                                  );
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            <div>
                              <Label className="text-xs">Schedule Name</Label>
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...feedingSchedule];
                                  updated[index].name = e.target.value;
                                  setFeedingSchedule(updated);
                                }}
                                placeholder="e.g., Morning Feeding"
                              />
                            </div>
                            {selectedPets.length > 1 && (
                              <div>
                                <Label className="text-xs">Pet</Label>
                                <Select
                                  value={item.petId?.toString() || ""}
                                  onValueChange={(value) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].petId = parseInt(value);
                                    setFeedingSchedule(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select pet" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedPets.map((pet) => (
                                      <SelectItem
                                        key={pet.id}
                                        value={pet.id.toString()}
                                      >
                                        {pet.name} ({pet.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Time</Label>
                                <Select
                                  value={item.time}
                                  onValueChange={(value) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].time = value;
                                    setFeedingSchedule(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                    <SelectItem value="Noon">Noon</SelectItem>
                                    <SelectItem value="Evening">
                                      Evening
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Amount</Label>
                                <Input
                                  value={item.amount}
                                  onChange={(e) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].amount = e.target.value;
                                    setFeedingSchedule(updated);
                                  }}
                                  placeholder="e.g., 1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Unit</Label>
                                <Select
                                  value={item.unit}
                                  onValueChange={(value) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].unit = value;
                                    setFeedingSchedule(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cup">Cup</SelectItem>
                                    <SelectItem value="oz">Oz</SelectItem>
                                    <SelectItem value="g">Grams</SelectItem>
                                    <SelectItem value="scoop">Scoop</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={item.type}
                                  onValueChange={(value) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].type = value;
                                    setFeedingSchedule(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dry">
                                      Dry Food
                                    </SelectItem>
                                    <SelectItem value="wet">
                                      Wet Food
                                    </SelectItem>
                                    <SelectItem value="raw">
                                      Raw Food
                                    </SelectItem>
                                    <SelectItem value="treats">
                                      Treats
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Source</Label>
                                <Select
                                  value={item.source}
                                  onValueChange={(value) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].source = value;
                                    setFeedingSchedule(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="owner">
                                      Owner Provides
                                    </SelectItem>
                                    <SelectItem value="facility">
                                      Facility Provides
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Instructions</Label>
                                <Select
                                  value={item.instructions}
                                  onValueChange={(value) => {
                                    const updated = [...feedingSchedule];
                                    updated[index].instructions = value;
                                    setFeedingSchedule(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="slow_feed">
                                      Slow Feed
                                    </SelectItem>
                                    <SelectItem value="separate">
                                      Feed Separately
                                    </SelectItem>
                                    <SelectItem value="mixed">
                                      Mix with Water
                                    </SelectItem>
                                    <SelectItem value="normal">
                                      Normal
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Feeding Notes</Label>
                              <Textarea
                                value={item.notes}
                                onChange={(e) => {
                                  const updated = [...feedingSchedule];
                                  updated[index].notes = e.target.value;
                                  setFeedingSchedule(updated);
                                }}
                                placeholder="Additional notes..."
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFeedingSchedule([
                            ...feedingSchedule,
                            {
                              id: `feeding-${Date.now()}`,
                              petId:
                                selectedPets.length === 1
                                  ? selectedPets[0].id
                                  : undefined,
                              name: "",
                              time: "",
                              amount: "",
                              unit: "",
                              type: "",
                              source: "",
                              instructions: "",
                              notes: "",
                            },
                          ]);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Feeding Schedule
                      </Button>
                    </div>
                  </div>

                  {/* Medication Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Medication Instructions
                    </h4>
                    <div className="space-y-3">
                      {medications.map((item, index) => (
                        <Card key={item.id}>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <Label className="text-sm font-medium">
                                Medication #{index + 1}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMedications(
                                    medications.filter((_, i) => i !== index),
                                  );
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            <div>
                              <Label className="text-xs">Medication Name</Label>
                              <Input
                                value={item.name}
                                onChange={(e) => {
                                  const updated = [...medications];
                                  updated[index].name = e.target.value;
                                  setMedications(updated);
                                }}
                                placeholder="e.g., Heartworm Prevention"
                              />
                            </div>
                            {selectedPets.length > 1 && (
                              <div>
                                <Label className="text-xs">Pet</Label>
                                <Select
                                  value={item.petId?.toString() || ""}
                                  onValueChange={(value) => {
                                    const updated = [...medications];
                                    updated[index].petId = parseInt(value);
                                    setMedications(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select pet" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedPets.map((pet) => (
                                      <SelectItem
                                        key={pet.id}
                                        value={pet.id.toString()}
                                      >
                                        {pet.name} ({pet.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Time</Label>
                                <Select
                                  value={item.time}
                                  onValueChange={(value) => {
                                    const updated = [...medications];
                                    updated[index].time = value;
                                    setMedications(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                    <SelectItem value="Noon">Noon</SelectItem>
                                    <SelectItem value="Evening">
                                      Evening
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Amount</Label>
                                <Input
                                  value={item.amount}
                                  onChange={(e) => {
                                    const updated = [...medications];
                                    updated[index].amount = e.target.value;
                                    setMedications(updated);
                                  }}
                                  placeholder="e.g., 1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Unit</Label>
                                <Select
                                  value={item.unit}
                                  onValueChange={(value) => {
                                    const updated = [...medications];
                                    updated[index].unit = value;
                                    setMedications(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pill">Pill</SelectItem>
                                    <SelectItem value="ml">ML</SelectItem>
                                    <SelectItem value="mg">MG</SelectItem>
                                    <SelectItem value="drop">
                                      Drop(s)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Type</Label>
                                <Select
                                  value={item.type}
                                  onValueChange={(value) => {
                                    const updated = [...medications];
                                    updated[index].type = value;
                                    setMedications(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="oral">Oral</SelectItem>
                                    <SelectItem value="topical">
                                      Topical
                                    </SelectItem>
                                    <SelectItem value="injection">
                                      Injection
                                    </SelectItem>
                                    <SelectItem value="eye_ear">
                                      Eye/Ear Drops
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Source</Label>
                                <Select
                                  value={item.source}
                                  onValueChange={(value) => {
                                    const updated = [...medications];
                                    updated[index].source = value;
                                    setMedications(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="owner">
                                      Owner Provides
                                    </SelectItem>
                                    <SelectItem value="facility">
                                      Facility Provides
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Instructions</Label>
                                <Select
                                  value={item.instructions}
                                  onValueChange={(value) => {
                                    const updated = [...medications];
                                    updated[index].instructions = value;
                                    setMedications(updated);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="with_food">
                                      With Food
                                    </SelectItem>
                                    <SelectItem value="empty_stomach">
                                      Empty Stomach
                                    </SelectItem>
                                    <SelectItem value="as_needed">
                                      As Needed
                                    </SelectItem>
                                    <SelectItem value="regular">
                                      Regular Schedule
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">
                                Medication Notes
                              </Label>
                              <Textarea
                                value={item.notes}
                                onChange={(e) => {
                                  const updated = [...medications];
                                  updated[index].notes = e.target.value;
                                  setMedications(updated);
                                }}
                                placeholder="Additional notes..."
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setMedications([
                            ...medications,
                            {
                              id: `medication-${Date.now()}`,
                              petId:
                                selectedPets.length === 1
                                  ? selectedPets[0].id
                                  : undefined,
                              name: "",
                              time: "",
                              amount: "",
                              unit: "",
                              type: "",
                              source: "",
                              instructions: "",
                              notes: "",
                            },
                          ]);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Medication
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
