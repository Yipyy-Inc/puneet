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
  Sun,
  Eye,
  Search,
} from "lucide-react";
import { daycareCheckIns, DaycareCheckIn } from "@/data/daycare";
import { clients } from "@/data/clients";

interface UnifiedCheckIn {
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  serviceType: "daycare";
  status: "scheduled" | "checked-in" | "checked-out";
  checkInTime: string;
  checkOutTime: string | null;
  scheduledCheckOut: string;
  notes: string;
  playGroup?: string | null;
  rateType?: string;
}

function normalizeToUnifiedCheckIn(
  daycareData: DaycareCheckIn[],
): UnifiedCheckIn[] {
  const daycareItems: UnifiedCheckIn[] = daycareData.map((item) => ({
    id: item.id,
    petId: item.petId,
    petName: item.petName,
    petBreed: item.petBreed,
    ownerName: item.ownerName,
    ownerPhone: item.ownerPhone,
    serviceType: "daycare" as const,
    status: item.status,
    checkInTime: item.checkInTime,
    checkOutTime: item.checkOutTime,
    scheduledCheckOut: item.scheduledCheckOut,
    notes: item.notes,
    playGroup: item.playGroup,
    rateType: item.rateType,
  }));

  return daycareItems;
}

const petImages: Record<number, string> = {
  1: "/api/placeholder/40/40",
  2: "/api/placeholder/40/40",
  3: "/api/placeholder/40/40",
  4: "/api/placeholder/40/40",
  5: "/api/placeholder/40/40",
  6: "/api/placeholder/40/40",
  7: "/api/placeholder/40/40",
  8: "/api/placeholder/40/40",
};

const getPetImage = (petId: number) => petImages[petId];

export function DaycareCheckInOutSection() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInOutMode, setCheckInOutMode] = useState<
    "check-in" | "check-out" | "view" | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedCheckIn | null>(null);

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [daycareData, setDaycareData] =
    useState<DaycareCheckIn[]>(daycareCheckIns);

  const unifiedData = useMemo(
    () => normalizeToUnifiedCheckIn(daycareData),
    [daycareData],
  );

  // Currently checked in pets
  const checkedInPets = useMemo(() => {
    return unifiedData.filter((item) => item.status === "checked-in");
  }, [unifiedData]);

  // Scheduled arrivals (not yet checked in)
  const scheduledArrivals = useMemo(() => {
    return unifiedData.filter((item) => item.status === "scheduled");
  }, [unifiedData]);

  // Checked out today
  const checkedOutToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return unifiedData.filter((item) => {
      if (item.status !== "checked-out" || !item.checkOutTime) return false;
      const checkOutDate = new Date(item.checkOutTime);
      checkOutDate.setHours(0, 0, 0, 0);
      return checkOutDate.getTime() === today.getTime();
    });
  }, [unifiedData]);

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
    setCheckInOutMode("check-in");
  };

  const handleCheckOut = (item: UnifiedCheckIn) => {
    setSelectedItem(item);
    setCheckInOutMode("check-out");
  };

  const handleViewDetails = (item: UnifiedCheckIn) => {
    setSelectedItem(item);
    setCheckInOutMode("view");
  };

  const revertToScheduled = (item: UnifiedCheckIn) => {
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

    setCheckInOutMode(null);
    setSelectedItem(null);
  };

  const revertToCheckedIn = (item: UnifiedCheckIn) => {
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

    setCheckInOutMode(null);
    setSelectedItem(null);
  };

  const confirmCheckInOut = () => {
    if (!selectedItem) return;

    const now = new Date().toISOString();
    const previousStatus = selectedItem.status;
    const actionLabel =
      checkInOutMode === "check-in" ? "Checked In" : "Checked Out";
    const newStatus =
      checkInOutMode === "check-in" ? "checked-in" : "checked-out";

    const previousData = daycareData.find((c) => c.id === selectedItem.id);
    setDaycareData((prev) =>
      prev.map((checkIn) => {
        if (checkIn.id === selectedItem.id) {
          if (checkInOutMode === "check-in") {
            return {
              ...checkIn,
              status: "checked-in" as const,
              checkInTime: now,
            };
          } else {
            return {
              ...checkIn,
              status: "checked-out" as const,
              checkOutTime: now,
            };
          }
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

    setCheckInOutMode(null);
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

  const formatExpectedDeparture = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCheckoutStatus = (scheduledCheckOut: string) => {
    const now = new Date();
    const expected = new Date(scheduledCheckOut);
    const diffMs = now.getTime() - expected.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffMins < -30) {
      const displayTime =
        Math.abs(diffHours) >= 1
          ? `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? "s" : ""}`
          : `${Math.abs(diffMins)} min${Math.abs(diffMins) !== 1 ? "s" : ""}`;
      return {
        status: "early" as const,
        message: `${displayTime} early`,
      };
    } else if (diffMins > 30) {
      const displayTime =
        diffHours >= 1
          ? `${diffHours} hour${diffHours !== 1 ? "s" : ""}`
          : `${diffMins} min${diffMins !== 1 ? "s" : ""}`;
      return {
        status: "late" as const,
        message: `${displayTime} late`,
      };
    }
    return {
      status: "on-time" as const,
      message: "On time",
    };
  };

  const getServiceBadge = () => {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        <Sun className="h-3 w-3 mr-1" />
        Daycare
      </Badge>
    );
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Header with Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Daycare Check-In/Out</h3>
          </div>

          <div className="flex flex-col items-start gap-3">
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
                    daycare arrivals
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
                              {getServiceBadge()}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {item.ownerName} • {item.petBreed}
                            </p>
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
                    daycare guests
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
                              {getServiceBadge()}
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
                                )}
                              </span>
                              {item.playGroup && (
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
                    daycare checkouts
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
                              {getServiceBadge()}
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

        {/* Check-In / Check-Out Dialog */}
        <Dialog
          open={checkInOutMode !== null}
          onOpenChange={() => {
            setCheckInOutMode(null);
            setSelectedItem(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {checkInOutMode === "check-in" ? (
                  <>
                    <LogIn className="h-5 w-5 text-green-600" />
                    Check In
                  </>
                ) : checkInOutMode === "check-out" ? (
                  <>
                    <LogOut className="h-5 w-5 text-orange-600" />
                    Check Out
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-gray-600" />
                    Checkout Details
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {checkInOutMode === "check-in"
                  ? "Confirm check-in for this pet"
                  : checkInOutMode === "check-out"
                    ? "Confirm check-out for this pet"
                    : "View details for this checkout"}
              </DialogDescription>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-4 py-4">
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
                      {getServiceBadge()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Owner: {selectedItem.ownerName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Breed</p>
                    <p className="font-medium">{selectedItem.petBreed}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedItem.ownerPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected Departure</p>
                    <p className="font-medium">
                      {formatExpectedDeparture(selectedItem.scheduledCheckOut)}
                    </p>
                  </div>
                  {(checkInOutMode === "check-out" ||
                    checkInOutMode === "view") && (
                    <div>
                      <p className="text-muted-foreground">Checkout Status</p>
                      {(() => {
                        const checkoutStatus = getCheckoutStatus(
                          selectedItem.scheduledCheckOut,
                        );
                        return (
                          <p
                            className={`font-medium flex items-center gap-1 ${
                              checkoutStatus.status === "early"
                                ? "text-blue-600"
                                : checkoutStatus.status === "late"
                                  ? "text-orange-600"
                                  : "text-green-600"
                            }`}
                          >
                            {checkoutStatus.status === "early" ? (
                              <Clock className="h-3 w-3" />
                            ) : checkoutStatus.status === "late" ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {checkoutStatus.message}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                  {checkInOutMode === "view" && selectedItem.checkOutTime && (
                    <div>
                      <p className="text-muted-foreground">Checked Out At</p>
                      <p className="font-medium">
                        {formatTime(selectedItem.checkOutTime)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Play Group</p>
                    <p className="font-medium">
                      {selectedItem.playGroup || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rate Type</p>
                    <p className="font-medium capitalize">
                      {selectedItem.rateType?.replace("-", " ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {checkInOutMode === "view" && selectedItem ? (
                <div className="flex w-full justify-between">
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCheckInOutMode(null);
                      setSelectedItem(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              ) : checkInOutMode !== "view" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCheckInOutMode(null);
                      setSelectedItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmCheckInOut}
                    className={
                      checkInOutMode === "check-in"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-orange-600 hover:bg-orange-700"
                    }
                  >
                    {checkInOutMode === "check-in"
                      ? "Confirm Check In"
                      : "Confirm Check Out"}
                  </Button>
                </>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
