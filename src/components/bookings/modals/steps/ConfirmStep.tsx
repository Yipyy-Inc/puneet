import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Bed, PawPrint } from "lucide-react";
import type { Pet, Client } from "@/lib/types";
import { SERVICE_CATEGORIES } from "../constants";

const GROOMING_STYLES = [
  { id: "bath_brush", name: "Bath & Brush", price: 40 },
  { id: "full_groom", name: "Full Groom", price: 65 },
  { id: "puppy_groom", name: "Puppy Groom", price: 35 },
  { id: "hand_stripping", name: "Hand Stripping", price: 95 },
  { id: "deshedding", name: "De-shedding Treatment", price: 55 },
];

const GROOMING_ADDONS = [
  { id: "nail_trim", name: "Nail Trim", price: 15 },
  { id: "teeth_brush", name: "Teeth Brushing", price: 10 },
  { id: "ear_clean", name: "Ear Cleaning", price: 12 },
  { id: "flea_treatment", name: "Flea Treatment", price: 25 },
  { id: "medicated_bath", name: "Medicated Bath", price: 20 },
  { id: "paw_treatment", name: "Paw Pad Treatment", price: 15 },
];

const TRAINING_TYPES = [
  { id: "basic_obedience", name: "Basic Obedience" },
  { id: "advanced_obedience", name: "Advanced Obedience" },
  { id: "private_session", name: "Private Session" },
  { id: "puppy_training", name: "Puppy Training" },
  { id: "behavior_modification", name: "Behavior Modification" },
  { id: "agility", name: "Agility Training" },
];

interface FeedingScheduleItem {
  id: string;
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
  name: string;
  time: string;
  amount: string;
  unit: string;
  type: string;
  source: string;
  instructions: string;
  notes: string;
}

interface ConfirmStepProps {
  selectedClient: Client | undefined;
  selectedPets: Pet[];
  selectedService: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  daycareSelectedDates: Date[];
  boardingRangeStart: Date | null;
  boardingRangeEnd: Date | null;
  boardingDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  groomingStyle: string;
  groomingAddOns: string[];
  trainingType: string;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  feedingSchedule: FeedingScheduleItem[];
  medications: MedicationItem[];
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  calculatePrice: { basePrice: number; total: number };
}

export function ConfirmStep({
  selectedClient,
  selectedPets,
  selectedService,
  serviceType,
  startDate,
  endDate,
  checkInTime,
  checkOutTime,
  daycareSelectedDates,
  boardingRangeStart,
  boardingRangeEnd,
  boardingDateTimes,
  groomingStyle,
  groomingAddOns,
  trainingType,
  roomAssignments,
  feedingSchedule,
  medications,
  extraServices,
  calculatePrice,
}: ConfirmStepProps) {
  const displayClient = selectedClient;
  const displayPets = selectedPets;
  const serviceInfo = SERVICE_CATEGORIES.find((s) => s.id === selectedService);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Client & Pet */}
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
              {displayClient?.imageUrl ? (
                <img
                  src={displayClient.imageUrl}
                  alt={displayClient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{displayClient?.name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">
                {displayClient?.email}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm text-muted-foreground">
                Pet{displayPets.length > 1 ? "s" : ""}
              </p>
              <div className="flex gap-2 justify-end mt-1">
                {displayPets.slice(0, 3).map((pet) => (
                  <div
                    key={pet.id}
                    className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border-2 border-background"
                    title={pet.name}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {displayPets.length > 3 && (
                  <div className="w-10 h-10 rounded-lg bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      +{displayPets.length - 3}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {displayPets.length} selected
              </p>
            </div>
          </div>

          <Separator />

          {/* Service */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
              {serviceInfo?.image ? (
                <img
                  src={serviceInfo.image}
                  alt={serviceInfo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Service</p>
              <p className="font-medium">{serviceInfo?.name}</p>
              {serviceType && (
                <p className="text-sm text-muted-foreground capitalize">
                  {serviceType.replace(/_/g, " ")}
                </p>
              )}
              {groomingStyle && (
                <p className="text-sm text-muted-foreground">
                  {GROOMING_STYLES.find((g) => g.id === groomingStyle)?.name}
                </p>
              )}
              {trainingType && (
                <p className="text-sm text-muted-foreground">
                  {TRAINING_TYPES.find((t) => t.id === trainingType)?.name}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {selectedService === "daycare" &&
                daycareSelectedDates.length > 0
                  ? "Selected Days"
                  : "Date"}
              </p>
              {selectedService === "daycare" &&
              daycareSelectedDates.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium">
                    {daycareSelectedDates.length} day
                    {daycareSelectedDates.length !== 1 ? "s" : ""} selected
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {daycareSelectedDates.slice(0, 5).map((date, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Badge>
                    ))}
                    {daycareSelectedDates.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{daycareSelectedDates.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              ) : selectedService === "boarding" &&
                boardingRangeStart &&
                boardingRangeEnd ? (
                <p className="font-medium">
                  {boardingRangeStart.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  →{" "}
                  {boardingRangeEnd.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p className="font-medium">
                  {startDate}
                  {endDate && endDate !== startDate && ` → ${endDate}`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {selectedService === "boarding" && boardingDateTimes.length > 0
                  ? `Check-in: ${boardingDateTimes[0]?.checkInTime || checkInTime}`
                  : checkInTime}
                {selectedService === "boarding" && boardingDateTimes.length > 0
                  ? ` / Check-out: ${boardingDateTimes[boardingDateTimes.length - 1]?.checkOutTime || checkOutTime}`
                  : checkOutTime && ` - ${checkOutTime}`}
              </p>
            </div>
          </div>

          {/* Room Assignment */}
          {(selectedService === "daycare" || selectedService === "boarding") &&
            roomAssignments.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <Bed className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Room Assignments
                    </p>
                    <div className="space-y-1">
                      {roomAssignments.map((assignment) => {
                        const pet = selectedPets.find(
                          (p) => p.id === assignment.petId,
                        );
                        return (
                          <p key={assignment.petId} className="font-medium">
                            {pet?.name}: {assignment.roomId.replace(/-/g, " ")}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

          {/* Room Type for Boarding */}
          {selectedService === "boarding" && serviceType && (
            <>
              <Separator />
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  <Bed className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room Type</p>
                  <p className="font-medium capitalize">
                    {serviceType.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Feeding Schedule */}
          {(selectedService === "daycare" || selectedService === "boarding") &&
            feedingSchedule.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Feeding Schedule
                  </p>
                  <div className="space-y-3">
                    {feedingSchedule.map((item, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-sm">
                              {item.name || `Schedule ${idx + 1}`}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {item.time}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Amount:</span>{" "}
                              {item.amount} {item.unit}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>{" "}
                              {item.type.replace(/_/g, " ")}
                            </div>
                            <div>
                              <span className="font-medium">Source:</span>{" "}
                              {item.source.replace(/_/g, " ")}
                            </div>
                            <div>
                              <span className="font-medium">Instructions:</span>{" "}
                              {item.instructions.replace(/_/g, " ")}
                            </div>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

          {/* Medications */}
          {(selectedService === "daycare" || selectedService === "boarding") &&
            medications.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Medications
                  </p>
                  <div className="space-y-3">
                    {medications.map((item, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-sm">
                              {item.name || `Medication ${idx + 1}`}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {item.time}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Dosage:</span>{" "}
                              {item.amount} {item.unit}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>{" "}
                              {item.type.replace(/_/g, " ")}
                            </div>
                            <div>
                              <span className="font-medium">Source:</span>{" "}
                              {item.source.replace(/_/g, " ")}
                            </div>
                            <div>
                              <span className="font-medium">Instructions:</span>{" "}
                              {item.instructions.replace(/_/g, " ")}
                            </div>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              &ldquo;{item.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

          {/* Extra Services */}
          {(selectedService === "daycare" || selectedService === "boarding") &&
            extraServices.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Extra Services
                  </p>
                  <div className="space-y-1">
                    {Object.entries(
                      extraServices.reduce(
                        (acc, item) => {
                          if (!acc[item.serviceId]) {
                            acc[item.serviceId] = [];
                          }
                          acc[item.serviceId].push(item);
                          return acc;
                        },
                        {} as Record<string, typeof extraServices>,
                      ),
                    ).map(([serviceId, items]) => (
                      <div key={serviceId}>
                        <p className="text-sm font-medium">
                          {serviceId
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        {items.map((item) => {
                          const assignedPet = selectedPets.find(
                            (p) => p.id === item.petId,
                          );
                          return (
                            <p
                              key={`${item.serviceId}-${item.petId}`}
                              className="text-sm text-muted-foreground ml-4"
                            >
                              {assignedPet?.name}: × {item.quantity}
                            </p>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          {/* Add-ons for grooming */}
          {groomingAddOns.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Add-ons</p>
                <div className="flex flex-wrap gap-2">
                  {groomingAddOns.map((addonId) => {
                    const addon = GROOMING_ADDONS.find((a) => a.id === addonId);
                    return (
                      <Badge key={addonId} variant="secondary">
                        {addon?.name} (+${addon?.price})
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Pricing */}
          <Separator />

          {/* Pricing Summary */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Total Price</span>
              <span>${calculatePrice.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
