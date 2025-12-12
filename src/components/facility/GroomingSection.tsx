"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  PawPrint,
  Phone,
  Clock,
  Scissors,
  CheckCircle,
  Eye,
  PlayCircle,
  Hourglass,
  Calendar,
  User,
} from "lucide-react";
import {
  groomingAppointments,
  GroomingAppointment,
  GroomingStatus,
  stylists,
} from "@/data/grooming";
import { clients } from "@/data/clients";

interface GroomingAppointmentWithPending extends Omit<
  GroomingAppointment,
  "status"
> {
  status: GroomingStatus | "pending";
}

// Map pet IDs to dog images
const petImages: Record<number, string> = {
  1: "/dogs/dog-1.jpg",
  13: "/dogs/dog-2.jpg",
  14: "/dogs/dog-3.jpg",
  5: "/dogs/dog-4.jpg",
};

const getPetImage = (petId: number): string | null => {
  return petImages[petId] || null;
};

// Helper function to find client for a pet
const findClientForPet = (petId: number) => {
  return clients.find((client) => client.pets.some((pet) => pet.id === petId));
};

export function GroomingSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<GroomingAppointmentWithPending | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "pending" | "start" | "complete" | null;
    appointment: GroomingAppointmentWithPending | null;
  }>({ open: false, type: null, appointment: null });

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter visibility states
  const [showScheduled, setShowScheduled] = useState(true);
  const [showPending, setShowPending] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  // Local state for appointments data with pending status support
  const [appointmentsData, setAppointmentsData] = useState<
    GroomingAppointmentWithPending[]
  >(groomingAppointments as GroomingAppointmentWithPending[]);

  // Get groomer availability based on in-progress appointments
  const groomerStatus = useMemo(() => {
    const statusMap: Record<string, { busy: boolean; currentPet?: string }> =
      {};

    // Initialize all stylists as available
    stylists.forEach((stylist) => {
      statusMap[stylist.id] = { busy: false };
    });

    // Mark groomers with in-progress appointments as busy
    appointmentsData.forEach((apt) => {
      if (apt.status === "in-progress") {
        statusMap[apt.stylistId] = { busy: true, currentPet: apt.petName };
      }
    });

    return statusMap;
  }, [appointmentsData]);

  const isGroomerAvailable = (stylistId: string) => {
    return !groomerStatus[stylistId]?.busy;
  };

  const getGroomerCurrentPet = (stylistId: string) => {
    return groomerStatus[stylistId]?.currentPet;
  };

  // Get today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return appointmentsData.filter((apt) => apt.date === today);
  }, [appointmentsData]);

  // Filter appointments based on visibility toggles
  const filteredAppointments = useMemo(() => {
    return todayAppointments.filter((apt) => {
      if (apt.status === "scheduled" && !showScheduled) return false;
      if (apt.status === "pending" && !showPending) return false;
      if (apt.status === "in-progress" && !showInProgress) return false;
      if (apt.status === "completed" && !showCompleted) return false;
      return true;
    });
  }, [
    todayAppointments,
    showScheduled,
    showPending,
    showInProgress,
    showCompleted,
  ]);

  // Search results
  const displayedAppointments = useMemo(() => {
    if (!searchQuery.trim()) return filteredAppointments;
    const query = searchQuery.toLowerCase();
    return filteredAppointments.filter(
      (apt) =>
        apt.petName.toLowerCase().includes(query) ||
        apt.ownerName.toLowerCase().includes(query) ||
        apt.petBreed.toLowerCase().includes(query) ||
        apt.ownerPhone.includes(query) ||
        apt.stylistName.toLowerCase().includes(query),
    );
  }, [filteredAppointments, searchQuery]);

  // Get counts for badges
  const counts = useMemo(
    () => ({
      scheduled: todayAppointments.filter((apt) => apt.status === "scheduled")
        .length,
      pending: todayAppointments.filter((apt) => apt.status === "pending")
        .length,
      inProgress: todayAppointments.filter(
        (apt) => apt.status === "in-progress",
      ).length,
      completed: todayAppointments.filter((apt) => apt.status === "completed")
        .length,
    }),
    [todayAppointments],
  );

  const openConfirmDialog = (
    type: "pending" | "start" | "complete",
    appointment: GroomingAppointmentWithPending,
  ) => {
    setConfirmDialog({ open: true, type, appointment });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: null, appointment: null });
  };

  const executeAction = (
    appointment: GroomingAppointmentWithPending,
    newStatus: GroomingAppointmentWithPending["status"],
    actionLabel: string,
  ) => {
    const previousStatus = appointment.status;

    // Update the status
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id ? { ...apt, status: newStatus } : apt,
      ),
    );

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Show toast with undo option
    toast.success(`${appointment.petName} - ${actionLabel}`, {
      description: `Status changed to ${newStatus.replace("-", " ")}`,
      action: {
        label: "Undo",
        onClick: () => {
          setAppointmentsData((prev) =>
            prev.map((apt) =>
              apt.id === appointment.id
                ? { ...apt, status: previousStatus }
                : apt,
            ),
          );
          toast.info("Action undone", {
            description: `${appointment.petName} restored to ${previousStatus.replace("-", " ")}`,
          });
        },
      },
      duration: 5000,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.appointment || !confirmDialog.type) return;

    const { appointment, type } = confirmDialog;

    switch (type) {
      case "pending":
        executeAction(appointment, "pending", "Marked as pending");
        break;
      case "start":
        executeAction(appointment, "in-progress", "Grooming started");
        break;
      case "complete":
        executeAction(appointment, "completed", "Grooming completed");
        break;
    }

    closeConfirmDialog();
  };

  const revertToScheduled = (appointment: GroomingAppointmentWithPending) => {
    const previousStatus = appointment.status;
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id
          ? { ...apt, status: "scheduled" as const }
          : apt,
      ),
    );

    toast.success(`${appointment.petName} - Reverted to Scheduled`, {
      description: "Status has been reset",
      action: {
        label: "Undo",
        onClick: () => {
          setAppointmentsData((prev) =>
            prev.map((apt) =>
              apt.id === appointment.id
                ? { ...apt, status: previousStatus }
                : apt,
            ),
          );
          toast.info("Action undone");
        },
      },
      duration: 5000,
    });

    setShowDialog(false);
    setSelectedAppointment(null);
  };

  const revertToPending = (appointment: GroomingAppointmentWithPending) => {
    const previousStatus = appointment.status;
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id
          ? { ...apt, status: "pending" as const }
          : apt,
      ),
    );

    toast.success(`${appointment.petName} - Reverted to Pending`, {
      description: "Status has been reset",
      action: {
        label: "Undo",
        onClick: () => {
          setAppointmentsData((prev) =>
            prev.map((apt) =>
              apt.id === appointment.id
                ? { ...apt, status: previousStatus }
                : apt,
            ),
          );
          toast.info("Action undone");
        },
      },
      duration: 5000,
    });

    setShowDialog(false);
    setSelectedAppointment(null);
  };

  const revertToInProgress = (appointment: GroomingAppointmentWithPending) => {
    const previousStatus = appointment.status;
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id
          ? { ...apt, status: "in-progress" as const }
          : apt,
      ),
    );

    toast.success(`${appointment.petName} - Reverted to In Progress`, {
      description: "Status has been reset",
      action: {
        label: "Undo",
        onClick: () => {
          setAppointmentsData((prev) =>
            prev.map((apt) =>
              apt.id === appointment.id
                ? { ...apt, status: previousStatus }
                : apt,
            ),
          );
          toast.info("Action undone");
        },
      },
      duration: 5000,
    });

    setShowDialog(false);
    setSelectedAppointment(null);
  };

  const handleMarkPending = (appointment: GroomingAppointmentWithPending) => {
    openConfirmDialog("pending", appointment);
  };

  const handleStartGrooming = (appointment: GroomingAppointmentWithPending) => {
    openConfirmDialog("start", appointment);
  };

  const handleCompleteGrooming = (
    appointment: GroomingAppointmentWithPending,
  ) => {
    openConfirmDialog("complete", appointment);
  };

  const handleViewDetails = (appointment: GroomingAppointmentWithPending) => {
    setSelectedAppointment(appointment);
    setShowDialog(true);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: GroomingStatus | "pending") => {
    switch (status) {
      case "scheduled":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <Calendar className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Hourglass className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <PlayCircle className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCardStyles = (status: GroomingStatus | "pending") => {
    switch (status) {
      case "scheduled":
        return {
          bg: "bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30",
          iconBg: "bg-orange-100 dark:bg-orange-900",
          icon: "text-orange-600",
        };
      case "pending":
        return {
          bg: "bg-yellow-50/50 dark:bg-yellow-950/20 hover:bg-yellow-100/50 dark:hover:bg-yellow-950/30",
          iconBg: "bg-yellow-100 dark:bg-yellow-900",
          icon: "text-yellow-600",
        };
      case "in-progress":
        return {
          bg: "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30",
          iconBg: "bg-blue-100 dark:bg-blue-900",
          icon: "text-blue-600",
        };
      case "completed":
        return {
          bg: "bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100/50 dark:hover:bg-green-950/30",
          iconBg: "bg-green-100 dark:bg-green-900",
          icon: "text-green-600",
        };
      default:
        return {
          bg: "bg-card hover:bg-muted/50",
          iconBg: "bg-primary/10",
          icon: "text-primary",
        };
    }
  };

  const getActionButton = (appointment: GroomingAppointmentWithPending) => {
    switch (appointment.status) {
      case "scheduled":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMarkPending(appointment)}
            className="gap-1"
          >
            <Hourglass className="h-3 w-3" />
            Arrived
          </Button>
        );
      case "pending":
        const available = isGroomerAvailable(appointment.stylistId);
        return (
          <Button
            size="sm"
            onClick={() => handleStartGrooming(appointment)}
            className="gap-1 bg-blue-600 hover:bg-blue-700"
            disabled={!available}
            title={
              !available
                ? `${appointment.stylistName} is currently busy`
                : undefined
            }
          >
            <PlayCircle className="h-3 w-3" />
            Start
          </Button>
        );
      case "in-progress":
        return (
          <Button
            size="sm"
            onClick={() => handleCompleteGrooming(appointment)}
            className="gap-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-3 w-3" />
            Done
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Header with Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Grooming</h3>
            <Badge variant="outline">{todayAppointments.length} today</Badge>
          </div>

          {/* Filter Toggles */}
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div className="flex rounded-lg border p-1 gap-1 flex-wrap">
              <Button
                size="sm"
                variant={showScheduled ? "default" : "ghost"}
                onClick={() => setShowScheduled(!showScheduled)}
                className="h-7 px-3 gap-1"
              >
                <Calendar className="h-3 w-3" />
                Scheduled
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.scheduled}
                </Badge>
              </Button>
              <Button
                size="sm"
                variant={showPending ? "default" : "ghost"}
                onClick={() => setShowPending(!showPending)}
                className="h-7 px-3 gap-1"
              >
                <Hourglass className="h-3 w-3" />
                Pending
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.pending}
                </Badge>
              </Button>
              <Button
                size="sm"
                variant={showInProgress ? "default" : "ghost"}
                onClick={() => setShowInProgress(!showInProgress)}
                className="h-7 px-3 gap-1"
              >
                <PlayCircle className="h-3 w-3" />
                In Progress
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.inProgress}
                </Badge>
              </Button>
              <Button
                size="sm"
                variant={showCompleted ? "default" : "ghost"}
                onClick={() => setShowCompleted(!showCompleted)}
                className="h-7 px-3 gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                Completed
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.completed}
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by pet name, owner, breed, phone, or groomer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Appointments List */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {displayedAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery
                ? "No appointments match your search"
                : "No appointments for today"}
            </p>
          ) : (
            displayedAppointments.map((appointment) => {
              const styles = getCardStyles(appointment.status);
              const client = findClientForPet(appointment.petId);
              return (
                <div
                  key={appointment.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${styles.bg} transition-colors cursor-pointer`}
                  onClick={() => handleViewDetails(appointment)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getPetImage(appointment.petId) ? (
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${appointment.petId}`
                            : "#"
                        }
                        className="shrink-0"
                      >
                        <div className="h-10 w-10 rounded-full overflow-hidden">
                          <Image
                            src={getPetImage(appointment.petId)!}
                            alt={appointment.petName}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </Link>
                    ) : (
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${appointment.petId}`
                            : "#"
                        }
                        className="shrink-0"
                      >
                        <div
                          className={`h-10 w-10 rounded-full ${styles.iconBg} flex items-center justify-center`}
                        >
                          <PawPrint className={`h-5 w-5 ${styles.icon}`} />
                        </div>
                      </Link>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={
                            client
                              ? `/facility/dashboard/clients/${client.id}/pets/${appointment.petId}`
                              : "#"
                          }
                          className="font-medium truncate hover:underline"
                        >
                          {appointment.petName}
                        </Link>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {appointment.ownerName} • {appointment.petBreed}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(appointment.startTime)} -{" "}
                          {formatTime(appointment.endTime)}
                        </span>
                        <span>•</span>
                        <User className="h-3 w-3" />
                        <span>{appointment.stylistName}</span>
                        <span>•</span>
                        {isGroomerAvailable(appointment.stylistId) ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs h-5">
                            Available
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs h-5">
                            Busy
                            {getGroomerCurrentPet(appointment.stylistId) &&
                              ` - ${getGroomerCurrentPet(appointment.stylistId)}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getActionButton(appointment)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Appointment Details Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                Appointment Details
              </DialogTitle>
              <DialogDescription>
                View grooming appointment information
              </DialogDescription>
            </DialogHeader>

            {selectedAppointment && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  {(() => {
                    const client = findClientForPet(selectedAppointment.petId);
                    return getPetImage(selectedAppointment.petId) ? (
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${selectedAppointment.petId}`
                            : "#"
                        }
                      >
                        <div className="h-12 w-12 rounded-full overflow-hidden">
                          <Image
                            src={getPetImage(selectedAppointment.petId)!}
                            alt={selectedAppointment.petName}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </Link>
                    ) : (
                      <Link
                        href={
                          client
                            ? `/facility/dashboard/clients/${client.id}/pets/${selectedAppointment.petId}`
                            : "#"
                        }
                      >
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-primary" />
                        </div>
                      </Link>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const client = findClientForPet(
                          selectedAppointment.petId,
                        );
                        return (
                          <Link
                            href={
                              client
                                ? `/facility/dashboard/clients/${client.id}/pets/${selectedAppointment.petId}`
                                : "#"
                            }
                            className="font-semibold text-lg hover:underline"
                          >
                            {selectedAppointment.petName}
                          </Link>
                        );
                      })()}
                      {getStatusBadge(selectedAppointment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Owner: {selectedAppointment.ownerName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Breed</p>
                    <p className="font-medium">
                      {selectedAppointment.petBreed}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedAppointment.ownerPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Appointment Time</p>
                    <p className="font-medium">
                      {formatTime(selectedAppointment.startTime)} -{" "}
                      {formatTime(selectedAppointment.endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Groomer</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {selectedAppointment.stylistName}
                      </p>
                      {isGroomerAvailable(selectedAppointment.stylistId) ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Available
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Busy
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Package</p>
                    <p className="font-medium">
                      {selectedAppointment.packageName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Price</p>
                    <p className="font-medium">
                      ${selectedAppointment.totalPrice}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pet Size</p>
                    <p className="font-medium capitalize">
                      {selectedAppointment.petSize}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Coat Type</p>
                    <p className="font-medium capitalize">
                      {selectedAppointment.coatType}
                    </p>
                  </div>
                  {selectedAppointment.addOns.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Add-ons</p>
                      <p className="font-medium">
                        {selectedAppointment.addOns.join(", ")}
                      </p>
                    </div>
                  )}
                  {selectedAppointment.specialInstructions && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">
                        Special Instructions
                      </p>
                      <p className="font-medium">
                        {selectedAppointment.specialInstructions}
                      </p>
                    </div>
                  )}
                  {selectedAppointment.allergies.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Allergies</p>
                      <p className="font-medium text-red-600">
                        {selectedAppointment.allergies.join(", ")}
                      </p>
                    </div>
                  )}
                  {selectedAppointment.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Notes</p>
                      <p className="font-medium">{selectedAppointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex w-full justify-between">
                <div className="flex gap-2">
                  <Link href="/facility/dashboard/bookings">
                    <Button variant="outline">Booking Details</Button>
                  </Link>
                  {selectedAppointment?.status === "pending" && (
                    <Button
                      variant="outline"
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      onClick={() => revertToScheduled(selectedAppointment)}
                    >
                      Revert to Scheduled
                    </Button>
                  )}
                  {selectedAppointment?.status === "in-progress" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={() => revertToScheduled(selectedAppointment)}
                      >
                        Revert to Scheduled
                      </Button>
                      <Button
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        onClick={() => revertToPending(selectedAppointment)}
                      >
                        Revert to Pending
                      </Button>
                    </>
                  )}
                  {selectedAppointment?.status === "completed" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={() => revertToScheduled(selectedAppointment)}
                      >
                        Revert to Scheduled
                      </Button>
                      <Button
                        variant="outline"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={() => revertToInProgress(selectedAppointment)}
                      >
                        Revert to In Progress
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                  >
                    Close
                  </Button>
                  {selectedAppointment?.status === "scheduled" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleMarkPending(selectedAppointment);
                        setShowDialog(false);
                      }}
                    >
                      <Hourglass className="h-4 w-4 mr-2" />
                      Mark Arrived
                    </Button>
                  )}
                  {selectedAppointment?.status === "pending" && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        handleStartGrooming(selectedAppointment);
                        setShowDialog(false);
                      }}
                      disabled={
                        !isGroomerAvailable(selectedAppointment.stylistId)
                      }
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {isGroomerAvailable(selectedAppointment.stylistId)
                        ? "Start Grooming"
                        : `${selectedAppointment.stylistName} is Busy`}
                    </Button>
                  )}
                  {selectedAppointment?.status === "in-progress" && (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleCompleteGrooming(selectedAppointment);
                        setShowDialog(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && closeConfirmDialog()}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === "pending" && "Mark as Arrived?"}
                {confirmDialog.type === "start" && "Start Grooming?"}
                {confirmDialog.type === "complete" && "Complete Grooming?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.type === "pending" &&
                  `Are you sure you want to mark ${confirmDialog.appointment?.petName}'s appointment as arrived?`}
                {confirmDialog.type === "start" &&
                  `Are you sure you want to start grooming for ${confirmDialog.appointment?.petName}? This will mark ${confirmDialog.appointment?.stylistName} as busy.`}
                {confirmDialog.type === "complete" &&
                  `Are you sure you want to mark ${confirmDialog.appointment?.petName}'s grooming as complete?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                className={
                  confirmDialog.type === "complete"
                    ? "bg-green-600 hover:bg-green-700"
                    : confirmDialog.type === "start"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : ""
                }
              >
                {confirmDialog.type === "pending" && "Mark Arrived"}
                {confirmDialog.type === "start" && "Start Grooming"}
                {confirmDialog.type === "complete" && "Complete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
