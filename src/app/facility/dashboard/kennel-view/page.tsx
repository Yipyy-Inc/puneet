"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import {
  useBoardingRooms,
  type BoardingRoomsPayload,
} from "@/lib/api/boarding-rooms";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { clientQueries } from "@/lib/api/client";
import { bookingMutations } from "@/lib/api/booking";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KennelCalendarView } from "./kennel-calendar";
import type { KennelStatus } from "@/types/base";
import { Switch } from "@/components/ui/switch";
import { customServiceCheckIns } from "@/data/custom-service-checkins";
import type { CustomServiceCheckIn } from "@/data/custom-service-checkins";
import { COLOR_HEX_MAP } from "@/data/custom-services";
import { useCustomServices } from "@/hooks/use-custom-services";
import { useDaycareAreas } from "@/hooks/use-daycare-areas";
import { useLocationContext } from "@/hooks/use-location-context";
import type {
  RoomCategory,
  DaycarePlayArea,
  DaycareSection,
} from "@/types/rooms";
import type { OccupancyKennel } from "./_lib/calendar-types";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { PageHeader } from "@/components/ui/page-header";

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
// ── THE BOARDING HALF READS THE DATABASE ─────────────────────────────────────
//
// What used to be here: `mockBookingOverlays`, a hand-written map of twelve
// kennels to invented guests — pet names, owner names, and PHONE NUMBERS like
// "Nancy Taylor / 555-444-6666" — merged over the rooms fixture and computed at
// MODULE SCOPE, so it was built once at import and identical for every facility.
// An occupancy board is the screen staff use to know which dog is in which
// kennel, and this one was answering with people who do not exist.
//
// Rooms, categories and occupancy now come from /api/boarding/rooms, the same
// read the (already converted) boarding ops board uses. `occupied` carries who
// is actually in the kennel — petNames, clientName, petType — because a board
// that only knows WHICH BOOKING holds a room cannot be walked by an operator.
function buildKennels({
  rooms,
  categories,
  occupied,
}: BoardingRoomsPayload): Kennel[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const stayByRoom = new Map(occupied.map((o) => [o.roomId, o]));

  return rooms
    .filter((room) => room.active)
    .map((room) => {
      const category = categoryById.get(room.categoryId);
      const stay = stayByRoom.get(room.id);

      // `maintenance` is deliberately absent. The old map could mark a kennel
      // out of service, but nothing in the database records that yet, and
      // inventing it here is how the fixture got started. A room that is not
      // active is filtered out above; the rest are vacant or occupied.
      const status: KennelStatus = stay
        ? stay.status === "checked_in"
          ? "occupied"
          : "reserved"
        : "vacant";

      return {
        id: room.id,
        name: room.name,
        categoryId: room.categoryId,
        dailyRate: category?.defaultBasePrice ?? 0,
        status,
        ...(stay
          ? {
              bookingId: stay.bookingRef,
              // A kennel holds one guest on this board; a booking may cover
              // several pets, and the first is the one the square is labelled
              // with rather than a silent join of names.
              petName: stay.petNames[0],
              clientName: stay.clientName,
              petSpecies: (stay.petType.toLowerCase() === "cat"
                ? "cat"
                : "dog") as "cat" | "dog",
              checkIn: stay.from,
              checkOut: stay.to,
            }
          : {}),
      };
    });
}

// Daycare uses Play Areas → Sections. We adapt them into the same
// RoomCategory / OccupancyKennel shapes the calendar already understands.
//
// Derived from the hook rather than computed at module scope, because the
// areas are `room_categories` rows now (20260822800000) and arrive
// asynchronously. As a module constant this was evaluated once, at import,
// against a fixture — which is exactly why editing a yard never changed this
// board.
function toDaycareCategories(areas: DaycarePlayArea[]): RoomCategory[] {
  return areas
    .filter((a) => a.isActive)
    .map((a) => ({
      id: a.id,
      facilityId: a.facilityId,
      service: "daycare" as const,
      name: a.name,
      description: a.description,
      color: "amber" as const,
      sortOrder: a.sortOrder,
      rules: [],
      defaultCapacity: 0,
      visibleToClients: true,
      imageUrl: a.imageUrl,
      // Everything reaching here passed the `isActive` filter above.
      active: true,
      // Daycare has no per-location price table -- see RoomCategory's doc.
      locationPricing: [],
    }));
}

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

// The SECTIONS are real now — `facility_rooms` inside a daycare category. The
// OCCUPANCY on this half still is not: `mockDaycareOverlays` above invents who
// is in them. The boarding half gets its occupancy from /api/boarding/rooms,
// which joins the stays; daycare has no equivalent yet, and inventing one here
// would be the same mistake in a new place.
function buildInitialDaycareKennels(
  daycareSections: DaycareSection[],
): Kennel[] {
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

type ServiceType = "boarding" | "daycare" | "both";

/**
 * The data boundary.
 *
 * The board below seeds `useState` from the rooms payload. Seeding state from a
 * query that has not resolved gives you an empty board that never refills, and
 * syncing it back with an effect is the `set-state-in-effect` shape the lint
 * rule objects to — so the branch that needs the data is its own component and
 * its initialiser runs once, with the data already in hand. Same split as the
 * client-file layout.
 */
export default function KennelViewPage() {
  const { data, isPending, error } = useBoardingRooms();

  if (isPending) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-112 w-full rounded-xl" />
      </div>
    );
  }

  // Not an empty board. A board with no kennels drawn on it reads as "nothing
  // is booked", which is a statement about the facility rather than about a
  // failed request.
  if (error || !data) {
    return (
      <div className="p-6">
        <p role="alert" className="text-muted-foreground">
          Could not load the kennels.{" "}
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }

  return <KennelViewBoard rooms={data} />;
}

function KennelViewBoard({ rooms }: { rooms: BoardingRoomsPayload }) {
  const { profile } = useFacilityProfile();
  // The booking wizard opened from a grid cell was offered the CLIENTS FIXTURE
  // — people who do not exist — while `clients` from @/data is still imported
  // below for findPetById, which enriches the daycare half (no table yet).
  const { data: liveClients = [] } = useQuery(clientQueries.all());
  const queryClient = useQueryClient();
  const boardingCategories = rooms.categories.filter(
    (c) => c.service === "boarding",
  );
  const [kennels, setKennels] = useState<Kennel[]>(() => buildKennels(rooms));

  // The facility's real play areas and sections.
  const { areas: daycareAreas, sections: daycareSections } = useDaycareAreas();
  const daycareCategories = useMemo(
    () => toDaycareCategories(daycareAreas),
    [daycareAreas],
  );
  const [daycareKennels, setDaycareKennels] = useState<Kennel[]>([]);
  // Rebuilt whenever the sections change — they arrive asynchronously, and the
  // board carries local status edits on top, so it stays state rather than a
  // memo.
  useEffect(() => {
    setDaycareKennels(buildInitialDaycareKennels(daycareSections));
  }, [daycareSections]);
  const [filterStatus, setFilterStatus] = useState<KennelStatus | "all">("all");
  const [daycareFilterStatus, setDaycareFilterStatus] = useState<
    KennelStatus | "all"
  >("all");
  const [serviceType, setServiceType] = useState<ServiceType>("boarding");

  const { openBookingModal } = useBookingModal();
  const { currentLocationId } = useLocationContext();

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
        clients: liveClients,
        facilityId: 11,
        facilityName: profile.businessName,
        preSelectedService: "boarding",
        preSelectedRoomId: kennelId,
        preSelectedStartDate: date,
        onCreateBooking: async (newBooking) => {
          // This used to be `console.log("Booking created from occupancy
          // grid", newBooking)`. The wizard closed, the operator believed a
          // kennel was booked, and nothing had happened.
          try {
            const created = await bookingMutations.create(
              newBooking,
              currentLocationId,
            );
            // The board itself is derived from the occupancy read, so it has
            // to be refetched or the new guest does not appear in the kennel
            // that was just clicked.
            await queryClient.invalidateQueries({
              queryKey: ["boarding-rooms"],
            });
            await queryClient.invalidateQueries({ queryKey: ["bookings"] });
            toast.success(`Booking #${created.id} created`);
          } catch (error) {
            toast.error("Could not create that booking", {
              description:
                error instanceof Error ? error.message : "Please try again.",
            });
          }
        },
      });
    },
    [kennels, openBookingModal, liveClients, profile.businessName, queryClient],
  );

  const handleAddDaycareBookingFromCell = useCallback(
    (sectionId: string, date: string) => {
      const target = daycareKennels.find((k) => k.id === sectionId);
      if (!target || target.status === "maintenance") return;
      openBookingModal({
        clients: liveClients,
        facilityId: 11,
        facilityName: profile.businessName,
        preSelectedService: "daycare",
        preSelectedRoomId: sectionId,
        preSelectedStartDate: date,
        onCreateBooking: async (newBooking) => {
          // Same as the boarding grid above: this logged to the console and
          // reported nothing, so a daycare place booked from this screen was
          // never booked. The SECTIONS on this half are still fixtures — there
          // is no daycare-areas table — but the BOOKING it creates is real.
          try {
            const created = await bookingMutations.create(
              newBooking,
              currentLocationId,
            );
            await queryClient.invalidateQueries({ queryKey: ["bookings"] });
            toast.success(`Booking #${created.id} created`);
          } catch (error) {
            toast.error("Could not create that booking", {
              description:
                error instanceof Error ? error.message : "Please try again.",
            });
          }
        },
      });
    },
    [
      daycareKennels,
      openBookingModal,
      liveClients,
      profile.businessName,
      queryClient,
    ],
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
      <PageHeader
        title="Occupancy"
        description={
          serviceType === "boarding"
            ? "Manage kennel occupancy and bookings"
            : serviceType === "daycare"
              ? "Manage daycare play areas and reservations"
              : "Manage kennel occupancy and daycare reservations"
        }
        secondary={
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
        }
      />

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
              facilityName={profile.businessName}
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
              facilityName={profile.businessName}
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
