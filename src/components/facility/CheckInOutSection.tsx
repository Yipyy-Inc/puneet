"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { boardingGuests, BoardingGuest } from "@/data/boarding";
import { daycareCheckIns, DaycareCheckIn } from "@/data/daycare";

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
  }));

  return [...boardingItems, ...daycareItems];
}

export function CheckInOutSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [checkInOutMode, setCheckInOutMode] = useState<
    "check-in" | "check-out" | "view" | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedCheckIn | null>(null);

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

  const confirmCheckInOut = () => {
    if (!selectedItem) return;

    const now = new Date().toISOString();

    if (selectedItem.serviceType === "boarding") {
      setBoardingData((prev) =>
        prev.map((guest) => {
          if (guest.id === selectedItem.id) {
            if (checkInOutMode === "check-in") {
              return {
                ...guest,
                status: "checked-in" as const,
                actualCheckIn: now,
              };
            } else {
              return {
                ...guest,
                status: "checked-out" as const,
                actualCheckOut: now,
              };
            }
          }
          return guest;
        }),
      );
    } else {
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
    }

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
                  scheduledArrivals.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getPetImage(item.petId) ? (
                          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={getPetImage(item.petId)!}
                              alt={item.petName}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                            <PawPrint className="h-5 w-5 text-orange-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {item.petName}
                            </p>
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
                        onClick={() => handleCheckIn(item)}
                        className="shrink-0 gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <LogIn className="h-3 w-3" />
                        Check In
                      </Button>
                    </div>
                  ))
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
                  displayedPets.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getPetImage(item.petId) ? (
                          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={getPetImage(item.petId)!}
                              alt={item.petName}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <PawPrint className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {item.petName}
                            </p>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(item)}
                        className="shrink-0 gap-1"
                      >
                        <LogOut className="h-3 w-3" />
                        Check Out
                      </Button>
                    </div>
                  ))
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
                  checkedOutToday.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 dark:bg-gray-950/20 hover:bg-gray-100/50 dark:hover:bg-gray-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getPetImage(item.petId) ? (
                          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={getPetImage(item.petId)!}
                              alt={item.petName}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0">
                            <PawPrint className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {item.petName}
                            </p>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(item)}
                        className="shrink-0 gap-1"
                      >
                        View
                      </Button>
                    </div>
                  ))
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
                  {getPetImage(selectedItem.petId) ? (
                    <div className="h-12 w-12 rounded-full overflow-hidden">
                      <Image
                        src={getPetImage(selectedItem.petId)!}
                        alt={selectedItem.petName}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <PawPrint className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">
                        {selectedItem.petName}
                      </p>
                      {getServiceBadge(selectedItem.serviceType)}
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
                      {formatExpectedDeparture(
                        selectedItem.scheduledCheckOut,
                        selectedItem.serviceType,
                      )}
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
                  {selectedItem.serviceType === "boarding" && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Kennel</p>
                        <p className="font-medium">{selectedItem.kennelName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stay Duration</p>
                        <p className="font-medium">
                          {selectedItem.totalNights} night
                          {selectedItem.totalNights !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </>
                  )}
                  {selectedItem.serviceType === "daycare" && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              {checkInOutMode === "view" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCheckInOutMode(null);
                    setSelectedItem(null);
                  }}
                >
                  Close
                </Button>
              ) : (
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
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
