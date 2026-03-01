"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { clients } from "@/data/clients";
import { SERVICE_CATEGORIES } from "@/components/bookings/modals/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";
import { DateSelectionCalendar, type DateTimeInfo } from "@/components/ui/date-selection-calendar";
import { Booking, Pet } from "@/lib/types";
import { toast } from "sonner";
import { vaccinationRecords } from "@/data/pet-data";
import { facilityConfig } from "@/data/facility-config";
import { vaccinationRules, evaluationConfig } from "@/data/settings";
import { Syringe } from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

interface CustomerBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBooking?: Booking | null;
  onBookingCreated: () => void;
}

const STEPS = [
  { id: "pets", label: "Select Pet(s)" },
  { id: "service", label: "Select Service" },
  { id: "details", label: "Details" },
  { id: "confirm", label: "Confirm" },
];

export function CustomerBookingModal({
  open,
  onOpenChange,
  existingBooking,
  onBookingCreated,
}: CustomerBookingModalProps) {
  const { selectedFacility } = useCustomerFacility();
  const {
    daycare,
    boarding,
    grooming,
    training,
    bookingFlow,
    hours,
    rules,
    scheduleTimeOverrides,
    dropOffPickUpOverrides,
    serviceDateBlocks,
  } = useSettings();
  const configs = { daycare, boarding, grooming, training };

  // Get customer and their pets
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );
  const customerPets = useMemo(() => customer?.pets || [], [customer]);

  // Helper to format date without timezone issues
  const formatDateToISO = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState("");
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("08:00");
  const [checkOutTime, setCheckOutTime] = useState("17:00");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringPreferredDays, setRecurringPreferredDays] = useState<string[]>([]);
  const [recurringPreferredTimeWindow, setRecurringPreferredTimeWindow] = useState({ start: "09:00", end: "17:00" });
  const [recurringAutoPay, setRecurringAutoPay] = useState(false);
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [tipPercentage, setTipPercentage] = useState<number | null>(null);
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  // Details sub-step (0 = Schedule; daycare/boarding may add Room, Add-ons, Feeding later)
  const [currentDetailsSubStep, setCurrentDetailsSubStep] = useState(0);
  // Daycare: multi-date + time slider
  const [daycareSelectedDates, setDaycareSelectedDates] = useState<Date[]>([]);
  const [daycareDateTimes, setDaycareDateTimes] = useState<DateTimeInfo[]>([]);
  // Boarding: range + time slider
  const [boardingRangeStart, setBoardingRangeStart] = useState<Date | null>(null);
  const [boardingRangeEnd, setBoardingRangeEnd] = useState<Date | null>(null);
  const [boardingDateTimes, setBoardingDateTimes] = useState<DateTimeInfo[]>([]);

  // Check if pets have valid evaluations
  const getLatestEvaluation = useCallback((pet: Pet) => {
    const evals = (pet as unknown as { evaluations?: any[] }).evaluations ?? [];
    if (evals.length === 0) return null;
    return [...evals].sort((a, b) => {
      const da = a?.evaluatedAt ? new Date(a.evaluatedAt).getTime() : 0;
      const db = b?.evaluatedAt ? new Date(b.evaluatedAt).getTime() : 0;
      return db - da;
    })[0];
  }, []);

  const hasValidEvaluation = useCallback(
    (pet: Pet) => {
      const latest = getLatestEvaluation(pet);
      if (!latest) return false;
      if (latest.status === "failed") return false;
      if (latest.status !== "passed") return false;
      if (latest.isExpired === true) return false;
      return true;
    },
    [getLatestEvaluation]
  );

  // Filter available services based on facility rules
  const availableServices = useMemo(() => {
    // Check if mandatory evaluation is enabled
    const isMandatoryEvaluationEnabled = 
      bookingFlow.evaluationRequired && bookingFlow.hideServicesUntilEvaluationCompleted;

    // If mandatory evaluation is enabled, check pet evaluation status
    if (isMandatoryEvaluationEnabled) {
      // If no pets selected yet, only show evaluation
      if (selectedPetIds.length === 0) {
        return SERVICE_CATEGORIES.filter((service) => service.id === "evaluation");
      }

      // Check if all selected pets have valid evaluations
      const selectedPets = customerPets.filter((p) => selectedPetIds.includes(p.id));
      const allPetsHaveValidEvaluation = selectedPets.every((pet) => hasValidEvaluation(pet));

      if (allPetsHaveValidEvaluation) {
        // All pets have valid evaluation - hide evaluation, show all other services
        return SERVICE_CATEGORIES.filter((service) => {
          if (service.id === "evaluation") return false; // Hide evaluation once completed
          if (bookingFlow.hiddenServices.includes(service.id)) return false;
          return true;
        });
      } else {
        // At least one pet needs evaluation - show ONLY evaluation
        return SERVICE_CATEGORIES.filter((service) => service.id === "evaluation");
      }
    }

    // If mandatory evaluation is not enabled, use normal filtering
    return SERVICE_CATEGORIES.filter((service) => {
      // Hide if facility has hidden this service
      if (bookingFlow.hiddenServices.includes(service.id)) return false;

      // Check service-specific evaluation requirements
      const config = configs[service.id as keyof typeof configs];
      if (config?.settings.evaluation?.enabled && !config.settings.evaluation.optional) {
        if (selectedPetIds.length === 0) return false;
        const selectedPets = customerPets.filter((p) => selectedPetIds.includes(p.id));
        return selectedPets.every((pet) => hasValidEvaluation(pet));
      }

      return true;
    });
  }, [bookingFlow, selectedPetIds, customerPets, hasValidEvaluation, configs]);

  // Check if service requires evaluation
  const serviceRequiresEvaluation = useCallback(
    (serviceId: string) => {
      if (serviceId === "evaluation") return false;
      if (bookingFlow.evaluationRequired) return true;
      if (bookingFlow.servicesRequiringEvaluation.includes(serviceId)) return true;
      const config = configs[serviceId as keyof typeof configs];
      return config?.settings.evaluation?.enabled ?? false;
    },
    [bookingFlow, configs]
  );

  // Get selected pets
  const selectedPets = useMemo(
    () => customerPets.filter((p) => selectedPetIds.includes(p.id)),
    [customerPets, selectedPetIds]
  );

  // Derived date/time for display and submit (from daycare/boarding slider state or single date/time)
  const effectiveStartDate = useMemo(() => {
    if (selectedService === "daycare" && daycareDateTimes.length > 0)
      return daycareDateTimes[0].date;
    if (selectedService === "boarding" && boardingRangeStart)
      return boardingRangeStart.toISOString().slice(0, 10);
    return startDate;
  }, [selectedService, daycareDateTimes, boardingRangeStart, startDate]);
  const effectiveEndDate = useMemo(() => {
    if (selectedService === "boarding" && boardingRangeEnd)
      return boardingRangeEnd.toISOString().slice(0, 10);
    return endDate;
  }, [selectedService, boardingRangeEnd, endDate]);
  const effectiveCheckInTime = useMemo(() => {
    if (selectedService === "daycare" && daycareDateTimes.length > 0)
      return daycareDateTimes[0].checkInTime;
    if (selectedService === "boarding" && boardingDateTimes.length > 0)
      return boardingDateTimes[0].checkInTime;
    return checkInTime;
  }, [selectedService, daycareDateTimes, boardingDateTimes, checkInTime]);
  const effectiveCheckOutTime = useMemo(() => {
    if (selectedService === "daycare" && daycareDateTimes.length > 0)
      return daycareDateTimes[daycareDateTimes.length - 1].checkOutTime;
    if (selectedService === "boarding" && boardingDateTimes.length > 0)
      return boardingDateTimes[boardingDateTimes.length - 1].checkOutTime;
    return checkOutTime;
  }, [selectedService, daycareDateTimes, boardingDateTimes, checkOutTime]);

  // Reset selected service if it's no longer available after pet selection changes
  useEffect(() => {
    if (selectedService && !availableServices.find((s) => s.id === selectedService)) {
      setSelectedService("");
    }
  }, [availableServices, selectedService]);

  // Facility schedule props for DateSelectionCalendar (time slider)
  const scheduleOverridesForService = useMemo(() => {
    if (!selectedService) return [];
    return scheduleTimeOverrides.filter(
      (o) => !o.services?.length || o.services.includes(selectedService),
    );
  }, [selectedService, scheduleTimeOverrides]);

  const dropOffPickUpWindowsByDate = useMemo(() => {
    const map: Record<
      string,
      { dropOffStart: string; dropOffEnd: string; pickUpStart: string; pickUpEnd: string }
    > = {};
    dropOffPickUpOverrides
      .filter((o) => o.services.includes(selectedService))
      .forEach((o) => {
        map[o.date] = {
          dropOffStart: o.dropOffStart,
          dropOffEnd: o.dropOffEnd,
          pickUpStart: o.pickUpStart,
          pickUpEnd: o.pickUpEnd,
        };
      });
    return map;
  }, [selectedService, dropOffPickUpOverrides]);

  const { blockedDates, blockedStartDates, blockedEndDates, disabledDateMessages } = useMemo(() => {
    const blocks = serviceDateBlocks.filter(
      (b) => b.services.includes(selectedService),
    );
    const dates = blocks.filter((b) => b.closed).map((b) => {
      const [y, m, d] = b.date.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
    const startDates: Date[] = [];
    const endDates: Date[] = [];
    const messages: Record<string, string> = {};
    blocks.forEach((b) => {
      const [y, m, d] = b.date.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      if (b.closed || b.blockCheckIn) startDates.push(date);
      if (b.closed || b.blockCheckOut) endDates.push(date);
      if (b.closureMessage) messages[b.date] = b.closureMessage;
    });
    return {
      blockedDates: dates,
      blockedStartDates: startDates,
      blockedEndDates: endDates,
      disabledDateMessages: messages,
    };
  }, [selectedService, serviceDateBlocks]);

  // Check vaccination status for a pet
  const getPetVaccinationStatus = useCallback((pet: Pet) => {
    const petVaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
    const facilityRequirements = facilityConfig.vaccinationRequirements.requiredVaccinations.filter(
      (v) => v.required
    );

    const status: {
      missing: string[];
      expired: string[];
      expiringSoon: string[];
      upToDate: string[];
    } = {
      missing: [],
      expired: [],
      expiringSoon: [],
      upToDate: [],
    };

    facilityRequirements.forEach((req) => {
      const petVaccination = petVaccinations.find(
        (v) => v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
              req.name.toLowerCase().includes(v.vaccineName.toLowerCase())
      );

      if (!petVaccination) {
        status.missing.push(req.name);
      } else {
        const expiryDate = new Date(petVaccination.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 0) {
          status.expired.push(req.name);
        } else if (daysUntilExpiry <= 30) {
          status.expiringSoon.push(req.name);
        } else {
          status.upToDate.push(req.name);
        }
      }
    });

    return status;
  }, []);

  // Check if pets have required vaccinations for the selected service
  const vaccinationCompliance = useMemo(() => {
    if (selectedPets.length === 0 || !selectedService) return null;

    const serviceType = selectedService.toLowerCase();
    const applicableRules = vaccinationRules.filter((rule) =>
      rule.applicableServices.some((s) => s.toLowerCase() === serviceType)
    );

    const requiredVaccines = applicableRules
      .filter((rule) => rule.required)
      .map((rule) => rule.vaccineName);

    if (requiredVaccines.length === 0) return null;

    const allPetsCompliant = selectedPets.every((pet) => {
      const petStatus = getPetVaccinationStatus(pet);
      return (
        petStatus.missing.length === 0 &&
        petStatus.expired.length === 0
      );
    });

    const allPetsIssues: { petName: string; issues: string[] }[] = selectedPets.map((pet) => {
      const petStatus = getPetVaccinationStatus(pet);
      const issues: string[] = [];
      
      requiredVaccines.forEach((vaccine) => {
        if (petStatus.missing.includes(vaccine)) {
          issues.push(`${vaccine} is missing`);
        } else if (petStatus.expired.includes(vaccine)) {
          issues.push(`${vaccine} is expired`);
        }
      });

      return { petName: pet.name, issues };
    }).filter((p) => p.issues.length > 0);

    return {
      allCompliant: allPetsCompliant,
      issues: allPetsIssues,
      requiredVaccines,
    };
  }, [selectedPets, selectedService, getPetVaccinationStatus]);

  // Validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Pets
        return selectedPetIds.length > 0;
      case 1: // Service
        return selectedService !== "";
      case 2: // Details (Schedule)
        if (selectedService === "daycare") {
          return daycareSelectedDates.length > 0 && daycareDateTimes.length > 0;
        }
        if (selectedService === "boarding") {
          return (
            boardingRangeStart != null &&
            boardingRangeEnd != null &&
            boardingDateTimes.length > 0
          );
        }
        // grooming, evaluation, training: single date + time
        return startDate !== "" && checkInTime !== "";
      case 3: // Confirm
        if (vaccinationCompliance && !vaccinationCompliance.allCompliant) {
          if (facilityConfig.vaccinationRequirements.mandatoryRecords) {
            return false;
          }
        }
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    selectedService,
    selectedPetIds,
    startDate,
    checkInTime,
    daycareSelectedDates.length,
    daycareDateTimes.length,
    boardingRangeStart,
    boardingRangeEnd,
    boardingDateTimes.length,
    vaccinationCompliance,
  ]);

  const handleNext = () => {
    if (canProceed && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFacility || !customer) return;

    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Check if facility requires approval
      const requiresApproval = facilityConfig.bookingRules.approvalWorkflow?.enabled ?? false;
      
      if (requiresApproval) {
        toast.success("Booking request submitted! The facility will review and respond within 24 hours.");
      } else {
        toast.success("Booking created successfully!");
      }
      
      onBookingCreated();
      onOpenChange(false);
      // Reset form
      setCurrentStep(0);
      setSelectedService("");
      setSelectedPetIds([]);
      setStartDate("");
      setEndDate("");
      setCurrentDetailsSubStep(0);
      setDaycareSelectedDates([]);
      setDaycareDateTimes([]);
      setBoardingRangeStart(null);
      setBoardingRangeEnd(null);
      setBoardingDateTimes([]);
      setSpecialRequests("");
      setIsRecurring(false);
      setRecurringFrequency("monthly");
      setRecurringEndDate("");
      setRecurringPreferredDays([]);
      setRecurringPreferredTimeWindow({ start: "09:00", end: "17:00" });
      setRecurringAutoPay(false);
      setTipAmount(0);
      setCustomTipAmount("");
      setTipPercentage(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    // If service requires evaluation and pet doesn't have one, show alert
    if (serviceRequiresEvaluation(serviceId) && selectedPetIds.length > 0) {
      const selectedPets = customerPets.filter((p) => selectedPetIds.includes(p.id));
      const needsEvaluation = selectedPets.some((pet) => !hasValidEvaluation(pet));
      if (needsEvaluation) {
        toast.warning("Some selected pets need evaluation before booking this service");
      }
    }
  };

  // Check if tips are enabled for this service
  // TODO: Get from facility settings - for now, enable tips for grooming services
  const tipsEnabled = useMemo(() => {
    // In production, check facility settings
    // For now, enable tips for grooming services
    return selectedService === "grooming";
  }, [selectedService]);

  // Calculate price (simplified)
  const calculatedPrice = useMemo(() => {
    if (!selectedService) return 0;
    const service = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
    if (!service) return 0;
    const basePrice = service.basePrice;
    return basePrice * selectedPetIds.length;
  }, [selectedService, selectedPetIds]);

  const totalPrice = useMemo(() => {
    return calculatedPrice + tipAmount;
  }, [calculatedPrice, tipAmount]);

  // Check if deposit is required
  const requiresDeposit = useMemo(() => {
    // TODO: Get from facility config
    return facilityConfig.bookingRules.deposits.required;
  }, []);

  // Calculate deposit amount
  const calculatedDeposit = useMemo(() => {
    if (!requiresDeposit) return 0;
    const depositPercentage = facilityConfig.bookingRules.deposits.percentage || 0.5;
    return totalPrice * depositPercentage;
  }, [requiresDeposit, totalPrice]);

  // Tip percentage options
  const tipPercentages = [15, 18, 20, 25];
  
  const handleTipPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    const tip = (calculatedPrice * percentage) / 100;
    setTipAmount(tip);
    setCustomTipAmount("");
  };

  const handleCustomTip = (value: string) => {
    setCustomTipAmount(value);
    setTipPercentage(null);
    const tip = parseFloat(value) || 0;
    setTipAmount(tip);
  };

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedService("");
      setSelectedPetIds([]);
      setStartDate("");
      setEndDate("");
      setCurrentDetailsSubStep(0);
      setDaycareSelectedDates([]);
      setDaycareDateTimes([]);
      setBoardingRangeStart(null);
      setBoardingRangeEnd(null);
      setBoardingDateTimes([]);
      setSpecialRequests("");
      setIsRecurring(false);
      setRecurringFrequency("monthly");
      setRecurringEndDate("");
      setRecurringPreferredDays([]);
      setRecurringPreferredTimeWindow({ start: "09:00", end: "17:00" });
      setRecurringAutoPay(false);
      setTipAmount(0);
      setCustomTipAmount("");
      setTipPercentage(null);
      setDepositRequired(false);
      setDepositAmount(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1600px] w-[98vw] min-w-[90vw] h-[95vh] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>
            {existingBooking ? "Reschedule Booking" : "Book a Service"}
          </DialogTitle>
          <DialogDescription>
            Select a service and book for your pets
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6">
          {/* Stepper */}
          <div className="mb-6 flex-shrink-0">
            <Stepper
              steps={STEPS.map((s) => ({ id: s.id, title: s.label }))}
              currentStep={currentStep}
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 pr-4 max-h-[calc(95vh-280px)]">
              <div className="space-y-6 pb-4">
              {/* Step 1: Pet Selection */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <Label className="text-base">Select pets</Label>
                  
                  {/* Vaccination Warning */}
                  {vaccinationCompliance && !vaccinationCompliance.allCompliant && (
                    <Alert className={facilityConfig.vaccinationRequirements.mandatoryRecords ? "border-destructive" : "border-warning"}>
                      <Syringe className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-semibold">
                            {facilityConfig.vaccinationRequirements.mandatoryRecords
                              ? "Vaccination Required"
                              : "Vaccination Warning"}
                          </p>
                          {vaccinationCompliance.issues.map((issue) => (
                            <div key={issue.petName} className="text-sm">
                              <strong>{issue.petName}:</strong> {issue.issues.join(", ")}
                            </div>
                          ))}
                          {facilityConfig.vaccinationRequirements.mandatoryRecords && (
                            <p className="text-sm font-medium text-destructive">
                              Please update vaccinations before booking.
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    {customerPets.map((pet) => {
                      // Get vaccination status for this pet
                      const petVaxStatus = getPetVaccinationStatus(pet);
                      const hasVaxIssues = petVaxStatus.missing.length > 0 || petVaxStatus.expired.length > 0;
                      
                      // Block selection if mandatory records are required and pet has vaccination issues
                      const isBlocked = facilityConfig.vaccinationRequirements.mandatoryRecords && hasVaxIssues;

                      return (
                        <Card
                          key={pet.id}
                          className={`cursor-pointer transition-all ${
                            selectedPetIds.includes(pet.id)
                              ? "ring-2 ring-primary"
                              : "hover:border-primary/50"
                          } ${isBlocked ? "opacity-50 cursor-not-allowed border-destructive/50" : ""} ${hasVaxIssues && !isBlocked ? "border-yellow-200 bg-yellow-50/50" : ""}`}
                          onClick={() => {
                            if (isBlocked) {
                              toast.error(
                                `${pet.name} has missing or expired vaccinations. Please update them first.`
                              );
                              return;
                            }
                            if (selectedPetIds.includes(pet.id)) {
                              setSelectedPetIds(selectedPetIds.filter((id) => id !== pet.id));
                            } else {
                              setSelectedPetIds([...selectedPetIds, pet.id]);
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedPetIds.includes(pet.id)}
                                disabled={isBlocked}
                                onCheckedChange={(checked) => {
                                  if (isBlocked) return;
                                  if (checked) {
                                    setSelectedPetIds([...selectedPetIds, pet.id]);
                                  } else {
                                    setSelectedPetIds(selectedPetIds.filter((id) => id !== pet.id));
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold">{pet.name}</h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {hasVaxIssues && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        <Syringe className="h-3 w-3" />
                                        {petVaxStatus.missing.length > 0 ? "Missing Vax" : "Expired Vax"}
                                      </Badge>
                                    )}
                                    {bookingFlow.evaluationRequired &&
                                      bookingFlow.hideServicesUntilEvaluationCompleted &&
                                      !hasValidEvaluation(pet) && (
                                        <Badge variant="secondary" className="text-xs">
                                          Needs evaluation
                                        </Badge>
                                      )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {pet.breed} • {pet.age} years old
                                </p>
                                {(hasVaxIssues || (bookingFlow.evaluationRequired && !hasValidEvaluation(pet))) && (
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {(hasVaxIssues || !hasValidEvaluation(pet)) && (
                                      <a
                                        href={`/customer/pets/${pet.id}`}
                                        className="text-xs font-medium text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Fix now →
                                      </a>
                                    )}
                                    {hasVaxIssues && (
                                      <span className="text-xs text-destructive">
                                        {petVaxStatus.missing.length > 0 && `${petVaxStatus.missing.join(", ")} missing. `}
                                        {petVaxStatus.expired.length > 0 && `${petVaxStatus.expired.join(", ")} expired.`}
                                        {isBlocked && (
                                          <span className="font-medium"> Update required before booking.</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Service Selection — same card layout as facility (image, description, from price) */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <Label className="text-base">Select a service</Label>

                  {/* When mandatory evaluation and no pets selected: only show Evaluation + message */}
                  {bookingFlow.evaluationRequired &&
                    bookingFlow.hideServicesUntilEvaluationCompleted &&
                    selectedPetIds.length === 0 && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription>
                          <p className="font-semibold text-amber-800 dark:text-amber-200">
                            Book an evaluation first
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            You must book an evaluation before you can book any other services. Select your pet(s) above, then choose Evaluation below.
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* When mandatory evaluation and some pets need evaluation: show only Evaluation + alert */}
                  {bookingFlow.evaluationRequired &&
                    bookingFlow.hideServicesUntilEvaluationCompleted &&
                    selectedPetIds.length > 0 && (() => {
                      const selectedPets = customerPets.filter((p) => selectedPetIds.includes(p.id));
                      const petsNeedingEvaluation = selectedPets.filter((pet) => !hasValidEvaluation(pet));
                      if (petsNeedingEvaluation.length > 0) {
                        return (
                          <Alert className="border-warning bg-warning/10">
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <AlertDescription>
                              <p className="font-semibold text-warning">Evaluation required</p>
                              <p className="text-sm mt-1">
                                {petsNeedingEvaluation.length === 1
                                  ? `${petsNeedingEvaluation[0].name} needs to complete an evaluation before booking other services.`
                                  : `The following pets need an evaluation first: ${petsNeedingEvaluation.map((p) => p.name).join(", ")}`}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Book an evaluation below. Once completed and approved, you can book other services.
                              </p>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}

                  <div className="grid grid-cols-2 gap-4">
                    {availableServices.map((service) => {
                      const Icon = service.icon;
                      const config = configs[service.id as keyof typeof configs];
                      const isDisabled = config?.status.disabled ?? false;
                      const requiresEval = serviceRequiresEvaluation(service.id);
                      const hasEvalForPets =
                        selectedPetIds.length === 0 ||
                        selectedPets.every((p) => hasValidEvaluation(p));
                      const isEvaluation = service.id === "evaluation";

                      return (
                        <div
                          key={service.id}
                          className={`relative border rounded-lg transition-colors overflow-hidden ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          } ${
                            selectedService === service.id && !isDisabled
                              ? "border-primary bg-primary/5 ring-2 ring-primary"
                              : !isDisabled
                                ? "hover:border-primary/50"
                                : ""
                          }`}
                          onClick={() => !isDisabled && handleServiceSelect(service.id)}
                        >
                          {requiresEval && !hasEvalForPets && !isEvaluation && (
                            <div className="absolute top-2 left-2 z-10">
                              <Badge variant="secondary" className="text-xs">
                                Evaluation required
                              </Badge>
                            </div>
                          )}
                          {config?.bannerImage ? (
                            <div className="w-full h-32">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={config.bannerImage}
                                alt={config.clientFacingName || service.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : service.image ? (
                            <div className="w-full h-32">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={service.image}
                                alt={service.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-full h-32 flex items-center justify-center ${
                                selectedService === service.id && !isDisabled
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <Icon className="h-12 w-12" />
                            </div>
                          )}
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {isEvaluation
                                  ? evaluationConfig.customerName
                                  : config?.clientFacingName || service.name}
                              </p>
                              {selectedService === service.id && !isDisabled && (
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {isEvaluation
                                ? evaluationConfig.description
                                : config?.slogan || service.description}
                            </p>
                            <p className="font-semibold text-primary">
                              {isEvaluation
                                ? `$${evaluationConfig.price}`
                                : `From $${config?.basePrice ?? service.basePrice}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Step 3: Details — Schedule (same time selector as facility: date + time slider) */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {selectedService === "daycare" && (
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <Label className="text-base">Select Daycare Days</Label>
                        <p className="text-xs text-muted-foreground">
                          Drop-off and pick-up times use the same time slider as the facility booking flow.
                        </p>
                        <DateSelectionCalendar
                          mode="multi"
                          selectedDates={daycareSelectedDates}
                          onSelectionChange={setDaycareSelectedDates}
                          showTimeSelection
                          dateTimes={daycareDateTimes}
                          onDateTimesChange={setDaycareDateTimes}
                          facilityHours={hours}
                          scheduleTimeOverrides={scheduleOverridesForService}
                          dropOffPickUpWindowsByDate={dropOffPickUpWindowsByDate}
                          bookingRules={{
                            minimumAdvanceBooking: rules.minimumAdvanceBooking,
                            maximumAdvanceBooking: rules.maximumAdvanceBooking,
                          }}
                          disabledDates={blockedDates}
                          disabledDateMessages={disabledDateMessages}
                        />
                      </CardContent>
                    </Card>
                  )}
                  {selectedService === "boarding" && (
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <Label className="text-base">Select Boarding Dates</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Choose check-in and check-out dates, then set times with the slider (same as facility).
                        </p>
                        <DateSelectionCalendar
                          mode="range"
                          rangeStart={boardingRangeStart}
                          rangeEnd={boardingRangeEnd}
                          onRangeChange={(start, end) => {
                            setBoardingRangeStart(start);
                            setBoardingRangeEnd(end);
                            if (start) setStartDate(formatDateToISO(start));
                            if (end) setEndDate(formatDateToISO(end));
                          }}
                          showTimeSelection
                          dateTimes={boardingDateTimes}
                          onDateTimesChange={(times) => {
                            setBoardingDateTimes(times);
                            if (times.length > 0) {
                              setCheckInTime(times[0].checkInTime);
                              setCheckOutTime(times[times.length - 1].checkOutTime);
                            }
                          }}
                          facilityHours={hours}
                          scheduleTimeOverrides={scheduleOverridesForService}
                          dropOffPickUpWindowsByDate={dropOffPickUpWindowsByDate}
                          bookingRules={{
                            minimumAdvanceBooking: rules.minimumAdvanceBooking,
                            maximumAdvanceBooking: rules.maximumAdvanceBooking,
                          }}
                          disabledStartDates={blockedStartDates}
                          disabledEndDates={blockedEndDates}
                          disabledDateMessages={disabledDateMessages}
                        />
                      </CardContent>
                    </Card>
                  )}
                  {(selectedService === "grooming" || selectedService === "evaluation" || selectedService === "training") && (
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <Label className="text-base">
                          {selectedService === "grooming" ? "Appointment Date & Time" : "Select Date & Time"}
                        </Label>
                        <DateSelectionCalendar
                          mode="single"
                          selectedDates={startDate ? [new Date(startDate + "T00:00:00")] : []}
                          onSelectionChange={(dates) => {
                            if (dates.length > 0) setStartDate(formatDateToISO(dates[0]));
                          }}
                          showTimeSelection
                          dateTimes={
                            startDate
                              ? [
                                  {
                                    date: startDate,
                                    checkInTime: checkInTime,
                                    checkOutTime: checkInTime,
                                  },
                                ]
                              : []
                          }
                          onDateTimesChange={(times) => {
                            if (times.length > 0) {
                              setStartDate(times[0].date);
                              setCheckInTime(times[0].checkInTime);
                            }
                          }}
                          facilityHours={hours}
                          scheduleTimeOverrides={scheduleOverridesForService}
                          bookingRules={{
                            minimumAdvanceBooking: rules.minimumAdvanceBooking,
                            maximumAdvanceBooking: rules.maximumAdvanceBooking,
                          }}
                          disabledDates={blockedDates}
                          disabledDateMessages={disabledDateMessages}
                        />
                        {selectedService === "grooming" && (
                          <>
                            <Separator />
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isRecurring}
                                onCheckedChange={(checked) => setIsRecurring(checked === true)}
                              />
                              <Label>Make this a recurring appointment</Label>
                            </div>
                            {isRecurring && (
                              <div className="grid grid-cols-2 gap-4 pl-6">
                                <div className="space-y-2">
                                  <Label>Frequency</Label>
                                  <Select
                                    value={recurringFrequency}
                                    onValueChange={(value: "weekly" | "biweekly" | "monthly") =>
                                      setRecurringFrequency(value)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>End Date (Optional)</Label>
                                  <Input
                                    type="date"
                                    value={recurringEndDate}
                                    onChange={(e) => setRecurringEndDate(e.target.value)}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label>Special Requests or Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any special instructions or requests..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Confirm — receipt-style review + tip + confirm */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Service</h3>
                        <p className="text-muted-foreground capitalize">
                          {SERVICE_CATEGORIES.find((s) => s.id === selectedService)?.name}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2">Pets</h3>
                        <div className="space-y-1">
                          {selectedPets.map((pet) => (
                            <p key={pet.id} className="text-muted-foreground">
                              {pet.name} ({pet.breed})
                            </p>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2">Date & Time</h3>
                        <p className="text-muted-foreground">
                          {effectiveStartDate &&
                            new Date(effectiveStartDate + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          {effectiveCheckInTime && ` at ${effectiveCheckInTime}`}
                        </p>
                        {effectiveEndDate && effectiveEndDate !== effectiveStartDate && (
                          <p className="text-muted-foreground">
                            Until{" "}
                            {new Date(effectiveEndDate + "T00:00:00").toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {effectiveCheckOutTime && ` at ${effectiveCheckOutTime}`}
                          </p>
                        )}
                        {selectedService === "daycare" && daycareDateTimes.length > 1 && (
                          <p className="text-sm text-muted-foreground">
                            {daycareDateTimes.length} days selected
                          </p>
                        )}
                        {isRecurring && (
                          <p className="text-muted-foreground">
                            Recurring: {recurringFrequency}
                          </p>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2">Pricing Summary</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service:</span>
                            <span>${calculatedPrice.toFixed(2)}</span>
                          </div>
                          {tipsEnabled && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tip:</span>
                              <span className={tipAmount > 0 ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                                {tipAmount > 0 ? `$${tipAmount.toFixed(2)}` : "Optional"}
                              </span>
                            </div>
                          )}
                          {tipAmount > 0 && !tipsEnabled && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tip:</span>
                              <span className="text-green-600 font-semibold">${tipAmount.toFixed(2)}</span>
                            </div>
                          )}
                          {requiresDeposit && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Deposit:</span>
                              <span>${calculatedDeposit.toFixed(2)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total:</span>
                            <span className="text-primary">${totalPrice.toFixed(2)}</span>
                          </div>
                          {requiresDeposit && (
                            <p className="text-xs text-muted-foreground">
                              {calculatedDeposit.toFixed(2)} due now, {(totalPrice - calculatedDeposit).toFixed(2)} at service
                            </p>
                          )}
                        </div>
                      </div>
                      {tipsEnabled && (
                        <div className="pt-4 space-y-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            <span>💝</span> Add a Tip (Optional)
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Show your appreciation to the team who cares for your pet!
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {tipPercentages.map((percent) => (
                              <Button
                                key={percent}
                                variant={tipPercentage === percent ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleTipPercentage(percent)}
                                className="text-sm"
                              >
                                {percent}%
                              </Button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Custom amount"
                              value={customTipAmount}
                              onChange={(e) => handleCustomTip(e.target.value)}
                              className="flex-1"
                              min="0"
                              step="0.01"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTipAmount(0);
                                setTipPercentage(null);
                                setCustomTipAmount("");
                              }}
                            >
                              No tip
                            </Button>
                          </div>
                          {tipAmount > 0 && (
                            <p className="text-sm text-green-600 font-medium">
                              Thank you! Your ${tipAmount.toFixed(2)} tip will go directly to the team.
                            </p>
                          )}
                        </div>
                      )}
                      {isRecurring && selectedService === "grooming" && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-2">Recurring Settings</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>Frequency: {recurringFrequency}</p>
                              {recurringPreferredDays.length > 0 && (
                                <p>Preferred days: {recurringPreferredDays.join(", ")}</p>
                              )}
                              <p>Time window: {recurringPreferredTimeWindow.start} - {recurringPreferredTimeWindow.end}</p>
                              {recurringAutoPay && (
                                <p className="text-green-600 font-medium">✓ Auto-pay enabled</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 pb-6 border-t mt-4 flex-shrink-0 bg-background">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={!canProceed}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
