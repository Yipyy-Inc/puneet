import { PawPrint } from "lucide-react";
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
    <div className="max-w-2xl mx-auto">
      {/* Receipt Header */}
      <div className="bg-primary text-primary-foreground p-4 rounded-t-lg">
        <div className="text-center">
          <h2 className="text-xl font-bold">Booking Receipt</h2>
          <p className="text-sm opacity-90">Pet Care Services</p>
        </div>
      </div>

      {/* Receipt Body */}
      <div className="border-2 border-primary rounded-b-lg bg-white">
        {/* Client & Pet Info */}
        <div className="p-4 border-b border-dashed">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Client
              </p>
              <p className="font-semibold">
                {displayClient?.name || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground">
                {displayClient?.email}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Pet{displayPets.length > 1 ? "s" : ""}
              </p>
              <div className="flex gap-1 justify-end mt-1">
                {displayPets.map((pet) => (
                  <div
                    key={pet.id}
                    className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"
                    title={pet.name}
                  >
                    <PawPrint className="h-3 w-3 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {displayPets.map((p) => p.name).join(", ")}
              </p>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="p-4 border-b border-dashed">
          <div className="space-y-3">
            {/* Main Service */}
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{serviceInfo?.name}</p>
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
              <div className="text-right">
                <p className="font-semibold">
                  ${calculatePrice.basePrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex justify-between items-center text-sm">
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                {selectedService === "daycare" &&
                daycareSelectedDates.length > 0 ? (
                  <div>
                    <p>
                      {daycareSelectedDates.length} day
                      {daycareSelectedDates.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {daycareSelectedDates.slice(0, 3).map((date, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-muted px-2 py-1 rounded"
                        >
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ))}
                      {daycareSelectedDates.length > 3 && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          +{daycareSelectedDates.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : selectedService === "boarding" &&
                  boardingRangeStart &&
                  boardingRangeEnd ? (
                  <p>
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
                  <p>
                    {startDate}
                    {endDate && endDate !== startDate && ` → ${endDate}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p>
                  {selectedService === "boarding" &&
                  boardingDateTimes.length > 0
                    ? `${boardingDateTimes[0]?.checkInTime || checkInTime} - ${boardingDateTimes[boardingDateTimes.length - 1]?.checkOutTime || checkOutTime}`
                    : `${checkInTime}${checkOutTime ? ` - ${checkOutTime}` : ""}`}
                </p>
              </div>
            </div>

            {/* Room Assignments */}
            {(selectedService === "daycare" ||
              selectedService === "boarding") &&
              roomAssignments.length > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-muted-foreground">Room Assignments</p>
                    {roomAssignments.map((assignment) => {
                      const pet = selectedPets.find(
                        (p) => p.id === assignment.petId,
                      );
                      return (
                        <p key={assignment.petId}>
                          {pet?.name}: {assignment.roomId.replace(/-/g, " ")}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Grooming Add-ons */}
            {groomingAddOns.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Add-ons</p>
                <div className="space-y-1">
                  {groomingAddOns.map((addonId) => {
                    const addon = GROOMING_ADDONS.find((a) => a.id === addonId);
                    return (
                      <div
                        key={addonId}
                        className="flex justify-between text-sm"
                      >
                        <span>{addon?.name}</span>
                        <span>+${addon?.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Services */}
            {(selectedService === "daycare" ||
              selectedService === "boarding") &&
              extraServices.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Extra Services
                  </p>
                  <div className="space-y-1">
                    {Object.entries(
                      extraServices.reduce(
                        (acc, item) => {
                          if (!acc[item.serviceId]) acc[item.serviceId] = [];
                          acc[item.serviceId].push(item);
                          return acc;
                        },
                        {} as Record<string, typeof extraServices>,
                      ),
                    ).map(([serviceId, items]) => (
                      <div key={serviceId} className="space-y-1">
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
                            <div
                              key={`${item.serviceId}-${item.petId}`}
                              className="flex justify-between text-sm ml-4"
                            >
                              <span>{assignedPet?.name}</span>
                              <span>× {item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Additional Details */}
        {(selectedService === "daycare" || selectedService === "boarding") &&
          (feedingSchedule.length > 0 || medications.length > 0) && (
            <div className="p-4 border-b border-dashed">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Additional Details
              </p>

              {/* Feeding Schedule */}
              {feedingSchedule.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">Feeding Schedule</p>
                  <div className="space-y-2">
                    {feedingSchedule.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-muted/50 p-2 rounded"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {item.name || `Schedule ${idx + 1}`}
                          </span>
                          <span>{item.time}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {item.amount} {item.unit} •{" "}
                          {item.type.replace(/_/g, " ")} •{" "}
                          {item.source.replace(/_/g, " ")}
                        </p>
                        {item.notes && (
                          <p className="text-muted-foreground italic mt-1">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {medications.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Medications</p>
                  <div className="space-y-2">
                    {medications.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-muted/50 p-2 rounded"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {item.name || `Medication ${idx + 1}`}
                          </span>
                          <span>{item.time}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {item.amount} {item.unit} •{" "}
                          {item.type.replace(/_/g, " ")} •{" "}
                          {item.source.replace(/_/g, " ")}
                        </p>
                        {item.notes && (
                          <p className="text-muted-foreground italic mt-1">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Total */}
        <div className="p-4">
          <div className="border-t-2 border-dashed pt-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>${calculatePrice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-muted/50 p-3 text-center border-t">
          <p className="text-xs text-muted-foreground">
            Thank you for choosing our pet care services!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Receipt generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
