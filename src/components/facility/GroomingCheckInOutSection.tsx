"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import {
  PawPrint,
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Phone,
  Scissors,
  Eye,
  Search,
  User,
} from "lucide-react";
import {
  groomingAppointments,
  GroomingAppointment,
  GroomingStatus,
} from "@/data/grooming";
import { clients } from "@/data/clients";

interface UnifiedGroomingAppointment {
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  stylistName: string;
  packageName: string;
  status: GroomingStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  startTime: string;
  endTime: string;
  date: string;
  totalPrice: number;
  specialInstructions: string;
  allergies: string[];
  petPhotoUrl?: string;
}

function normalizeToUnified(
  appointments: GroomingAppointment[],
): UnifiedGroomingAppointment[] {
  return appointments.map((apt) => ({
    id: apt.id,
    petId: apt.petId,
    petName: apt.petName,
    petBreed: apt.petBreed,
    ownerName: apt.ownerName,
    ownerPhone: apt.ownerPhone,
    stylistName: apt.stylistName,
    packageName: apt.packageName,
    status: apt.status,
    checkInTime: apt.checkInTime,
    checkOutTime: apt.checkOutTime,
    startTime: apt.startTime,
    endTime: apt.endTime,
    date: apt.date,
    totalPrice: apt.totalPrice,
    specialInstructions: apt.specialInstructions,
    allergies: apt.allergies,
    petPhotoUrl: apt.petPhotoUrl,
  }));
}

const petImages: Record<number, string> = {
  1: "/api/placeholder/40/40",
  13: "/api/placeholder/40/40",
  14: "/api/placeholder/40/40",
  5: "/api/placeholder/40/40",
};

const getPetImage = (petId: number) => petImages[petId] || "/api/placeholder/40/40";

export function GroomingCheckInOutSection() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInOutMode, setCheckInOutMode] = useState<
    "check-in" | "check-out" | "view" | null
  >(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<UnifiedGroomingAppointment | null>(null);
  const [handlerName, setHandlerName] = useState("");

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Section visibility states
  const [showCheckedIn, setShowCheckedIn] = useState(true);
  const [showScheduled, setShowScheduled] = useState(true);
  const [showReadyForPickup, setShowReadyForPickup] = useState(true);
  const [showCheckedOut, setShowCheckedOut] = useState(true);

  // Local state for data
  const [appointmentsData, setAppointmentsData] = useState<GroomingAppointment[]>(
    groomingAppointments,
  );

  const unifiedData = useMemo(
    () => normalizeToUnified(appointmentsData),
    [appointmentsData],
  );

  // Get today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return unifiedData.filter((apt) => apt.date === today);
  }, [unifiedData]);

  // Currently checked in pets (checked-in or in-progress)
  const checkedInPets = useMemo(() => {
    return todayAppointments.filter(
      (apt) => apt.status === "checked-in" || apt.status === "in-progress",
    );
  }, [todayAppointments]);

  // Scheduled arrivals (not yet checked in)
  const scheduledArrivals = useMemo(() => {
    return todayAppointments.filter((apt) => apt.status === "scheduled");
  }, [todayAppointments]);

  // Ready for pickup
  const readyForPickup = useMemo(() => {
    return todayAppointments.filter((apt) => apt.status === "ready-for-pickup");
  }, [todayAppointments]);

  // Checked out today
  const checkedOutToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return todayAppointments.filter((apt) => {
      if (apt.status !== "completed" || !apt.checkOutTime) return false;
      const checkOutDate = new Date(apt.checkOutTime);
      checkOutDate.setHours(0, 0, 0, 0);
      return checkOutDate.getTime() === today.getTime();
    });
  }, [todayAppointments]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const allToday = [
      ...scheduledArrivals,
      ...checkedInPets,
      ...readyForPickup,
      ...checkedOutToday,
    ];
    return allToday.filter(
      (apt) =>
        apt.petName.toLowerCase().includes(query) ||
        apt.ownerName.toLowerCase().includes(query) ||
        apt.petBreed.toLowerCase().includes(query) ||
        apt.ownerPhone.includes(query) ||
        apt.stylistName.toLowerCase().includes(query),
    );
  }, [searchQuery, scheduledArrivals, checkedInPets, readyForPickup, checkedOutToday]);

  const handleCheckIn = (apt: UnifiedGroomingAppointment) => {
    setSelectedAppointment(apt);
    setHandlerName(apt.ownerName);
    setCheckInOutMode("check-in");
  };

  const handleCheckOut = (apt: UnifiedGroomingAppointment) => {
    setSelectedAppointment(apt);
    setHandlerName(apt.ownerName);
    setCheckInOutMode("check-out");
  };

  const handleViewDetails = (apt: UnifiedGroomingAppointment) => {
    setSelectedAppointment(apt);
    setCheckInOutMode("view");
  };

  const confirmCheckInOut = () => {
    if (!selectedAppointment) return;

    const now = new Date().toISOString();
    const previousStatus = selectedAppointment.status;
    const previousData = appointmentsData.find((a) => a.id === selectedAppointment.id);

    if (!previousData) return;

    if (checkInOutMode === "check-in") {
      // Check-in: scheduled -> checked-in
      setAppointmentsData((prev) =>
        prev.map((apt) => {
          if (apt.id === selectedAppointment.id) {
            return {
              ...apt,
              status: "checked-in" as const,
              checkInTime: now,
            };
          }
          return apt;
        }),
      );

      toast.success(`${selectedAppointment.petName} - Checked In`, {
        description: "Grooming appointment checked in",
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setAppointmentsData((prev) =>
                prev.map((apt) => (apt.id === selectedAppointment.id ? previousData : apt)),
              );
              toast.info("Action undone");
            }
          },
        },
        duration: 5000,
      });
    } else if (checkInOutMode === "check-out") {
      // Check-out: ready-for-pickup -> completed
      setAppointmentsData((prev) =>
        prev.map((apt) => {
          if (apt.id === selectedAppointment.id) {
            return {
              ...apt,
              status: "completed" as const,
              checkOutTime: now,
            };
          }
          return apt;
        }),
      );

      toast.success(`${selectedAppointment.petName} - Checked Out`, {
        description: "Grooming appointment completed",
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setAppointmentsData((prev) =>
                prev.map((apt) => (apt.id === selectedAppointment.id ? previousData : apt)),
              );
              toast.info("Action undone");
            }
          },
        },
        duration: 5000,
      });
    }

    setCheckInOutMode(null);
    setSelectedAppointment(null);
    setHandlerName("");
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: GroomingStatus) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "checked-in":
        return <Badge className="bg-blue-500">Checked In</Badge>;
      case "in-progress":
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case "ready-for-pickup":
        return <Badge className="bg-green-500">Ready for Pickup</Badge>;
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "no-show":
        return <Badge variant="destructive">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isMounted) {
    return null;
  }

  const displayedScheduled = searchResults
    ? searchResults.filter((apt) => apt.status === "scheduled")
    : scheduledArrivals;
  const displayedCheckedIn = searchResults
    ? searchResults.filter(
        (apt) => apt.status === "checked-in" || apt.status === "in-progress",
      )
    : checkedInPets;
  const displayedReady = searchResults
    ? searchResults.filter((apt) => apt.status === "ready-for-pickup")
    : readyForPickup;
  const displayedCheckedOut = searchResults
    ? searchResults.filter((apt) => apt.status === "completed")
    : checkedOutToday;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Grooming Check-In / Check-Out</h2>
        <p className="text-muted-foreground">
          Manage grooming appointments check-in and check-out
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pet name, owner, phone, or stylist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filter Toggles */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={showScheduled ? "default" : "outline"}
          size="sm"
          onClick={() => setShowScheduled(!showScheduled)}
        >
          Scheduled ({scheduledArrivals.length})
        </Button>
        <Button
          variant={showCheckedIn ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCheckedIn(!showCheckedIn)}
        >
          Checked In ({checkedInPets.length})
        </Button>
        <Button
          variant={showReadyForPickup ? "default" : "outline"}
          size="sm"
          onClick={() => setShowReadyForPickup(!showReadyForPickup)}
        >
          Ready ({readyForPickup.length})
        </Button>
        <Button
          variant={showCheckedOut ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCheckedOut(!showCheckedOut)}
        >
          Checked Out ({checkedOutToday.length})
        </Button>
      </div>

      {/* Scheduled Arrivals */}
      {showScheduled && displayedScheduled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Arrivals ({displayedScheduled.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedScheduled.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                      {apt.petPhotoUrl ? (
                        <Image
                          src={apt.petPhotoUrl}
                          alt={apt.petName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apt.petName}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({apt.petBreed})
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.ownerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {apt.ownerPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Scissors className="h-3 w-3" />
                            {apt.stylistName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.startTime} - {apt.endTime}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {apt.packageName}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(apt.status)}
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(apt)}
                      className="gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Check In
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(apt)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checked In / In Progress */}
      {showCheckedIn && displayedCheckedIn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Checked In / In Progress ({displayedCheckedIn.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedCheckedIn.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                      {apt.petPhotoUrl ? (
                        <Image
                          src={apt.petPhotoUrl}
                          alt={apt.petName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apt.petName}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({apt.petBreed})
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.ownerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Scissors className="h-3 w-3" />
                            {apt.stylistName}
                          </span>
                          {apt.checkInTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Checked in: {formatTime(apt.checkInTime)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {apt.packageName}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(apt.status)}
                    {apt.status === "checked-in" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Move to in-progress
                          setAppointmentsData((prev) =>
                            prev.map((a) =>
                              a.id === apt.id
                                ? { ...a, status: "in-progress" as const }
                                : a,
                            ),
                          );
                          toast.success(`${apt.petName} - Grooming started`);
                        }}
                      >
                        Start Grooming
                      </Button>
                    )}
                    {apt.status === "in-progress" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Move to ready-for-pickup
                          setAppointmentsData((prev) =>
                            prev.map((a) =>
                              a.id === apt.id
                                ? { ...a, status: "ready-for-pickup" as const }
                                : a,
                            ),
                          );
                          toast.success(`${apt.petName} - Ready for pickup`);
                        }}
                      >
                        Mark Ready
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(apt)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready for Pickup */}
      {showReadyForPickup && displayedReady.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Ready for Pickup ({displayedReady.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedReady.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                      {apt.petPhotoUrl ? (
                        <Image
                          src={apt.petPhotoUrl}
                          alt={apt.petName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apt.petName}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({apt.petBreed})
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.ownerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {apt.ownerPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Scissors className="h-3 w-3" />
                            {apt.stylistName}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {apt.packageName}
                          </Badge>
                          <span className="ml-2 text-xs font-medium">
                            ${apt.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(apt.status)}
                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(apt)}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Check Out
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(apt)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checked Out Today */}
      {showCheckedOut && displayedCheckedOut.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Checked Out Today ({displayedCheckedOut.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedCheckedOut.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                      {apt.petPhotoUrl ? (
                        <Image
                          src={apt.petPhotoUrl}
                          alt={apt.petName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{apt.petName}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({apt.petBreed})
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.ownerName}
                          </span>
                          {apt.checkOutTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Checked out: {formatTime(apt.checkOutTime)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {apt.packageName}
                          </Badge>
                          <span className="ml-2 text-xs font-medium">
                            ${apt.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(apt.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(apt)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-In/Check-Out Modal */}
      <Dialog
        open={checkInOutMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCheckInOutMode(null);
            setSelectedAppointment(null);
            setHandlerName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {checkInOutMode === "check-in"
                ? "Check In Appointment"
                : checkInOutMode === "check-out"
                  ? "Check Out Appointment"
                  : "Appointment Details"}
            </DialogTitle>
            <DialogDescription>
              {checkInOutMode === "check-in"
                ? "Confirm check-in for this grooming appointment"
                : checkInOutMode === "check-out"
                  ? "Confirm check-out and complete this appointment"
                  : "View appointment details"}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted">
                  {selectedAppointment.petPhotoUrl ? (
                    <Image
                      src={selectedAppointment.petPhotoUrl}
                      alt={selectedAppointment.petName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PawPrint className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedAppointment.petName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.petBreed}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Owner:</span>
                  <p className="font-medium">{selectedAppointment.ownerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{selectedAppointment.ownerPhone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stylist:</span>
                  <p className="font-medium">{selectedAppointment.stylistName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Package:</span>
                  <p className="font-medium">{selectedAppointment.packageName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <p className="font-medium">
                    {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">${selectedAppointment.totalPrice.toFixed(2)}</p>
                </div>
              </div>
              {selectedAppointment.specialInstructions && (
                <div>
                  <span className="text-sm text-muted-foreground">Special Instructions:</span>
                  <p className="text-sm mt-1">{selectedAppointment.specialInstructions}</p>
                </div>
              )}
              {selectedAppointment.allergies.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Allergies:</span>
                  <div className="flex gap-2 mt-1">
                    {selectedAppointment.allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {checkInOutMode === "check-in" && (
                <div>
                  <label className="text-sm font-medium">Handler Name</label>
                  <Input
                    value={handlerName}
                    onChange={(e) => setHandlerName(e.target.value)}
                    placeholder="Person dropping off the pet"
                    className="mt-1"
                  />
                </div>
              )}
              {checkInOutMode === "check-out" && (
                <div>
                  <label className="text-sm font-medium">Handler Name</label>
                  <Input
                    value={handlerName}
                    onChange={(e) => setHandlerName(e.target.value)}
                    placeholder="Person picking up the pet"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCheckInOutMode(null);
                setSelectedAppointment(null);
                setHandlerName("");
              }}
            >
              Cancel
            </Button>
            {(checkInOutMode === "check-in" || checkInOutMode === "check-out") && (
              <Button onClick={confirmCheckInOut}>
                {checkInOutMode === "check-in" ? "Check In" : "Check Out"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
