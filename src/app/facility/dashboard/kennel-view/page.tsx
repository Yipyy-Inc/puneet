"use client";

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Button } from "@/components/ui/button";

import {
  PawPrint,
  Calendar,
  Wrench,
  CheckCircle,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { clients } from "@/data/clients";
import { KennelCalendarView } from "./kennel-calendar";
import type { KennelStatus } from "@/types/base";
import { Switch } from "@/components/ui/switch";
import { customServiceCheckIns } from "@/data/custom-service-checkins";
import type { CustomServiceCheckIn } from "@/data/custom-service-checkins";
import { COLOR_HEX_MAP } from "@/data/custom-services";
import { useCustomServices } from "@/hooks/use-custom-services";
import { roomCategories, facilityRooms } from "@/data/rooms";
import {
  daycarePlayAreas,
  daycareSections,
} from "@/data/daycare-areas";
import type { RoomCategory } from "@/types/rooms";
import type { OccupancyKennel } from "./_lib/calendar-types";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { bookings as facilityBookings } from "@/data/bookings";

type Kennel = OccupancyKennel;

function petSizeFromWeight(
  weight: number,
): "small" | "medium" | "large" | "xlarge" {
  if (weight < 20) return "small";
  if (weight < 50) return "medium";
  if (weight < 80) return "large";
  return "xlarge";
}

function findPetById(petId: number) {
  for (const c of clients) {
    const p = c.pets?.find((p) => p.id === petId);
    if (p) return { pet: p, client: c };
  }
  return null;
}

// Mock booking overlays keyed by room id — demonstrates each status colour.
// In real wiring, this would join `bookings.ts` to rooms by kennel/room id.
const mockBookingOverlays: Record<
  string,
  Pick<
    Kennel,
    | "status"
    | "bookingStatus"
    | "bookingId"
    | "petId"
    | "petName"
    | "clientName"
    | "clientPhone"
    | "checkIn"
    | "checkOut"
  >
> = {
  "room-pcs-01": {
    status: "occupied",
    bookingStatus: "checked_in",
    bookingId: 5,
    petId: 4,
    petName: "Daisy",
    clientName: "Diana Prince",
    clientPhone: "111-222-3333",
    checkIn: "2026-04-30",
    checkOut: "2026-05-04",
  },
  "room-ds-01": {
    status: "occupied",
    bookingStatus: "checked_in",
    bookingId: 13,
    petId: 1,
    petName: "Bella",
    clientName: "Alice Johnson",
    clientPhone: "123-456-7890",
    checkIn: "2026-05-01",
    checkOut: "2026-05-06",
  },
  "room-ds-02": {
    status: "reserved",
    bookingStatus: "confirmed",
    bookingId: 18,
    petId: 5,
    petName: "Rex",
    clientName: "John Doe",
    clientPhone: "123-456-7890",
    checkIn: "2026-05-08",
    checkOut: "2026-05-12",
  },
  "room-ds-04": {
    status: "reserved",
    bookingStatus: "pending",
    bookingId: 21,
    petId: 7,
    petName: "Luna",
    clientName: "Sarah Wilson",
    clientPhone: "555-111-2222",
    checkIn: "2026-05-05",
    checkOut: "2026-05-09",
  },
  "room-ds-05": {
    // Inactive in data — shown as maintenance for demo
    status: "maintenance",
  },
  "room-s-01": {
    status: "occupied",
    bookingStatus: "checked_in",
    bookingId: 2,
    petId: 3,
    petName: "Charlie",
    clientName: "Bob Smith",
    clientPhone: "098-765-4321",
    checkIn: "2026-05-02",
    checkOut: "2026-05-07",
  },
  "room-s-03": {
    status: "occupied",
    bookingStatus: "completed",
    bookingId: 8,
    petId: 6,
    petName: "Cooper",
    clientName: "Eve Adams",
    clientPhone: "555-666-7777",
    checkIn: "2026-04-28",
    checkOut: "2026-05-02",
  },
  "room-s-05": {
    status: "reserved",
    bookingStatus: "confirmed",
    bookingId: 20,
    petName: "Max",
    clientName: "Bob Smith",
    clientPhone: "098-765-4321",
    checkIn: "2026-05-10",
    checkOut: "2026-05-14",
  },
  "room-s-07": {
    status: "maintenance",
  },
  "room-c-01": {
    status: "occupied",
    bookingStatus: "checked_in",
    bookingId: 30,
    petName: "Buddy",
    clientName: "Tom Harris",
    clientPhone: "555-222-3333",
    checkIn: "2026-05-03",
    checkOut: "2026-05-06",
  },
  "room-c-04": {
    status: "reserved",
    bookingStatus: "pending",
    petName: "Milo",
    clientName: "Lisa Garcia",
    clientPhone: "555-444-5555",
    checkIn: "2026-05-07",
    checkOut: "2026-05-11",
  },
  "room-c-08": {
    status: "occupied",
    bookingStatus: "checked_in",
    petName: "Ginger",
    clientName: "Nancy Taylor",
    clientPhone: "555-444-6666",
    checkIn: "2026-05-01",
    checkOut: "2026-05-05",
  },
};

function buildInitialKennels(): Kennel[] {
  return facilityRooms
    .filter((r) => r.active || mockBookingOverlays[r.id]?.status === "maintenance")
    .map((room) => {
      const category = roomCategories.find((c) => c.id === room.categoryId);
      const overlay = mockBookingOverlays[room.id];
      const enrichment: Partial<OccupancyKennel> = {};
      if (overlay?.petId) {
        const lookup = findPetById(overlay.petId);
        if (lookup) {
          enrichment.petPhotoUrl = lookup.pet.imageUrl;
          enrichment.petBreed = lookup.pet.breed;
          enrichment.petSize = petSizeFromWeight(lookup.pet.weight);
          enrichment.petSpecies =
            lookup.pet.type.toLowerCase() === "cat" ? "cat" : "dog";
          enrichment.clientPhotoUrl = lookup.client.imageUrl;
        }
      }
      // Find the related booking (if any) to surface care signals to the bar.
      const related = overlay?.bookingId
        ? facilityBookings.find((b) => b.id === overlay.bookingId)
        : undefined;
      if (related) {
        enrichment.paymentStatus = related.paymentStatus;
        enrichment.specialRequests = related.specialRequests;
        enrichment.checkInTime = related.checkInTime;
        enrichment.checkOutTime = related.checkOutTime;
        enrichment.hasFeedingInstructions =
          (related.feedingInstructions?.length ?? 0) > 0;
        enrichment.hasMedications =
          (related.medications?.length ?? 0) > 0;
      }
      return {
        id: room.id,
        name: room.name,
        categoryId: room.categoryId,
        dailyRate: category?.defaultBasePrice ?? 0,
        ...(overlay ?? {}),
        ...enrichment,
        status: overlay?.status ?? ("vacant" as KennelStatus),
      };
    });
}

const initialKennels: Kennel[] = buildInitialKennels();

// Boarding categories — only categories tied to boarding rooms.
const boardingCategories: RoomCategory[] = roomCategories.filter(
  (c) => c.service === "boarding",
);

// Daycare uses Play Areas → Sections from the modules data. We adapt them into
// the same RoomCategory / OccupancyKennel shapes the calendar already understands.
const daycareCategories: RoomCategory[] = daycarePlayAreas
  .filter((a) => a.isActive)
  .map((a) => ({
    id: a.id,
    facilityId: a.facilityId,
    service: "daycare",
    name: a.name,
    description: a.description,
    color: "amber",
    sortOrder: a.sortOrder,
    rules: [],
    defaultCapacity: 0,
    visibleToClients: true,
    imageUrl: a.imageUrl,
  }));

// Mock daycare reservations (1-day each) keyed by section id.
const mockDaycareOverlays: Record<
  string,
  Pick<
    Kennel,
    | "status"
    | "bookingStatus"
    | "bookingId"
    | "petId"
    | "petName"
    | "clientName"
    | "clientPhone"
    | "checkIn"
    | "checkOut"
  >
> = {
  "sec-indoor-small": {
    status: "occupied",
    bookingStatus: "checked_in",
    bookingId: 200,
    petId: 1,
    petName: "Bella",
    clientName: "Alice Johnson",
    clientPhone: "123-456-7890",
    checkIn: "2026-05-05",
    checkOut: "2026-05-05",
  },
  "sec-indoor-medium": {
    status: "reserved",
    bookingStatus: "confirmed",
    bookingId: 201,
    petId: 3,
    petName: "Charlie",
    clientName: "Bob Smith",
    clientPhone: "098-765-4321",
    checkIn: "2026-05-06",
    checkOut: "2026-05-06",
  },
  "sec-indoor-large": {
    status: "occupied",
    bookingStatus: "checked_in",
    bookingId: 202,
    petId: 5,
    petName: "Rex",
    clientName: "John Doe",
    clientPhone: "123-456-7890",
    checkIn: "2026-05-05",
    checkOut: "2026-05-05",
  },
  "sec-outdoor-main": {
    status: "reserved",
    bookingStatus: "pending",
    bookingId: 203,
    petId: 7,
    petName: "Luna",
    clientName: "Sarah Wilson",
    clientPhone: "555-111-2222",
    checkIn: "2026-05-07",
    checkOut: "2026-05-07",
  },
  "sec-outdoor-agility": {
    status: "maintenance",
  },
};

function buildInitialDaycareKennels(): Kennel[] {
  return daycareSections
    .filter((s) => s.isActive)
    .map((section) => {
      const overlay = mockDaycareOverlays[section.id];
      const enrichment: Partial<OccupancyKennel> = {};
      if (overlay?.petId) {
        const lookup = findPetById(overlay.petId);
        if (lookup) {
          enrichment.petPhotoUrl = lookup.pet.imageUrl;
          enrichment.petBreed = lookup.pet.breed;
          enrichment.petSize = petSizeFromWeight(lookup.pet.weight);
          enrichment.petSpecies =
            lookup.pet.type.toLowerCase() === "cat" ? "cat" : "dog";
          enrichment.clientPhotoUrl = lookup.client.imageUrl;
        }
      }
      return {
        id: section.id,
        name: section.name,
        categoryId: section.playAreaId,
        dailyRate: 35,
        ...(overlay ?? {}),
        ...enrichment,
        status: overlay?.status ?? ("vacant" as KennelStatus),
      };
    });
}

const initialDaycareKennels: Kennel[] = buildInitialDaycareKennels();

type ServiceType = "boarding" | "daycare" | "both";

export default function KennelViewPage() {
  const [kennels, setKennels] = useState<Kennel[]>(initialKennels);
  const [daycareKennels, setDaycareKennels] = useState<Kennel[]>(
    initialDaycareKennels,
  );
  const [filterStatus, setFilterStatus] = useState<KennelStatus | "all">("all");
  const [daycareFilterStatus, setDaycareFilterStatus] = useState<
    KennelStatus | "all"
  >("all");
  const [serviceType, setServiceType] = useState<ServiceType>("boarding");

  const { openBookingModal } = useBookingModal();

  // Generic move handler that works for both boarding and daycare — the calendar
  // calls it with the same kennel-id shape regardless of service.
  const moveWithin = useCallback(
    (
      setList: React.Dispatch<React.SetStateAction<Kennel[]>>,
      bookingId: number,
      fromRoomId: string,
      toRoomId: string,
      staffInitials: string,
    ) => {
      setList((prev) => {
        const source = prev.find((k) => k.id === fromRoomId);
        if (!source) return prev;
        return prev.map((k) => {
          if (k.id === fromRoomId) {
            return {
              id: k.id,
              name: k.name,
              categoryId: k.categoryId,
              dailyRate: k.dailyRate,
              status: "vacant" as KennelStatus,
            };
          }
          if (k.id === toRoomId) {
            return {
              ...source,
              id: k.id,
              name: k.name,
              categoryId: k.categoryId,
              dailyRate: k.dailyRate,
            };
          }
          return k;
        });
      });
      console.log(
        "Moved booking",
        bookingId,
        fromRoomId,
        "→",
        toRoomId,
        "by",
        staffInitials,
      );
    },
    [],
  );

  const handleMoveBooking = useCallback(
    (b: number, f: string, t: string, s: string) =>
      moveWithin(setKennels, b, f, t, s),
    [moveWithin],
  );
  const handleDaycareMoveBooking = useCallback(
    (b: number, f: string, t: string, s: string) =>
      moveWithin(setDaycareKennels, b, f, t, s),
    [moveWithin],
  );

  const handleAddBookingFromCell = useCallback(
    (kennelId: string, date: string) => {
      const target = kennels.find((k) => k.id === kennelId);
      if (!target || target.status === "maintenance") return;
      openBookingModal({
        clients,
        facilityId: 11,
        facilityName: "Pawradise Resort",
        preSelectedService: "boarding",
        preSelectedRoomId: kennelId,
        preSelectedStartDate: date,
        onCreateBooking: (newBooking) => {
          console.log("Booking created from occupancy grid", newBooking);
        },
      });
    },
    [kennels, openBookingModal],
  );

  const handleAddDaycareBookingFromCell = useCallback(
    (sectionId: string, date: string) => {
      const target = daycareKennels.find((k) => k.id === sectionId);
      if (!target || target.status === "maintenance") return;
      openBookingModal({
        clients,
        facilityId: 11,
        facilityName: "Pawradise Resort",
        preSelectedService: "daycare",
        preSelectedRoomId: sectionId,
        preSelectedStartDate: date,
        onCreateBooking: (newBooking) => {
          console.log("Daycare booking created from occupancy grid", newBooking);
        },
      });
    },
    [daycareKennels, openBookingModal],
  );

  const [showCustomServices, setShowCustomServices] = useState(true);

  // Get active modules for color mapping
  const { activeModules } = useCustomServices();

  // Map petId → their custom service check-ins
  const petServicesMap = useMemo(() => {
    const map = new Map<number, CustomServiceCheckIn[]>();
    for (const csc of customServiceCheckIns) {
      const existing = map.get(csc.petId) ?? [];
      map.set(csc.petId, [...existing, csc]);
    }
    return map;
  }, []);

  // Map moduleId → hex color for badge styling
  const moduleColorMap = useMemo(
    () =>
      new Map(
        activeModules.map((m) => [
          m.id,
          COLOR_HEX_MAP[m.iconColor] ?? "#6366f1",
        ]),
      ),
    [activeModules],
  );

  const daycareStatusCounts = useMemo(() => {
    return {
      vacant: daycareKennels.filter((k) => k.status === "vacant").length,
      occupied: daycareKennels.filter((k) => k.status === "occupied").length,
      reserved: daycareKennels.filter((k) => k.status === "reserved").length,
      maintenance: daycareKennels.filter((k) => k.status === "maintenance")
        .length,
    };
  }, [daycareKennels]);

  const statusCounts = useMemo(() => {
    return {
      vacant: kennels.filter((k) => k.status === "vacant").length,
      occupied: kennels.filter((k) => k.status === "occupied").length,
      reserved: kennels.filter((k) => k.status === "reserved").length,
      maintenance: kennels.filter((k) => k.status === "maintenance").length,
    };
  }, [kennels]);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Occupancy</h2>
          <p className="text-muted-foreground">
            {serviceType === "boarding"
              ? "Manage kennel occupancy and bookings"
              : serviceType === "daycare"
                ? "Manage daycare play areas and reservations"
                : "Manage kennel occupancy and daycare reservations"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Service Type Toggle */}
          <div className="flex overflow-hidden rounded-lg border">
            <Button
              variant={serviceType === "boarding" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2 rounded-none"
              onClick={() => setServiceType("boarding")}
            >
              <Moon className="size-4" />
              Boarding
            </Button>
            <Button
              variant={serviceType === "daycare" ? "secondary" : "ghost"}
              size="sm"
              className="gap-2 rounded-none"
              onClick={() => setServiceType("daycare")}
            >
              <Sun className="size-4" />
              Daycare
            </Button>
            <Button
              variant={serviceType === "both" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setServiceType("both")}
            >
              Both
            </Button>
          </div>
          {/* Custom Services Toggle (Boarding Only) */}
          {serviceType !== "daycare" && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
              <Sparkles className="text-muted-foreground size-3.5" />
              <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                Add-ons
              </span>
              <Switch
                checked={showCustomServices}
                onCheckedChange={setShowCustomServices}
                className="scale-75"
              />
            </div>
          )}
        </div>
      </div>

      {serviceType !== "daycare" && (
        <>
          {/* Status Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <KpiTile
              label="Vacant"
              value={statusCounts.vacant}
              hint="Rooms available now"
              icon={CheckCircle}
              tone="emerald"
              active={filterStatus === "vacant"}
              onClick={() =>
                setFilterStatus(filterStatus === "vacant" ? "all" : "vacant")
              }
            />
            <KpiTile
              label="Occupied"
              value={statusCounts.occupied}
              hint="Pets currently checked-in"
              icon={PawPrint}
              tone="indigo"
              active={filterStatus === "occupied"}
              onClick={() =>
                setFilterStatus(
                  filterStatus === "occupied" ? "all" : "occupied",
                )
              }
            />
            <KpiTile
              label="Reserved"
              value={statusCounts.reserved}
              hint="Upcoming bookings"
              icon={Calendar}
              tone="amber"
              active={filterStatus === "reserved"}
              onClick={() =>
                setFilterStatus(
                  filterStatus === "reserved" ? "all" : "reserved",
                )
              }
            />
            <KpiTile
              label="Maintenance"
              value={statusCounts.maintenance}
              hint="Out of service"
              icon={Wrench}
              tone="rose"
              active={filterStatus === "maintenance"}
              onClick={() =>
                setFilterStatus(
                  filterStatus === "maintenance" ? "all" : "maintenance",
                )
              }
            />
          </div>

          <Card className="p-4">
            <KennelCalendarView
              kennels={kennels}
              categories={boardingCategories}
              facilityName="Pawradise Resort"
              onAddBooking={handleAddBookingFromCell}
              onUpdateBooking={(kennelId, checkIn, checkOut, staffInitials) => {
                setKennels((prev) =>
                  prev.map((k) =>
                    k.id === kennelId
                      ? {
                          ...k,
                          checkIn,
                          checkOut,
                        }
                      : k,
                  ),
                );
                console.log(
                  "Updated stay",
                  kennelId,
                  checkIn,
                  "→",
                  checkOut,
                  "by",
                  staffInitials,
                );
              }}
              onMoveBooking={handleMoveBooking}
              customServicesMap={petServicesMap}
              moduleColorMap={moduleColorMap}
              showCustomServices={showCustomServices}
            />
          </Card>
        </>
      )}

      {serviceType !== "boarding" && (
        <>
          {/* Status Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <KpiTile
              label="Vacant"
              value={daycareStatusCounts.vacant}
              hint="Sections open today"
              icon={CheckCircle}
              tone="emerald"
              active={daycareFilterStatus === "vacant"}
              onClick={() =>
                setDaycareFilterStatus(
                  daycareFilterStatus === "vacant" ? "all" : "vacant",
                )
              }
            />
            <KpiTile
              label="Occupied"
              value={daycareStatusCounts.occupied}
              hint="Pets in play areas"
              icon={PawPrint}
              tone="indigo"
              active={daycareFilterStatus === "occupied"}
              onClick={() =>
                setDaycareFilterStatus(
                  daycareFilterStatus === "occupied" ? "all" : "occupied",
                )
              }
            />
            <KpiTile
              label="Reserved"
              value={daycareStatusCounts.reserved}
              hint="Upcoming reservations"
              icon={Calendar}
              tone="amber"
              active={daycareFilterStatus === "reserved"}
              onClick={() =>
                setDaycareFilterStatus(
                  daycareFilterStatus === "reserved" ? "all" : "reserved",
                )
              }
            />
            <KpiTile
              label="Maintenance"
              value={daycareStatusCounts.maintenance}
              hint="Out of service"
              icon={Wrench}
              tone="rose"
              active={daycareFilterStatus === "maintenance"}
              onClick={() =>
                setDaycareFilterStatus(
                  daycareFilterStatus === "maintenance" ? "all" : "maintenance",
                )
              }
            />
          </div>

          <Card className="p-4">
            <KennelCalendarView
              kennels={daycareKennels}
              categories={daycareCategories}
              facilityName="Pawradise Resort"
              rateSuffix="/day"
              disableResize
              onAddBooking={handleAddDaycareBookingFromCell}
              onUpdateBooking={() => {
                // Daycare stays are 1-day; resize is disabled in the calendar.
              }}
              onMoveBooking={handleDaycareMoveBooking}
              customServicesMap={petServicesMap}
              moduleColorMap={moduleColorMap}
              showCustomServices={false}
            />
          </Card>
        </>
      )}

    </div>
  );
}
