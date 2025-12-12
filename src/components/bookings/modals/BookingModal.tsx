"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DaycareDetails, BoardingDetails } from "./service-details";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type Step } from "@/components/ui/stepper";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  Bed,
  Sun,
  Scissors,
  GraduationCap,
  Stethoscope,
  PawPrint,
  Check,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
export interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  imageUrl?: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  pets: Pet[];
}

export interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  facilityId: number;
  facilityName: string;
  onCreateBooking: (booking: BookingData) => void;
  onCreateClient?: (client: NewClientData) => number;
  onAddPetToClient?: (clientId: number, pet: Omit<Pet, "id">) => number;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
}

export interface NewClientData {
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  pets: Omit<Pet, "id">[];
}

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

export interface BookingData {
  clientId: number;
  petId: number | number[];
  facilityId: number;
  service: string;
  serviceType?: string;
  startDate: string;
  endDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "pending" | "confirmed";
  basePrice: number;
  discount: number;
  discountReason?: string;
  totalCost: number;
  paymentStatus: "pending" | "paid";
  specialRequests?: string;
  bookingMethod: string;
  bookingMethodDetails?: string;
  // Service-specific fields
  daycareSelectedDates?: string[]; // ISO date strings for multi-date daycare
  daycareDateTimes?: Array<{
    date: string;
    checkInTime: string;
    checkOutTime: string;
  }>;
  groomingStyle?: string;
  groomingAddOns?: string[];
  stylistPreference?: string;
  trainingType?: string;
  trainerId?: string;
  trainingGoals?: string;
  vetReason?: string;
  vetSymptoms?: string;
  isEmergency?: boolean;
  kennel?: string;
  feedingSchedule?: FeedingScheduleItem[];
  walkSchedule?: string;
  medications?: MedicationItem[];
  extraServices?: Array<{ serviceId: string; quantity: number }>;
}

// Service definitions with their specific flows
const SERVICE_CATEGORIES = [
  {
    id: "daycare",
    name: "Daycare",
    icon: Sun,
    description: "Full or half day supervised care",
    basePrice: 35,
  },
  {
    id: "boarding",
    name: "Boarding",
    icon: Bed,
    description: "Overnight stays with full care",
    basePrice: 45,
  },
  {
    id: "grooming",
    name: "Grooming",
    icon: Scissors,
    description: "Bath, grooming, and styling services",
    basePrice: 40,
  },
  {
    id: "training",
    name: "Training",
    icon: GraduationCap,
    description: "Obedience and specialized training",
    basePrice: 85,
  },
  {
    id: "vet",
    name: "Veterinary",
    icon: Stethoscope,
    description: "Health checkups and medical care",
    basePrice: 75,
  },
];

const BOOKING_METHODS = [
  {
    id: "phone",
    name: "Phone Call",
    icon: Phone,
    description: "Customer called in",
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    description: "Customer emailed request",
  },
  {
    id: "in_person",
    name: "In Person",
    icon: Users,
    description: "Customer is at the facility",
  },
  {
    id: "other",
    name: "Other",
    icon: MessageSquare,
    description: "Other booking method",
  },
];

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

const VET_REASONS = [
  { id: "wellness_check", name: "Wellness Check", price: 75 },
  { id: "vaccination", name: "Vaccination", price: 45 },
  { id: "sick_visit", name: "Sick Visit", price: 95 },
  { id: "follow_up", name: "Follow-up Visit", price: 50 },
  { id: "dental", name: "Dental Cleaning", price: 200 },
  { id: "surgery_consult", name: "Surgery Consultation", price: 125 },
  { id: "emergency", name: "Emergency", price: 150 },
];

const DAYCARE_TYPES = [
  { id: "full_day", name: "Full Day", price: 35, hours: "8+" },
  { id: "half_day", name: "Half Day", price: 22, hours: "up to 5" },
];

const BOARDING_TYPES = [
  { id: "standard", name: "Standard Boarding", price: 45 },
  { id: "luxury", name: "Luxury Suite", price: 75 },
  { id: "vip", name: "VIP Suite", price: 100 },
];

const STEPS: Step[] = [
  { id: "service", title: "Service", description: "Choose service" },
  { id: "client-pet", title: "Client & Pet", description: "Select or create" },
  { id: "details", title: "Details", description: "Service info" },
  { id: "confirm", title: "Confirm", description: "Review booking" },
];

const DAYCARE_SUB_STEPS = [
  { id: 0, title: "Schedule", description: "Select dates and times" },
  { id: 1, title: "Room Assignment", description: "Assign to room" },
  { id: 2, title: "Extra Services", description: "Add-on services" },
  { id: 3, title: "Feeding", description: "Feeding instructions" },
  { id: 4, title: "Medication", description: "Medication details" },
  { id: 5, title: "Booking Method", description: "How they booked" },
];

const BOARDING_SUB_STEPS = [
  { id: 0, title: "Schedule", description: "Select dates" },
  { id: 1, title: "Room Type", description: "Choose room" },
  { id: 2, title: "Extra Services", description: "Add-on services" },
  { id: 3, title: "Feeding", description: "Feeding instructions" },
  { id: 4, title: "Medication", description: "Medication details" },
  { id: 5, title: "Booking Method", description: "How they booked" },
];

export function BookingModal({
  open,
  onOpenChange,
  clients,
  facilityId,
  facilityName,
  onCreateBooking,
  onCreateClient,
  onAddPetToClient,
  preSelectedClientId,
  preSelectedPetId,
}: NewBookingModalProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSubStep, setCurrentSubStep] = useState(0);

  // Client selection state
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [petMode, setPetMode] = useState<"existing" | "new">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preSelectedClientId ?? null,
  );
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>(
    preSelectedPetId ? [preSelectedPetId] : [],
  );

  // New client form state
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [newPetData, setNewPetData] = useState<Omit<Pet, "id">>({
    name: "",
    type: "Dog",
    breed: "",
    age: 0,
    weight: 0,
    color: "",
    microchip: "",
    allergies: "None",
    specialNeeds: "None",
  });

  // Booking method state
  const [bookingMethod, setBookingMethod] = useState<string>("");
  const [bookingMethodDetails, setBookingMethodDetails] = useState("");

  // Service selection state
  const [selectedService, setSelectedService] = useState<string>("");

  // Service-specific state
  const [serviceType, setServiceType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("08:00");
  const [checkOutTime, setCheckOutTime] = useState("17:00");

  // Daycare specific - multi-date selection
  const [daycareSelectedDates, setDaycareSelectedDates] = useState<Date[]>([]);
  const [daycareDateTimes, setDaycareDateTimes] = useState<
    Array<{ date: string; checkInTime: string; checkOutTime: string }>
  >([]);

  // Boarding specific - date range selection
  const [boardingRangeStart, setBoardingRangeStart] = useState<Date | null>(
    null,
  );
  const [boardingRangeEnd, setBoardingRangeEnd] = useState<Date | null>(null);
  const [boardingDateTimes, setBoardingDateTimes] = useState<
    Array<{ date: string; checkInTime: string; checkOutTime: string }>
  >([]);

  // Grooming specific
  const [groomingStyle, setGroomingStyle] = useState("");
  const [groomingAddOns, setGroomingAddOns] = useState<string[]>([]);
  const [stylistPreference, setStylistPreference] = useState("");

  // Training specific
  const [trainingType, setTrainingType] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [trainingGoals, setTrainingGoals] = useState("");

  // Vet specific
  const [vetReason, setVetReason] = useState("");
  const [vetSymptoms, setVetSymptoms] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);

  // Boarding specific
  const [kennel, setKennel] = useState("");
  const [assignedRoom, setAssignedRoom] = useState("");
  const [feedingSchedule, setFeedingSchedule] = useState<FeedingScheduleItem[]>(
    [],
  );
  const [walkSchedule, setWalkSchedule] = useState("");
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [feedingMedicationTab, setFeedingMedicationTab] = useState<
    "feeding" | "medication"
  >("feeding");
  const [extraServices, setExtraServices] = useState<
    Array<{ serviceId: string; quantity: number }>
  >([]);

  // Get current sub-steps based on selected service
  const currentSubSteps = useMemo(() => {
    if (selectedService === "daycare") return DAYCARE_SUB_STEPS;
    if (selectedService === "boarding") return BOARDING_SUB_STEPS;
    return [];
  }, [selectedService]);

  // Check if current sub-step is complete
  const isSubStepComplete = useCallback(
    (stepIndex: number) => {
      if (selectedService === "daycare") {
        switch (stepIndex) {
          case 0:
            return daycareSelectedDates.length > 0;
          case 1:
            return assignedRoom !== "";
          case 2:
            return true;
          case 3:
            return true;
          case 4:
            return true;
          case 5:
            if (!bookingMethod) return false;
            if (bookingMethod === "other" && !bookingMethodDetails.trim())
              return false;
            return true;
          default:
            return false;
        }
      }
      if (selectedService === "boarding") {
        switch (stepIndex) {
          case 0:
            return boardingRangeStart !== null && boardingRangeEnd !== null;
          case 1:
            return serviceType !== "";
          case 2:
            return true;
          case 3:
            return true;
          case 4:
            return true;
          case 5:
            if (!bookingMethod) return false;
            if (bookingMethod === "other" && !bookingMethodDetails.trim())
              return false;
            return true;
          default:
            return false;
        }
      }
      return true;
    },
    [
      selectedService,
      daycareSelectedDates,
      assignedRoom,
      bookingMethod,
      bookingMethodDetails,
      boardingRangeStart,
      boardingRangeEnd,
      serviceType,
    ],
  );

  // Filtered clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone?.includes(query),
    );
  }, [clients, searchQuery]);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  const selectedPets = useMemo(() => {
    return (
      selectedClient?.pets.filter((p) => selectedPetIds.includes(p.id)) || []
    );
  }, [selectedClient, selectedPetIds]);

  // Calculate total price
  const calculatePrice = useMemo(() => {
    let basePrice = 0;

    if (selectedService === "daycare") {
      const daycare = DAYCARE_TYPES.find((d) => d.id === serviceType);
      const pricePerDay = daycare?.price || 35;
      basePrice = pricePerDay * daycareSelectedDates.length;
    } else if (selectedService === "boarding") {
      const boarding = BOARDING_TYPES.find((b) => b.id === serviceType);
      basePrice = boarding?.price || 45;
      if (boardingRangeStart && boardingRangeEnd) {
        const days = Math.ceil(
          (boardingRangeEnd.getTime() - boardingRangeStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        basePrice = basePrice * Math.max(days, 1);
      }
    } else if (selectedService === "grooming") {
      const style = GROOMING_STYLES.find((g) => g.id === groomingStyle);
      basePrice = style?.price || 40;
      groomingAddOns.forEach((addonId) => {
        const addon = GROOMING_ADDONS.find((a) => a.id === addonId);
        if (addon) basePrice += addon.price;
      });
    } else if (selectedService === "training") {
      const training = TRAINING_TYPES.find((t) => t.id === trainingType);
      basePrice = training?.price || 85;
    } else if (selectedService === "vet") {
      const vet = VET_REASONS.find((v) => v.id === vetReason);
      basePrice = vet?.price || 75;
      if (isEmergency) basePrice += 50;
    }

    return {
      basePrice,
      total: basePrice,
    };
  }, [
    selectedService,
    serviceType,
    boardingRangeStart,
    boardingRangeEnd,
    groomingStyle,
    groomingAddOns,
    trainingType,
    vetReason,
    isEmergency,
    daycareSelectedDates.length,
  ]);

  // Validation for each step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Service
        return selectedService !== "";
      case 1: // Client & Pet
        return selectedClientId !== null && selectedPetIds.length > 0;
      case 2: // Details
        // For daycare/boarding, check current sub-step completion
        if (selectedService === "daycare" || selectedService === "boarding") {
          return isSubStepComplete(currentSubStep);
        }
        // For other services, original logic
        if (!startDate) return false;
        if (selectedService === "grooming" && !groomingStyle) return false;
        if (selectedService === "training" && !trainingType) return false;
        if (selectedService === "vet" && !vetReason) return false;
        if (!bookingMethod) return false;
        if (bookingMethod === "other" && !bookingMethodDetails.trim())
          return false;
        return true;
      case 3: // Confirm
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    currentSubStep,
    selectedClientId,
    selectedPetIds,
    bookingMethod,
    bookingMethodDetails,
    selectedService,
    startDate,
    groomingStyle,
    trainingType,
    vetReason,
    isSubStepComplete,
  ]);

  const handleNext = () => {
    // Handle sub-steps for daycare/boarding on details step
    if (
      currentStep === 2 &&
      (selectedService === "daycare" || selectedService === "boarding")
    ) {
      if (currentSubStep < currentSubSteps.length - 1) {
        setCurrentSubStep(currentSubStep + 1);
        return;
      }
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentSubStep(0);
    }
  };

  const handlePrevious = () => {
    // Handle sub-steps for daycare/boarding on details step
    if (
      currentStep === 2 &&
      (selectedService === "daycare" || selectedService === "boarding")
    ) {
      if (currentSubStep > 0) {
        setCurrentSubStep(currentSubStep - 1);
        return;
      }
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      // Reset to last sub-step if going back to details with daycare/boarding
      if (
        currentStep - 1 === 2 &&
        (selectedService === "daycare" || selectedService === "boarding")
      ) {
        setCurrentSubStep(currentSubSteps.length - 1);
      } else {
        setCurrentSubStep(0);
      }
    }
  };

  const handleComplete = () => {
    let clientId = selectedClientId;
    let petId: number | number[] =
      selectedPetIds.length === 1 ? selectedPetIds[0] : selectedPetIds;

    // If creating new client, call the create callback
    if (clientMode === "new" && onCreateClient) {
      clientId = onCreateClient({
        name: newClientData.name,
        email: newClientData.email,
        phone: newClientData.phone || undefined,
        status: "active",
        facility: facilityName,
        pets: [newPetData],
      });
      petId = 1; // Assuming the new pet gets ID 1 relative to the new client
    } else if (
      clientMode === "existing" &&
      petMode === "new" &&
      onAddPetToClient &&
      selectedClientId
    ) {
      // Adding new pet to existing client
      petId = onAddPetToClient(selectedClientId, newPetData);
    }

    if (!clientId || !petId) return;

    const booking: BookingData = {
      clientId,
      petId,
      facilityId,
      service: selectedService,
      serviceType,
      startDate:
        selectedService === "daycare" && daycareSelectedDates.length > 0
          ? daycareSelectedDates[0].toISOString().split("T")[0]
          : selectedService === "boarding" && boardingRangeStart
            ? boardingRangeStart.toISOString().split("T")[0]
            : startDate,
      endDate:
        selectedService === "boarding" && boardingRangeEnd
          ? boardingRangeEnd.toISOString().split("T")[0]
          : endDate || startDate,
      checkInTime:
        selectedService === "boarding" && boardingDateTimes.length > 0
          ? boardingDateTimes[0].checkInTime
          : checkInTime,
      checkOutTime:
        selectedService === "boarding" && boardingDateTimes.length > 0
          ? boardingDateTimes[boardingDateTimes.length - 1].checkOutTime
          : checkOutTime,
      status: "pending",
      basePrice: calculatePrice.basePrice,
      discount: 0,
      totalCost: calculatePrice.total,
      paymentStatus: "pending",
      bookingMethod,
      bookingMethodDetails: bookingMethodDetails || undefined,
      daycareSelectedDates:
        daycareSelectedDates.length > 0
          ? daycareSelectedDates.map((d) => d.toISOString().split("T")[0])
          : undefined,
      daycareDateTimes:
        daycareDateTimes.length > 0 ? daycareDateTimes : undefined,
      groomingStyle: groomingStyle || undefined,
      groomingAddOns: groomingAddOns.length > 0 ? groomingAddOns : undefined,
      stylistPreference: stylistPreference || undefined,
      trainingType: trainingType || undefined,
      trainerId: trainerId || undefined,
      trainingGoals: trainingGoals || undefined,
      vetReason: vetReason || undefined,
      vetSymptoms: vetSymptoms || undefined,
      isEmergency: isEmergency || undefined,
      kennel: kennel || undefined,
      feedingSchedule: feedingSchedule || undefined,
      walkSchedule: walkSchedule || undefined,
      medications: medications || undefined,
      extraServices: extraServices.length > 0 ? extraServices : undefined,
    };

    onCreateBooking(booking);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setCurrentSubStep(0);
    setClientMode("existing");
    setPetMode("existing");
    setSearchQuery("");
    setSelectedClientId(null);
    setSelectedPetIds([]);
    setNewClientData({ name: "", email: "", phone: "" });
    setNewPetData({
      name: "",
      type: "Dog",
      breed: "",
      age: 0,
      weight: 0,
      color: "",
      microchip: "",
      allergies: "None",
      specialNeeds: "None",
    });
    setDaycareSelectedDates([]);
    setDaycareDateTimes([]);
    setBoardingRangeStart(null);
    setBoardingRangeEnd(null);
    setBoardingDateTimes([]);
    setBookingMethod("");
    setBookingMethodDetails("");
    setSelectedService("");
    setServiceType("");
    setStartDate("");
    setEndDate("");
    setCheckInTime("08:00");
    setCheckOutTime("17:00");
    setGroomingStyle("");
    setGroomingAddOns([]);
    setStylistPreference("");
    setTrainingType("");
    setTrainerId("");
    setTrainingGoals("");
    setVetReason("");
    setVetSymptoms("");
    setIsEmergency(false);
    setKennel("");
    setAssignedRoom("");
    setFeedingSchedule([]);
    setWalkSchedule("");
    setMedications([]);
    setExtraServices([]);
  };

  const toggleGroomingAddon = (addonId: string) => {
    setGroomingAddOns((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  };

  // Combined Step: Client & Pet Selection
  const renderClientPetStep = () => (
    <div className="space-y-6">
      {/* Client Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Client</h3>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Client list */}
        <div className="max-h-[300px] overflow-y-auto border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No clients found
              </p>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedClientId === client.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setSelectedPetIds([]);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p
                        className={`text-sm ${selectedClientId === client.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {client.email}
                      </p>
                    </div>
                    <Badge
                      variant={
                        selectedClientId === client.id ? "secondary" : "outline"
                      }
                    >
                      {client.pets.length} pet
                      {client.pets.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Pet Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Pet(s)</h3>
        {selectedClient ? (
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Booking for</p>
              <p className="font-medium">{selectedClient.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedPetIds.length} pet
                {selectedPetIds.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            {selectedClient.pets.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 pr-2">
                  {selectedClient.pets.map((pet) => {
                    const isSelected = selectedPetIds.includes(pet.id);
                    return (
                      <div
                        key={pet.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedPetIds((prev) =>
                            prev.includes(pet.id)
                              ? prev.filter((id) => id !== pet.id)
                              : [...prev, pet.id],
                          );
                        }}
                      >
                        <div className="flex gap-3">
                          {pet.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pet.imageUrl}
                              alt={pet.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                              <PawPrint className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {pet.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {pet.type} • {pet.breed}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {pet.age} {pet.age === 1 ? "yr" : "yrs"} •{" "}
                                  {pet.weight}kg
                                </p>
                              </div>
                              {isSelected && (
                                <Check className="h-5 w-5 text-primary shrink-0" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  This client has no pets registered.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Please select a client first
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Service Selection
  const renderServiceStep = () => (
    <div className="space-y-4">
      <Label className="text-base">Select a service</Label>
      <div className="grid gap-3">
        {SERVICE_CATEGORIES.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedService === service.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => {
                setSelectedService(service.id);
                setServiceType("");
                setCurrentSubStep(0);
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    selectedService === service.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">From ${service.basePrice}</p>
                </div>
                {selectedService === service.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Step 4: Service Details
  const renderDetailsStep = () => {
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
                selectedService === "training" ||
                selectedService === "vet") && (
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
            feedingMedicationTab={feedingMedicationTab}
            setFeedingMedicationTab={setFeedingMedicationTab}
            bookingMethod={bookingMethod}
            setBookingMethod={setBookingMethod}
            bookingMethodDetails={bookingMethodDetails}
            setBookingMethodDetails={setBookingMethodDetails}
            assignedRoom={assignedRoom}
            setAssignedRoom={setAssignedRoom}
            extraServices={extraServices}
            setExtraServices={setExtraServices}
          />
        )}

        {selectedService === "boarding" && (
          <BoardingDetails
            currentSubStep={currentSubStep}
            boardingRangeStart={boardingRangeStart}
            boardingRangeEnd={boardingRangeEnd}
            setBoardingRangeStart={setBoardingRangeStart}
            setBoardingRangeEnd={setBoardingRangeEnd}
            boardingDateTimes={boardingDateTimes}
            setBoardingDateTimes={setBoardingDateTimes}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            setCheckInTime={setCheckInTime}
            setCheckOutTime={setCheckOutTime}
            serviceType={serviceType}
            setServiceType={setServiceType}
            feedingSchedule={feedingSchedule}
            setFeedingSchedule={setFeedingSchedule}
            medications={medications}
            setMedications={setMedications}
            feedingMedicationTab={feedingMedicationTab}
            setFeedingMedicationTab={setFeedingMedicationTab}
            bookingMethod={bookingMethod}
            setBookingMethod={setBookingMethod}
            bookingMethodDetails={bookingMethodDetails}
            setBookingMethodDetails={setBookingMethodDetails}
            extraServices={extraServices}
            setExtraServices={setExtraServices}
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

        {selectedService === "vet" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
              <Checkbox
                id="emergency"
                checked={isEmergency}
                onCheckedChange={(checked) => setIsEmergency(checked === true)}
              />
              <Label
                htmlFor="emergency"
                className="text-destructive font-medium cursor-pointer"
              >
                This is an emergency (+$50)
              </Label>
            </div>

            <div>
              <Label className="text-base">
                Reason for Visit <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={vetReason}
                onValueChange={setVetReason}
                className="grid gap-2 mt-2"
              >
                {VET_REASONS.map((reason) => (
                  <Label
                    key={reason.id}
                    htmlFor={`vet-${reason.id}`}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      vetReason === reason.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={reason.id} id={`vet-${reason.id}`} />
                    <span className="flex-1 font-medium">{reason.name}</span>
                    <span className="font-semibold">${reason.price}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="symptoms">Symptoms/Notes</Label>
              <Textarea
                id="symptoms"
                value={vetSymptoms}
                onChange={(e) => setVetSymptoms(e.target.value)}
                placeholder="Describe any symptoms or concerns..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Booking Method for grooming, training, vet services */}
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
                    const Icon = method.icon;
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
  };

  const renderConfirmStep = () => {
    const displayClient =
      clientMode === "existing" ? selectedClient : newClientData;
    const displayPets =
      clientMode === "existing"
        ? petMode === "existing"
          ? selectedPets
          : [newPetData]
        : [newPetData];
    const serviceInfo = SERVICE_CATEGORIES.find(
      (s) => s.id === selectedService,
    );
    const methodInfo = BOOKING_METHODS.find((m) => m.id === bookingMethod);

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Client & Pet */}
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">
                  {displayClient?.name || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {displayClient?.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Pet{displayPets.length > 1 ? "s" : ""}
                </p>
                <p className="font-medium">
                  {displayPets
                    .map(
                      (p: Pet | (Omit<Pet, "id"> & { name: string })) =>
                        p?.name,
                    )
                    .filter(Boolean)
                    .join(", ") || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {displayPets.length} selected
                </p>
              </div>
            </div>

            <Separator />

            {/* Booking Method */}
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                {methodInfo && <methodInfo.icon className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking Method</p>
                <p className="font-medium">{methodInfo?.name}</p>
                {bookingMethodDetails && (
                  <p className="text-sm text-muted-foreground">
                    {bookingMethodDetails}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Service */}
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                {serviceInfo && <serviceInfo.icon className="h-5 w-5" />}
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
                {vetReason && (
                  <p className="text-sm text-muted-foreground">
                    {VET_REASONS.find((v) => v.id === vetReason)?.name}
                    {isEmergency && (
                      <Badge variant="destructive" className="ml-2">
                        Emergency
                      </Badge>
                    )}
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
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
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
                  {selectedService === "boarding" &&
                  boardingDateTimes.length > 0
                    ? `Check-in: ${boardingDateTimes[0]?.checkInTime || checkInTime}`
                    : checkInTime}
                  {selectedService === "boarding" &&
                  boardingDateTimes.length > 0
                    ? ` / Check-out: ${boardingDateTimes[boardingDateTimes.length - 1]?.checkOutTime || checkOutTime}`
                    : checkOutTime && ` - ${checkOutTime}`}
                </p>
              </div>
            </div>

            {/* Room Assignment for Daycare */}
            {selectedService === "daycare" && assignedRoom && (
              <>
                <Separator />
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    <Bed className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Assigned Room
                    </p>
                    <p className="font-medium capitalize">
                      {assignedRoom.replace(/-/g, " ")}
                    </p>
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
            {(selectedService === "daycare" ||
              selectedService === "boarding") &&
              feedingSchedule.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Feeding Schedule
                    </p>
                    <div className="space-y-1">
                      {feedingSchedule.map((item, idx) => (
                        <p key={idx} className="text-sm">
                          {item.time} - {item.amount} {item.unit} of{" "}
                          {item.type.replace(/_/g, " ")}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}

            {/* Medications */}
            {(selectedService === "daycare" ||
              selectedService === "boarding") &&
              medications.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Medications
                    </p>
                    <div className="space-y-1">
                      {medications.map((item, idx) => (
                        <p key={idx} className="text-sm">
                          {item.time} - {item.amount} {item.unit} ({item.type})
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}

            {/* Extra Services */}
            {(selectedService === "daycare" ||
              selectedService === "boarding") &&
              extraServices.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Extra Services
                    </p>
                    <div className="space-y-1">
                      {extraServices.map((item, idx) => (
                        <p key={idx} className="text-sm">
                          {item.serviceId
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                          × {item.quantity}
                        </p>
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
                      const addon = GROOMING_ADDONS.find(
                        (a) => a.id === addonId,
                      );
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

        {clientMode === "new" && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> A new client and pet will be created along
            with this booking.
          </div>
        )}

        {clientMode === "existing" && petMode === "new" && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> A new pet will be added to{" "}
            {selectedClient?.name}&apos;s profile with this booking.
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Booking
          </DialogTitle>
          <DialogDescription>
            Create a new booking for your facility
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Side Navigation Tabs */}
          <div className="w-80 border-r bg-muted/30 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {STEPS.map((step, idx) => {
                  const isActive = currentStep === idx;
                  const isCompleted = currentStep > idx;
                  const displayClient =
                    clientMode === "existing" ? selectedClient : newClientData;
                  const displayPet =
                    clientMode === "existing"
                      ? petMode === "existing"
                        ? selectedPets[0]
                        : newPetData
                      : newPetData;
                  const serviceInfo = SERVICE_CATEGORIES.find(
                    (s) => s.id === selectedService,
                  );
                  const showSubSteps =
                    idx === 2 &&
                    isActive &&
                    (selectedService === "daycare" ||
                      selectedService === "boarding");

                  return (
                    <div key={step.id}>
                      <button
                        onClick={() => {
                          if (isCompleted || idx < currentStep) {
                            setCurrentStep(idx);
                            setCurrentSubStep(0);
                          }
                        }}
                        disabled={!isCompleted && idx > currentStep}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : isCompleted
                              ? "bg-background hover:bg-muted border-border cursor-pointer"
                              : "bg-muted/50 border-dashed border-muted-foreground/30 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                              isActive
                                ? "bg-primary-foreground text-primary"
                                : isCompleted
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted-foreground/20 text-muted-foreground"
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium text-sm mb-0.5 ${
                                isActive
                                  ? ""
                                  : isCompleted
                                    ? ""
                                    : "text-muted-foreground"
                              }`}
                            >
                              {step.title}
                            </p>
                            <p
                              className={`text-xs ${
                                isActive
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {step.description}
                            </p>

                            {/* Display entered data */}
                            {isCompleted && (
                              <div className="mt-2 pt-2 border-t border-current/20">
                                {idx === 0 && selectedService && (
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium truncate">
                                      {serviceInfo?.name}
                                    </p>
                                    {serviceType && (
                                      <p className="text-current/70 capitalize truncate">
                                        {serviceType.replace(/_/g, " ")}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {idx === 1 && displayClient && (
                                  <div className="text-xs space-y-2">
                                    <div>
                                      <p className="font-medium truncate">
                                        {displayClient.name}
                                      </p>
                                      <p className="text-current/70 truncate">
                                        {displayClient.email}
                                      </p>
                                    </div>
                                    {selectedPets.length > 0 && (
                                      <div>
                                        <p className="font-medium truncate">
                                          {selectedPets.length} pet
                                          {selectedPets.length > 1 ? "s" : ""}
                                        </p>
                                        <p className="text-current/70 truncate">
                                          {selectedPets
                                            .map((p: Pet) => p.name)
                                            .join(", ")}
                                        </p>
                                      </div>
                                    )}
                                    {petMode === "new" && displayPet && (
                                      <div>
                                        <p className="font-medium truncate">
                                          {displayPet.name}
                                        </p>
                                        <p className="text-current/70 truncate">
                                          {displayPet.type} • {displayPet.breed}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {idx === 2 && bookingMethod && (
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium truncate">
                                      {
                                        BOOKING_METHODS.find(
                                          (m) => m.id === bookingMethod,
                                        )?.name
                                      }
                                    </p>
                                    {selectedService === "daycare" &&
                                      daycareSelectedDates.length > 0 && (
                                        <p className="text-current/70 truncate">
                                          {daycareSelectedDates.length} day
                                          {daycareSelectedDates.length !== 1
                                            ? "s"
                                            : ""}
                                        </p>
                                      )}
                                    {selectedService === "boarding" &&
                                      boardingRangeStart &&
                                      boardingRangeEnd && (
                                        <p className="text-current/70 truncate">
                                          {boardingRangeStart.toLocaleDateString(
                                            "en-US",
                                            { month: "short", day: "numeric" },
                                          )}{" "}
                                          -{" "}
                                          {boardingRangeEnd.toLocaleDateString(
                                            "en-US",
                                            { month: "short", day: "numeric" },
                                          )}
                                        </p>
                                      )}
                                    {startDate &&
                                      selectedService !== "daycare" &&
                                      selectedService !== "boarding" && (
                                        <p className="text-current/70 truncate">
                                          {startDate}
                                        </p>
                                      )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Sub-steps for Details step when daycare/boarding */}
                      {showSubSteps && (
                        <div className="ml-6 mt-2 pl-4 border-l-2 border-primary/30 space-y-1">
                          {currentSubSteps.map((subStep, subIdx) => {
                            const isSubActive = currentSubStep === subIdx;
                            const isSubCompleted = isSubStepComplete(subIdx);

                            return (
                              <button
                                key={subStep.id}
                                type="button"
                                onClick={() => setCurrentSubStep(subIdx)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                                  isSubActive
                                    ? "bg-primary/20 text-primary font-medium"
                                    : isSubCompleted
                                      ? "text-foreground hover:bg-muted"
                                      : "text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                      isSubActive
                                        ? "bg-primary text-primary-foreground"
                                        : isSubCompleted
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted-foreground/20 text-muted-foreground"
                                    }`}
                                  >
                                    {isSubCompleted && !isSubActive ? (
                                      <Check className="h-2.5 w-2.5" />
                                    ) : (
                                      subIdx + 1
                                    )}
                                  </div>
                                  <span>{subStep.title}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Price Summary at Bottom */}
            <div className="p-4 border-t bg-background">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total Price</span>
                  <span>${calculatePrice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-scroll">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {currentStep === 0 && renderServiceStep()}
                {currentStep === 1 && renderClientPetStep()}
                {currentStep === 2 && renderDetailsStep()}
                {currentStep === 3 && renderConfirmStep()}
              </div>
            </ScrollArea>

            {/* Navigation Buttons */}
            <div className="p-4 border-t bg-background flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                {currentStep < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleComplete}
                    disabled={!canProceed}
                  >
                    Create Booking
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
