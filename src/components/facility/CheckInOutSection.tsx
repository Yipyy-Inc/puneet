"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  LogIn,
  LogOut,
  Search,
  PawPrint,
  Phone,
  Clock,
  Bed,
  Sun,
  Filter,
  AlertTriangle,
  CheckCircle,
  Eye,
  CreditCard,
  MapPin,
  Mail,
} from "lucide-react";
import { boardingGuests, BoardingGuest } from "@/data/boarding";
import { daycareCheckIns, DaycareCheckIn, daycareRates } from "@/data/daycare";
import { clients } from "@/data/clients";

// Map pet IDs to dog images
const petImages: Record<number, string> = {
  1: "/dogs/dog-1.jpg",
  2: "/dogs/dog-2.jpg",
  3: "/dogs/dog-3.jpg",
  4: "/dogs/dog-4.jpg",
  5: "/dogs/dog-1.jpg",
  6: "/dogs/dog-2.jpg",
  7: "/dogs/dog-3.jpg",
  8: "/dogs/dog-4.jpg",
};

const getPetImage = (petId: number): string | null => {
  return petImages[petId] || null;
};

type ServiceFilter = "all" | "daycare" | "boarding";

interface UnifiedCheckIn {
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  serviceType: "daycare" | "boarding";
  status: "checked-in" | "checked-out" | "scheduled";
  checkInTime: string;
  checkOutTime: string | null;
  scheduledCheckOut: string;
  notes: string;
  kennelName?: string;
  totalNights?: number;
  playGroup?: string | null;
  rateType?: string;
  petSize?: "small" | "medium" | "large" | "giant";
  price?: number;
}

function calculateDaycarePrice(rateType: string, petSize: string): number {
  const rate = daycareRates.find((r) => r.type === rateType);
  if (!rate) return 0;
  return rate.sizePricing[petSize as keyof typeof rate.sizePricing] || 0;
}

function normalizeToUnifiedCheckIn(
  boarding: BoardingGuest[],
  daycare: DaycareCheckIn[],
): UnifiedCheckIn[] {
  const boardingItems: UnifiedCheckIn[] = boarding.map((guest) => ({
    id: guest.id,
    petId: guest.petId,
    petName: guest.petName,
    petBreed: guest.petBreed,
    ownerName: guest.ownerName,
    ownerPhone: guest.ownerPhone,
    serviceType: "boarding" as const,
    status: guest.status === "cancelled" ? "checked-out" : guest.status,
    checkInTime: guest.actualCheckIn || guest.checkInDate,
    checkOutTime: guest.actualCheckOut || null,
    scheduledCheckOut: guest.checkOutDate,
    notes: guest.notes,
    kennelName: guest.kennelName,
    totalNights: guest.totalNights,
    petSize: guest.petSize,
    price: guest.totalPrice,
  }));

  const daycareItems: UnifiedCheckIn[] = daycare.map((checkIn) => ({
    id: checkIn.id,
    petId: checkIn.petId,
    petName: checkIn.petName,
    petBreed: checkIn.petBreed,
    ownerName: checkIn.ownerName,
    ownerPhone: checkIn.ownerPhone,
    serviceType: "daycare" as const,
    status: checkIn.status,
    checkInTime: checkIn.checkInTime,
    checkOutTime: checkIn.checkOutTime,
    scheduledCheckOut: checkIn.scheduledCheckOut,
    notes: checkIn.notes,
    playGroup: checkIn.playGroup,
    rateType: checkIn.rateType,
    petSize: checkIn.petSize,
    price: calculateDaycarePrice(checkIn.rateType, checkIn.petSize),
  }));

  return [...boardingItems, ...daycareItems];
}

export function CheckInOutSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [selectedItem, setSelectedItem] = useState<UnifiedCheckIn | null>(null);
  const [pickupPerson, setPickupPerson] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    null | "processing" | "succeeded" | "failed"
  >(null);

  // Modal open states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to find client for a pet
  const findClientForPet = (petId: number) => {
    return clients.find((client) =>
      client.pets.some((pet) => pet.id === petId),
    );
  };

  // Section visibility states
  const [showCheckedIn, setShowCheckedIn] = useState(true);
  const [showScheduled, setShowScheduled] = useState(true);
  const [showCheckedOut, setShowCheckedOut] = useState(true);

  // Local state for data
  const [boardingData, setBoardingData] =
    useState<BoardingGuest[]>(boardingGuests);
  const [daycareData, setDaycareData] =
    useState<DaycareCheckIn[]>(daycareCheckIns);

  const unifiedData = useMemo(
    () => normalizeToUnifiedCheckIn(boardingData, daycareData),
    [boardingData, daycareData],
  );

  // Filter by service type
  const filteredByService = useMemo(() => {
    if (serviceFilter === "all") return unifiedData;
    return unifiedData.filter((item) => item.serviceType === serviceFilter);
  }, [unifiedData, serviceFilter]);

  // Currently checked in pets
  const checkedInPets = useMemo(() => {
    return filteredByService.filter((item) => item.status === "checked-in");
  }, [filteredByService]);

  // Scheduled arrivals (not yet checked in)
  const scheduledArrivals = useMemo(() => {
    return filteredByService.filter((item) => item.status === "scheduled");
  }, [filteredByService]);

  // Checked out today
  const checkedOutToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredByService.filter((item) => {
      if (item.status !== "checked-out" || !item.checkOutTime) return false;
      const checkOutDate = new Date(item.checkOutTime);
      checkOutDate.setHours(0, 0, 0, 0);
      return checkOutDate.getTime() === today.getTime();
    });
  }, [filteredByService]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return checkedInPets.filter(
      (item) =>
        item.petName.toLowerCase().includes(query) ||
        item.ownerName.toLowerCase().includes(query) ||
        item.petBreed.toLowerCase().includes(query) ||
        item.ownerPhone.includes(query),
    );
  }, [checkedInPets, searchQuery]);

  const displayedPets = searchResults ?? checkedInPets;

  const handleCheckIn = (item: UnifiedCheckIn) => {
    setSelectedItem(item);
    setPickupPerson(item.ownerName);
    setPaymentStatus(null);
    setIsCheckInModalOpen(true);
  };

  const handleCheckOut = (item: UnifiedCheckIn) => {
    setSelectedItem(item);
    setPickupPerson(item.ownerName);
    setPaymentStatus(null);
    setIsCheckOutModalOpen(true);
  };

  const handleViewDetails = (item: UnifiedCheckIn) => {
    setSelectedItem(item);
    setPickupPerson(item.ownerName);
    setPaymentStatus(null);
    setIsDetailsModalOpen(true);
  };

  const revertToScheduled = (item: UnifiedCheckIn) => {
    if (item.serviceType === "boarding") {
      const previousData = boardingData.find((g) => g.id === item.id);
      setBoardingData((prev) =>
        prev.map((guest) => {
          if (guest.id === item.id) {
            return {
              ...guest,
              status: "scheduled" as const,
              actualCheckIn: undefined,
              actualCheckOut: undefined,
            };
          }
          return guest;
        }),
      );

      toast.success(`${item.petName} - Reverted to Scheduled`, {
        description: "Status has been reset",
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setBoardingData((prev) =>
                prev.map((guest) =>
                  guest.id === item.id ? previousData : guest,
                ),
              );
              toast.info("Action undone");
            }
          },
        },
        duration: 5000,
      });
    } else {
      const previousData = daycareData.find((c) => c.id === item.id);
      setDaycareData((prev) =>
        prev.map((checkIn) => {
          if (checkIn.id === item.id) {
            return {
              ...checkIn,
              status: "scheduled" as const,
              checkInTime: "",
              checkOutTime: null,
            };
          }
          return checkIn;
        }),
      );

      toast.success(`${item.petName} - Reverted to Scheduled`, {
        description: "Status has been reset",
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setDaycareData((prev) =>
                prev.map((checkIn) =>
                  checkIn.id === item.id ? previousData : checkIn,
                ),
              );
              toast.info("Action undone");
            }
          },
        },
        duration: 5000,
      });
    }

    setIsDetailsModalOpen(false);
    setSelectedItem(null);
  };

  const revertToCheckedIn = (item: UnifiedCheckIn) => {
    if (item.serviceType === "boarding") {
      const previousData = boardingData.find((g) => g.id === item.id);
      setBoardingData((prev) =>
        prev.map((guest) => {
          if (guest.id === item.id) {
            return {
              ...guest,
              status: "checked-in" as const,
              actualCheckOut: undefined,
            };
          }
          return guest;
        }),
      );

      toast.success(`${item.petName} - Reverted to Checked In`, {
        description: "Status has been reset",
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setBoardingData((prev) =>
                prev.map((guest) =>
                  guest.id === item.id ? previousData : guest,
                ),
              );
              toast.info("Action undone");
            }
          },
        },
        duration: 5000,
      });
    } else {
      const previousData = daycareData.find((c) => c.id === item.id);
      setDaycareData((prev) =>
        prev.map((checkIn) => {
          if (checkIn.id === item.id) {
            return {
              ...checkIn,
              status: "checked-in" as const,
              checkOutTime: null,
            };
          }
          return checkIn;
        }),
      );

      toast.success(`${item.petName} - Reverted to Checked In`, {
        description: "Status has been reset",
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setDaycareData((prev) =>
                prev.map((checkIn) =>
                  checkIn.id === item.id ? previousData : checkIn,
                ),
              );
              toast.info("Action undone");
            }
          },
        },
        duration: 5000,
      });
    }

    setIsDetailsModalOpen(false);
    setSelectedItem(null);
  };

  const confirmCheckIn = () => {
    if (!selectedItem) return;

    const now = new Date().toISOString();
    const previousStatus = selectedItem.status;
    const actionLabel = "Checked In";
    const newStatus = "checked-in";

    if (selectedItem.serviceType === "boarding") {
      const previousData = boardingData.find((g) => g.id === selectedItem.id);
      setBoardingData((prev) =>
        prev.map((guest) => {
          if (guest.id === selectedItem.id) {
            return {
              ...guest,
              status: "checked-in" as const,
              actualCheckIn: now,
            };
          }
          return guest;
        }),
      );

      // Show toast with undo
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      toast.success(`${selectedItem.petName} - ${actionLabel}`, {
        description: `Boarding ${newStatus.replace("-", " ")}`,
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setBoardingData((prev) =>
                prev.map((guest) =>
                  guest.id === selectedItem.id ? previousData : guest,
                ),
              );
              toast.info("Action undone", {
                description: `${selectedItem.petName} restored to ${previousStatus.replace("-", " ")}`,
              });
            }
          },
        },
        duration: 5000,
      });
    } else {
      const previousData = daycareData.find((c) => c.id === selectedItem.id);
      setDaycareData((prev) =>
        prev.map((checkIn) => {
          if (checkIn.id === selectedItem.id) {
            return {
              ...checkIn,
              status: "checked-in" as const,
              checkInTime: now,
            };
          }
          return checkIn;
        }),
      );

      // Show toast with undo
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      toast.success(`${selectedItem.petName} - ${actionLabel}`, {
        description: `Daycare ${newStatus.replace("-", " ")}`,
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setDaycareData((prev) =>
                prev.map((checkIn) =>
                  checkIn.id === selectedItem.id ? previousData : checkIn,
                ),
              );
              toast.info("Action undone", {
                description: `${selectedItem.petName} restored to ${previousStatus.replace("-", " ")}`,
              });
            }
          },
        },
        duration: 5000,
      });
    }

    setIsCheckInModalOpen(false);
    setSelectedItem(null);
  };

  const confirmCheckOut = () => {
    if (!selectedItem) return;

    const now = new Date().toISOString();
    const previousStatus = selectedItem.status;
    const actionLabel = "Checked Out";
    const newStatus = "checked-out";

    if (selectedItem.serviceType === "boarding") {
      const previousData = boardingData.find((g) => g.id === selectedItem.id);
      setBoardingData((prev) =>
        prev.map((guest) => {
          if (guest.id === selectedItem.id) {
            return {
              ...guest,
              status: "checked-out" as const,
              actualCheckOut: now,
            };
          }
          return guest;
        }),
      );

      // Show toast with undo
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      toast.success(`${selectedItem.petName} - ${actionLabel}`, {
        description: `Boarding ${newStatus.replace("-", " ")}`,
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setBoardingData((prev) =>
                prev.map((guest) =>
                  guest.id === selectedItem.id ? previousData : guest,
                ),
              );
              toast.info("Action undone", {
                description: `${selectedItem.petName} restored to ${previousStatus.replace("-", " ")}`,
              });
            }
          },
        },
        duration: 5000,
      });
    } else {
      const previousData = daycareData.find((c) => c.id === selectedItem.id);
      setDaycareData((prev) =>
        prev.map((checkIn) => {
          if (checkIn.id === selectedItem.id) {
            return {
              ...checkIn,
              status: "checked-out" as const,
              checkOutTime: now,
            };
          }
          return checkIn;
        }),
      );

      // Show toast with undo
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      toast.success(`${selectedItem.petName} - ${actionLabel}`, {
        description: `Daycare ${newStatus.replace("-", " ")}`,
        action: {
          label: "Undo",
          onClick: () => {
            if (previousData) {
              setDaycareData((prev) =>
                prev.map((checkIn) =>
                  checkIn.id === selectedItem.id ? previousData : checkIn,
                ),
              );
              toast.info("Action undone", {
                description: `${selectedItem.petName} restored to ${previousStatus.replace("-", " ")}`,
              });
            }
          },
        },
        duration: 5000,
      });
    }

    setPaymentStatus("processing");
  };

  useEffect(() => {
    if (paymentStatus === "processing") {
      const timer = setTimeout(() => {
        setPaymentStatus("succeeded");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  const closeCheckOutModal = () => {
    setIsCheckOutModalOpen(false);
    setSelectedItem(null);
    setPickupPerson("");
    setPaymentStatus(null);
  };

  const closeCheckInModal = () => {
    setIsCheckInModalOpen(false);
    setSelectedItem(null);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedItem(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatExpectedDeparture = (
    dateStr: string,
    serviceType: "daycare" | "boarding",
  ) => {
    const date = new Date(dateStr);
    if (serviceType === "daycare") {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getServiceBadge = (serviceType: "daycare" | "boarding") => {
    if (serviceType === "daycare") {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Sun className="h-3 w-3 mr-1" />
          Daycare
        </Badge>
      );
    }
    return (
      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
        <Bed className="h-3 w-3 mr-1" />
        Boarding
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Header with Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Daycare & Boarding</h3>
          </div>

          <div className="flex flex-col items-start gap-3">
            {/* Service Filter Buttons */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex rounded-lg border p-1">
                <Button
                  size="sm"
                  variant={serviceFilter === "all" ? "default" : "ghost"}
                  onClick={() => setServiceFilter("all")}
                  className="h-7 px-3"
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={serviceFilter === "daycare" ? "default" : "ghost"}
                  onClick={() => setServiceFilter("daycare")}
                  className="h-7 px-3"
                >
                  <Sun className="h-3 w-3 mr-1" />
                  Daycare
                </Button>
                <Button
                  size="sm"
                  variant={serviceFilter === "boarding" ? "default" : "ghost"}
                  onClick={() => setServiceFilter("boarding")}
                  className="h-7 px-3"
                >
                  <Bed className="h-3 w-3 mr-1" />
                  Boarding
                </Button>
              </div>
            </div>

            {/* Section Visibility Toggle */}
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div className="flex rounded-lg border p-1 gap-1">
                <Button
                  size="sm"
                  variant={showCheckedIn ? "default" : "ghost"}
                  onClick={() => setShowCheckedIn(!showCheckedIn)}
                  className="h-7 px-3"
                >
                  Checked In
                </Button>
                <Button
                  size="sm"
                  variant={showScheduled ? "default" : "ghost"}
                  onClick={() => setShowScheduled(!showScheduled)}
                  className="h-7 px-3"
                >
                  Scheduled
                </Button>
                <Button
                  size="sm"
                  variant={showCheckedOut ? "default" : "ghost"}
                  onClick={() => setShowCheckedOut(!showCheckedOut)}
                  className="h-7 px-3"
                >
                  Checked Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by pet name, owner, breed, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div
          className={`grid gap-4 ${
            [showCheckedIn, showScheduled, showCheckedOut].filter(Boolean)
              .length === 1
              ? "lg:grid-cols-1"
              : [showCheckedIn, showScheduled, showCheckedOut].filter(Boolean)
                    .length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-3"
          }`}
        >
          {/* Scheduled Arrivals */}
          {showScheduled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Scheduled Arrivals
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{scheduledArrivals.length}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {
                      scheduledArrivals.filter(
                        (p) => p.serviceType === "boarding",
                      ).length
                    }{" "}
                    boarding,{" "}
                    {
                      scheduledArrivals.filter(
                        (p) => p.serviceType === "daycare",
                      ).length
                    }{" "}
                    daycare
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {scheduledArrivals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No arrivals scheduled
                  </p>
                ) : (
                  scheduledArrivals.map((item) => {
                    const client = findClientForPet(item.petId);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getPetImage(item.petId) ? (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="h-10 w-10 rounded-full overflow-hidden">
                                <Image
                                  src={getPetImage(item.petId)!}
                                  alt={item.petName}
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
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                                <PawPrint className="h-5 w-5 text-orange-600" />
                              </div>
                            </Link>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                    : "#"
                                }
                                className="font-medium truncate hover:underline"
                              >
                                {item.petName}
                              </Link>
                              {getServiceBadge(item.serviceType)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {item.ownerName} • {item.petBreed}
                            </p>
                            {item.serviceType === "boarding" &&
                              item.totalNights && (
                                <p className="text-xs text-muted-foreground">
                                  {item.totalNights} night
                                  {item.totalNights > 1 ? "s" : ""}
                                </p>
                              )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(item);
                          }}
                          className="shrink-0 gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <LogIn className="h-3 w-3" />
                          Check In
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* Currently Checked In */}
          {showCheckedIn && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LogIn className="h-4 w-4 text-green-600" />
                  Currently Checked In
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{displayedPets.length}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {
                      displayedPets.filter((p) => p.serviceType === "boarding")
                        .length
                    }{" "}
                    boarding,{" "}
                    {
                      displayedPets.filter((p) => p.serviceType === "daycare")
                        .length
                    }{" "}
                    daycare
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {displayedPets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery
                      ? "No pets match your search"
                      : "No pets currently checked in"}
                  </p>
                ) : (
                  displayedPets.map((item) => {
                    const client = findClientForPet(item.petId);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getPetImage(item.petId) ? (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="h-10 w-10 rounded-full overflow-hidden">
                                <Image
                                  src={getPetImage(item.petId)!}
                                  alt={item.petName}
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
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <PawPrint className="h-5 w-5 text-primary" />
                              </div>
                            </Link>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                    : "#"
                                }
                                className="font-medium truncate hover:underline"
                              >
                                {item.petName}
                              </Link>
                              {getServiceBadge(item.serviceType)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {item.ownerName} • {item.petBreed}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <Clock className="h-3 w-3" />
                              <span>In: {formatTime(item.checkInTime)}</span>
                              <span>•</span>
                              <span>
                                Out:{" "}
                                {formatExpectedDeparture(
                                  item.scheduledCheckOut,
                                  item.serviceType,
                                )}
                              </span>
                              {item.serviceType === "boarding" &&
                                item.kennelName && (
                                  <>
                                    <span>•</span>
                                    <span>{item.kennelName}</span>
                                  </>
                                )}
                              {item.serviceType === "daycare" &&
                                item.playGroup && (
                                  <>
                                    <span>•</span>
                                    <span>{item.playGroup}</span>
                                  </>
                                )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckOut(item);
                            }}
                            className="gap-1"
                          >
                            <LogOut className="h-3 w-3" />
                            Check Out
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* Checked Out Today */}
          {showCheckedOut && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  Checked Out Today
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{checkedOutToday.length}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {
                      checkedOutToday.filter(
                        (p) => p.serviceType === "boarding",
                      ).length
                    }{" "}
                    boarding,{" "}
                    {
                      checkedOutToday.filter((p) => p.serviceType === "daycare")
                        .length
                    }{" "}
                    daycare
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {checkedOutToday.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No checkouts today
                  </p>
                ) : (
                  checkedOutToday.map((item) => {
                    const client = findClientForPet(item.petId);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-950/20 hover:bg-gray-100/50 dark:hover:bg-gray-950/30 transition-colors cursor-pointer"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getPetImage(item.petId) ? (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="h-10 w-10 rounded-full overflow-hidden">
                                <Image
                                  src={getPetImage(item.petId)!}
                                  alt={item.petName}
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
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                <PawPrint className="h-5 w-5 text-gray-600" />
                              </div>
                            </Link>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                    : "#"
                                }
                                className="font-medium truncate hover:underline"
                              >
                                {item.petName}
                              </Link>
                              {getServiceBadge(item.serviceType)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {item.ownerName} • {item.petBreed}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              <span>
                                Out:{" "}
                                {item.checkOutTime
                                  ? formatTime(item.checkOutTime)
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Check-In Modal */}
        <Modal
          open={isCheckInModalOpen}
          onOpenChange={closeCheckInModal}
          type="details"
          title="Check In"
          description="Confirm check-in for this pet"
          icon={<LogIn className="h-5 w-5 text-green-600" />}
          size="xl"
        >
          {selectedItem && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Pet Information</h4>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                      {(() => {
                        const client = findClientForPet(selectedItem.petId);
                        return getPetImage(selectedItem.petId) ? (
                          <Link
                            href={
                              client
                                ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                : "#"
                            }
                          >
                            <div className="h-12 w-12 rounded-full overflow-hidden">
                              <Image
                                src={getPetImage(selectedItem.petId)!}
                                alt={selectedItem.petName}
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
                                ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
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
                            const client = findClientForPet(selectedItem.petId);
                            return (
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                    : "#"
                                }
                                className="font-semibold text-lg hover:underline"
                              >
                                {selectedItem.petName}
                              </Link>
                            );
                          })()}
                          {getServiceBadge(selectedItem.serviceType)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Breed: {selectedItem.petBreed}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedItem.serviceType === "boarding"
                            ? `Kennel: ${selectedItem.kennelName}`
                            : `Play Group: ${selectedItem.playGroup || "Not assigned"}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Owner: {selectedItem.ownerName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Owner Information</h4>
                    {(() => {
                      const client = findClientForPet(selectedItem.petId);
                      return client ? (
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                          <div className="h-12 w-12 rounded-full overflow-hidden">
                            <Image
                              src="/people/person-2.jpg"
                              alt={client.name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {client.name}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {client.address
                                ? `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Client information not available
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Booking Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium capitalize">
                        {selectedItem.serviceType}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedItem.checkInTime,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-out Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedItem.scheduledCheckOut,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Price</p>
                      <p className="font-medium">
                        ${selectedItem.price?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeCheckInModal}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmCheckIn}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Check In
                </Button>
              </div>
            </>
          )}
        </Modal>

        {/* Check-Out Modal */}
        <Modal
          open={isCheckOutModalOpen}
          onOpenChange={closeCheckOutModal}
          type="details"
          title="Check Out"
          description="Confirm check-out for this pet"
          icon={<LogOut className="h-5 w-5 text-orange-600" />}
          size="xl"
        >
          {selectedItem && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Pet Information</h4>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                      {(() => {
                        const client = findClientForPet(selectedItem.petId);
                        return getPetImage(selectedItem.petId) ? (
                          <Link
                            href={
                              client
                                ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                : "#"
                            }
                          >
                            <div className="h-12 w-12 rounded-full overflow-hidden">
                              <Image
                                src={getPetImage(selectedItem.petId)!}
                                alt={selectedItem.petName}
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
                                ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
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
                            const client = findClientForPet(selectedItem.petId);
                            return (
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                    : "#"
                                }
                                className="font-semibold text-lg hover:underline"
                              >
                                {selectedItem.petName}
                              </Link>
                            );
                          })()}
                          {getServiceBadge(selectedItem.serviceType)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Breed: {selectedItem.petBreed}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedItem.serviceType === "boarding"
                            ? `Kennel: ${selectedItem.kennelName}`
                            : `Play Group: ${selectedItem.playGroup || "Not assigned"}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Owner: {selectedItem.ownerName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Owner Information</h4>
                    {(() => {
                      const client = findClientForPet(selectedItem.petId);
                      return client ? (
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                          <div className="h-12 w-12 rounded-full overflow-hidden">
                            <Image
                              src="/people/person-2.jpg"
                              alt={client.name}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {client.name}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.phone}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {client.address
                                ? `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Client information not available
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Pickup Information</h4>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      Pickup by: {pickupPerson || selectedItem.ownerName}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Booking Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium capitalize">
                        {selectedItem.serviceType}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedItem.checkInTime,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-out Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedItem.scheduledCheckOut,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Price</p>
                      <p className="font-medium">
                        ${selectedItem.price?.toFixed(2) || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {paymentStatus && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Payment Status</h4>
                    <div className="p-4 rounded-lg bg-muted/50">
                      {paymentStatus === "processing" && (
                        <p className="text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4 animate-pulse" />
                          Processing payment...
                        </p>
                      )}
                      {paymentStatus === "succeeded" && (
                        <p className="text-sm flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Payment succeeded
                        </p>
                      )}
                      {paymentStatus === "failed" && (
                        <p className="text-sm flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Payment failed: Insufficient funds
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                {paymentStatus === null && (
                  <Button variant="outline" onClick={closeCheckOutModal}>
                    Cancel
                  </Button>
                )}
                {paymentStatus === null && (
                  <Button
                    onClick={confirmCheckOut}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Confirm Check Out
                  </Button>
                )}
                {paymentStatus === "succeeded" && (
                  <Button onClick={closeCheckOutModal}>Close</Button>
                )}
              </div>
            </>
          )}
        </Modal>

        {/* Details Modal */}
        <Modal
          open={isDetailsModalOpen}
          onOpenChange={closeDetailsModal}
          type="details"
          title="Pet Details"
          description="View details for this pet"
          icon={<CheckCircle className="h-5 w-5 text-gray-600" />}
          size="xl"
        >
          {selectedItem && (
            <>
              <div className="space-y-4">
                {selectedItem.status === "checked-out" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">
                          Pet Information
                        </h4>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                          {(() => {
                            const client = findClientForPet(selectedItem.petId);
                            return getPetImage(selectedItem.petId) ? (
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                    : "#"
                                }
                              >
                                <div className="h-12 w-12 rounded-full overflow-hidden">
                                  <Image
                                    src={getPetImage(selectedItem.petId)!}
                                    alt={selectedItem.petName}
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
                                    ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
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
                                  selectedItem.petId,
                                );
                                return (
                                  <Link
                                    href={
                                      client
                                        ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                        : "#"
                                    }
                                    className="font-semibold text-lg hover:underline"
                                  >
                                    {selectedItem.petName}
                                  </Link>
                                );
                              })()}
                              {getServiceBadge(selectedItem.serviceType)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Breed: {selectedItem.petBreed}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedItem.serviceType === "boarding"
                                ? `Kennel: ${selectedItem.kennelName}`
                                : `Play Group: ${selectedItem.playGroup || "Not assigned"}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Owner: {selectedItem.ownerName}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">
                          Owner Information
                        </h4>
                        {(() => {
                          const client = findClientForPet(selectedItem.petId);
                          return client ? (
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                              <div className="h-12 w-12 rounded-full overflow-hidden">
                                <Image
                                  src="/people/person-2.jpg"
                                  alt={client.name}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-semibold text-lg">
                                  {client.name}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {client.phone}
                                </p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {client.address
                                    ? `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Client information not available
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">
                        Pickup Information
                      </h4>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm">
                          Pickup by: {pickupPerson || selectedItem.ownerName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Booking Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-muted-foreground">Service</p>
                          <p className="font-medium capitalize">
                            {selectedItem.serviceType}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Check-in Date</p>
                          <p className="font-medium">
                            {new Date(
                              selectedItem.checkInTime,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Check-out Date
                          </p>
                          <p className="font-medium">
                            {new Date(
                              selectedItem.scheduledCheckOut,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Price</p>
                          <p className="font-medium">
                            ${selectedItem.price?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Payment Status</h4>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Payment succeeded
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                    {(() => {
                      const client = findClientForPet(selectedItem.petId);
                      return getPetImage(selectedItem.petId) ? (
                        <Link
                          href={
                            client
                              ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                              : "#"
                          }
                        >
                          <div className="h-12 w-12 rounded-full overflow-hidden">
                            <Image
                              src={getPetImage(selectedItem.petId)!}
                              alt={selectedItem.petName}
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
                              ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
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
                          const client = findClientForPet(selectedItem.petId);
                          return (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                  : "#"
                              }
                              className="font-semibold text-lg hover:underline"
                            >
                              {selectedItem.petName}
                            </Link>
                          );
                        })()}
                        {getServiceBadge(selectedItem.serviceType)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Owner: {selectedItem.ownerName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between w-full gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Link href="/facility/dashboard/bookings">
                    <Button variant="outline">Booking Details</Button>
                  </Link>
                  {selectedItem.status === "checked-in" && (
                    <Button
                      variant="outline"
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      onClick={() => revertToScheduled(selectedItem)}
                    >
                      Revert to Scheduled
                    </Button>
                  )}
                  {selectedItem.status === "checked-out" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={() => revertToScheduled(selectedItem)}
                      >
                        Revert to Scheduled
                      </Button>
                      <Button
                        variant="outline"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={() => revertToCheckedIn(selectedItem)}
                      >
                        Revert to Checked In
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={closeDetailsModal}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </Modal>
      </CardContent>
    </Card>
  );
}
