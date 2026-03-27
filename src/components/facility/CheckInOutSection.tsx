"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
  CreditCard,
  MapPin,
  Mail,
} from "lucide-react";
import { boardingGuests, BoardingGuest } from "@/data/boarding";
import { daycareCheckIns, DaycareCheckIn, daycareRates } from "@/data/daycare";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import {
  getYipyyGoDisplayStatusForBooking,
  type YipyyGoDisplayStatus,
} from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { TagList } from "@/components/shared/TagList";
import { hasCriticalTags, hasWarningTags } from "@/data/tags-notes";
import { cn } from "@/lib/utils";

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

type ServiceFilter = "all" | "daycare" | "boarding" | (string & {});

interface UnifiedCheckIn {
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  serviceType: string;
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

interface CheckInOutSectionProps {
  /** Facility ID for YipyyGo status (today's arrivals); omit to hide YipyyGo badges */
  facilityId?: number;
}

export function CheckInOutSection({ facilityId }: CheckInOutSectionProps) {
  const isMounted = useSyncExternalStore(
    (cb) => {
      cb();
      return () => {};
    },
    () => true,
    () => false,
  );
  const [checkedInQuery, setCheckedInQuery] = useState("");
  const [scheduledQuery, setScheduledQuery] = useState("");
  const [checkedOutQuery, setCheckedOutQuery] = useState("");
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

  const matchesSearch = (item: UnifiedCheckIn, query: string) => {
    if (!query.trim()) return true;
    const value = query.toLowerCase();
    return (
      item.petName.toLowerCase().includes(value) ||
      item.ownerName.toLowerCase().includes(value) ||
      item.petBreed.toLowerCase().includes(value) ||
      item.ownerPhone.includes(value)
    );
  };

  const filteredCheckedIn = useMemo(
    () => checkedInPets.filter((item) => matchesSearch(item, checkedInQuery)),
    [checkedInPets, checkedInQuery],
  );

  const filteredScheduled = useMemo(
    () =>
      scheduledArrivals.filter((item) => matchesSearch(item, scheduledQuery)),
    [scheduledArrivals, scheduledQuery],
  );

  // Resolve YipyyGo status for today's arrivals (by matching petId + date + service to booking)
  const scheduledYipyyGoByItemId = useMemo(() => {
    if (!facilityId || !isMounted)
      return new Map<
        string,
        { bookingId: number; status: YipyyGoDisplayStatus }
      >();
    const today = new Date().toISOString().split("T")[0];
    const config = getYipyyGoConfig(facilityId);
    if (!config?.enabled)
      return new Map<
        string,
        { bookingId: number; status: YipyyGoDisplayStatus }
      >();
    const facilityBookings = bookings.filter(
      (b) => b.facilityId === facilityId && b.startDate === today,
    );
    const map = new Map<
      string,
      { bookingId: number; status: YipyyGoDisplayStatus }
    >();
    for (const item of scheduledArrivals) {
      const b = facilityBookings.find(
        (booking) =>
          (Array.isArray(booking.petId)
            ? booking.petId.includes(item.petId)
            : booking.petId === item.petId) &&
          booking.service?.toLowerCase() === item.serviceType,
      );
      if (!b) continue;
      const enabled = config.serviceConfigs?.find(
        (s) => s.serviceType === item.serviceType,
      )?.enabled;
      if (!enabled) continue;
      map.set(item.id, {
        bookingId: b.id,
        status: getYipyyGoDisplayStatusForBooking(b.id, {
          facilityId,
          service: b.service ?? item.serviceType,
        }),
      });
    }
    return map;
  }, [facilityId, isMounted, scheduledArrivals]);

  const filteredCheckedOut = useMemo(
    () =>
      checkedOutToday.filter((item) => matchesSearch(item, checkedOutQuery)),
    [checkedOutToday, checkedOutQuery],
  );

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

  const formatExpectedDeparture = (dateStr: string, serviceType: string) => {
    const date = new Date(dateStr);
    // Daycare shows time, boarding shows date
    if (serviceType !== "boarding") {
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

  const getServiceBadge = (serviceType: string, _item?: UnifiedCheckIn) => {
    if (serviceType === "daycare") {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Sun className="mr-1 size-3" />
          Daycare
        </Badge>
      );
    }
    if (serviceType === "boarding") {
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <Bed className="mr-1 size-3" />
          Boarding
        </Badge>
      );
    }
    return (
      <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
        <PawPrint className="mr-1 size-3" />
        {serviceType.charAt(0).toUpperCase() +
          serviceType.slice(1).replace(/-/g, " ")}
      </Badge>
    );
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {/* Compact header: title + dropdown filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <PawPrint className="text-primary size-5" />
            <h3 className="text-lg font-semibold">Daycare & Boarding</h3>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="size-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Service</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={serviceFilter}
                  onValueChange={(v) => setServiceFilter(v as ServiceFilter)}
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="daycare">
                    Daycare
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="boarding">
                    Boarding
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>Show sections</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={showCheckedIn}
                  onCheckedChange={(v) => setShowCheckedIn(!!v)}
                >
                  Checked In
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showScheduled}
                  onCheckedChange={(v) => setShowScheduled(!!v)}
                >
                  Scheduled
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showCheckedOut}
                  onCheckedChange={(v) => setShowCheckedOut(!!v)}
                >
                  Checked Out
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="size-4 text-orange-600" />
                    Scheduled Arrivals
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {filteredScheduled.length}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {
                        filteredScheduled.filter(
                          (p) => p.serviceType === "boarding",
                        ).length
                      }{" "}
                      boarding,{" "}
                      {
                        filteredScheduled.filter(
                          (p) => p.serviceType === "daycare",
                        ).length
                      }{" "}
                      daycare
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search arrivals..."
                    value={scheduledQuery}
                    onChange={(e) => setScheduledQuery(e.target.value)}
                    className="h-8 pl-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
                {filteredScheduled.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {scheduledQuery
                      ? "No arrivals match your search"
                      : "No arrivals scheduled"}
                  </p>
                ) : (
                  filteredScheduled.map((item) => {
                    const client = findClientForPet(item.petId);
                    const isCritical = hasCriticalTags("pet", item.petId);
                    const isWarning =
                      !isCritical && hasWarningTags("pet", item.petId);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          `cursor-pointer space-y-2.5 rounded-lg border bg-orange-50/50 p-3 transition-colors hover:bg-orange-100/50 dark:bg-orange-950/20 dark:hover:bg-orange-950/30`,
                          isCritical &&
                            `border-l-4 border-l-red-500 dark:border-l-red-400`,
                          isWarning &&
                            `border-l-4 border-l-yellow-500 dark:border-l-yellow-400`,
                        )}
                        onClick={() => handleViewDetails(item)}
                      >
                        {isCritical && (
                          <span className="sr-only">Critical alert</span>
                        )}
                        {isWarning && <span className="sr-only">Warning</span>}
                        <div className="flex items-start gap-3">
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
                          <div className="min-w-0 flex-1">
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="text-sm font-semibold hover:underline"
                            >
                              {item.petName}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {getServiceBadge(item.serviceType, item)}
                              <TagList
                                entityType="pet"
                                entityId={item.petId}
                                compact
                                maxVisible={2}
                              />
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {item.ownerName}
                            </p>
                            {item.serviceType === "boarding" &&
                              item.totalNights && (
                                <p className="text-muted-foreground text-xs">
                                  {item.totalNights} night
                                  {item.totalNights > 1 ? "s" : ""}
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          {scheduledYipyyGoByItemId.get(item.id) ? (
                            <YipyyGoStatusBadge
                              status={
                                scheduledYipyyGoByItemId.get(item.id)!.status
                              }
                              showIcon={false}
                            />
                          ) : (
                            <span />
                          )}
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckIn(item);
                            }}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <LogIn className="size-3" />
                            Check In
                          </Button>
                        </div>
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
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LogIn className="size-4 text-green-600" />
                    Currently Checked In
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {filteredCheckedIn.length}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {
                        filteredCheckedIn.filter(
                          (p) => p.serviceType === "boarding",
                        ).length
                      }{" "}
                      boarding,{" "}
                      {
                        filteredCheckedIn.filter(
                          (p) => p.serviceType === "daycare",
                        ).length
                      }{" "}
                      daycare
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search checked-in pets..."
                    value={checkedInQuery}
                    onChange={(e) => setCheckedInQuery(e.target.value)}
                    className="h-8 pl-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
                {filteredCheckedIn.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {checkedInQuery
                      ? "No pets match your search"
                      : "No pets currently checked in"}
                  </p>
                ) : (
                  filteredCheckedIn.map((item) => {
                    const client = findClientForPet(item.petId);
                    const isCritical = hasCriticalTags("pet", item.petId);
                    const isWarning =
                      !isCritical && hasWarningTags("pet", item.petId);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          `bg-card hover:bg-muted/50 cursor-pointer space-y-2.5 rounded-lg border p-3 transition-colors`,
                          isCritical &&
                            `border-l-4 border-l-red-500 dark:border-l-red-400`,
                          isWarning &&
                            `border-l-4 border-l-yellow-500 dark:border-l-yellow-400`,
                        )}
                        onClick={() => handleViewDetails(item)}
                      >
                        {isCritical && (
                          <span className="sr-only">Critical alert</span>
                        )}
                        {isWarning && <span className="sr-only">Warning</span>}
                        <div className="flex items-start gap-3">
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
                          <div className="min-w-0 flex-1">
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="text-sm font-semibold hover:underline"
                            >
                              {item.petName}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {getServiceBadge(item.serviceType, item)}
                              <TagList
                                entityType="pet"
                                entityId={item.petId}
                                compact
                                maxVisible={2}
                              />
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {item.ownerName}
                            </p>
                            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                              <Clock className="size-3" />
                              <span>In: {formatTime(item.checkInTime)}</span>
                              <span>•</span>
                              <span>
                                Out:{" "}
                                {formatExpectedDeparture(
                                  item.scheduledCheckOut,
                                  item.serviceType,
                                )}
                              </span>
                            </div>
                            {item.serviceType === "boarding" &&
                              item.kennelName && (
                                <p className="text-muted-foreground text-xs">
                                  {item.kennelName}
                                </p>
                              )}
                            {item.serviceType === "daycare" &&
                              item.playGroup && (
                                <p className="text-muted-foreground text-xs">
                                  {item.playGroup}
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="flex justify-end">
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
              <CardHeader className="space-y-3 pb-4">
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LogOut className="size-4 text-gray-600" />
                    Checked Out Today
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {filteredCheckedOut.length}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {
                        filteredCheckedOut.filter(
                          (p) => p.serviceType === "boarding",
                        ).length
                      }{" "}
                      boarding,{" "}
                      {
                        filteredCheckedOut.filter(
                          (p) => p.serviceType === "daycare",
                        ).length
                      }{" "}
                      daycare
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    placeholder="Search checkouts..."
                    value={checkedOutQuery}
                    onChange={(e) => setCheckedOutQuery(e.target.value)}
                    className="h-8 pl-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
                {filteredCheckedOut.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {checkedOutQuery
                      ? "No checkouts match your search"
                      : "No checkouts today"}
                  </p>
                ) : (
                  filteredCheckedOut.map((item) => {
                    const client = findClientForPet(item.petId);
                    return (
                      <div
                        key={item.id}
                        className="cursor-pointer space-y-2 rounded-lg border bg-gray-50/50 p-3 transition-colors hover:bg-gray-100/50 dark:bg-gray-950/20 dark:hover:bg-gray-950/30"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex items-start gap-3">
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
                          <div className="min-w-0 flex-1">
                            <Link
                              href={
                                client
                                  ? `/facility/dashboard/clients/${client.id}/pets/${item.petId}`
                                  : "#"
                              }
                              className="text-sm font-semibold hover:underline"
                            >
                              {item.petName}
                            </Link>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {getServiceBadge(item.serviceType, item)}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                              {item.ownerName}
                            </p>
                            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
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

        {/* Check-In Modal */}
        <Modal
          open={isCheckInModalOpen}
          onOpenChange={closeCheckInModal}
          type="details"
          title="Check In"
          description="Confirm check-in for this pet"
          icon={<LogIn className="size-5 text-green-600" />}
          size="xl"
        >
          {selectedItem && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Pet Information</h4>
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
                          {getServiceBadge(
                            selectedItem.serviceType,
                            selectedItem,
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Breed: {selectedItem.petBreed}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {selectedItem.serviceType === "boarding"
                            ? `Kennel: ${selectedItem.kennelName}`
                            : `Play Group: ${selectedItem.playGroup || "Not assigned"}`}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Owner: {selectedItem.ownerName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Owner Information</h4>
                    {(() => {
                      const client = findClientForPet(selectedItem.petId);
                      return client ? (
                        <div className="bg-muted flex items-center gap-4 rounded-lg p-4">
                          <div className="size-12 overflow-hidden rounded-full">
                            <Image
                              src="/people/person-2.jpg"
                              alt={client.name}
                              width={48}
                              height={48}
                              className="size-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              {client.name}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <Mail className="size-3" />
                              {client.email}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <Phone className="size-3" />
                              {client.phone}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <MapPin className="size-3" />
                              {client.address
                                ? `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Client information not available
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Booking Details</h4>
                  <div className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg p-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium capitalize">
                        {selectedItem.serviceType}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in Date</p>
                      <p className="font-medium">
                        {new Date(selectedItem.checkInTime).toLocaleDateString(
                          "en-US",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-out Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedItem.scheduledCheckOut,
                        ).toLocaleDateString("en-US")}
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

              <div className="flex items-center justify-end gap-2 border-t pt-4">
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
          icon={<LogOut className="size-5 text-orange-600" />}
          size="xl"
        >
          {selectedItem && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Pet Information</h4>
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
                          {getServiceBadge(
                            selectedItem.serviceType,
                            selectedItem,
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Breed: {selectedItem.petBreed}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {selectedItem.serviceType === "boarding"
                            ? `Kennel: ${selectedItem.kennelName}`
                            : `Play Group: ${selectedItem.playGroup || "Not assigned"}`}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Owner: {selectedItem.ownerName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Owner Information</h4>
                    {(() => {
                      const client = findClientForPet(selectedItem.petId);
                      return client ? (
                        <div className="bg-muted flex items-center gap-4 rounded-lg p-4">
                          <div className="size-12 overflow-hidden rounded-full">
                            <Image
                              src="/people/person-2.jpg"
                              alt={client.name}
                              width={48}
                              height={48}
                              className="size-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              {client.name}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <Mail className="size-3" />
                              {client.email}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <Phone className="size-3" />
                              {client.phone}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <MapPin className="size-3" />
                              {client.address
                                ? `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Client information not available
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Pickup Information</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm">
                      Pickup by: {pickupPerson || selectedItem.ownerName}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Booking Details</h4>
                  <div className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg p-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service</p>
                      <p className="font-medium capitalize">
                        {selectedItem.serviceType}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-in Date</p>
                      <p className="font-medium">
                        {new Date(selectedItem.checkInTime).toLocaleDateString(
                          "en-US",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check-out Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedItem.scheduledCheckOut,
                        ).toLocaleDateString("en-US")}
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
                    <h4 className="text-sm font-semibold">Payment Status</h4>
                    <div className="bg-muted/50 rounded-lg p-4">
                      {paymentStatus === "processing" && (
                        <p className="flex items-center gap-2 text-sm">
                          <CreditCard className="size-4 animate-pulse" />
                          Processing payment...
                        </p>
                      )}
                      {paymentStatus === "succeeded" && (
                        <p className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="size-4" />
                          Payment succeeded
                        </p>
                      )}
                      {paymentStatus === "failed" && (
                        <p className="flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="size-4" />
                          Payment failed: Insufficient funds
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4">
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
          icon={<CheckCircle className="size-5 text-gray-600" />}
          size="xl"
        >
          {selectedItem && (
            <>
              <div className="space-y-4">
                {selectedItem.status === "checked-out" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">
                          Pet Information
                        </h4>
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
                                    className="text-lg font-semibold hover:underline"
                                  >
                                    {selectedItem.petName}
                                  </Link>
                                );
                              })()}
                              {getServiceBadge(
                                selectedItem.serviceType,
                                selectedItem,
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Breed: {selectedItem.petBreed}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {selectedItem.serviceType === "boarding"
                                ? `Kennel: ${selectedItem.kennelName}`
                                : `Play Group: ${selectedItem.playGroup || "Not assigned"}`}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              Owner: {selectedItem.ownerName}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">
                          Owner Information
                        </h4>
                        {(() => {
                          const client = findClientForPet(selectedItem.petId);
                          return client ? (
                            <div className="bg-muted flex items-center gap-4 rounded-lg p-4">
                              <div className="size-12 overflow-hidden rounded-full">
                                <Image
                                  src="/people/person-2.jpg"
                                  alt={client.name}
                                  width={48}
                                  height={48}
                                  className="size-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-lg font-semibold">
                                  {client.name}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                  <Mail className="size-3" />
                                  {client.email}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                  <Phone className="size-3" />
                                  {client.phone}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                                  <MapPin className="size-3" />
                                  {client.address
                                    ? `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              Client information not available
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        Pickup Information
                      </h4>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm">
                          Pickup by: {pickupPerson || selectedItem.ownerName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Booking Details</h4>
                      <div className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg p-4 text-sm">
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
                      <h4 className="text-sm font-semibold">Payment Status</h4>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="size-4" />
                          Payment succeeded
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
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
                        {getServiceBadge(
                          selectedItem.serviceType,
                          selectedItem,
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Owner: {selectedItem.ownerName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full items-center justify-between gap-2 border-t pt-4">
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
                <div className="ml-auto flex gap-2">
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
