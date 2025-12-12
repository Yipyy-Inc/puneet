"use client";

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

interface DaycareDetailsProps {
  currentSubStep: number;
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
  feedingMedicationTab: "feeding" | "medication";
  setFeedingMedicationTab: (tab: "feeding" | "medication") => void;
  bookingMethod: string;
  setBookingMethod: (method: string) => void;
  bookingMethodDetails: string;
  setBookingMethodDetails: (details: string) => void;
  assignedRoom: string;
  setAssignedRoom: (room: string) => void;
  extraServices: Array<{ serviceId: string; quantity: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number }>,
  ) => void;
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
  },
  {
    id: "playroom-b",
    name: "Playroom B",
    description: "Smaller dogs and calm play",
    capacity: 10,
    currentBookings: 6,
  },
  {
    id: "quiet-zone",
    name: "Quiet Zone",
    description: "Low-energy pets and seniors",
    capacity: 8,
    currentBookings: 3,
  },
  {
    id: "outdoor-yard",
    name: "Outdoor Yard",
    description: "Outdoor supervised play area",
    capacity: 20,
    currentBookings: 15,
  },
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

export function DaycareDetails({
  currentSubStep,
  daycareSelectedDates,
  setDaycareSelectedDates,
  daycareDateTimes,
  setDaycareDateTimes,
  setServiceType,
  feedingSchedule,
  setFeedingSchedule,
  medications,
  setMedications,
  bookingMethod,
  setBookingMethod,
  bookingMethodDetails,
  setBookingMethodDetails,
  assignedRoom,
  setAssignedRoom,
  extraServices,
  setExtraServices,
}: DaycareDetailsProps) {
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
              minDate={new Date()}
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
              defaultCheckInTime="08:00"
              defaultCheckOutTime="17:00"
            />
          </div>
        )}

        {currentSubStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Room Assignment</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Assign pet to a daycare room based on availability
              </p>
            </div>

            <RadioGroup
              value={assignedRoom}
              onValueChange={setAssignedRoom}
              className="grid gap-3"
            >
              {DAYCARE_ROOMS.map((room) => {
                const availableSpots = room.capacity - room.currentBookings;
                const occupancyRate = Math.round(
                  (room.currentBookings / room.capacity) * 100,
                );

                return (
                  <Label
                    key={room.id}
                    htmlFor={`room-${room.id}`}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      assignedRoom === room.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50 hover:shadow-sm"
                    } ${availableSpots === 0 ? "opacity-60" : ""}`}
                  >
                    <RadioGroupItem
                      value={room.id}
                      id={`room-${room.id}`}
                      disabled={availableSpots === 0}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-semibold text-base">{room.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {room.description}
                          </p>
                        </div>
                        {availableSpots === 0 && (
                          <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded">
                            Full
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">
                            Available:
                          </span>
                          <span
                            className={cn(
                              "font-semibold",
                              availableSpots === 0 && "text-destructive",
                              availableSpots > 0 &&
                                availableSpots <= 2 &&
                                "text-orange-600",
                              availableSpots > 2 && "text-green-600",
                            )}
                          >
                            {availableSpots}/{room.capacity} spots
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
                Add optional services to enhance your pet&apos;s daycare
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
                      quantity > 0 && "ring-2 ring-primary",
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
