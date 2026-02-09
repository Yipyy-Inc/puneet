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
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Booking, Pet } from "@/lib/types";
import { toast } from "sonner";
import { vaccinationRecords } from "@/data/pet-data";
import { facilityConfig } from "@/data/facility-config";
import { vaccinationRules } from "@/data/settings";
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
  { id: "service", label: "Service" },
  { id: "pets", label: "Pets" },
  { id: "date", label: "Date & Time" },
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
  const { daycare, boarding, grooming, training, bookingFlow } = useSettings();
  const configs = { daycare, boarding, grooming, training };

  // Get customer and their pets
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );
  const customerPets = useMemo(() => customer?.pets || [], [customer]);

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
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    return SERVICE_CATEGORIES.filter((service) => {
      // Always show evaluation
      if (service.id === "evaluation") return true;

      // Hide if facility has hidden this service
      if (bookingFlow.hiddenServices.includes(service.id)) return false;

      // Check evaluation requirements
      if (bookingFlow.evaluationRequired && bookingFlow.hideServicesUntilEvaluationCompleted) {
        if (selectedPetIds.length === 0) return false;
        const selectedPets = customerPets.filter((p) => selectedPetIds.includes(p.id));
        return selectedPets.every((pet) => hasValidEvaluation(pet));
      }

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
      case 0:
        return selectedService !== "";
      case 1:
        if (selectedPetIds.length === 0) return false;
        // Block if vaccinations are missing/expired (unless facility allows warnings only)
        if (vaccinationCompliance && !vaccinationCompliance.allCompliant) {
          // Check if facility blocks bookings or just warns
          if (facilityConfig.vaccinationRequirements.mandatoryRecords) {
            return false; // Block booking
          }
        }
        return true;
      case 2:
        return startDate !== "" && (selectedService !== "boarding" || endDate !== "");
      case 3:
        return true;
      case 4:
        // Final check before confirmation
        if (vaccinationCompliance && !vaccinationCompliance.allCompliant) {
          if (facilityConfig.vaccinationRequirements.mandatoryRecords) {
            return false; // Block booking
          }
        }
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedService, selectedPetIds, startDate, endDate, vaccinationCompliance]);

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
      onBookingCreated();
      onOpenChange(false);
      // Reset form
      setCurrentStep(0);
      setSelectedService("");
      setSelectedPetIds([]);
      setStartDate("");
      setEndDate("");
      setSpecialRequests("");
      setIsRecurring(false);
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

  // Calculate price (simplified)
  const calculatedPrice = useMemo(() => {
    if (!selectedService) return 0;
    const service = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
    if (!service) return 0;
    const basePrice = service.basePrice;
    return basePrice * selectedPetIds.length;
  }, [selectedService, selectedPetIds]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setSelectedService("");
      setSelectedPetIds([]);
      setStartDate("");
      setEndDate("");
      setSpecialRequests("");
      setIsRecurring(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {existingBooking ? "Reschedule Booking" : "Book a Service"}
          </DialogTitle>
          <DialogDescription>
            Select a service and book for your pets
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Stepper */}
          <div className="mb-6">
            <Stepper
              steps={STEPS.map((s) => ({ id: s.id, title: s.label }))}
              currentStep={currentStep}
            />
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Step 1: Service Selection */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <Label className="text-base">Select a service</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {availableServices.map((service) => {
                      const Icon = service.icon;
                      const config = configs[service.id as keyof typeof configs];
                      const isDisabled = config?.status.disabled ?? false;
                      const requiresEval = serviceRequiresEvaluation(service.id);
                      const hasEvalForPets =
                        selectedPetIds.length === 0 ||
                        selectedPets.every((p) => hasValidEvaluation(p));

                      return (
                        <Card
                          key={service.id}
                          className={`cursor-pointer transition-all ${
                            selectedService === service.id
                              ? "ring-2 ring-primary"
                              : "hover:border-primary/50"
                          } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => !isDisabled && handleServiceSelect(service.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold">{service.name}</h3>
                                  {selectedService === service.id && (
                                    <CheckCircle className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {service.description}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-primary">
                                    From ${service.basePrice}
                                  </span>
                                  {requiresEval && !hasEvalForPets && (
                                    <Badge variant="warning" className="text-xs">
                                      Evaluation Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Pet Selection */}
              {currentStep === 1 && (
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
                      const hasEval = hasValidEvaluation(pet);
                      const requiresEval = selectedService
                        ? serviceRequiresEvaluation(selectedService)
                        : false;
                      const canSelect = !requiresEval || hasEval || selectedService === "evaluation";
                      
                      // Get vaccination status for this pet
                      const petVaxStatus = getPetVaccinationStatus(pet);
                      const hasVaxIssues = petVaxStatus.missing.length > 0 || petVaxStatus.expired.length > 0;
                      const isBlocked = facilityConfig.vaccinationRequirements.mandatoryRecords && hasVaxIssues;

                      return (
                        <Card
                          key={pet.id}
                          className={`cursor-pointer transition-all ${
                            selectedPetIds.includes(pet.id)
                              ? "ring-2 ring-primary"
                              : "hover:border-primary/50"
                          } ${!canSelect || isBlocked ? "opacity-50" : ""}`}
                          onClick={() => {
                            if (!canSelect) {
                              toast.warning(
                                `${pet.name} needs evaluation before booking this service`
                              );
                              return;
                            }
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
                                disabled={!canSelect || isBlocked}
                                onCheckedChange={(checked) => {
                                  if (!canSelect || isBlocked) return;
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
                                  <div className="flex items-center gap-2">
                                    {requiresEval && (
                                      <Badge
                                        variant={hasEval ? "default" : "destructive"}
                                        className="text-xs"
                                      >
                                        {hasEval ? "Evaluated" : "Needs Evaluation"}
                                      </Badge>
                                    )}
                                    {hasVaxIssues && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs flex items-center gap-1"
                                      >
                                        <Syringe className="h-3 w-3" />
                                        {petVaxStatus.missing.length > 0 ? "Missing Vax" : "Expired Vax"}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {pet.breed} • {pet.age} years old
                                </p>
                                {hasVaxIssues && (
                                  <p className="text-xs text-destructive mt-1">
                                    {petVaxStatus.missing.length > 0 && `${petVaxStatus.missing.join(", ")} missing. `}
                                    {petVaxStatus.expired.length > 0 && `${petVaxStatus.expired.join(", ")} expired.`}
                                  </p>
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

              {/* Step 3: Date & Time */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <Label className="text-base">Select date and time</Label>
                  {selectedService === "daycare" ? (
                    <div className="space-y-4">
                      <DateSelectionCalendar
                        mode="multiple"
                        selectedDates={startDate ? [new Date(startDate)] : []}
                        onSelectionChange={(dates) => {
                          if (dates.length > 0) {
                            setStartDate(dates[0].toISOString().split("T")[0]);
                          }
                        }}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Check-in Time</Label>
                          <Input
                            type="time"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Check-out Time</Label>
                          <Input
                            type="time"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : selectedService === "boarding" ? (
                    <div className="space-y-4">
                      <DateSelectionCalendar
                        mode="range"
                        rangeStart={startDate ? new Date(startDate) : null}
                        rangeEnd={endDate ? new Date(endDate) : null}
                        onRangeChange={(start, end) => {
                          if (start) setStartDate(start.toISOString().split("T")[0]);
                          if (end) setEndDate(end.toISOString().split("T")[0]);
                        }}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Check-in Time</Label>
                          <Input
                            type="time"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Check-out Time</Label>
                          <Input
                            type="time"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : selectedService === "grooming" ? (
                    <div className="space-y-4">
                      <DateSelectionCalendar
                        mode="single"
                        selectedDates={startDate ? [new Date(startDate)] : []}
                        onSelectionChange={(dates) => {
                          if (dates.length > 0) {
                            setStartDate(dates[0].toISOString().split("T")[0]);
                          }
                        }}
                      />
                      <div className="space-y-2">
                        <Label>Appointment Time</Label>
                        <Input
                          type="time"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        />
                      </div>
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
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <DateSelectionCalendar
                        mode="single"
                        selectedDates={startDate ? [new Date(startDate)] : []}
                        onSelectionChange={(dates) => {
                          if (dates.length > 0) {
                            setStartDate(dates[0].toISOString().split("T")[0]);
                          }
                        }}
                      />
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Input
                          type="time"
                          value={checkInTime}
                          onChange={(e) => setCheckInTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Special Requests or Notes</Label>
                    <Textarea
                      placeholder="Any special instructions or requests..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Confirm */}
              {currentStep === 4 && (
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
                          {new Date(startDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          {checkInTime && ` at ${checkInTime}`}
                        </p>
                        {endDate && (
                          <p className="text-muted-foreground">
                            Until{" "}
                            {new Date(endDate).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {checkOutTime && ` at ${checkOutTime}`}
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
                        <h3 className="font-semibold mb-2">Total</h3>
                        <p className="text-2xl font-bold text-primary">
                          ${calculatedPrice.toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
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
