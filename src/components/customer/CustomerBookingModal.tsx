"use client";

import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { clients } from "@/data/clients";
import {
  SERVICE_CATEGORIES,
  CUSTOMER_BOARDING_ROOM_TYPES,
  GROOMING_PACKAGES,
  GROOMING_ADDONS,
  CUSTOMER_ADDONS,
} from "@/components/bookings/modals/constants";
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
  Dog,
  Cat,
  Scissors,
  PawPrint,
  Bed,
  Receipt,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DateSelectionCalendar, type DateTimeInfo } from "@/components/ui/date-selection-calendar";
import { Booking, Pet } from "@/lib/types";
import { toast } from "sonner";
import { vaccinationRecords } from "@/data/pet-data";
import { facilityConfig } from "@/data/facility-config";
import { clientDocuments } from "@/data/documents";
import { vaccinationRules, evaluationConfig } from "@/data/settings";
import { getFormById, getFormsByFacility } from "@/data/forms";
import { getSubmissionsForPet } from "@/data/form-submissions";
import { Syringe } from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

interface CustomerBookingModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, render as a full page (no Dialog). Requires onCancel. */
  asPage?: boolean;
  /** Required when asPage: called when user clicks Cancel / Back from first step */
  onCancel?: () => void;
  existingBooking?: Booking | null;
  onBookingCreated: () => void;
}

const STEPS = [
  { id: "pets", label: "Select Pet(s)" },
  { id: "service", label: "Select Service" },
  { id: "details", label: "Details" },
  { id: "forms", label: "Complete Required Forms" },
  { id: "tip", label: "Tip Your Care Team" },
  { id: "confirm", label: "Confirm" },
];

function WizardWrapper({
  asPage,
  open,
  onOpenChange,
  existingBooking,
  children,
}: {
  asPage: boolean;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  existingBooking?: Booking | null;
  children: ReactNode;
}) {
  if (asPage) {
    return (
      <div className="flex flex-col min-h-[85vh] w-full max-w-5xl mx-auto px-4 py-6">
        {children}
      </div>
    );
  }
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
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function CustomerBookingModal({
  open = true,
  onOpenChange,
  asPage = false,
  onCancel,
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
  // Boarding: room type per pet (or same for all if facility does not allow different)
  const [roomAssignments, setRoomAssignments] = useState<Array<{ petId: number; roomId: string }>>([]);
  /** If false, same room type is applied to all pets and we show one selector. */
  const allowDifferentRoomPerPet = true;
  // Grooming: package + add-ons
  const [selectedGroomingPackage, setSelectedGroomingPackage] = useState("");
  const [selectedGroomingAddons, setSelectedGroomingAddons] = useState<string[]>([]);
  // Add-ons (daycare/boarding): same shape as facility — serviceId, quantity, petId
  const [extraServices, setExtraServices] = useState<Array<{ serviceId: string; quantity: number; petId: number }>>([]);
  /** Per add-on: apply to "all" or a specific petId (for UI: All pets vs dropdown) */
  const [addOnApplyTo, setAddOnApplyTo] = useState<Record<string, "all" | number>>({});
  /** Details modal: room or grooming package (photos + notes) */
  const [detailsOpen, setDetailsOpen] = useState<{ type: "room"; id: string } | { type: "package"; id: string } | null>(null);

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

  // Number of Details sub-steps: daycare 2 (Schedule, Add-ons); boarding 3 (Schedule, Room Type, Add-ons); grooming 3 (Schedule, Package, Add-ons)
  const detailsSubStepCount = useMemo(() => {
    if (selectedService === "daycare") return 2;
    if (selectedService === "boarding") return 3;
    if (selectedService === "grooming") return 3;
    return 1;
  }, [selectedService]);

  // Add-ons for current service (daycare or boarding only; grooming uses GROOMING_ADDONS)
  const eligibleAddons = useMemo(() => {
    if (selectedService !== "daycare" && selectedService !== "boarding") return [];
    return CUSTOMER_ADDONS.filter((a) => a.services.includes(selectedService));
  }, [selectedService]);

  // Boarding: filter room types by pet eligibility (type, weight limits)
  const eligibleBoardingRooms = useMemo(() => {
    if (selectedService !== "boarding" || selectedPets.length === 0) return CUSTOMER_BOARDING_ROOM_TYPES;
    return CUSTOMER_BOARDING_ROOM_TYPES.filter((room) => {
      return selectedPets.every((pet) => {
        if (!room.allowedPetTypes.includes(pet.type)) return false;
        if (room.minWeightLbs != null && pet.weight < room.minWeightLbs) return false;
        if (room.maxWeightLbs != null && pet.weight > room.maxWeightLbs) return false;
        return true;
      });
    });
  }, [selectedService, selectedPets]);

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

  // Reset Details sub-step and service-specific state when service changes
  useEffect(() => {
    setCurrentDetailsSubStep(0);
    setRoomAssignments([]);
    setSelectedGroomingPackage("");
    setSelectedGroomingAddons([]);
    setExtraServices([]);
    setAddOnApplyTo({});
  }, [selectedService]);

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

  // Required forms/agreements/vaccination for booking (used in "Complete Required Forms" step). 7.1 Includes formRequirements.beforeRequest per service.
  const facilityId = selectedFacility?.id ?? 11;
  const requiredFormsStatus = useMemo(() => {
    const missing: Array<{ type: "vaccination" | "agreement" | "intake" | "form"; label: string; petId?: number; petName?: string; link: string }> = [];
    const templates = facilityConfig.waiversAndContracts.templates;
    const requiredAgreementNames: string[] = [];
    if (templates.liabilityWaiver.required) requiredAgreementNames.push(templates.liabilityWaiver.name);
    if (selectedService === "daycare" && templates.daycareAgreement.required) requiredAgreementNames.push(templates.daycareAgreement.name);
    if (selectedService === "boarding" && templates.boardingContract.required) requiredAgreementNames.push(templates.boardingContract.name);
    if (selectedService === "grooming" || selectedService === "training" || selectedService === "evaluation") {
      // Only liability if required
    }

    const clientDocs = clientDocuments.filter(
      (d) => d.clientId === MOCK_CUSTOMER_ID && d.facilityId === facilityId && (d.type === "agreement" || d.type === "waiver") && d.signedAt
    );
    requiredAgreementNames.forEach((name) => {
      const signed = clientDocs.some((d) => d.name.toLowerCase().includes(name.toLowerCase()));
      if (!signed) {
        missing.push({
          type: "agreement",
          label: name,
          link: "/customer/documents",
        });
      }
    });

    if (facilityConfig.vaccinationRequirements.documentationRequired || facilityConfig.vaccinationRequirements.mandatoryRecords) {
      selectedPets.forEach((pet) => {
        const status = getPetVaccinationStatus(pet);
        const hasIssue = status.missing.length > 0 || status.expired.length > 0;
        if (hasIssue) {
          const issues = [...status.missing.map((v) => `${v} missing`), ...status.expired.map((v) => `${v} expired`)];
          missing.push({
            type: "vaccination",
            label: issues.join("; "),
            petId: pet.id,
            petName: pet.name,
            link: `/customer/pets/${pet.id}`,
          });
        }
      });
    }

    // 7.1 Required forms before booking (configurable per service)
    const formReq = selectedService ? facilityConfig.formRequirements[selectedService as keyof typeof facilityConfig.formRequirements] : null;
    const beforeRequestFormIds = formReq?.beforeRequest ?? [];
    if (beforeRequestFormIds.length > 0 && selectedPets.length > 0) {
      selectedPets.forEach((pet) => {
        const petSubmissions = getSubmissionsForPet(facilityId, pet.id);
        const completedFormIds = new Set(petSubmissions.map((s) => s.formId));
        beforeRequestFormIds.forEach((formId) => {
          if (completedFormIds.has(formId)) return;
          const form = getFormById(formId);
          missing.push({
            type: "form",
            label: form?.name ?? formId,
            petId: pet.id,
            petName: pet.name,
            link: form?.slug ? `/forms/${form.slug}?petId=${pet.id}&customerId=${MOCK_CUSTOMER_ID}` : `/customer/pets/${pet.id}`,
          });
        });
      });
    }

    const totalRequirements =
      requiredAgreementNames.length +
      (facilityConfig.vaccinationRequirements.documentationRequired || facilityConfig.vaccinationRequirements.mandatoryRecords
        ? selectedPets.length
        : 0) +
      beforeRequestFormIds.length * selectedPets.length;
    const completedCount = Math.max(0, totalRequirements - missing.length);
    const totalCount = totalRequirements;

    return {
      missing,
      completedCount,
      totalCount,
      allComplete: missing.length === 0,
    };
  }, [selectedService, selectedPets, facilityId, getPetVaccinationStatus]);

  const allowBookingWithoutForms = facilityConfig.bookingRules.allowBookingWithoutForms ?? false;

  // Validation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Pets
        return selectedPetIds.length > 0;
      case 1: // Service
        return selectedService !== "";
      case 2: // Details (sub-steps)
        if (currentDetailsSubStep === 0) {
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
          return startDate !== "" && checkInTime !== "";
        }
        if (currentDetailsSubStep === 1) {
          if (selectedService === "boarding") {
            return roomAssignments.length === selectedPetIds.length;
          }
          if (selectedService === "grooming") {
            return selectedGroomingPackage !== "";
          }
        }
        return true;
      case 3: // Complete Required Forms. 7.1 If formRequirements.ifMissing === "block", block until forms complete.
        const formReqBlock = selectedService ? facilityConfig.formRequirements[selectedService as keyof typeof facilityConfig.formRequirements] : null;
        if (formReqBlock?.ifMissing === "block") return requiredFormsStatus.allComplete;
        if (allowBookingWithoutForms) return true;
        return requiredFormsStatus.allComplete;
      case 4: // Tip (optional step; always can proceed)
        return true;
      case 5: // Confirm
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
    allowBookingWithoutForms,
    requiredFormsStatus.allComplete,
    selectedPetIds,
    startDate,
    checkInTime,
    currentDetailsSubStep,
    daycareSelectedDates.length,
    daycareDateTimes.length,
    boardingRangeStart,
    boardingRangeEnd,
    boardingDateTimes.length,
    roomAssignments.length,
    selectedGroomingPackage,
    vaccinationCompliance,
  ]);

  const handleNext = () => {
    if (!canProceed) return;
    if (currentStep === 2 && currentDetailsSubStep < detailsSubStepCount - 1) {
      setCurrentDetailsSubStep(currentDetailsSubStep + 1);
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      if (currentStep + 1 === 2) setCurrentDetailsSubStep(0);
      if (currentStep + 1 === 3) setCurrentDetailsSubStep(0);
    }
  };

  const handleBack = () => {
    if (currentStep === 2 && currentDetailsSubStep > 0) {
      setCurrentDetailsSubStep(currentDetailsSubStep - 1);
      return;
    }
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
      
      // Check if facility requires approval or if requirements are incomplete (allow booking without forms)
      const requiresApproval = facilityConfig.bookingRules.approvalWorkflow?.enabled ?? false;
      const formsIncomplete = allowBookingWithoutForms && !requiredFormsStatus.allComplete && requiredFormsStatus.missing.length > 0;

      if (formsIncomplete) {
        toast.success("Booking request submitted. Approval pending until required forms and documents are completed.");
      } else if (requiresApproval) {
        toast.success("Booking request submitted! The facility will review and respond within 24 hours.");
      } else {
        toast.success("Booking created successfully!");
      }
      
      onBookingCreated();
      if (!asPage) onOpenChange?.(false);
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
      setRoomAssignments([]);
      setSelectedGroomingPackage("");
      setSelectedGroomingAddons([]);
      setExtraServices([]);
      setAddOnApplyTo({});
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

  // Tipping: facility-configurable (enabled, mode, suggestions, recommended)
  const tippingConfig = facilityConfig.bookingRules?.tipping ?? { enabled: false, mode: "percent" as const, percentSuggestions: [10, 15, 20], fixedSuggestions: [5, 10, 20], recommendedIndex: null as number | null };
  const tipsEnabled = tippingConfig.enabled ?? false;
  const tipSuggestions = useMemo(() => {
    if (tippingConfig.mode === "fixed") return (tippingConfig.fixedSuggestions ?? [5, 10, 20]).map((a) => ({ type: "fixed" as const, value: a, label: `$${a}` }));
    return (tippingConfig.percentSuggestions ?? [10, 15, 20]).map((p) => ({ type: "percent" as const, value: p, label: `${p}%` }));
  }, [tippingConfig.mode, tippingConfig.percentSuggestions, tippingConfig.fixedSuggestions]);
  const recommendedTipIndex = tippingConfig.recommendedIndex ?? null;

  // Add-ons total (daycare/boarding extra services)
  const extraServicesTotal = useMemo(() => {
    return extraServices.reduce((sum, es) => {
      const addon = CUSTOMER_ADDONS.find((a) => a.id === es.serviceId);
      if (!addon) return sum;
      if (addon.hasUnits && addon.pricePerUnit != null) return sum + addon.pricePerUnit * es.quantity;
      return sum + (addon.basePrice ?? 0) * es.quantity;
    }, 0);
  }, [extraServices]);

  // Calculate price (simplified)
  const calculatedPrice = useMemo(() => {
    if (!selectedService) return 0;
    if (selectedService === "grooming") {
      const pkg = GROOMING_PACKAGES.find((p) => p.id === selectedGroomingPackage);
      const pkgPrice = pkg ? pkg.price : 0;
      const addonsPrice = selectedGroomingAddons.reduce(
        (sum, id) => sum + (GROOMING_ADDONS.find((a) => a.id === id)?.price ?? 0),
        0
      );
      return (pkgPrice + addonsPrice) * selectedPetIds.length;
    }
    if (selectedService === "boarding") {
      let base = 0;
      if (roomAssignments.length > 0 && effectiveEndDate && effectiveStartDate) {
        const nights = Math.max(1, Math.ceil((new Date(effectiveEndDate).getTime() - new Date(effectiveStartDate).getTime()) / (24 * 60 * 60 * 1000)));
        base = roomAssignments.reduce((sum, a) => {
          const room = CUSTOMER_BOARDING_ROOM_TYPES.find((r) => r.id === a.roomId);
          return sum + (room ? room.price * nights : 0);
        }, 0);
      }
      return base + extraServicesTotal;
    }
    if (selectedService === "daycare") {
      const service = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
      const base = service ? service.basePrice * selectedPetIds.length : 0;
      return base + extraServicesTotal;
    }
    const service = SERVICE_CATEGORIES.find((s) => s.id === selectedService);
    if (!service) return 0;
    return service.basePrice * selectedPetIds.length;
  }, [selectedService, selectedPetIds, selectedGroomingPackage, selectedGroomingAddons, roomAssignments, effectiveStartDate, effectiveEndDate, extraServicesTotal]);

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

  const handleTipPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    const maxPct = tippingConfig.maxTipPercent ?? 100;
    const tip = Math.min((calculatedPrice * percentage) / 100, (calculatedPrice * maxPct) / 100);
    setTipAmount(tip);
    setCustomTipAmount("");
  };

  const handleTipFixed = (amount: number) => {
    setTipPercentage(null);
    setTipAmount(amount);
    setCustomTipAmount("");
  };

  const handleCustomTip = (value: string) => {
    setCustomTipAmount(value);
    setTipPercentage(null);
    const tip = parseFloat(value) || 0;
    setTipAmount(Math.min(tip, tippingConfig.maxTipAmount ?? 9999));
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
      setRoomAssignments([]);
      setSelectedGroomingPackage("");
      setSelectedGroomingAddons([]);
      setExtraServices([]);
      setAddOnApplyTo({});
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
    <WizardWrapper
      asPage={asPage}
      open={open}
      onOpenChange={onOpenChange}
      existingBooking={existingBooking}
    >
        <div className="relative flex-1 flex flex-col min-h-0 px-6">
          {/* Back à gauche, Next à droite — cercles, légèrement plus petits, grossissent au hover */}
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 z-10">
            <Button variant="outline" size="lg" className="h-[4rem] w-[4rem] rounded-full p-0 flex items-center justify-center gap-1 transition-transform duration-200 hover:scale-110 disabled:hover:scale-100" onClick={handleBack} disabled={currentStep === 0}>
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span className="text-xs">Back</span>
            </Button>
          </div>
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 z-10">
            {currentStep < STEPS.length - 1 ? (
              <Button size="lg" className="h-[4rem] w-[4rem] rounded-full p-0 flex items-center justify-center gap-1 transition-transform duration-200 hover:scale-110" onClick={handleNext} disabled={!canProceed}>
                <span className="text-xs">Next</span>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </Button>
            ) : (
              <Button size="lg" className="h-[4rem] w-[4rem] rounded-full p-0 flex items-center justify-center transition-transform duration-200 hover:scale-110" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "OK"
                )}
              </Button>
            )}
          </div>

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
                <div className="space-y-4 px-2 py-2">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 py-2">
                    {availableServices.map((service) => {
                      const Icon = service.icon;
                      const config = configs[service.id as keyof typeof configs];
                      const isDisabled = config?.status.disabled ?? false;
                      const requiresEval = serviceRequiresEvaluation(service.id);
                      const hasEvalForPets =
                        selectedPetIds.length === 0 ||
                        selectedPets.every((p) => hasValidEvaluation(p));
                      const isEvaluation = service.id === "evaluation";
                      const displayName = isEvaluation ? evaluationConfig.customerName : (config?.clientFacingName || service.name);
                      const displayDesc = isEvaluation ? evaluationConfig.description : (config?.slogan || (service as { description?: string }).description || "");
                      const displayPrice = isEvaluation ? evaluationConfig.price : (config?.basePrice ?? (service as { basePrice?: number }).basePrice ?? 0);
                      const included = (service as { included?: string[] }).included;

                      return (
                        <div
                          key={service.id}
                          className={`relative flex flex-col min-h-[240px] border-2 rounded-lg transition-all overflow-hidden ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          } ${
                            selectedService === service.id && !isDisabled
                              ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                              : !isDisabled
                                ? "hover:border-primary/50 hover:shadow"
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
                          <div className="w-full h-28 shrink-0 bg-muted">
                            {config?.bannerImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={config.bannerImage}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : service.image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={service.image}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-full h-full flex items-center justify-center ${
                                  selectedService === service.id && !isDisabled
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <Icon className="h-10 w-10" />
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex flex-col flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-base leading-tight">
                                {displayName}
                              </h3>
                              {selectedService === service.id && !isDisabled && (
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {displayDesc}
                            </p>
                            {included && included.length > 0 && (
                              <ul className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                                {included.slice(0, 3).map((item, i) => (
                                  <li key={i} className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-auto pt-1">
                              <p className="font-bold text-primary text-sm">
                                {isEvaluation ? `$${displayPrice}` : `From $${displayPrice}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Step 3: Details — Schedule, then Room Type (boarding) or Package + Add-ons (grooming) */}
              {currentStep === 2 && (
                <div className="space-y-4 px-2 py-2">
                  {detailsSubStepCount > 1 && (
                    <p className="text-sm text-muted-foreground font-medium">
                      Step {currentDetailsSubStep + 1} of {detailsSubStepCount}
                    </p>
                  )}

                  {/* Sub-step 0: Schedule */}
                  {currentDetailsSubStep === 0 && (
                    <>
                  {selectedService === "daycare" && (
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <Label className="text-base">Select Daycare Days</Label>
                        <p className="text-xs text-muted-foreground">
                          Drop-off and pick-up times use the same time slider as the facility booking flow.
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                          Play area and group are assigned by the facility.
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
                    </>
                  )}

                  {/* Sub-step 1 (Daycare): Add-ons */}
                  {currentDetailsSubStep === 1 && selectedService === "daycare" && (
                    <div className="space-y-4 px-1 py-2">
                      <div>
                        <Label className="text-base font-semibold">Add-ons</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add optional services to enhance your pet&apos;s daycare experience
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eligibleAddons.map((addon) => {
                          const applyTo = addOnApplyTo[addon.id] ?? "all";
                          const isAll = applyTo === "all";
                          const targetPetIds = isAll ? selectedPets.map((p) => p.id) : [applyTo as number];
                          const currentQty = targetPetIds.length > 0
                            ? (extraServices.find((es) => es.serviceId === addon.id && es.petId === targetPetIds[0])?.quantity ?? 0)
                            : 0;
                          const totalQty = extraServices.filter((es) => es.serviceId === addon.id).reduce((s, es) => s + es.quantity, 0);
                          return (
                            <Card key={addon.id} className={`flex flex-col min-h-[240px] overflow-hidden ${totalQty > 0 ? "ring-2 ring-primary" : ""}`}>
                              <div className="h-28 w-full shrink-0 bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" />
                              </div>
                              <CardContent className="p-3 flex flex-col flex-1 space-y-2">
                                <div>
                                  <h4 className="font-semibold text-sm">{addon.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{addon.description}</p>
                                </div>
                                {addon.included && addon.included.length > 0 && (
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {addon.included.slice(0, 2).map((item, i) => (
                                      <li key={i} className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <p className="font-semibold text-primary text-sm">
                                  {addon.hasUnits ? `$${addon.pricePerUnit} / ${addon.unit}` : `$${addon.basePrice}`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Apply to:</span>
                                  <Select
                                    value={isAll ? "all" : String(applyTo)}
                                    onValueChange={(v) => {
                                      setAddOnApplyTo((prev) => ({ ...prev, [addon.id]: v === "all" ? "all" : Number(v) }));
                                      if (v === "all") {
                                        setExtraServices((prev) => [
                                          ...prev.filter((es) => es.serviceId !== addon.id),
                                          ...selectedPets.map((p) => ({ serviceId: addon.id, quantity: currentQty || 1, petId: p.id })),
                                        ]);
                                      } else {
                                        const petId = Number(v);
                                        setExtraServices((prev) => [
                                          ...prev.filter((es) => es.serviceId !== addon.id),
                                          { serviceId: addon.id, quantity: currentQty || 1, petId },
                                        ]);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All pets</SelectItem>
                                      {selectedPets.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2 mt-auto pt-0.5">
                                  {addon.hasUnits ? (
                                    <>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-xs"
                                        disabled={currentQty === 0}
                                        onClick={() => {
                                          if (currentQty <= 0) return;
                                          const newQty = currentQty - 1;
                                          setExtraServices((prev) => {
                                            const next = prev.filter((es) => !(es.serviceId === addon.id && targetPetIds.includes(es.petId)));
                                            targetPetIds.forEach((petId) => {
                                              if (newQty > 0) next.push({ serviceId: addon.id, quantity: newQty, petId });
                                            });
                                            return next;
                                          });
                                        }}
                                      >
                                        -
                                      </Button>
                                      <span className="text-xs font-medium min-w-[2ch] text-center">{currentQty}</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-xs"
                                        onClick={() => {
                                          const newQty = currentQty + 1;
                                          setExtraServices((prev) => {
                                            const next = prev.filter((es) => !(es.serviceId === addon.id && targetPetIds.includes(es.petId)));
                                            targetPetIds.forEach((petId) => {
                                              next.push({ serviceId: addon.id, quantity: newQty, petId });
                                            });
                                            return next;
                                          });
                                        }}
                                      >
                                        +
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant={currentQty > 0 ? "default" : "outline"}
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        if (currentQty > 0) {
                                          setExtraServices((prev) => prev.filter((es) => !(es.serviceId === addon.id && targetPetIds.includes(es.petId))));
                                        } else {
                                          setExtraServices((prev) => {
                                            const next = prev.filter((es) => es.serviceId !== addon.id);
                                            targetPetIds.forEach((petId) => next.push({ serviceId: addon.id, quantity: 1, petId }));
                                            return next;
                                          });
                                        }
                                      }}
                                    >
                                      {currentQty > 0 ? <><CheckCircle className="h-3 w-3 mr-1" /> Added</> : "Add"}
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

                  {/* Sub-step 1 (Boarding): Room Type */}
                  {currentDetailsSubStep === 1 && selectedService === "boarding" && (
                    <div className="space-y-4 px-1 py-2">
                      <Label className="text-base">Choose room type</Label>
                      <p className="text-sm text-muted-foreground">
                        {allowDifferentRoomPerPet
                          ? "Select a room type for each pet. Only rooms that fit your pets are shown."
                          : "One room type will apply to all pets."}
                      </p>
                      {eligibleBoardingRooms.length === 0 ? (
                        <Alert>
                          <AlertDescription>
                            No room types match your selected pets (type or weight). Please contact the facility.
                          </AlertDescription>
                        </Alert>
                      ) : allowDifferentRoomPerPet ? (
                        <div className="space-y-4">
                          {selectedPets.map((pet) => {
                            const assigned = roomAssignments.find((a) => a.petId === pet.id);
                            return (
                              <Card key={pet.id}>
                                <CardContent className="p-4">
                                  <p className="font-medium mb-3">
                                    <PawPrint className="inline h-4 w-4 mr-1" />
                                    {pet.name} ({pet.type}, {pet.weight} lbs)
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {eligibleBoardingRooms.map((room) => {
                                      const available = room.totalRooms - room.bookedRooms;
                                      const isSelected = assigned?.roomId === room.id;
                                      return (
                                        <div
                                          key={room.id}
                                          onClick={() => {
                                            if (available > 0) {
                                              setRoomAssignments((prev) => [
                                                ...prev.filter((a) => a.petId !== pet.id),
                                                { petId: pet.id, roomId: room.id },
                                              ]);
                                            }
                                          }}
                                          className={`flex flex-col min-h-[220px] border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                                            isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                          } ${available === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
                                        >
                                          <div className="h-28 bg-muted relative shrink-0">
                                            {room.image ? (
                                              /* eslint-disable-next-line @next/next/no-img-element */
                                              <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Bed className="h-8 w-8 text-muted-foreground" />
                                              </div>
                                            )}
                                            {isSelected && (
                                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                                <CheckCircle className="h-4 w-4" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="p-2.5 flex flex-col flex-1">
                                            <h4 className="font-semibold text-sm">{room.name}</h4>
                                            <p className="text-primary font-bold text-xs mt-0.5">${room.price}/night</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{room.description}</p>
                                            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                              {room.included.slice(0, 3).map((item, i) => (
                                                <li key={i} className="flex items-center gap-1">
                                                  <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                                  {item}
                                                </li>
                                              ))}
                                            </ul>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                              {room.allowedPetTypes.includes("Dog") && <Dog className="h-3.5 w-3.5" />}
                                              {room.allowedPetTypes.includes("Cat") && <Cat className="h-3.5 w-3.5" />}
                                              {(room.minWeightLbs != null || room.maxWeightLbs != null) && (
                                                <span>
                                                  {room.minWeightLbs != null && `≥${room.minWeightLbs} lbs`}
                                                  {room.maxWeightLbs != null && ` ≤${room.maxWeightLbs} lbs`}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs mt-0.5">{available <= 2 ? "Limited availability" : `${available} available`}</p>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="mt-auto w-full text-xs h-7"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailsOpen({ type: "room", id: room.id });
                                              }}
                                            >
                                              <Info className="h-3.5 w-3.5 mr-1" />
                                              View details
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {eligibleBoardingRooms.map((room) => {
                            const available = room.totalRooms - room.bookedRooms;
                            const isSelected = selectedPets.length > 0 && roomAssignments.length === selectedPets.length && roomAssignments.every((a) => a.roomId === room.id);
                            return (
                              <div
                                key={room.id}
                                className={`flex flex-col min-h-[260px] border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                                  isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                } ${available === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
                                onClick={() => {
                                  if (available > 0) {
                                    setRoomAssignments(selectedPets.map((p) => ({ petId: p.id, roomId: room.id })));
                                  }
                                }}
                              >
                                <div className="h-32 bg-muted relative shrink-0">
                                  {room.image ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Bed className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                      <CheckCircle className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 flex flex-col flex-1">
                                  <h3 className="font-semibold text-base">{room.name}</h3>
                                  <p className="text-primary font-bold text-sm mt-0.5">${room.price}/night</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{room.description}</p>
                                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {room.included.slice(0, 4).map((item, i) => (
                                      <li key={i} className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    {room.allowedPetTypes.includes("Dog") && <Dog className="h-3.5 w-3.5" />}
                                    {room.allowedPetTypes.includes("Cat") && <Cat className="h-3.5 w-3.5" />}
                                    {(room.minWeightLbs != null || room.maxWeightLbs != null) && (
                                      <span>
                                        {room.minWeightLbs != null && `≥${room.minWeightLbs} lbs`}
                                        {room.maxWeightLbs != null && ` ≤${room.maxWeightLbs} lbs`}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {available <= 2 ? "Limited availability" : `${available} available`}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-auto w-full text-xs h-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailsOpen({ type: "room", id: room.id });
                                    }}
                                  >
                                    <Info className="h-3.5 w-3.5 mr-1" />
                                    View details
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-step 2 (Boarding): Add-ons */}
                  {currentDetailsSubStep === 2 && selectedService === "boarding" && (
                    <div className="space-y-4 px-1 py-2">
                      <div>
                        <Label className="text-base font-semibold">Add-ons</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add optional services to enhance your pet&apos;s boarding experience
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {eligibleAddons.map((addon) => {
                          const applyTo = addOnApplyTo[addon.id] ?? "all";
                          const isAll = applyTo === "all";
                          const targetPetIds = isAll ? selectedPets.map((p) => p.id) : [applyTo as number];
                          const currentQty = targetPetIds.length > 0
                            ? (extraServices.find((es) => es.serviceId === addon.id && es.petId === targetPetIds[0])?.quantity ?? 0)
                            : 0;
                          const totalQty = extraServices.filter((es) => es.serviceId === addon.id).reduce((s, es) => s + es.quantity, 0);
                          return (
                            <Card key={addon.id} className={`flex flex-col min-h-[240px] overflow-hidden ${totalQty > 0 ? "ring-2 ring-primary" : ""}`}>
                              <div className="h-28 w-full shrink-0 bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" />
                              </div>
                              <CardContent className="p-3 flex flex-col flex-1 space-y-2">
                                <div>
                                  <h4 className="font-semibold text-sm">{addon.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{addon.description}</p>
                                </div>
                                {addon.included && addon.included.length > 0 && (
                                  <ul className="text-xs text-muted-foreground space-y-0.5">
                                    {addon.included.slice(0, 2).map((item, i) => (
                                      <li key={i} className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <p className="font-semibold text-primary text-sm">
                                  {addon.hasUnits ? `$${addon.pricePerUnit} / ${addon.unit}` : `$${addon.basePrice}`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Apply to:</span>
                                  <Select
                                    value={isAll ? "all" : String(applyTo)}
                                    onValueChange={(v) => {
                                      setAddOnApplyTo((prev) => ({ ...prev, [addon.id]: v === "all" ? "all" : Number(v) }));
                                      if (v === "all") {
                                        setExtraServices((prev) => [
                                          ...prev.filter((es) => es.serviceId !== addon.id),
                                          ...selectedPets.map((p) => ({ serviceId: addon.id, quantity: currentQty || 1, petId: p.id })),
                                        ]);
                                      } else {
                                        const petId = Number(v);
                                        setExtraServices((prev) => [
                                          ...prev.filter((es) => es.serviceId !== addon.id),
                                          { serviceId: addon.id, quantity: currentQty || 1, petId },
                                        ]);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All pets</SelectItem>
                                      {selectedPets.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2 mt-auto pt-0.5">
                                  {addon.hasUnits ? (
                                    <>
                                      <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" disabled={currentQty === 0}
                                        onClick={() => {
                                          if (currentQty <= 0) return;
                                          const newQty = currentQty - 1;
                                          setExtraServices((prev) => {
                                            const next = prev.filter((es) => !(es.serviceId === addon.id && targetPetIds.includes(es.petId)));
                                            targetPetIds.forEach((petId) => { if (newQty > 0) next.push({ serviceId: addon.id, quantity: newQty, petId }); });
                                            return next;
                                          });
                                        }}>−</Button>
                                      <span className="text-xs font-medium min-w-[2ch] text-center">{currentQty}</span>
                                      <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0 text-xs"
                                        onClick={() => {
                                          const newQty = currentQty + 1;
                                          setExtraServices((prev) => {
                                            const next = prev.filter((es) => !(es.serviceId === addon.id && targetPetIds.includes(es.petId)));
                                            targetPetIds.forEach((petId) => { next.push({ serviceId: addon.id, quantity: newQty, petId }); });
                                            return next;
                                          });
                                        }}>+</Button>
                                    </>
                                  ) : (
                                    <Button type="button" variant={currentQty > 0 ? "default" : "outline"} size="sm" className="h-8 text-xs"
                                      onClick={() => {
                                        if (currentQty > 0) setExtraServices((prev) => prev.filter((es) => !(es.serviceId === addon.id && targetPetIds.includes(es.petId))));
                                        else setExtraServices((prev) => {
                                          const next = prev.filter((es) => es.serviceId !== addon.id);
                                          targetPetIds.forEach((petId) => next.push({ serviceId: addon.id, quantity: 1, petId }));
                                          return next;
                                        });
                                      }}>
                                      {currentQty > 0 ? <><CheckCircle className="h-3 w-3 mr-1" /> Added</> : "Add"}
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

                  {/* Sub-step 1 (Grooming): Package */}
                  {currentDetailsSubStep === 1 && selectedService === "grooming" && (
                    <div className="space-y-4 px-1 py-2">
                      <Label className="text-base">Choose a grooming package</Label>
                      <p className="text-sm text-muted-foreground">
                        Select one package. Add-ons (e.g. nail trim, teeth brushing) are on the next step.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GROOMING_PACKAGES.map((pkg) => {
                          const isSelected = selectedGroomingPackage === pkg.id;
                          return (
                            <div
                              key={pkg.id}
                              className={`flex flex-col min-h-[260px] border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                                isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedGroomingPackage(pkg.id)}
                            >
                              <div className="h-32 bg-muted relative shrink-0">
                                {pkg.image ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Scissors className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                    <CheckCircle className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="p-3 flex flex-col flex-1">
                                <h3 className="font-semibold text-base">{pkg.name}</h3>
                                <p className="text-primary font-bold text-sm mt-0.5">From ${pkg.price}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">~{pkg.durationMinutes} min</p>
                                {pkg.notes && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{pkg.notes}</p>
                                )}
                                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  {pkg.included.slice(0, 4).map((item, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-auto w-full text-xs h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailsOpen({ type: "package", id: pkg.id });
                                  }}
                                >
                                  <Info className="h-3.5 w-3.5 mr-1" />
                                  View details
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-step 2 (Grooming): Add-ons */}
                  {currentDetailsSubStep === 2 && selectedService === "grooming" && (
                    <div className="space-y-4 px-1 py-2">
                      <Label className="text-base">Add-ons (optional)</Label>
                      <p className="text-sm text-muted-foreground">
                        Nail trim, teeth brushing, and more. Select any add-ons to include with your package.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GROOMING_ADDONS.map((addon) => {
                          const isSelected = selectedGroomingAddons.includes(addon.id);
                          const addonWithExtras = addon as { name: string; price: number; description?: string; image?: string };
                          return (
                            <div
                              key={addon.id}
                              className={`flex flex-col min-h-[200px] border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                                isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => {
                                setSelectedGroomingAddons((prev) =>
                                  prev.includes(addon.id) ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                                );
                              }}
                            >
                              <div className="h-24 shrink-0 bg-muted relative">
                                {addonWithExtras.image ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={addonWithExtras.image} alt={addon.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Scissors className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5 flex flex-col flex-1">
                                <h4 className="font-semibold text-sm">{addon.name}</h4>
                                {addonWithExtras.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{addonWithExtras.description}</p>
                                )}
                                <p className="font-semibold text-primary text-sm mt-auto pt-1">+${addon.price}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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

              {/* Step 4: Complete Required Forms */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-base mb-1">Complete Required Forms</h3>
                    <p className="text-sm text-muted-foreground">
                      {requiredFormsStatus.allComplete
                        ? "All requirements are complete. You can proceed to confirm your booking."
                        : "The following items are required before you can confirm your booking."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Progress:</span>
                    <span className={requiredFormsStatus.allComplete ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                      {requiredFormsStatus.completedCount}/{requiredFormsStatus.totalCount} completed
                    </span>
                  </div>
                  {requiredFormsStatus.missing.length > 0 && (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Missing requirements</p>
                        <ul className="space-y-2">
                          {requiredFormsStatus.missing.map((item, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                              <div>
                                {item.petName && <span className="font-medium">{item.petName}: </span>}
                                <span className="text-muted-foreground">
                                  {item.type === "vaccination" ? "Vaccination records — " : item.type === "agreement" ? "Agreement — " : item.type === "form" ? "Form — " : ""}
                                  {item.label}
                                </span>
                              </div>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary font-medium text-sm hover:underline shrink-0"
                              >
                                Fill now →
                              </a>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {requiredFormsStatus.allComplete && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">All set! Proceed to confirm your booking.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Tip Your Care Team — full-screen, conversion-focused */}
              {currentStep === 4 && (
                <div className="space-y-6 py-4">
                  {tipsEnabled ? (
                    <>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-semibold">Tip Your Care Team</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Your tip goes directly to the team who will care for your pet. Any amount is appreciated and helps support our staff.
                        </p>
                      </div>
                      <Card className="max-w-lg mx-auto">
                        <CardContent className="p-6 space-y-6">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-3">Select an amount</p>
                            <div className="grid grid-cols-3 gap-3">
                              {tipSuggestions.map((s, idx) => {
                                const isPercent = s.type === "percent";
                                const isSelected = isPercent
                                  ? tipPercentage === s.value
                                  : tipAmount === s.value && tipPercentage === null;
                                const isRecommended = recommendedTipIndex === idx;
                                return (
                                  <Button
                                    key={s.label}
                                    variant={isSelected ? "default" : "outline"}
                                    size="lg"
                                    className={`h-14 text-base font-semibold relative ${isRecommended && !isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                    onClick={() => (isPercent ? handleTipPercentage(s.value) : handleTipFixed(s.value))}
                                  >
                                    {s.label}
                                    {isRecommended && (
                                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-normal bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                        Recommended
                                      </span>
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Or enter a custom amount</Label>
                            <div className="flex gap-2">
                              <span className="flex items-center px-3 rounded-md border bg-muted/50 text-muted-foreground text-sm">$</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={customTipAmount}
                                onChange={(e) => handleCustomTip(e.target.value)}
                                className="text-base"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                          {tipAmount > 0 && (
                            <p className="text-sm text-green-600 font-medium text-center">
                              Thank you! Your ${tipAmount.toFixed(2)} tip will go directly to the team.
                            </p>
                          )}
                          <div className="pt-2 border-t">
                            <button
                              type="button"
                              onClick={() => {
                                setTipAmount(0);
                                setTipPercentage(null);
                                setCustomTipAmount("");
                              }}
                              className="text-sm text-muted-foreground hover:text-foreground underline"
                            >
                              No tip
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="font-medium">Tipping is not enabled for this facility.</p>
                      <p className="text-sm mt-1">Continue to confirm your booking.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Confirm — facility receipt-style */}
              {currentStep === 5 && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {/* Receipt card — same style as facility ConfirmStep */}
                  <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-6 py-6">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTZzLTItNC0yLTYgMi00IDItNi0yLTQtMi02IDItNCAyLTYtMi00LTIgLTYgMi00IDItNiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                      <div className="relative flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                          {(() => {
                            const ServiceIcon = SERVICE_CATEGORIES.find((s) => s.id === selectedService)?.icon ?? Receipt;
                            return <ServiceIcon className="h-7 w-7 text-white" />;
                          })()}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white tracking-tight">Booking Receipt</h2>
                          <p className="text-sm text-white/90">
                            {SERVICE_CATEGORIES.find((s) => s.id === selectedService)?.name ?? "Pet Care Services"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Client & Pets */}
                    <div className="p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Client</p>
                          <p className="font-semibold text-foreground">{customer?.name ?? "—"}</p>
                          {customer?.email && <p className="mt-0.5 text-sm text-muted-foreground">{customer.email}</p>}
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pet{selectedPets.length !== 1 ? "s" : ""}</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPets.map((pet) => (
                              <Badge key={pet.id} variant="secondary" className="gap-1.5 px-2.5 py-1 font-medium">
                                <PawPrint className="h-3 w-3" />
                                {pet.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Service summary */}
                    <div className="p-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{SERVICE_CATEGORIES.find((s) => s.id === selectedService)?.name}</p>
                          {selectedService === "grooming" && selectedGroomingPackage && (
                            <p className="text-sm text-muted-foreground">
                              {GROOMING_PACKAGES.find((p) => p.id === selectedGroomingPackage)?.name}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold">${calculatedPrice.toFixed(2)}</p>
                      </div>

                      {/* Date & Time */}
                      <div className="flex justify-between items-center text-sm">
                        <div>
                          <p className="text-muted-foreground">Date & Time</p>
                          {selectedService === "daycare" && daycareDateTimes.length > 0 ? (
                            <p>{daycareDateTimes.length} day{daycareDateTimes.length !== 1 ? "s" : ""}</p>
                          ) : effectiveStartDate ? (
                            <p>
                              {new Date(effectiveStartDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {effectiveEndDate && effectiveEndDate !== effectiveStartDate && (
                                <> → {new Date(effectiveEndDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                              )}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p>{effectiveCheckInTime}{effectiveCheckOutTime ? ` - ${effectiveCheckOutTime}` : ""}</p>
                        </div>
                      </div>

                      {/* Room type (boarding) */}
                      {selectedService === "boarding" && roomAssignments.length > 0 && (
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">Room type</p>
                          {roomAssignments.map((a) => {
                            const room = CUSTOMER_BOARDING_ROOM_TYPES.find((r) => r.id === a.roomId);
                            const pet = selectedPets.find((p) => p.id === a.petId);
                            return (
                              <p key={`${a.petId}-${a.roomId}`}>{pet?.name}: {room?.name ?? a.roomId}</p>
                            );
                          })}
                        </div>
                      )}

                      {/* Grooming package/add-ons */}
                      {selectedService === "grooming" && (selectedGroomingPackage || selectedGroomingAddons.length > 0) && (
                        <div className="text-sm">
                          {selectedGroomingPackage && (
                            <p><span className="text-muted-foreground">Package:</span> {GROOMING_PACKAGES.find((p) => p.id === selectedGroomingPackage)?.name}</p>
                          )}
                          {selectedGroomingAddons.length > 0 && (
                            <p><span className="text-muted-foreground">Add-ons:</span> {selectedGroomingAddons.map((id) => GROOMING_ADDONS.find((a) => a.id === id)?.name ?? id).join(", ")}</p>
                          )}
                        </div>
                      )}

                      {/* Add-ons (daycare/boarding) */}
                      {extraServices.length > 0 && (selectedService === "daycare" || selectedService === "boarding") && (
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">Add-ons</p>
                          <div className="space-y-0.5">
                            {extraServices.map((es, idx) => {
                              const addon = CUSTOMER_ADDONS.find((a) => a.id === es.serviceId);
                              const pet = selectedPets.find((p) => p.id === es.petId);
                              return (
                                <p key={`${es.serviceId}-${es.petId}-${idx}`}>
                                  {addon?.name ?? es.serviceId} × {es.quantity}{pet ? ` (${pet.name})` : ""}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Feeding/medication summary — placeholder when customer flow collects these later */}
                      {(selectedService === "daycare" || selectedService === "boarding") && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Feeding / medication</p>
                          <p className="text-muted-foreground italic">None added</p>
                        </div>
                      )}
                    </div>

                    {/* Pricing breakdown */}
                    {(() => {
                      const taxRate = facilityConfig.pricing?.taxSettings?.taxRate ?? 0;
                      const taxIncluded = facilityConfig.pricing?.taxSettings?.taxIncluded ?? false;
                      const taxAmount = taxRate > 0 && !taxIncluded ? calculatedPrice * taxRate : 0;
                      const receiptTotal = calculatedPrice + taxAmount + tipAmount;
                      return (
                        <div className="p-4 border-t border-dashed">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Pricing breakdown</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>${calculatedPrice.toFixed(2)}</span>
                            </div>
                            {taxAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Taxes</span>
                                <span>${taxAmount.toFixed(2)}</span>
                              </div>
                            )}
                            {requiresDeposit && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Deposit</span>
                                <span>${calculatedDeposit.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tip</span>
                              <span>{tipAmount > 0 ? `$${tipAmount.toFixed(2)}` : "—"}</span>
                            </div>
                          </div>
                          <div className="border-t-2 border-dashed pt-3 mt-3 flex justify-between items-center text-lg font-bold">
                            <span>Total</span>
                            <span className="text-primary">${receiptTotal.toFixed(2)}</span>
                          </div>
                          {requiresDeposit && (
                            <p className="text-xs text-muted-foreground mt-2">
                              ${calculatedDeposit.toFixed(2)} due now · ${(receiptTotal - calculatedDeposit).toFixed(2)} at service
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Footer */}
                    <div className="bg-muted/50 p-3 text-center border-t">
                      <p className="text-xs text-muted-foreground">Thank you for choosing our pet care services!</p>
                      <p className="text-xs text-muted-foreground mt-1">Receipt generated on {new Date().toLocaleDateString("en-US")}</p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </ScrollArea>
          </div>

          {/* Details modal: room or grooming package — photos + notes */}
          <Dialog open={!!detailsOpen} onOpenChange={(open) => !open && setDetailsOpen(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {detailsOpen?.type === "room" && CUSTOMER_BOARDING_ROOM_TYPES.find((r) => r.id === detailsOpen.id)?.name}
                  {detailsOpen?.type === "package" && GROOMING_PACKAGES.find((p) => p.id === detailsOpen.id)?.name}
                </DialogTitle>
              </DialogHeader>
              {detailsOpen?.type === "room" && (() => {
                const room = CUSTOMER_BOARDING_ROOM_TYPES.find((r) => r.id === detailsOpen.id);
                if (!room) return null;
                const photos = (room.images && room.images.length > 0 ? room.images : [room.image]).slice(0, 5);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((src, i) => (
                        <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`${room.name} ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {room.notes && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{room.notes}</p>
                      </div>
                    )}
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {room.included.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
              {detailsOpen?.type === "package" && (() => {
                const pkg = GROOMING_PACKAGES.find((p) => p.id === detailsOpen.id);
                if (!pkg) return null;
                const photos = (pkg.images && pkg.images.length > 0 ? pkg.images : [pkg.image]).slice(0, 5);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((src, i) => (
                        <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`${pkg.name} ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    {pkg.notes && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{pkg.notes}</p>
                      </div>
                    )}
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {pkg.included.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
    </WizardWrapper>
  );
}
