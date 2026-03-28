"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";

import {
  Search,
  PawPrint,
  Phone,
  Scissors,
  CheckCircle,
  PlayCircle,
  Hourglass,
  Calendar,
  LogIn,
  Filter,
} from "lucide-react";
import {
  groomingAppointments,
  GroomingAppointment,
  GroomingStatus,
  stylists,
  type GroomingIntake,
  type PriceAdjustment,
} from "@/data/grooming";
import { clients } from "@/data/clients";
import { GroomingIntakeForm } from "@/components/grooming/GroomingIntakeForm";
import { PriceAdjustmentForm } from "@/components/grooming/PriceAdjustmentForm";
import { sendPickupNotifications } from "@/lib/grooming-pickup-notifications";

interface GroomingAppointmentWithPending extends Omit<
  GroomingAppointment,
  "status"
> {
  status: GroomingStatus;
  price: number;
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
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [groomerFilter, setGroomerFilter] = useState<string>("all");
  const [showScheduled, setShowScheduled] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter visibility states

  // Local state for appointments data
  const [appointmentsData, setAppointmentsData] = useState<
    GroomingAppointmentWithPending[]
  >(
    groomingAppointments.map((apt) => ({
      ...apt,
      status: apt.status as GroomingStatus,
      price: apt.totalPrice,
    })),
  );

  // Get groomer availability based on in-progress appointments
  const groomerStatus = useMemo(() => {
    const statusMap: Record<string, { busy: boolean; currentPet?: string }> =
      {};

    // Initialize all stylists as available
    stylists.forEach((stylist) => {
      statusMap[stylist.id] = { busy: false };
    });

    // Mark groomers with checked-in or in-progress appointments as busy
    appointmentsData.forEach((apt) => {
      if (apt.status === "checked-in" || apt.status === "in-progress") {
        statusMap[apt.stylistId] = { busy: true, currentPet: apt.petName };
      }
    });

    return statusMap;
  }, [appointmentsData]);

  const isGroomerAvailable = (stylistId: string) => {
    return !groomerStatus[stylistId]?.busy;
  };

  // Get today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return appointmentsData.filter((apt) => apt.date === today);
  }, [appointmentsData]);

  const executeAction = (
    appointment: GroomingAppointmentWithPending,
    newStatus: GroomingAppointmentWithPending["status"],
    actionLabel: string,
  ) => {
    const previousStatus = appointment.status;

    // Check if check-in is required before starting groom
    // TODO: Get from grooming settings - requireCheckInBeforeGroom
    const requireCheckInBeforeGroom = true; // Default: true
    if (
      newStatus === "in-progress" &&
      requireCheckInBeforeGroom &&
      appointment.status !== "checked-in" &&
      !appointment.checkInTime
    ) {
      toast.error("Check-in required", {
        description: "Appointment must be checked in before groom can start.",
      });
      return;
    }

    // Update the status
    const updatedAppointment = {
      ...appointment,
      status: newStatus,
    };

    setAppointmentsData((prev) =>
      prev.map((apt) => (apt.id === appointment.id ? updatedAppointment : apt)),
    );

    // Send notifications when status changes to "ready-for-pickup"
    if (
      newStatus === "ready-for-pickup" &&
      previousStatus !== "ready-for-pickup"
    ) {
      // TODO: Get from grooming settings
      const settings = {
        autoReadyForPickupSMS: true, // Default: true
        autoReadyForPickupEmail: true, // Default: true
      };

      sendPickupNotifications(updatedAppointment, settings)
        .then((results) => {
          const notificationMessages: string[] = [];
          if (results.smsSent) notificationMessages.push("SMS sent");
          if (results.emailSent) notificationMessages.push("Email sent");

          if (notificationMessages.length > 0) {
            toast.success("Customer notified", {
              description: `${notificationMessages.join(" and ")}: ${appointment.petName} is ready for pickup.`,
            });
          }
        })
        .catch((error) => {
          console.error("Failed to send pickup notifications:", error);
        });
    }

    // If status changed to completed, automatically deduct products

    // If status changed to completed, automatically deduct products
    if (newStatus === "completed" && previousStatus !== "completed") {
      import("@/lib/grooming-inventory-deduction").then(
        ({ deductProductsForAppointment }) => {
          const deductionResult = deductProductsForAppointment(
            appointment,
            appointment.stylistName,
          );

          if (
            deductionResult.success &&
            deductionResult.deductions.length > 0
          ) {
            const productsDeducted = deductionResult.deductions
              .map(
                (d) =>
                  `${d.productName} (${d.quantityDeducted} ${d.productName.includes("ml") ? "ml" : "units"})`,
              )
              .join(", ");

            // Check for low stock alerts
            const lowStockProducts = deductionResult.deductions.filter(
              (d) => d.isNowLowStock,
            );
            if (lowStockProducts.length > 0) {
              toast.warning("Products deducted - Low stock alert", {
                description: `${productsDeducted}. ${lowStockProducts.length} product(s) are now low in stock.`,
                duration: 8000,
              });
            } else {
              toast.success("Products deducted from inventory", {
                description: productsDeducted,
                duration: 5000,
              });
            }
          } else if (deductionResult.errors.length > 0) {
            const errorMessages = deductionResult.errors
              .map((e) => e.reason)
              .join(", ");
            toast.error("Inventory deduction failed", {
              description: errorMessages,
              duration: 8000,
            });
          }
        },
      );
    }

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

    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const revertToCheckedIn = (appointment: GroomingAppointmentWithPending) => {
    const previousStatus = appointment.status;
    setAppointmentsData((prev) =>
      prev.map((apt) =>
        apt.id === appointment.id
          ? { ...apt, status: "checked-in" as const }
          : apt,
      ),
    );

    toast.success(`${appointment.petName} - Reverted to Checked In`, {
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

    setIsDetailsModalOpen(false);
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

    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleMarkPending = (appointment: GroomingAppointmentWithPending) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(false);
    setIsCheckInModalOpen(true);
  };

  const handleStartGrooming = (appointment: GroomingAppointmentWithPending) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(false);
    setIsCheckInModalOpen(true);
  };

  const handleViewDetails = (appointment: GroomingAppointmentWithPending) => {
    setSelectedAppointment(appointment);
    setIsCheckInModalOpen(false);
    setIsDetailsModalOpen(true);
  };

  const confirmCheckIn = () => {
    if (!selectedAppointment) return;
    if (selectedAppointment.status === "scheduled") {
      const now = new Date().toISOString();
      setAppointmentsData((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id
            ? { ...apt, status: "checked-in" as const, checkInTime: now }
            : apt,
        ),
      );
      toast.success(`${selectedAppointment.petName} - Checked In`);
    } else if (selectedAppointment.status === "checked-in") {
      executeAction(selectedAppointment, "in-progress", "Grooming started");
    }
    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleDetailsCheckIn = () => {
    if (!selectedAppointment) return;
    if (selectedAppointment.status === "scheduled") {
      const now = new Date().toISOString();
      setAppointmentsData((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id
            ? { ...apt, status: "checked-in" as const, checkInTime: now }
            : apt,
        ),
      );
      toast.success(`${selectedAppointment.petName} - Checked In`);
    } else if (selectedAppointment.status === "checked-in") {
      executeAction(selectedAppointment, "in-progress", "Grooming started");
    }
    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status: GroomingStatus) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <Calendar className="mr-1 size-3" />
            Scheduled
          </Badge>
        );
      case "checked-in":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <LogIn className="mr-1 size-3" />
            Checked In
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <PlayCircle className="mr-1 size-3" />
            In Progress
          </Badge>
        );
      case "ready-for-pickup":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 size-3" />
            Ready for Pickup
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="mr-1 size-3" />
            Completed
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "no-show":
        return <Badge variant="destructive">No Show</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
            <Hourglass className="size-3" />
            Arrived
          </Button>
        );
      case "scheduled":
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
            <PlayCircle className="size-3" />
            Start
          </Button>
        );
      case "in-progress":
        return null;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Header with Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="text-primary size-5" />
            <h3 className="text-lg font-semibold">Grooming</h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="size-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Groomer</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={groomerFilter}
                onValueChange={setGroomerFilter}
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                {stylists.map((s) => (
                  <DropdownMenuRadioItem key={s.id} value={s.id}>
                    {s.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Show sections</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={showScheduled}
                onCheckedChange={(v) => setShowScheduled(!!v)}
              >
                Scheduled
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showInProgress}
                onCheckedChange={(v) => setShowInProgress(!!v)}
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showCompleted}
                onCheckedChange={(v) => setShowCompleted(!!v)}
              >
                Completed
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column-based layout matching CheckInOutSection */}
        <div
          className={`grid gap-4 ${
            [showScheduled, showInProgress, showCompleted].filter(Boolean)
              .length === 1
              ? "lg:grid-cols-1"
              : [showScheduled, showInProgress, showCompleted].filter(Boolean)
                    .length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-3"
          } `}
        >
          {/* Scheduled Column */}
          {showScheduled &&
            (() => {
              const scheduled = todayAppointments
                .filter(
                  (apt) =>
                    apt.status === "scheduled" || apt.status === "checked-in",
                )
                .filter(
                  (apt) =>
                    groomerFilter === "all" || apt.stylistId === groomerFilter,
                );
              const filtered = searchQuery.trim()
                ? scheduled.filter((apt) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      apt.petName.toLowerCase().includes(q) ||
                      apt.ownerName.toLowerCase().includes(q) ||
                      apt.stylistName.toLowerCase().includes(q)
                    );
                  })
                : scheduled;
              return (
                <Card>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="size-4 text-blue-600" />
                        Scheduled
                      </CardTitle>
                      <Badge variant="secondary">{filtered.length}</Badge>
                    </div>
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                      <Input
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-9 text-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No scheduled appointments
                        </p>
                      ) : (
                        filtered.map((appointment) => {
                          const client = findClientForPet(appointment.petId);
                          return (
                            <div
                              key={appointment.id}
                              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                              onClick={() => handleViewDetails(appointment)}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                  <PawPrint className="size-5 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={
                                        client
                                          ? `/facility/dashboard/clients/${client.id}/pets/${appointment.petId}`
                                          : "#"
                                      }
                                      className="truncate font-medium hover:underline"
                                    >
                                      {appointment.petName}
                                    </Link>
                                    {appointment.status === "checked-in" && (
                                      <Badge className="h-5 bg-green-100 text-[10px] text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Arrived
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {appointment.ownerName} •{" "}
                                    {formatTime(appointment.startTime)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {getActionButton(appointment)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {/* In Progress Column */}
          {showInProgress &&
            (() => {
              const inProgress = todayAppointments
                .filter(
                  (apt) =>
                    apt.status === "in-progress" ||
                    apt.status === "ready-for-pickup",
                )
                .filter(
                  (apt) =>
                    groomerFilter === "all" || apt.stylistId === groomerFilter,
                );
              const filtered = searchQuery.trim()
                ? inProgress.filter((apt) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      apt.petName.toLowerCase().includes(q) ||
                      apt.ownerName.toLowerCase().includes(q) ||
                      apt.stylistName.toLowerCase().includes(q)
                    );
                  })
                : inProgress;
              return (
                <Card>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Scissors className="size-4 text-amber-600" />
                        In Progress
                      </CardTitle>
                      <Badge variant="secondary">{filtered.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No active grooming
                        </p>
                      ) : (
                        filtered.map((appointment) => {
                          const client = findClientForPet(appointment.petId);
                          return (
                            <div
                              key={appointment.id}
                              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                              onClick={() => handleViewDetails(appointment)}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                  <Scissors className="size-5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={
                                        client
                                          ? `/facility/dashboard/clients/${client.id}/pets/${appointment.petId}`
                                          : "#"
                                      }
                                      className="truncate font-medium hover:underline"
                                    >
                                      {appointment.petName}
                                    </Link>
                                    {appointment.status ===
                                      "ready-for-pickup" && (
                                      <Badge className="h-5 bg-green-100 text-[10px] text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Ready for Pickup
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {appointment.stylistName} •{" "}
                                    {appointment.ownerName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {getActionButton(appointment)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

          {/* Completed Column */}
          {showCompleted &&
            (() => {
              const completed = todayAppointments
                .filter((apt) => apt.status === "completed")
                .filter(
                  (apt) =>
                    groomerFilter === "all" || apt.stylistId === groomerFilter,
                );
              return (
                <Card>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle className="size-4 text-green-600" />
                        Completed
                      </CardTitle>
                      <Badge variant="secondary">{completed.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] space-y-2 overflow-y-auto">
                      {completed.length === 0 ? (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                          No completed today
                        </p>
                      ) : (
                        completed.map((appointment) => {
                          const client = findClientForPet(appointment.petId);
                          return (
                            <div
                              key={appointment.id}
                              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                              onClick={() => handleViewDetails(appointment)}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                  <CheckCircle className="size-5 text-green-600" />
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    href={
                                      client
                                        ? `/facility/dashboard/clients/${client.id}/pets/${appointment.petId}`
                                        : "#"
                                    }
                                    className="truncate font-medium hover:underline"
                                  >
                                    {appointment.petName}
                                  </Link>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {appointment.ownerName} •{" "}
                                    {appointment.stylistName}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
        </div>

        {/* Check-In Modal */}
        <Modal
          open={isCheckInModalOpen}
          onOpenChange={setIsCheckInModalOpen}
          type="confirmation"
          title="Check-In Grooming Appointment"
          description="Confirm pet arrival and appointment details"
          actions={{
            secondary: {
              label: "Close",
              onClick: () => setIsCheckInModalOpen(false),
              variant: "outline",
            },
            primary: {
              label: "Confirm Check-In",
              onClick: confirmCheckIn,
            },
          }}
        >
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Pet Information */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">Pet Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
                    {getPetImage(selectedAppointment.petId) ? (
                      <Image
                        src={getPetImage(selectedAppointment.petId)!}
                        alt={selectedAppointment.petName}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                        <PawPrint className="text-primary size-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {selectedAppointment.petName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {selectedAppointment.petBreed} •{" "}
                        {selectedAppointment.petSize}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">
                  Owner Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
                    <Image
                      src="/people/person-2.jpg"
                      alt={selectedAppointment.ownerName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-medium">
                        {selectedAppointment.ownerName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {selectedAppointment.ownerPhone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h3 className="mb-3 text-lg font-semibold">Booking Details</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium">
                        {selectedAppointment.packageName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Groomer</p>
                      <p className="font-medium">
                        {selectedAppointment.stylistName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date & Time</p>
                      <p className="font-medium">
                        {selectedAppointment.date}{" "}
                        {formatTime(selectedAppointment.startTime)} -{" "}
                        {formatTime(selectedAppointment.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">
                        ${selectedAppointment.price}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Details Modal */}
        <Modal
          open={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          type="details"
          title="Appointment Details"
          description="View grooming appointment information"
          size="xl"
          footer={
            <div className="flex w-full justify-between">
              <div className="flex gap-2">
                <Link href="/facility/dashboard/bookings">
                  <Button variant="outline">Booking Details</Button>
                </Link>
                {selectedAppointment?.status === "checked-in" && (
                  <Button
                    variant="outline"
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    onClick={() => {
                      setAppointmentsData((prev) =>
                        prev.map((apt) =>
                          apt.id === selectedAppointment.id
                            ? {
                                ...apt,
                                status: "scheduled" as const,
                                checkInTime: null,
                              }
                            : apt,
                        ),
                      );
                      toast.success(
                        `${selectedAppointment.petName} - Reverted to Scheduled`,
                      );
                    }}
                  >
                    Revert to Scheduled
                  </Button>
                )}
                {selectedAppointment?.status === "in-progress" && (
                  <>
                    <Button
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      onClick={() => revertToScheduled(selectedAppointment)}
                    >
                      Revert to Scheduled
                    </Button>
                    <Button
                      variant="outline"
                      className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                      onClick={() => revertToCheckedIn(selectedAppointment)}
                    >
                      Revert to Checked In
                    </Button>
                  </>
                )}
                {selectedAppointment?.status === "completed" && (
                  <>
                    <Button
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      onClick={() => revertToScheduled(selectedAppointment)}
                    >
                      Revert to Scheduled
                    </Button>
                    <Button
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
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
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
                {selectedAppointment?.status === "scheduled" && (
                  <Button variant="outline" onClick={handleDetailsCheckIn}>
                    <Hourglass className="mr-2 size-4" />
                    Mark Arrived
                  </Button>
                )}
                {selectedAppointment?.status === "checked-in" && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleDetailsCheckIn}
                    disabled={
                      !isGroomerAvailable(selectedAppointment.stylistId)
                    }
                  >
                    <PlayCircle className="mr-2 size-4" />
                    {isGroomerAvailable(selectedAppointment.stylistId)
                      ? "Start Grooming"
                      : `${selectedAppointment.stylistName} is Busy`}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="bg-muted flex items-center gap-4 rounded-lg p-4">
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
                      <div className="size-12 overflow-hidden rounded-full">
                        <Image
                          src={getPetImage(selectedAppointment.petId)!}
                          alt={selectedAppointment.petName}
                          width={48}
                          height={48}
                          className="size-full object-cover"
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
                      <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
                        <PawPrint className="text-primary size-6" />
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
                          className="text-lg font-semibold hover:underline"
                        >
                          {selectedAppointment.petName}
                        </Link>
                      );
                    })()}
                    {getStatusBadge(selectedAppointment.status)}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Owner: {selectedAppointment.ownerName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Breed</p>
                  <p className="font-medium">{selectedAppointment.petBreed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-1 font-medium">
                    <Phone className="size-3" />
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
                  <p className="text-muted-foreground">Base Price</p>
                  <p className="font-medium">
                    $
                    {(
                      selectedAppointment.basePrice ||
                      selectedAppointment.totalPrice
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Price</p>
                  <p className="text-lg font-medium">
                    ${selectedAppointment.totalPrice.toFixed(2)}
                    {(selectedAppointment.priceAdjustments?.length || 0) >
                      0 && (
                      <span className="text-muted-foreground ml-2 text-sm">
                        (+
                        {selectedAppointment.priceAdjustments
                          ?.reduce((sum, adj) => sum + adj.amount, 0)
                          .toFixed(2)}
                        )
                      </span>
                    )}
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

              {/* Price Adjustments - Show for checked-in, in-progress, or ready-for-pickup */}
              {(selectedAppointment.status === "checked-in" ||
                selectedAppointment.status === "in-progress" ||
                selectedAppointment.status === "ready-for-pickup") && (
                <div className="border-t pt-4">
                  <PriceAdjustmentForm
                    appointmentId={selectedAppointment.id}
                    petName={selectedAppointment.petName}
                    basePrice={
                      selectedAppointment.basePrice ||
                      selectedAppointment.totalPrice
                    }
                    currentTotal={selectedAppointment.totalPrice}
                    adjustments={selectedAppointment.priceAdjustments || []}
                    onAddAdjustment={(adjustment) => {
                      const newAdjustment: PriceAdjustment = {
                        ...adjustment,
                        id: `adj-${Date.now()}`,
                        addedAt: new Date().toISOString(),
                        notifiedAt: adjustment.customerNotified
                          ? new Date().toISOString()
                          : undefined,
                      };

                      const adjustments = [
                        ...(selectedAppointment.priceAdjustments || []),
                        newAdjustment,
                      ];
                      const totalAdjustments = adjustments.reduce(
                        (sum, adj) => sum + adj.amount,
                        0,
                      );
                      const newTotal =
                        (selectedAppointment.basePrice ||
                          selectedAppointment.totalPrice) + totalAdjustments;

                      setAppointmentsData((prev) =>
                        prev.map((apt) =>
                          apt.id === selectedAppointment.id
                            ? {
                                ...apt,
                                priceAdjustments: adjustments,
                                totalPrice: newTotal,
                                basePrice:
                                  apt.basePrice ||
                                  apt.totalPrice - totalAdjustments,
                              }
                            : apt,
                        ),
                      );

                      if (adjustment.customerNotified) {
                        // In production, send notification
                        console.log(
                          `Sending notification to ${selectedAppointment.ownerEmail} about $${adjustment.amount} charge`,
                        );
                      }
                    }}
                    onRemoveAdjustment={(adjustmentId) => {
                      const adjustments = (
                        selectedAppointment.priceAdjustments || []
                      ).filter((adj) => adj.id !== adjustmentId);
                      const totalAdjustments = adjustments.reduce(
                        (sum, adj) => sum + adj.amount,
                        0,
                      );
                      const newTotal =
                        (selectedAppointment.basePrice ||
                          selectedAppointment.totalPrice) + totalAdjustments;

                      setAppointmentsData((prev) =>
                        prev.map((apt) =>
                          apt.id === selectedAppointment.id
                            ? {
                                ...apt,
                                priceAdjustments: adjustments,
                                totalPrice: newTotal,
                              }
                            : apt,
                        ),
                      );
                      toast.success("Price adjustment removed");
                    }}
                    readOnly={false}
                  />
                </div>
              )}

              {/* Intake Form - Show for checked-in, in-progress, or completed appointments */}
              {selectedAppointment && (
                <div className="border-t pt-4">
                  <GroomingIntakeForm
                    appointmentId={selectedAppointment.id}
                    petName={selectedAppointment.petName}
                    initialData={selectedAppointment.intake}
                    onSave={(intake: GroomingIntake) => {
                      setAppointmentsData((prev) =>
                        prev.map((apt) =>
                          apt.id === selectedAppointment.id
                            ? { ...apt, intake }
                            : apt,
                        ),
                      );
                      toast.success("Intake form saved");
                    }}
                    readOnly={
                      selectedAppointment.status === "completed" ||
                      selectedAppointment.status === "cancelled" ||
                      selectedAppointment.status === "no-show"
                    }
                  />
                </div>
              )}
            </div>
          )}
        </Modal>
      </CardContent>
    </Card>
  );
}
