"use client";

import { useState } from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedingScheduleItem {
  id: string;
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
    image: "/placeholder-room.jpg",
    totalRooms: 10,
    bookedRooms: 7, // This would come from future bookings data
  },
  {
    id: "deluxe",
    name: "Deluxe Suite",
    price: 75,
    description: "Spacious suite with play area and webcam",
    image: "/placeholder-room.jpg",
    totalRooms: 5,
    bookedRooms: 2,
  },
  {
    id: "vip",
    name: "VIP Suite",
    price: 120,
    description: "Luxury suite with private outdoor access",
    image: "/placeholder-room.jpg",
    totalRooms: 3,
    bookedRooms: 1,
  },
];

const BOARDING_STEPS = [
  { id: 0, title: "Schedule", description: "Select dates" },
  { id: 1, title: "Room Type", description: "Choose room" },
  { id: 2, title: "Extra Services", description: "Add-on services" },
  { id: 3, title: "Feeding", description: "Feeding instructions" },
  { id: 4, title: "Medication", description: "Medication details" },
  { id: 5, title: "Booking Method", description: "How they booked" },
];

const BOOKING_METHODS = [
  {
    id: "phone",
    name: "Phone Call",
    description: "Customer called in",
  },
  {
    id: "email",
    name: "Email",
    description: "Customer emailed",
  },
  {
    id: "walk_in",
    name: "Walk-in",
    description: "Customer walked in",
  },
  {
    id: "other",
    name: "Other",
    description: "Other method",
  },
];

interface BoardingDetailsProps {
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
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (schedule: FeedingScheduleItem[]) => void;
  medications: MedicationItem[];
  setMedications: (medications: MedicationItem[]) => void;
  feedingMedicationTab: "feeding" | "medication";
  setFeedingMedicationTab: (tab: "feeding" | "medication") => void;
  bookingMethod: string;
  setBookingMethod: (method: string) => void;
  bookingMethodDetails: string;
  setBookingMethodDetails: (details: string) => void;
  extraServices: Array<{ serviceId: string; quantity: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number }>,
  ) => void;
}

export function BoardingDetails({
  boardingRangeStart,
  boardingRangeEnd,
  setBoardingRangeStart,
  setBoardingRangeEnd,
  boardingDateTimes,
  setBoardingDateTimes,
  setStartDate,
  setEndDate,
  setCheckInTime,
  setCheckOutTime,
  serviceType,
  setServiceType,
  feedingSchedule,
  setFeedingSchedule,
  medications,
  setMedications,
  bookingMethod,
  setBookingMethod,
  bookingMethodDetails,
  setBookingMethodDetails,
  extraServices,
  setExtraServices,
}: BoardingDetailsProps) {
  const [currentSubStep, setCurrentSubStep] = useState(0);

  const isStepComplete = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Schedule
        return boardingRangeStart !== null && boardingRangeEnd !== null;
      case 1: // Room Type
        return serviceType !== "";
      case 2: // Extra Services
        return true; // Optional
      case 3: // Feeding
        return true; // Optional
      case 4: // Medication
        return true; // Optional
      case 5: // Booking Method
        if (!bookingMethod) return false;
        if (bookingMethod === "other" && !bookingMethodDetails.trim())
          return false;
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Horizontal Stepper - Acts as Tabs */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {BOARDING_STEPS.map((step, index) => {
            const isActive = currentSubStep === index;
            const isCompleted = isStepComplete(index);

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => setCurrentSubStep(index)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all hover:scale-105",
                      isActive &&
                        "border-primary bg-primary text-primary-foreground shadow-md",
                      !isActive &&
                        isCompleted &&
                        "border-primary bg-primary text-primary-foreground",
                      !isActive &&
                        !isCompleted &&
                        "border-muted-foreground/30 bg-background text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </button>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive && "text-foreground",
                        !isActive && isCompleted && "text-primary",
                        !isActive && !isCompleted && "text-muted-foreground",
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < BOARDING_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mx-2 mb-8 transition-all",
                      currentSubStep > index
                        ? "bg-primary"
                        : "bg-muted-foreground/30",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentSubStep === 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base">Select Boarding Dates</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Choose check-in and check-out dates for boarding
              </p>
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
                Choose the room type for your pet&apos;s stay
              </p>
            </div>

            <RadioGroup
              value={serviceType}
              onValueChange={setServiceType}
              className="grid gap-4"
            >
              {BOARDING_TYPES.map((type) => {
                const availableRooms = type.totalRooms - type.bookedRooms;
                const occupancyRate = Math.round(
                  (type.bookedRooms / type.totalRooms) * 100,
                );

                return (
                  <Label
                    key={type.id}
                    htmlFor={`boarding-${type.id}`}
                    className={`relative flex gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      serviceType === type.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 hover:shadow-sm"
                    } ${availableRooms === 0 ? "opacity-60" : ""}`}
                  >
                    <RadioGroupItem
                      value={type.id}
                      id={`boarding-${type.id}`}
                      disabled={availableRooms === 0}
                      className="mt-1"
                    />
                    <div className="relative w-32 h-24 rounded-md overflow-hidden bg-muted shrink-0">
                      <img
                        src={type.image}
                        alt={type.name}
                        className="w-full h-full object-cover"
                      />
                      {availableRooms === 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            Fully Booked
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-base">{type.name}</p>
                        <p className="font-bold text-lg">
                          ${type.price}
                          <span className="text-sm text-muted-foreground font-normal">
                            /night
                          </span>
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {type.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            Availability:
                          </span>
                          <span
                            className={cn(
                              "font-semibold",
                              availableRooms === 0 && "text-destructive",
                              availableRooms > 0 &&
                                availableRooms <= 2 &&
                                "text-orange-600",
                              availableRooms > 2 && "text-green-600",
                            )}
                          >
                            {availableRooms}/{type.totalRooms} rooms
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            Occupancy:
                          </span>
                          <span className="font-medium">{occupancyRate}%</span>
                        </div>
                      </div>
                    </div>
                  </Label>
                );
              })}
            </RadioGroup>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXTRA_SERVICES.map((service) => {
                const selected = extraServices.find(
                  (es) => es.serviceId === service.id,
                );
                const quantity = selected?.quantity || 0;

                return (
                  <Card
                    key={service.id}
                    className={cn(
                      "overflow-hidden transition-all",
                      (quantity > 0 && "ring-2 ring-primary") || "",
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
                                      es.serviceId === service.id
                                        ? { ...es, quantity: es.quantity - 1 }
                                        : es,
                                    )
                                    .filter((es) => es.quantity > 0);
                                  setExtraServices(updated);
                                }
                              }}
                              disabled={quantity === 0}
                              className="h-8 w-8 p-0"
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
                                const existing = extraServices.find(
                                  (es) => es.serviceId === service.id,
                                );
                                if (existing) {
                                  const updated = extraServices.map((es) =>
                                    es.serviceId === service.id
                                      ? { ...es, quantity: es.quantity + 1 }
                                      : es,
                                  );
                                  setExtraServices(updated);
                                } else {
                                  setExtraServices([
                                    ...extraServices,
                                    { serviceId: service.id, quantity: 1 },
                                  ]);
                                }
                              }}
                              className="h-8 w-8 p-0"
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
                                const updated = extraServices.filter(
                                  (es) => es.serviceId !== service.id,
                                );
                                setExtraServices(updated);
                              } else {
                                setExtraServices([
                                  ...extraServices,
                                  { serviceId: service.id, quantity: 1 },
                                ]);
                              }
                            }}
                          >
                            {quantity > 0 ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Added
                              </>
                            ) : (
                              "Add"
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {currentSubStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Feeding Instructions</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add feeding schedules for your pet (optional)
              </p>
            </div>

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
                            feedingSchedule.filter((_, i) => i !== index),
                          );
                        }}
                      >
                        Remove
                      </Button>
                    </div>
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
                            <SelectItem value="Evening">Evening</SelectItem>
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
                            <SelectItem value="dry">Dry Food</SelectItem>
                            <SelectItem value="wet">Wet Food</SelectItem>
                            <SelectItem value="raw">Raw Food</SelectItem>
                            <SelectItem value="treats">Treats</SelectItem>
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
                            <SelectItem value="slow_feed">Slow Feed</SelectItem>
                            <SelectItem value="separate">
                              Feed Separately
                            </SelectItem>
                            <SelectItem value="mixed">
                              Mix with Water
                            </SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
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
        )}

        {currentSubStep === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                Medication Instructions
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add medication details for your pet (optional)
              </p>
            </div>

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
                            <SelectItem value="Evening">Evening</SelectItem>
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
                            <SelectItem value="drop">Drop(s)</SelectItem>
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
                            <SelectItem value="topical">Topical</SelectItem>
                            <SelectItem value="injection">Injection</SelectItem>
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
                            <SelectItem value="with_food">With Food</SelectItem>
                            <SelectItem value="empty_stomach">
                              Empty Stomach
                            </SelectItem>
                            <SelectItem value="as_needed">As Needed</SelectItem>
                            <SelectItem value="regular">
                              Regular Schedule
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Medication Notes</Label>
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
        )}

        {currentSubStep === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                How Did the Customer Book?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select the method the customer used to book this appointment
              </p>
            </div>

            <RadioGroup
              value={bookingMethod}
              onValueChange={setBookingMethod}
              className="grid grid-cols-2 gap-3"
            >
              {BOOKING_METHODS.map((method) => (
                <Label
                  key={method.id}
                  htmlFor={method.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    bookingMethod === method.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={method.id} id={method.id} />
                  <div className="flex-1">
                    <p className="font-medium">{method.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </Label>
              ))}
            </RadioGroup>

            {bookingMethod === "other" && (
              <div className="space-y-2">
                <Label htmlFor="booking-method-details">
                  Please specify the booking method{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="booking-method-details"
                  value={bookingMethodDetails}
                  onChange={(e) => setBookingMethodDetails(e.target.value)}
                  placeholder="Describe how the customer booked..."
                  rows={3}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
