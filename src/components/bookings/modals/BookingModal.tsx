"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Plus, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceStep, ClientPetStep, DetailsStep, ConfirmStep } from "./steps";
import {
  GROOMING_STYLES,
  GROOMING_ADDONS,
  TRAINING_TYPES,
  DAYCARE_TYPES,
  BOARDING_TYPES,
  STEPS,
  DAYCARE_SUB_STEPS,
  BOARDING_SUB_STEPS,
} from "./constants";

import { Client } from "@/lib/types";

// Types
export interface FeedingScheduleItem {
  id: string;
  petId?: number;
  name: string;
  time: string;
  amount: string;
  unit: string;
  type: string;
  source: string;
  instructions: string;
  notes: string;
}

export interface MedicationItem {
  id: string;
  petId?: number;
  name: string;
  time: string[];
  amount: string;
  unit: string;
  type: string;
  source?: string;
  instructions: string;
  notes: string;
}

export interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  facilityId: number;
  facilityName: string;
  onCreateBooking: (booking: BookingData) => void;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  preSelectedService?: string;
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
  notificationEmail?: boolean;
  notificationSMS?: boolean;

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

export function BookingModal({
  open,
  onOpenChange,
  clients,
  facilityId,
  onCreateBooking,
  preSelectedClientId,
  preSelectedPetId,
  preSelectedService,
}: NewBookingModalProps) {
  // Step management
  const displayedSteps = STEPS.filter(
    (step) =>
      !(step.id === "client-pet" && preSelectedClientId && preSelectedPetId),
  );
  const [currentStep, setCurrentStep] = useState(
    preSelectedService
      ? displayedSteps.findIndex(
          (s) =>
            s.id ===
            (preSelectedClientId && preSelectedPetId
              ? "details"
              : "client-pet"),
        )
      : 0,
  );
  const [currentSubStep, setCurrentSubStep] = useState(0);

  // Client selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    preSelectedClientId ?? null,
  );
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>(
    preSelectedPetId ? [preSelectedPetId] : [],
  );

  // Service selection state
  const [selectedService, setSelectedService] = useState<string>(
    preSelectedService ?? "",
  );

  // Service-specific state
  const [serviceType, setServiceType] = useState<string>(
    preSelectedService === "daycare" ? "full_day" : "",
  );
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

  // Boarding specific
  const [kennel, setKennel] = useState("");
  const [roomAssignments, setRoomAssignments] = useState<
    Array<{ petId: number; roomId: string }>
  >([]);
  const [feedingSchedule, setFeedingSchedule] = useState<FeedingScheduleItem[]>(
    [],
  );
  const [walkSchedule, setWalkSchedule] = useState("");
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [feedingMedicationTab, setFeedingMedicationTab] = useState<
    "feeding" | "medication"
  >("feeding");
  const [extraServices, setExtraServices] = useState<
    Array<{ serviceId: string; quantity: number; petId: number }>
  >([]);
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSMS, setNotificationSMS] = useState(false);

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
            return roomAssignments.length === selectedPetIds.length;
          case 2:
            return true;
          case 3:
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
            return roomAssignments.length === selectedPetIds.length;
          case 2:
            return true;
          case 3:
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
      roomAssignments,
      selectedPetIds,
      boardingRangeStart,
      boardingRangeEnd,
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
    daycareSelectedDates.length,
  ]);

  // Validation for each step
  const canProceed = useMemo(() => {
    const currentStepId = displayedSteps[currentStep]?.id;
    switch (currentStepId) {
      case "service":
        return selectedService !== "";
      case "client-pet":
        return selectedClientId !== null && selectedPetIds.length > 0;
      case "details":
        if (selectedService === "daycare" || selectedService === "boarding") {
          return isSubStepComplete(currentSubStep);
        }
        // For other services, original logic
        if (!startDate) return false;
        if (selectedService === "grooming" && !groomingStyle) return false;
        if (selectedService === "training" && !trainingType) return false;
        return true;
      case "confirm":
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    displayedSteps,
    currentSubStep,
    selectedClientId,
    selectedPetIds,
    selectedService,
    startDate,
    groomingStyle,
    trainingType,
    isSubStepComplete,
  ]);

  const handleNext = () => {
    const currentStepId = displayedSteps[currentStep]?.id;
    // Handle sub-steps for daycare/boarding on details step
    if (
      currentStepId === "details" &&
      (selectedService === "daycare" || selectedService === "boarding")
    ) {
      if (currentSubStep < currentSubSteps.length - 1) {
        setCurrentSubStep(currentSubStep + 1);
        return;
      }
    }
    if (currentStep < displayedSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentSubStep(0);
    }
  };

  const handlePrevious = () => {
    const currentStepId = displayedSteps[currentStep]?.id;
    const prevStepId = displayedSteps[currentStep - 1]?.id;
    // Handle sub-steps for daycare/boarding on details step
    if (
      currentStepId === "details" &&
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
        prevStepId === "details" &&
        (selectedService === "daycare" || selectedService === "boarding")
      ) {
        setCurrentSubStep(currentSubSteps.length - 1);
      } else {
        setCurrentSubStep(0);
      }
    }
  };

  const handleComplete = () => {
    const clientId = selectedClientId;
    const petId: number | number[] =
      selectedPetIds.length === 1 ? selectedPetIds[0] : selectedPetIds;

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

      kennel: kennel || undefined,
      feedingSchedule: feedingSchedule || undefined,
      walkSchedule: walkSchedule || undefined,
      medications: medications || undefined,
      extraServices: extraServices.length > 0 ? extraServices : undefined,
      notificationEmail: notificationEmail,
      notificationSMS: notificationSMS,
    };

    onCreateBooking(booking);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setCurrentStep(0);
    setCurrentSubStep(0);
    setSearchQuery("");
    setSelectedClientId(null);
    setSelectedPetIds([]);
    setDaycareSelectedDates([]);
    setDaycareDateTimes([]);
    setBoardingRangeStart(null);
    setBoardingRangeEnd(null);
    setBoardingDateTimes([]);

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

    setKennel("");
    setRoomAssignments([]);
    setFeedingSchedule([]);
    setWalkSchedule("");
    setMedications([]);
    setExtraServices([]);
    setNotificationEmail(true);
    setNotificationSMS(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
        <DialogTitle className="sr-only">New Booking</DialogTitle>
        <div className="flex-1 flex min-h-0">
          {/* Side Navigation Tabs */}
          <div className="w-80 border-r bg-muted/30 flex flex-col">
            {/* Title in Sidebar */}
            <div className="p-4 border-b bg-background">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Plus className="h-5 w-5" />
                {(() => {
                  const preSelectedClient = clients.find(
                    (c) => c.id === preSelectedClientId,
                  );
                  const preSelectedPet = preSelectedClient?.pets.find(
                    (p) => p.id === preSelectedPetId,
                  );
                  if (preSelectedPet) {
                    return `Book ${preSelectedPet.name}`;
                  } else if (preSelectedClient) {
                    return `Book for ${preSelectedClient.name}`;
                  } else {
                    return "New Booking";
                  }
                })()}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {(() => {
                  const preSelectedClient = clients.find(
                    (c) => c.id === preSelectedClientId,
                  );
                  const preSelectedPet = preSelectedClient?.pets.find(
                    (p) => p.id === preSelectedPetId,
                  );
                  if (preSelectedPet) {
                    return `Create a new booking for ${preSelectedPet.name}`;
                  } else if (preSelectedClient) {
                    return `Create a new booking for ${preSelectedClient.name}`;
                  } else {
                    return "Create a new booking for your facility";
                  }
                })()}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {displayedSteps.map((step, idx) => {
                  const isActive = currentStep === idx;
                  let isCompleted = currentStep > idx;
                  if (
                    step.id === "details" &&
                    currentStep === idx &&
                    canProceed
                  ) {
                    isCompleted = true;
                  }
                  const showSubSteps =
                    step.id === "details" &&
                    isActive &&
                    (selectedService === "daycare" ||
                      selectedService === "boarding");

                  return (
                    <div key={step.id}>
                      <div
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : isCompleted
                              ? "bg-background border-border"
                              : "bg-muted/50 border-dashed border-muted-foreground/30 opacity-60"
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
                          </div>
                        </div>
                      </div>

                      {/* Sub-steps for Details step when daycare/boarding */}
                      {showSubSteps && (
                        <div className="ml-6 mt-2 pl-4 border-l-2 border-primary/30 space-y-1">
                          {currentSubSteps.map((subStep, subIdx) => {
                            const isSubActive = currentSubStep === subIdx;
                            const isSubCompleted = isSubStepComplete(subIdx);
                            const isVisitedAndCompleted =
                              subIdx < currentSubStep && isSubCompleted;

                            return (
                              <div
                                key={subStep.id}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                                  isSubActive
                                    ? "bg-primary/20 text-primary font-medium"
                                    : isVisitedAndCompleted
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                      isSubActive
                                        ? "bg-primary text-primary-foreground"
                                        : isVisitedAndCompleted
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted-foreground/20 text-muted-foreground"
                                    }`}
                                  >
                                    {isVisitedAndCompleted ? (
                                      <Check className="h-2.5 w-2.5" />
                                    ) : (
                                      subIdx + 1
                                    )}
                                  </div>
                                  <span>{subStep.title}</span>
                                </div>
                              </div>
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
            <div className="p-6 border-t bg-background">
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
              <div className="p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">
                  {displayedSteps[currentStep]?.title}
                </h2>
                {displayedSteps[currentStep]?.id === "details" &&
                  (selectedService === "daycare" ||
                    selectedService === "boarding") && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentSubSteps[currentSubStep]?.title}
                    </p>
                  )}
              </div>
              <div className="p-6">
                {displayedSteps[currentStep]?.id === "service" && (
                  <ServiceStep
                    selectedService={selectedService}
                    setSelectedService={setSelectedService}
                    setServiceType={setServiceType}
                    setCurrentSubStep={setCurrentSubStep}
                  />
                )}
                {displayedSteps[currentStep]?.id === "client-pet" && (
                  <ClientPetStep
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filteredClients={filteredClients}
                    selectedClientId={selectedClientId}
                    setSelectedClientId={setSelectedClientId}
                    selectedPetIds={selectedPetIds}
                    setSelectedPetIds={setSelectedPetIds}
                    selectedClient={selectedClient}
                    preSelectedClientId={preSelectedClientId}
                  />
                )}
                {displayedSteps[currentStep]?.id === "details" && (
                  <DetailsStep
                    selectedService={selectedService}
                    currentSubStep={currentSubStep}
                    isSubStepComplete={isSubStepComplete}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    checkInTime={checkInTime}
                    setCheckInTime={setCheckInTime}
                    setCheckOutTime={setCheckOutTime}
                    setEndDate={setEndDate}
                    daycareSelectedDates={daycareSelectedDates}
                    setDaycareSelectedDates={setDaycareSelectedDates}
                    daycareDateTimes={daycareDateTimes}
                    setDaycareDateTimes={setDaycareDateTimes}
                    roomAssignments={roomAssignments}
                    setRoomAssignments={setRoomAssignments}
                    boardingRangeStart={boardingRangeStart}
                    setBoardingRangeStart={setBoardingRangeStart}
                    boardingRangeEnd={boardingRangeEnd}
                    setBoardingRangeEnd={setBoardingRangeEnd}
                    boardingDateTimes={boardingDateTimes}
                    setBoardingDateTimes={setBoardingDateTimes}
                    serviceType={serviceType}
                    setServiceType={setServiceType}
                    groomingStyle={groomingStyle}
                    setGroomingStyle={setGroomingStyle}
                    groomingAddOns={groomingAddOns}
                    setGroomingAddOns={setGroomingAddOns}
                    stylistPreference={stylistPreference}
                    setStylistPreference={setStylistPreference}
                    trainingType={trainingType}
                    setTrainingType={setTrainingType}
                    trainerId={trainerId}
                    setTrainerId={setTrainerId}
                    trainingGoals={trainingGoals}
                    setTrainingGoals={setTrainingGoals}
                    feedingSchedule={feedingSchedule}
                    setFeedingSchedule={setFeedingSchedule}
                    medications={medications}
                    setMedications={setMedications}
                    feedingMedicationTab={feedingMedicationTab}
                    setFeedingMedicationTab={setFeedingMedicationTab}
                    extraServices={extraServices}
                    setExtraServices={setExtraServices}
                    selectedPets={selectedPets}
                  />
                )}
                {displayedSteps[currentStep]?.id === "confirm" && (
                  <ConfirmStep
                    selectedClient={selectedClient}
                    selectedPets={selectedPets}
                    selectedService={selectedService}
                    serviceType={serviceType}
                    startDate={startDate}
                    endDate={endDate}
                    checkInTime={checkInTime}
                    checkOutTime={checkOutTime}
                    daycareSelectedDates={daycareSelectedDates}
                    boardingRangeStart={boardingRangeStart}
                    boardingRangeEnd={boardingRangeEnd}
                    boardingDateTimes={boardingDateTimes}
                    groomingStyle={groomingStyle}
                    groomingAddOns={groomingAddOns}
                    trainingType={trainingType}
                    roomAssignments={roomAssignments}
                    feedingSchedule={feedingSchedule}
                    medications={medications}
                    extraServices={extraServices}
                    calculatePrice={calculatePrice}
                    notificationEmail={notificationEmail}
                    setNotificationEmail={setNotificationEmail}
                    notificationSMS={notificationSMS}
                    setNotificationSMS={setNotificationSMS}
                  />
                )}
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
                {currentStep < displayedSteps.length - 1 ? (
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
