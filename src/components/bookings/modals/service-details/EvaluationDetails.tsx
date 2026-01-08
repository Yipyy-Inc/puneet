"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, Clock } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import type { Pet } from "@/lib/types";

// Helper to format date without timezone issues
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface EvaluationDetailsProps {
  currentSubStep: number;
  isSubStepComplete?: (stepIndex: number) => boolean;
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  evaluationTargetService: string;
  setEvaluationTargetService: (value: string) => void;
  evaluationEvaluator: string;
  setEvaluationEvaluator: (value: string) => void;
  evaluationSpace: string;
  setEvaluationSpace: (value: string) => void;
  evaluatorOptions: Array<{ value: string; label: string }>;
  selectedPets: Pet[];
}

type EvaluationTargetService = "daycare" | "boarding";

// NOTE: mock "existing rooms" (same idea as Daycare/Boarding details).
// Later this should come from backend / facility settings.
const DAYCARE_ROOMS = [
  {
    id: "playroom-a",
    name: "Playroom A",
    description: "Main playroom for active dogs",
    capacity: 15,
    currentBookings: 12,
    imageUrl: "/rooms/room-1.jpg",
  },
  {
    id: "playroom-b",
    name: "Playroom B",
    description: "Smaller dogs and calm play",
    capacity: 10,
    currentBookings: 6,
    imageUrl: "/rooms/room-2.jpg",
  },
  {
    id: "quiet-zone",
    name: "Quiet Zone",
    description: "Low-energy pets and seniors",
    capacity: 8,
    currentBookings: 3,
    imageUrl: "/rooms/room-3.jpg",
  },
  {
    id: "outdoor-yard",
    name: "Outdoor Yard",
    description: "Outdoor supervised play area",
    capacity: 20,
    currentBookings: 15,
  },
];

const BOARDING_TYPES = [
  {
    id: "standard",
    name: "Standard Room",
    description: "Comfortable indoor kennel with bedding",
    image: "/rooms/room-1.jpg",
    totalRooms: 10,
    bookedRooms: 7,
  },
  {
    id: "deluxe",
    name: "Deluxe Suite",
    description: "Spacious suite with play area and webcam",
    image: "/rooms/room-2.jpg",
    totalRooms: 5,
    bookedRooms: 2,
  },
  {
    id: "vip",
    name: "VIP Suite",
    description: "Luxury suite with private outdoor access",
    image: "/rooms/room-3.jpg",
    totalRooms: 3,
    bookedRooms: 1,
  },
];

export function EvaluationDetails({
  currentSubStep,
  isSubStepComplete,
  startDate,
  setStartDate,
  setCheckInTime,
  setCheckOutTime,
  evaluationTargetService,
  setEvaluationTargetService,
  evaluationEvaluator,
  setEvaluationEvaluator,
  evaluationSpace,
  setEvaluationSpace,
  evaluatorOptions,
}: EvaluationDetailsProps) {
  const { hours, rules, evaluation } = useSettings();
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);

  const isStepAccessible = React.useCallback(
    (stepIndex: number) => {
      if (stepIndex === 0) return true;
      if (!isSubStepComplete) return true;
      return isSubStepComplete(stepIndex - 1);
    },
    [isSubStepComplete],
  );

  const normalizedTarget =
    evaluationTargetService === "daycare" || evaluationTargetService === "boarding"
      ? (evaluationTargetService as EvaluationTargetService)
      : null;

  const roomOptions = React.useMemo(() => {
    if (!normalizedTarget) return [];
    if (normalizedTarget === "daycare") {
      return DAYCARE_ROOMS.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      }));
    }
    return BOARDING_TYPES.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
  }, [normalizedTarget]);

  // If target service changes, reset room if it doesn't belong to the new service.
  React.useEffect(() => {
    if (!evaluationSpace) return;
    if (roomOptions.length === 0) {
      setEvaluationSpace("");
      return;
    }
    const stillValid = roomOptions.some((r) => r.id === evaluationSpace);
    if (!stillValid) setEvaluationSpace("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationTargetService, roomOptions.length]);

  const selectedDates = React.useMemo(() => {
    if (!startDate) return [];
    const [year, month, day] = startDate.split("-").map(Number);
    return [new Date(year, month - 1, day)];
  }, [startDate]);

  // Don't pass dateTimes to calendar - we'll handle time selection separately
  const dateTimes = React.useMemo(() => {
    // Return empty array so calendar doesn't show time selection
    return [];
  }, []);

  const handleSelectionChange = (dates: Date[]) => {
    if (dates.length > 0) {
      const dateStr = formatDateString(dates[0]);
      setStartDate(dateStr);
      // Reset slot selection when date changes
      setSelectedSlot(null);
      setCheckInTime("");
      setCheckOutTime("");
    } else {
      setStartDate("");
      setCheckInTime("");
      setCheckOutTime("");
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slotStartTime: string) => {
    const slot = evaluation.availableSlots.find(
      (s) => s.startTime === slotStartTime,
    );
    if (!slot) return;

    setSelectedSlot(slotStartTime);
    setCheckInTime(slot.startTime);
    setCheckOutTime(slot.endTime);
  };

  return (
    <div className="space-y-6">
      <div className="min-h-[400px]">
        {currentSubStep === 0 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base">Select Evaluation Date</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Choose a date for your pet evaluation. {evaluation.description}
              </p>
              <DateSelectionCalendar
                mode="single"
                selectedDates={selectedDates}
                onSelectionChange={handleSelectionChange}
                showTimeSelection={false}
                dateTimes={dateTimes}
                facilityHours={hours}
                bookingRules={{
                  minimumAdvanceBooking: rules.minimumAdvanceBooking,
                  maximumAdvanceBooking: rules.maximumAdvanceBooking,
                }}
              />
            </div>

            {/* Time Slot Selection */}
            {startDate && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <Label className="text-base">
                        Select Available Time Slot
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Choose from the available evaluation time slots below
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {evaluation.availableSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.startTime;
                        return (
                          <Button
                            key={slot.startTime}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className="h-auto p-3 flex flex-col items-center gap-2"
                            onClick={() => handleSlotSelect(slot.startTime)}
                          >
                            <span className="font-medium text-sm">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <Badge
                              variant={isSelected ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {slot.duration} min
                            </Badge>
                          </Button>
                        );
                      })}
                    </div>

                    {evaluation.availableSlots.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No time slots available for evaluation.
                      </p>
                    )}

                    {selectedSlot && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium text-primary">
                          Selected:{" "}
                          {
                            evaluation.availableSlots.find(
                              (s) => s.startTime === selectedSlot,
                            )?.startTime
                          }{" "}
                          -{" "}
                          {
                            evaluation.availableSlots.find(
                              (s) => s.startTime === selectedSlot,
                            )?.endTime
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {currentSubStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Staff & Target Service</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the service to evaluate for and assign an evaluator.
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
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Target Service</Label>
                  <Select
                    value={evaluationTargetService}
                    onValueChange={(value) => {
                      setEvaluationTargetService(value);
                      setEvaluationSpace("");
                    }}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Select Daycare or Boarding" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daycare">Daycare</SelectItem>
                      <SelectItem value="boarding">Boarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base">Assign Evaluator</Label>
                  <Select
                    value={evaluationEvaluator}
                    onValueChange={setEvaluationEvaluator}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {evaluatorOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        {currentSubStep === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Choose Room</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select one of the existing rooms for this evaluation.
              </p>
            </div>

            {!isStepAccessible(2) && (
              <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                  Please complete the Staff step first
                </p>
              </div>
            )}

            {isStepAccessible(2) && (
              <>
                {!normalizedTarget ? (
                  <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">
                      Select target service first
                    </p>
                  </div>
                ) : roomOptions.length === 0 ? (
                  <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">
                      No rooms available for this service
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roomOptions.map((room) => {
                      const isSelected = evaluationSpace === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setEvaluationSpace(room.id)}
                          className={cn(
                            "text-left border-2 rounded-lg p-4 transition-all hover:border-primary/60",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {room.name}
                              </p>
                              {room.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {room.description}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <span className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
