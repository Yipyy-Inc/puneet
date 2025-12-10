"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Stepper,
  StepperContent,
  StepperNavigation,
  type Step,
} from "@/components/ui/stepper";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Heart,
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
interface Pet {
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
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  pets: Pet[];
}

interface NewBookingModalProps {
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

interface NewClientData {
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  pets: Omit<Pet, "id">[];
}

interface BookingData {
  clientId: number;
  petId: number;
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
  feedingSchedule?: string;
  walkSchedule?: string;
  medications?: string;
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
  { id: "client", title: "Client", description: "Select or create" },
  { id: "pet", title: "Pet", description: "Select pet(s)" },
  { id: "details", title: "Details", description: "Service info" },
  { id: "confirm", title: "Confirm", description: "Review booking" },
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

  // Client selection state
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [petMode, setPetMode] = useState<"existing" | "new">("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preSelectedClientId ?? null,
  );
  const [selectedPetId, setSelectedPetId] = useState<number | null>(
    preSelectedPetId ?? null,
  );

  // New client form state
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [newPetData, setNewPetData] = useState({
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
  const [specialRequests, setSpecialRequests] = useState("");

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
  const [feedingSchedule, setFeedingSchedule] = useState("");
  const [walkSchedule, setWalkSchedule] = useState("");
  const [medications, setMedications] = useState("");

  // Pricing
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");

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

  const selectedPet = useMemo(() => {
    return selectedClient?.pets.find((p) => p.id === selectedPetId);
  }, [selectedClient, selectedPetId]);

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
      discount,
      total: Math.max(basePrice - discount, 0),
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
    discount,
    daycareSelectedDates.length,
  ]);

  // Validation for each step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Service
        return selectedService !== "";
      case 1: // Client
        if (clientMode === "existing") {
          return selectedClientId !== null;
        } else {
          return (
            newClientData.name.trim() !== "" &&
            newClientData.email.trim() !== ""
          );
        }
      case 2: // Pet
        if (clientMode === "existing") {
          if (petMode === "existing") {
            return selectedPetId !== null;
          } else {
            // Existing client with new pet
            return (
              newPetData.name.trim() !== "" && newPetData.breed.trim() !== ""
            );
          }
        } else {
          // New client with new pet
          return (
            newPetData.name.trim() !== "" && newPetData.breed.trim() !== ""
          );
        }
      case 3: // Details
        if (selectedService === "daycare") {
          if (daycareSelectedDates.length === 0) return false;
        }
        if (selectedService === "boarding") {
          if (!boardingRangeStart || !boardingRangeEnd) return false;
          if (!serviceType) return false;
        }
        if (
          selectedService !== "daycare" &&
          selectedService !== "boarding" &&
          !startDate
        )
          return false;
        if (selectedService === "grooming" && !groomingStyle) return false;
        if (selectedService === "training" && !trainingType) return false;
        if (selectedService === "vet" && !vetReason) return false;
        // Booking method validation
        if (!bookingMethod) return false;
        if (bookingMethod === "other" && !bookingMethodDetails.trim())
          return false;
        return true;
      case 4: // Confirm
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    clientMode,
    petMode,
    selectedClientId,
    selectedPetId,
    newClientData,
    newPetData,
    bookingMethod,
    bookingMethodDetails,
    selectedService,
    startDate,
    boardingRangeStart,
    boardingRangeEnd,
    groomingStyle,
    trainingType,
    vetReason,
    serviceType,
    daycareSelectedDates.length,
  ]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    let clientId = selectedClientId;
    let petId = selectedPetId;

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
      discount,
      discountReason: discountReason || undefined,
      totalCost: calculatePrice.total,
      paymentStatus: "pending",
      specialRequests: specialRequests || undefined,
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
    };

    onCreateBooking(booking);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setClientMode("existing");
    setPetMode("existing");
    setSearchQuery("");
    setSelectedClientId(null);
    setSelectedPetId(null);
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
    setSpecialRequests("");
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
    setFeedingSchedule("");
    setWalkSchedule("");
    setMedications("");
    setDiscount(0);
    setDiscountReason("");
  };

  const toggleGroomingAddon = (addonId: string) => {
    setGroomingAddOns((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  };

  // Step 1: Client Selection
  const renderClientStep = () => (
    <div className="space-y-4">
      {/* Toggle between existing and new client */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={clientMode === "existing" ? "default" : "outline"}
          onClick={() => setClientMode("existing")}
          className="flex-1"
        >
          <User className="mr-2 h-4 w-4" />
          Existing Client
        </Button>
        <Button
          type="button"
          variant={clientMode === "new" ? "default" : "outline"}
          onClick={() => setClientMode("new")}
          className="flex-1"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Client
        </Button>
      </div>

      {clientMode === "existing" ? (
        <div className="space-y-4">
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
          <ScrollArea className="h-[400px] border rounded-lg">
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
                      setSelectedPetId(null);
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
                          selectedClientId === client.id
                            ? "secondary"
                            : "outline"
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
          </ScrollArea>
        </div>
      ) : (
        <div className="space-y-4">
          {/* New Client Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">
                Client Information
              </Label>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="newClientName">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newClientName"
                  value={newClientData.name}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newClientEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newClientEmail"
                  type="email"
                  value={newClientData.email}
                  onChange={(e) =>
                    setNewClientData({
                      ...newClientData,
                      email: e.target.value,
                    })
                  }
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newClientPhone">Phone</Label>
                <Input
                  id="newClientPhone"
                  type="tel"
                  value={newClientData.phone}
                  onChange={(e) =>
                    setNewClientData({
                      ...newClientData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="123-456-7890"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 2: Pet Selection
  const renderPetStep = () => (
    <div className="space-y-4">
      {selectedClient ? (
        <div className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Booking for</p>
            <p className="font-medium">{selectedClient.name}</p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Select Pet</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={petMode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPetMode("existing");
                  setSelectedPetId(null);
                }}
                disabled={selectedClient.pets.length === 0}
              >
                Existing Pet
              </Button>
              <Button
                type="button"
                variant={petMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPetMode("new");
                  setSelectedPetId(null);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                New Pet
              </Button>
            </div>
          </div>

          {petMode === "existing" ? (
            selectedClient.pets.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedClient.pets.map((pet) => (
                  <div
                    key={pet.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPetId === pet.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedPetId(pet.id)}
                  >
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{pet.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pet.type} • {pet.breed}
                        </p>
                      </div>
                      {selectedPetId === pet.id && (
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  This client has no pets registered. Create a new pet below.
                </p>
              </div>
            )
          ) : (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">
                  New Pet for {selectedClient.name}
                </Label>
              </div>

              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="petName">
                      Pet Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="petName"
                      value={newPetData.name}
                      onChange={(e) =>
                        setNewPetData({
                          ...newPetData,
                          name: e.target.value,
                        })
                      }
                      placeholder="Buddy"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="petType">Type</Label>
                    <Select
                      value={newPetData.type}
                      onValueChange={(value) =>
                        setNewPetData({ ...newPetData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog</SelectItem>
                        <SelectItem value="Cat">Cat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="petBreed">
                      Breed <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="petBreed"
                      value={newPetData.breed}
                      onChange={(e) =>
                        setNewPetData({
                          ...newPetData,
                          breed: e.target.value,
                        })
                      }
                      placeholder="Golden Retriever"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="petAge">Age (years)</Label>
                    <Input
                      id="petAge"
                      type="number"
                      min="0"
                      value={newPetData.age}
                      onChange={(e) =>
                        setNewPetData({
                          ...newPetData,
                          age: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="petWeight">Weight (kg)</Label>
                    <Input
                      id="petWeight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={newPetData.weight}
                      onChange={(e) =>
                        setNewPetData({
                          ...newPetData,
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="petColor">Color</Label>
                    <Input
                      id="petColor"
                      value={newPetData.color}
                      onChange={(e) =>
                        setNewPetData({
                          ...newPetData,
                          color: e.target.value,
                        })
                      }
                      placeholder="Golden"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="petAllergies">Allergies</Label>
                  <Input
                    id="petAllergies"
                    value={newPetData.allergies}
                    onChange={(e) =>
                      setNewPetData({
                        ...newPetData,
                        allergies: e.target.value,
                      })
                    }
                    placeholder="None"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="petSpecialNeeds">Special Needs</Label>
                  <Textarea
                    id="petSpecialNeeds"
                    value={newPetData.specialNeeds}
                    onChange={(e) =>
                      setNewPetData({
                        ...newPetData,
                        specialNeeds: e.target.value,
                      })
                    }
                    placeholder="None"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Pet Information</Label>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="newPetName">
                  Pet Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newPetName"
                  value={newPetData.name}
                  onChange={(e) =>
                    setNewPetData({ ...newPetData, name: e.target.value })
                  }
                  placeholder="Buddy"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newPetType">Type</Label>
                <Select
                  value={newPetData.type}
                  onValueChange={(value) =>
                    setNewPetData({ ...newPetData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog</SelectItem>
                    <SelectItem value="Cat">Cat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="newPetBreed">
                  Breed <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newPetBreed"
                  value={newPetData.breed}
                  onChange={(e) =>
                    setNewPetData({ ...newPetData, breed: e.target.value })
                  }
                  placeholder="Golden Retriever"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newPetAge">Age (years)</Label>
                <Input
                  id="newPetAge"
                  type="number"
                  min="0"
                  value={newPetData.age}
                  onChange={(e) =>
                    setNewPetData({
                      ...newPetData,
                      age: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="newPetWeight">Weight (kg)</Label>
                <Input
                  id="newPetWeight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newPetData.weight}
                  onChange={(e) =>
                    setNewPetData({
                      ...newPetData,
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newPetColor">Color</Label>
                <Input
                  id="newPetColor"
                  value={newPetData.color}
                  onChange={(e) =>
                    setNewPetData({ ...newPetData, color: e.target.value })
                  }
                  placeholder="Golden"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPetAllergies">Allergies</Label>
              <Input
                id="newPetAllergies"
                value={newPetData.allergies}
                onChange={(e) =>
                  setNewPetData({ ...newPetData, allergies: e.target.value })
                }
                placeholder="None"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPetSpecialNeeds">Special Needs</Label>
              <Textarea
                id="newPetSpecialNeeds"
                value={newPetData.specialNeeds}
                onChange={(e) =>
                  setNewPetData({
                    ...newPetData,
                    specialNeeds: e.target.value,
                  })
                }
                placeholder="None"
                rows={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 3: Service Selection
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
        {/* Booking Method */}
        <div className="space-y-3">
          <Label className="text-base">How did the customer book?</Label>
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
          <div className="space-y-4">
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
                  // Auto-determine daycare type based on first date's hours
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
          </div>
        )}

        {selectedService === "boarding" && (
          <div className="space-y-4">
            <div>
              <Label className="text-base">
                Select Check-in and Check-out Dates
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Choose your check-in date and check-out date, then set the times
              </p>
              <DateSelectionCalendar
                mode="range"
                rangeStart={boardingRangeStart}
                rangeEnd={boardingRangeEnd}
                onRangeChange={(start, end) => {
                  setBoardingRangeStart(start);
                  setBoardingRangeEnd(end);
                  // Update legacy state for backward compatibility
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
                  // Update legacy state for backward compatibility
                  if (times.length > 0) {
                    setCheckInTime(times[0].checkInTime);
                  }
                  if (times.length > 1) {
                    setCheckOutTime(times[times.length - 1].checkOutTime);
                  }
                }}
                defaultCheckInTime="14:00"
                defaultCheckOutTime="11:00"
              />
            </div>

            <Separator />

            <div>
              <Label className="text-base">
                Boarding Type <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={serviceType}
                onValueChange={setServiceType}
                className="grid gap-3 mt-2"
              >
                {BOARDING_TYPES.map((type) => (
                  <Label
                    key={type.id}
                    htmlFor={`boarding-${type.id}`}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      serviceType === type.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem
                      value={type.id}
                      id={`boarding-${type.id}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{type.name}</p>
                    </div>
                    <p className="font-semibold">${type.price}/night</p>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kennel">Kennel/Room Assignment</Label>
              <Input
                id="kennel"
                value={kennel}
                onChange={(e) => setKennel(e.target.value)}
                placeholder="e.g., K-12, Suite A"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedingSchedule">Feeding Schedule</Label>
              <Textarea
                id="feedingSchedule"
                value={feedingSchedule}
                onChange={(e) => setFeedingSchedule(e.target.value)}
                placeholder="e.g., 1 cup morning, 1 cup evening..."
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="walkSchedule">Walk Schedule</Label>
              <Input
                id="walkSchedule"
                value={walkSchedule}
                onChange={(e) => setWalkSchedule(e.target.value)}
                placeholder="e.g., 3 times daily, 15 min each"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="medications">Medications</Label>
              <Textarea
                id="medications"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="List any medications and dosing instructions..."
                rows={2}
              />
            </div>
          </div>
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

        <Separator />

        {/* Special requests (common) */}
        <div className="grid gap-2">
          <Label htmlFor="specialRequests">Special Requests</Label>
          <Textarea
            id="specialRequests"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Any additional notes or special requests..."
            rows={2}
          />
        </div>

        {/* Discount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="discount">Discount ($)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            />
          </div>
          {discount > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="discountReason">Discount Reason</Label>
              <Input
                id="discountReason"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g., Loyalty discount"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 5: Confirmation
  const renderConfirmStep = () => {
    const displayClient =
      clientMode === "existing" ? selectedClient : newClientData;
    const displayPet =
      clientMode === "existing"
        ? petMode === "existing"
          ? selectedPet
          : newPetData
        : newPetData;
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
                <p className="text-sm text-muted-foreground">Pet</p>
                <p className="font-medium">{displayPet?.name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">
                  {displayPet?.type} • {displayPet?.breed}
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

            {/* Special Requests */}
            {specialRequests && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Special Requests
                  </p>
                  <p className="text-sm">{specialRequests}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Pricing Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price</span>
                <span>${calculatePrice.basePrice.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount {discountReason && `(${discountReason})`}
                  </span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
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
      <DialogContent className="min-w-7xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Booking
          </DialogTitle>
          <DialogDescription>
            Create a new booking for your facility
          </DialogDescription>
        </DialogHeader>

        <Stepper steps={STEPS} currentStep={currentStep} />

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <StepperContent className="pb-4">
            {currentStep === 0 && renderServiceStep()}
            {currentStep === 1 && renderClientStep()}
            {currentStep === 2 && renderPetStep()}
            {currentStep === 3 && renderDetailsStep()}
            {currentStep === 4 && renderConfirmStep()}
          </StepperContent>
        </ScrollArea>

        <StepperNavigation
          currentStep={currentStep}
          totalSteps={STEPS.length}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onComplete={handleComplete}
          canProceed={canProceed}
          completeLabel="Create Booking"
        />
      </DialogContent>
    </Dialog>
  );
}
