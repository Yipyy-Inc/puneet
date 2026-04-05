"use client";

import { useState, useMemo, useRef } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
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
  ClipboardCheck,
  CheckCircle2,
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
  const isMounted = useHydrated();
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInOutMode, setCheckInOutMode] = useState<
    "check-in" | "check-out" | "view" | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedCheckIn | null>(null);

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

  const getServiceBadge = (item?: DaycareCheckIn) => {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Sun className="mr-1 size-3" />
          Daycare
        </Badge>
        {item?.includesEvaluation && (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <ClipboardCheck className="mr-1 size-3" />
            Evaluation
            {item.evaluationStatus === "completed" && (
              <CheckCircle2 className="ml-1 size-3 text-green-600" />
            )}
          </Badge>
        )}
      </div>
    );
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Header with Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="text-primary size-5" />
            <h3 className="text-lg font-semibold">Daycare Check-In/Out</h3>
          </div>

          <div className="flex flex-col items-start gap-3">
            {/* Section Visibility Toggle */}
            <div className="flex items-center gap-2">
              <Eye className="text-muted-foreground size-4" />
              <div className="flex gap-1 rounded-lg border p-1">
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
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
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
          } `}
        >
          {/* Scheduled Arrivals */}
          {showScheduled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4 text-orange-600" />
                  Scheduled Arrivals
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{scheduledArrivals.length}</Badge>
                  <span className="text-muted-foreground text-xs">
                    daycare arrivals
                  </span>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
                {scheduledArrivals.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No arrivals scheduled
                  </p>
                ) : (
                  scheduledArrivals.map((item) => {
                    const client = findClientForPet(item.petId);
                    return (
                      <div
                        key={item.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border bg-orange-50/50 p-3 transition-colors hover:bg-orange-100/50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {getPetImage(item.petId) ? (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="size-10 overflow-hidden rounded-full">
                                <Image
                                  src={getPetImage(item.petId)!}
                                  alt={item.petName}
                                  width={40}
                                  height={40}
                                  className="size-full object-cover"
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
                              <div className="flex size-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                                <PawPrint className="size-5 text-orange-600" />
                              </div>
                            </Link>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                    : "#"
                                }
                                className="truncate font-medium hover:underline"
                              >
                                {item.petName}
                              </Link>
                              {getServiceBadge()}
                            </div>
                            <p className="text-muted-foreground truncate text-sm">
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
                          <LogIn className="size-3" />
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
                  <LogIn className="size-4 text-green-600" />
                  Currently Checked In
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{displayedPets.length}</Badge>
                  <span className="text-muted-foreground text-xs">
                    daycare guests
                  </span>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
                {displayedPets.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
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
                        className="bg-card hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {getPetImage(item.petId) ? (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="size-10 overflow-hidden rounded-full">
                                <Image
                                  src={getPetImage(item.petId)!}
                                  alt={item.petName}
                                  width={40}
                                  height={40}
                                  className="size-full object-cover"
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
                              <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                                <PawPrint className="text-primary size-5" />
                              </div>
                            </Link>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                    : "#"
                                }
                                className="truncate font-medium hover:underline"
                              >
                                {item.petName}
                              </Link>
                              {getServiceBadge()}
                            </div>
                            <p className="text-muted-foreground truncate text-sm">
                              {item.ownerName} • {item.petBreed}
                            </p>
                            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                              <Clock className="size-3" />
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
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckOut(item);
                            }}
                            className="gap-1"
                          >
                            <LogOut className="size-3" />
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
                  <CheckCircle className="size-4 text-gray-600" />
                  Checked Out Today
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{checkedOutToday.length}</Badge>
                  <span className="text-muted-foreground text-xs">
                    daycare checkouts
                  </span>
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
                {checkedOutToday.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No checkouts today
                  </p>
                ) : (
                  checkedOutToday.map((item) => {
                    const client = findClientForPet(item.petId);
                    return (
                      <div
                        key={item.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border bg-gray-50/50 p-3 transition-colors hover:bg-gray-100/50 dark:bg-gray-950/20 dark:hover:bg-gray-950/30"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {getPetImage(item.petId) ? (
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="shrink-0"
                            >
                              <div className="size-10 overflow-hidden rounded-full">
                                <Image
                                  src={getPetImage(item.petId)!}
                                  alt={item.petName}
                                  width={40}
                                  height={40}
                                  className="size-full object-cover"
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
                              <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900">
                                <PawPrint className="size-5 text-gray-600" />
                              </div>
                            </Link>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={
                                  client
                                    ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                    : "#"
                                }
                                className="truncate font-medium hover:underline"
                              >
                                {item.petName}
                              </Link>
                              {getServiceBadge()}
                            </div>
                            <p className="text-muted-foreground truncate text-sm">
                              {item.ownerName} • {item.petBreed}
                            </p>
                            <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                              <Clock className="size-3" />
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
                    <LogIn className="size-5 text-green-600" />
                    Check In
                  </>
                ) : checkInOutMode === "check-out" ? (
                  <>
                    <LogOut className="size-5 text-orange-600" />
                    Check Out
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-5 text-gray-600" />
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
                <div className="bg-muted flex items-center gap-4 rounded-lg p-4">
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
                        <div className="size-12 overflow-hidden rounded-full">
                          <Image
                            src={getPetImage(selectedItem.petId)!}
                            alt={selectedItem.petName}
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
                            ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
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
                        const client = findClientForPet(selectedItem.petId);
                        return (
                          <Link
                            href={
                              client
                                ? `/facility/dashboard/clients/${client.id}/pets/${selectedItem.petId}`
                                : "#"
                            }
                            className="text-lg font-semibold hover:underline"
                          >
                            {selectedItem.petName}
                          </Link>
                        );
                      })()}
                      {getServiceBadge()}
                    </div>
                    <p className="text-muted-foreground text-sm">
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
                    <p className="flex items-center gap-1 font-medium">
                      <Phone className="size-3" />
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
                            className={`flex items-center gap-1 font-medium ${
                              checkoutStatus.status === "early"
                                ? "text-blue-600"
                                : checkoutStatus.status === "late"
                                  ? "text-orange-600"
                                  : "text-green-600"
                            } `}
                          >
                            {checkoutStatus.status === "early" ? (
                              <Clock className="size-3" />
                            ) : checkoutStatus.status === "late" ? (
                              <AlertTriangle className="size-3" />
                            ) : (
                              <CheckCircle className="size-3" />
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
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                        onClick={() => revertToScheduled(selectedItem)}
                      >
                        Revert to Scheduled
                      </Button>
                    )}
                    {selectedItem.status === "checked-out" && (
                      <>
                        <Button
                          variant="outline"
                          className="border-orange-600 text-orange-600 hover:bg-orange-50"
                          onClick={() => revertToScheduled(selectedItem)}
                        >
                          Revert to Scheduled
                        </Button>
                        <Button
                          variant="outline"
                          className="border-blue-600 text-blue-600 hover:bg-blue-50"
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
                        ? `bg-green-600 hover:bg-green-700`
                        : `bg-orange-600 hover:bg-orange-700`
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
