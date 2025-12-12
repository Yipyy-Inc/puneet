import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DaycareDetails, BoardingDetails } from "../service-details";
import type { FeedingScheduleItem, MedicationItem } from "../BookingModal";
import { Pet } from "@/lib/types";

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
  { id: "basic_obedience", name: "Basic Obedience", price: 250, sessions: 6 },
  {
    id: "advanced_obedience",
    name: "Advanced Obedience",
    price: 350,
    sessions: 8,
  },
  { id: "private_session", name: "Private Session", price: 85, sessions: 1 },
  { id: "puppy_training", name: "Puppy Training", price: 200, sessions: 4 },
  {
    id: "behavior_modification",
    name: "Behavior Modification",
    price: 150,
    sessions: 1,
  },
  { id: "agility", name: "Agility Training", price: 300, sessions: 6 },
];

const BOOKING_METHODS = [
  {
    id: "phone",
    name: "Phone Call",
    icon: "Phone" as const,
    description: "Customer called in",
  },
  {
    id: "email",
    name: "Email",
    icon: "Mail" as const,
    description: "Customer emailed request",
  },
  {
    id: "in_person",
    name: "In Person",
    icon: "Users" as const,
    description: "Customer is at the facility",
  },
  {
    id: "other",
    name: "Other",
    icon: "MessageSquare" as const,
    description: "Other booking method",
  },
];

import { Phone, Mail, Users, MessageSquare } from "lucide-react";

const ICON_MAP = {
  Phone,
  Mail,
  Users,
  MessageSquare,
};

interface DetailsStepProps {
  selectedService: string;
  currentSubStep: number;
  startDate: string;
  setStartDate: (value: string) => void;
  checkInTime: string;
  setCheckInTime: (value: string) => void;
  setCheckOutTime: (value: string) => void;
  setEndDate: (value: string) => void;
  // Daycare
  daycareSelectedDates: Date[];
  setDaycareSelectedDates: (value: Date[]) => void;
  daycareDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  setDaycareDateTimes: (
    value: Array<{ date: string; checkInTime: string; checkOutTime: string }>,
  ) => void;
  roomAssignments: Array<{ petId: number; roomId: string }>;
  setRoomAssignments: (value: Array<{ petId: number; roomId: string }>) => void;
  // Boarding
  boardingRangeStart: Date | null;
  setBoardingRangeStart: (value: Date | null) => void;
  boardingRangeEnd: Date | null;
  setBoardingRangeEnd: (value: Date | null) => void;
  boardingDateTimes: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  setBoardingDateTimes: (
    value: Array<{ date: string; checkInTime: string; checkOutTime: string }>,
  ) => void;
  serviceType: string;
  setServiceType: (value: string) => void;
  // Grooming
  groomingStyle: string;
  setGroomingStyle: (value: string) => void;
  groomingAddOns: string[];
  setGroomingAddOns: (value: string[]) => void;
  stylistPreference: string;
  setStylistPreference: (value: string) => void;
  // Training
  trainingType: string;
  setTrainingType: (value: string) => void;
  trainerId: string;
  setTrainerId: (value: string) => void;
  trainingGoals: string;
  setTrainingGoals: (value: string) => void;
  // Common
  feedingSchedule: FeedingScheduleItem[];
  setFeedingSchedule: (value: FeedingScheduleItem[]) => void;
  medications: MedicationItem[];
  setMedications: (value: MedicationItem[]) => void;
  feedingMedicationTab: "feeding" | "medication";
  setFeedingMedicationTab: (value: "feeding" | "medication") => void;
  bookingMethod: string;
  setBookingMethod: (value: string) => void;
  bookingMethodDetails: string;
  setBookingMethodDetails: (value: string) => void;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
}

export function DetailsStep({
  selectedService,
  currentSubStep,
  startDate,
  setStartDate,
  checkInTime,
  setCheckInTime,
  setCheckOutTime,
  setEndDate,
  daycareSelectedDates,
  setDaycareSelectedDates,
  daycareDateTimes,
  setDaycareDateTimes,
  roomAssignments,
  setRoomAssignments,
  boardingRangeStart,
  setBoardingRangeStart,
  boardingRangeEnd,
  setBoardingRangeEnd,
  boardingDateTimes,
  setBoardingDateTimes,
  serviceType,
  setServiceType,
  groomingStyle,
  setGroomingStyle,
  groomingAddOns,
  setGroomingAddOns,
  stylistPreference,
  setStylistPreference,
  trainingType,
  setTrainingType,
  trainerId,
  setTrainerId,
  trainingGoals,
  setTrainingGoals,
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
  selectedPets,
}: DetailsStepProps) {
  const toggleGroomingAddon = (addonId: string) => {
    setGroomingAddOns(
      groomingAddOns.includes(addonId)
        ? groomingAddOns.filter((id) => id !== addonId)
        : [...groomingAddOns, addonId],
    );
  };

  return (
    <div className="space-y-4">
      {selectedService !== "daycare" && selectedService !== "boarding" && (
        <>
          <Separator />

          {/* Common date/time fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {(selectedService === "grooming" ||
              selectedService === "training") && (
              <div className="grid gap-2">
                <Label htmlFor="appointmentTime">Appointment Time</Label>
                <Input
                  id="appointmentTime"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <Separator />
        </>
      )}

      {/* Service-specific fields */}
      {selectedService === "daycare" && (
        <DaycareDetails
          currentSubStep={currentSubStep}
          daycareSelectedDates={daycareSelectedDates}
          setDaycareSelectedDates={setDaycareSelectedDates}
          daycareDateTimes={daycareDateTimes}
          setDaycareDateTimes={setDaycareDateTimes}
          setServiceType={setServiceType}
          feedingSchedule={feedingSchedule}
          setFeedingSchedule={setFeedingSchedule}
          medications={medications}
          setMedications={setMedications}
          bookingMethod={bookingMethod}
          setBookingMethod={setBookingMethod}
          bookingMethodDetails={bookingMethodDetails}
          setBookingMethodDetails={setBookingMethodDetails}
          roomAssignments={roomAssignments}
          setRoomAssignments={setRoomAssignments}
          extraServices={extraServices}
          setExtraServices={setExtraServices}
          selectedPets={selectedPets}
        />
      )}

      {selectedService === "boarding" && (
        <BoardingDetails
          currentSubStep={currentSubStep}
          boardingRangeStart={boardingRangeStart}
          setBoardingRangeStart={setBoardingRangeStart}
          boardingRangeEnd={boardingRangeEnd}
          setBoardingRangeEnd={setBoardingRangeEnd}
          boardingDateTimes={boardingDateTimes}
          setBoardingDateTimes={setBoardingDateTimes}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          setCheckInTime={setCheckInTime}
          setCheckOutTime={setCheckOutTime}
          serviceType={serviceType}
          setServiceType={setServiceType}
          roomAssignments={roomAssignments}
          setRoomAssignments={setRoomAssignments}
          feedingSchedule={feedingSchedule}
          setFeedingSchedule={setFeedingSchedule}
          medications={medications}
          setMedications={setMedications}
          bookingMethod={bookingMethod}
          setBookingMethod={setBookingMethod}
          bookingMethodDetails={bookingMethodDetails}
          setBookingMethodDetails={setBookingMethodDetails}
          extraServices={extraServices}
          setExtraServices={setExtraServices}
          selectedPets={selectedPets}
        />
      )}

      {selectedService === "grooming" && (
        <div className="space-y-4">
          <div>
            <Label className="text-base">
              Grooming Style <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={groomingStyle}
              onValueChange={setGroomingStyle}
              className="grid gap-2 mt-2"
            >
              {GROOMING_STYLES.map((style) => (
                <Label
                  key={style.id}
                  htmlFor={`groom-${style.id}`}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    groomingStyle === style.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={style.id} id={`groom-${style.id}`} />
                  <span className="flex-1 font-medium">{style.name}</span>
                  <span className="font-semibold">${style.price}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base">Add-ons</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {GROOMING_ADDONS.map((addon) => (
                <Label
                  key={addon.id}
                  htmlFor={`addon-${addon.id}`}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    groomingAddOns.includes(addon.id)
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    id={`addon-${addon.id}`}
                    checked={groomingAddOns.includes(addon.id)}
                    onCheckedChange={() => toggleGroomingAddon(addon.id)}
                  />
                  <span className="flex-1 text-sm">{addon.name}</span>
                  <span className="text-sm font-medium">+${addon.price}</span>
                </Label>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stylist">Stylist Preference</Label>
            <Input
              id="stylist"
              value={stylistPreference}
              onChange={(e) => setStylistPreference(e.target.value)}
              placeholder="Any preferred groomer..."
            />
          </div>
        </div>
      )}

      {selectedService === "training" && (
        <div className="space-y-4">
          <div>
            <Label className="text-base">
              Training Program <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={trainingType}
              onValueChange={setTrainingType}
              className="grid gap-2 mt-2"
            >
              {TRAINING_TYPES.map((type) => (
                <Label
                  key={type.id}
                  htmlFor={`train-${type.id}`}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    trainingType === type.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={type.id} id={`train-${type.id}`} />
                  <div className="flex-1">
                    <p className="font-medium">{type.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {type.sessions} session{type.sessions > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="font-semibold">${type.price}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="trainer">Trainer Preference</Label>
            <Input
              id="trainer"
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              placeholder="Any preferred trainer..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="goals">Training Goals</Label>
            <Textarea
              id="goals"
              value={trainingGoals}
              onChange={(e) => setTrainingGoals(e.target.value)}
              placeholder="What would you like to achieve with training..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Booking Method for grooming, training services */}
      {selectedService !== "daycare" &&
        selectedService !== "boarding" &&
        selectedService !== "" && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base">
                How did the customer book?{" "}
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={bookingMethod}
                onValueChange={setBookingMethod}
                className="grid grid-cols-2 gap-3"
              >
                {BOOKING_METHODS.map((method) => {
                  const Icon = ICON_MAP[method.icon];
                  return (
                    <Label
                      key={method.id}
                      htmlFor={method.id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        bookingMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>

              {bookingMethod === "other" && (
                <div className="grid gap-2">
                  <Label htmlFor="methodDetails">
                    Please specify <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="methodDetails"
                    value={bookingMethodDetails}
                    onChange={(e) => setBookingMethodDetails(e.target.value)}
                    placeholder="Describe how they contacted you..."
                  />
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}
