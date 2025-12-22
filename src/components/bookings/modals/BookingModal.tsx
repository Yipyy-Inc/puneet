"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Check,
  Clock,
  Pill,
  Utensils,
  Scissors,
  type LucideIcon,
} from "lucide-react";
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

import {
  Client,
  FeedingScheduleItem,
  MedicationItem,
  NewBooking,
  Booking,
  DaycareDateTime,
  Task,
} from "@/lib/types";
import type { ExtraService } from "@/lib/types";

// Types

export interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  facilityId: number;
  facilityName: string;
  onCreateBooking: (booking: NewBooking) => void;
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  preSelectedService?: string;
  booking?: Booking;
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
  booking,
}: NewBookingModalProps) {
  // Staff options for assignment
  const staffOptions = [
    { value: "Mike Chen", label: "Mike Chen" },
    { value: "Emily Davis", label: "Emily Davis" },
    { value: "David Wilson", label: "David Wilson" },
    { value: "Lisa Rodriguez", label: "Lisa Rodriguez" },
    { value: "Tom Anderson", label: "Tom Anderson" },
    { value: "Manager One", label: "Manager One" },
    { value: "Admin User", label: "Admin User" },
  ];

  // Task assignments state
  const [taskAssignments, setTaskAssignments] = useState<
    Record<string, string>
  >({});

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
  const [daycareDateTimes, setDaycareDateTimes] = useState<DaycareDateTime[]>(
    [],
  );

  // Boarding specific - date range selection
  const [boardingRangeStart, setBoardingRangeStart] = useState<Date | null>(
    null,
  );
  const [boardingRangeEnd, setBoardingRangeEnd] = useState<Date | null>(null);
  const [boardingDateTimes, setBoardingDateTimes] = useState<DaycareDateTime[]>(
    [],
  );

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
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
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

    const booking: NewBooking = {
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

  const isViewMode = !!booking;

  const getTaskIcon = (type: string): LucideIcon => {
    switch (type) {
      case "feeding":
        return Utensils;
      case "medication":
        return Pill;
      case "service":
        return Scissors;
      case "walking":
        return Clock;
      default:
        return Clock;
    }
  };

  const tasks = useMemo((): Task[] => {
    if (!booking) return [];

    const taskList: Task[] = [];
    const now = new Date();
    const bookingStart = new Date(booking.startDate);
    const isFutureBooking = bookingStart > now;

    // Feeding tasks
    if (booking.feedingSchedule) {
      booking.feedingSchedule.forEach((feed) => {
        const petId = Array.isArray(booking.petId)
          ? booking.petId[0]
          : booking.petId;
        taskList.push({
          id: `feed-${feed.id}`,
          bookingId: booking.id,
          petId,
          type: "feeding",
          title: `Feed ${feed.name}`,
          time: feed.time,
          details: feed.instructions,
          assignedStaff: taskAssignments[`feed-${feed.id}`] || undefined,
          completionStatus: "pending",
          assignable: isFutureBooking && !taskAssignments[`feed-${feed.id}`],
        });
      });
    }

    // Medication tasks
    if (booking.medications) {
      booking.medications.forEach((med) => {
        med.time.forEach((time) => {
          const petId = Array.isArray(booking.petId)
            ? booking.petId[0]
            : booking.petId;
          taskList.push({
            id: `med-${med.id}-${time}`,
            bookingId: booking.id,
            petId,
            type: "medication",
            title: `Give ${med.name}`,
            time,
            details: med.instructions,
            assignedStaff:
              taskAssignments[`med-${med.id}-${time}`] || undefined,
            completionStatus: "pending",
            assignable:
              isFutureBooking && !taskAssignments[`med-${med.id}-${time}`],
          });
        });
      });
    }

    // Extra services
    if (booking.extraServices) {
      booking.extraServices.forEach((service) => {
        taskList.push({
          id: `service-${service.serviceId}-${service.petId}`,
          bookingId: booking.id,
          petId: service.petId,
          type: "service",
          title: `Perform ${service.serviceId} service`,
          time: null,
          details: `Quantity: ${service.quantity}`,
          assignedStaff:
            taskAssignments[`service-${service.serviceId}-${service.petId}`] ||
            undefined,
          completionStatus: "pending",
          assignable:
            isFutureBooking &&
            !taskAssignments[`service-${service.serviceId}-${service.petId}`],
        });
      });
    }

    // Walk schedule for boarding
    if (booking.service === "boarding" && booking.walkSchedule) {
      const petId = Array.isArray(booking.petId)
        ? booking.petId[0]
        : booking.petId;
      taskList.push({
        id: "walk-schedule",
        bookingId: booking.id,
        petId,
        type: "walking",
        title: "Walk Schedule",
        time: null,
        details: booking.walkSchedule,
        assignedStaff: taskAssignments["walk-schedule"] || undefined,
        completionStatus: "pending",
        assignable: isFutureBooking && !taskAssignments["walk-schedule"],
      });
    }

    return taskList;
  }, [booking, taskAssignments]);

  if (isViewMode && booking) {
    const client = clients.find((c) => c.id === booking.clientId);
    const pet = client?.pets.find(
      (p) =>
        p.id ===
        (Array.isArray(booking.petId) ? booking.petId[0] : booking.petId),
    );

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-4xl w-[90vw] h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogTitle className="sr-only">Booking Details</DialogTitle>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Booking #{booking.id}</h2>
                <p className="text-muted-foreground">
                  {client?.name} - {pet?.name} - {booking.service}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {booking.status}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 mx-6 mt-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Service</label>
                        <p className="capitalize">{booking.service}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Service Type
                        </label>
                        <p>{booking.serviceType || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Badge variant="outline" className="capitalize">
                          {booking.status}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Payment Status
                        </label>
                        <Badge variant="outline" className="capitalize">
                          {booking.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates & Times */}
                <Card>
                  <CardHeader>
                    <CardTitle>Dates & Times</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Start Date
                        </label>
                        <p>{booking.startDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <p>{booking.endDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Check In</label>
                        <p>{booking.checkInTime || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Check Out</label>
                        <p>{booking.checkOutTime || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium">
                          Base Price
                        </label>
                        <p>${booking.basePrice}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Discount</label>
                        <p>${booking.discount}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Total Cost
                        </label>
                        <p className="font-semibold">${booking.totalCost}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service-specific details */}
                {booking.service === "boarding" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Boarding Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {booking.kennel && (
                        <div>
                          <label className="text-sm font-medium">Kennel</label>
                          <p>{booking.kennel}</p>
                        </div>
                      )}
                      {booking.walkSchedule && (
                        <div>
                          <label className="text-sm font-medium">
                            Walk Schedule
                          </label>
                          <p>{booking.walkSchedule}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {booking.service === "daycare" &&
                  booking.daycareSelectedDates && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Daycare Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <label className="text-sm font-medium">
                            Selected Dates
                          </label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {booking.daycareSelectedDates.map((date) => (
                              <Badge key={date} variant="secondary">
                                {date}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {booking.specialRequests && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Special Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{booking.specialRequests}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Check className="h-16 w-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Tasks</h3>
                      <p className="text-muted-foreground text-center">
                        This booking does not have any scheduled tasks.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <Card key={task.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              {React.createElement(getTaskIcon(task.type), {
                                className: "h-4 w-4",
                              })}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <Badge
                                    variant="outline"
                                    className="text-xs capitalize"
                                  >
                                    {task.type}
                                  </Badge>
                                  <Badge
                                    variant={
                                      task.completionStatus === "completed"
                                        ? "default"
                                        : task.completionStatus ===
                                            "in_progress"
                                          ? "secondary"
                                          : "outline"
                                    }
                                    className="text-xs"
                                  >
                                    {task.completionStatus.replace("_", " ")}
                                  </Badge>
                                </div>
                                {task.assignedStaff && (
                                  <Badge variant="outline" className="text-xs">
                                    Assigned: {task.assignedStaff}
                                  </Badge>
                                )}
                              </div>
                              {task.time && (
                                <p className="text-sm text-muted-foreground mb-1">
                                  Time: {task.time}
                                </p>
                              )}
                              <p className="text-sm mb-2">{task.details}</p>
                              {task.assignable && (
                                <div className="flex items-center gap-2">
                                  <label className="text-sm font-medium">
                                    Assign to:
                                  </label>
                                  <Select
                                    value={task.assignedStaff || ""}
                                    onValueChange={(value) =>
                                      setTaskAssignments((prev) => ({
                                        ...prev,
                                        [task.id]: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Select staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {staffOptions.map((staff) => (
                                        <SelectItem
                                          key={staff.value}
                                          value={staff.value}
                                        >
                                          {staff.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

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
