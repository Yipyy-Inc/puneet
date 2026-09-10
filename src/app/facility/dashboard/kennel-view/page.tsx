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
import {
  useAssignBoardingRoom,
  useBoardingRooms,
  type BoardingRoomsPayload,
} from "@/lib/api/boarding-rooms";
import {
  useBoardingCheckIn,
  useBoardingStayUpdate,
} from "@/lib/api/boarding-attendance";
import { bookingQueries } from "@/lib/api/booking";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatDateShort } from "@/lib/i18n/format";
import type { Booking } from "@/types/booking";
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
import { OccupancyMeter } from "@/components/ui/occupancy-meter";

type Kennel = OccupancyKennel;

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

// ── THE DAYCARE HALF IS REAL, AND SPARSE ─────────────────────────────────
//
// It was `mockDaycareOverlays`: five invented guests ("Bella / Alice
// Johnson / 123-456-7890") in May 2026, the same at every facility, with a
// hard-coded $35 rate. A section now shows the facility's own daycare booking
// assigned to it — the first one from today on — and a section nobody is
// assigned to is vacant.
//
// A daycare section holds many dogs and this board draws ONE guest per row,
// so it cannot show a busy yard; the daycare check-in board is where the day's
// dogs are. See the debt map.
const LIVE = ["cancelled", "declined", "no_show", "completed"];

function daycareDay(b: Booking): string {
  return b.daycareSelectedDates?.[0] ?? b.startDate;
}

function buildDaycareKennels(
  daycareSections: DaycareSection[],
  bookings: Booking[],
  today: string,
): Kennel[] {
  const bySection = new Map<string, Booking>();
  for (const b of bookings) {
    if (b.service !== "daycare" || !b.sectionId) continue;
    if (LIVE.includes(b.status) || daycareDay(b) < today) continue;
    const held = bySection.get(b.sectionId);
    if (!held || daycareDay(b) < daycareDay(held))
      bySection.set(b.sectionId, b);
  }
  return daycareSections
    .filter((s) => s.isActive)
    .map((section) => {
      const booking = bySection.get(section.id);
      const base = {
        id: section.id,
        name: section.name,
        categoryId: section.playAreaId,
        dailyRate: 0,
      };
      if (!booking) return { ...base, status: "vacant" as KennelStatus };
      return {
        ...base,
        status: (booking.status === "checked_in"
          ? "occupied"
          : "reserved") as KennelStatus,
        // The board draws four workflow states; anything else live is a
        // confirmed place on the grid.
        bookingStatus: (booking.status === "checked_in"
          ? "checked_in"
          : booking.status === "pending"
            ? "pending"
            : "confirmed") as OccupancyKennel["bookingStatus"],
        bookingId: booking.id,
        checkIn: daycareDay(booking),
        checkOut: daycareDay(booking),
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
  const { data: allBookings = [] } = useQuery(bookingQueries.all());
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [daycareKennels, setDaycareKennels] = useState<Kennel[]>([]);
  // Rebuilt whenever the sections or the bookings change — both arrive
  // asynchronously, and the board carries a move on top until the refetch.
  useEffect(() => {
    setDaycareKennels(buildDaycareKennels(daycareSections, allBookings, today));
  }, [daycareSections, allBookings, today]);
  const { t, fill, locale } = useStaffText("occupancy");
  const assignRoom = useAssignBoardingRoom();
  const boardingCheckIn = useBoardingCheckIn();
  const boardingStay = useBoardingStayUpdate();
  const nameFor = (list: Kennel[], bookingId: number) =>
    list.find((k) => k.bookingId === bookingId)?.petName ?? t("guest");
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
      void staffInitials;
    },
    [],
  );

  // A kennel move is the stay's room — the same write the kennels board and
  // the booking page use. It was a `console.log("Moved booking")` over local
  // state, so the board showed the dog in its new kennel until the reload put
  // it back. Shown at once, written, and stepped back if the write is refused
  // (a kennel taken in the meantime is a 409 with its own sentence).
  const handleMoveBooking = (
    bookingId: number,
    from: string,
    to: string,
    staff: string,
  ) => {
    const pet = nameFor(kennels, bookingId);
    const room = kennels.find((k) => k.id === to)?.name ?? to;
    moveWithin(setKennels, bookingId, from, to, staff);
    assignRoom.mutate(
      { bookingRef: bookingId, roomId: to },
      {
        onSuccess: () => toast.success(fill("moved", { pet, room })),
        onError: (error) => {
          moveWithin(setKennels, bookingId, to, from, staff);
          toast.error(fill("moveFailed", { pet }), {
            description: error.message,
          });
        },
      },
    );
  };
  // A daycare move is the booking's section.
  const handleDaycareMoveBooking = (
    bookingId: number,
    from: string,
    to: string,
    staff: string,
  ) => {
    const room = daycareKennels.find((k) => k.id === to)?.name ?? to;
    const pet = nameFor(daycareKennels, bookingId);
    moveWithin(setDaycareKennels, bookingId, from, to, staff);
    bookingMutations
      .update(bookingId, { sectionId: to })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        toast.success(fill("moved", { pet, room }));
      })
      .catch((error: unknown) => {
        moveWithin(setDaycareKennels, bookingId, to, from, staff);
        toast.error(fill("moveFailed", { pet }), {
          description: error instanceof Error ? error.message : undefined,
        });
      });
  };

  // Stretching a stay on the grid changes the booking's dates; the stay
  // follows by trigger. It does NOT re-price the booking, and says so.
  const handleResizeStay = (
    kennelId: string,
    checkIn: string,
    checkOut: string,
  ) => {
    const kennel = kennels.find((k) => k.id === kennelId);
    if (!kennel?.bookingId) return;
    const before = { checkIn: kennel.checkIn, checkOut: kennel.checkOut };
    const pet = kennel.petName ?? t("guest");
    const setDates = (dates: { checkIn?: string; checkOut?: string }) =>
      setKennels((prev) =>
        prev.map((k) => (k.id === kennelId ? { ...k, ...dates } : k)),
      );
    setDates({ checkIn, checkOut });
    bookingMutations
      .update(kennel.bookingId, { startDate: checkIn, endDate: checkOut })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["boarding-rooms"] });
        toast.success(
          fill("datesChanged", {
            pet,
            from: formatDateShort(checkIn, locale),
            to: formatDateShort(checkOut, locale),
          }),
          { description: t("datesChangedHelp") },
        );
      })
      .catch((error: unknown) => {
        setDates(before);
        toast.error(t("datesFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
      });
  };

  // The details sheet's arrival and departure — the boarding attendance the
  // arrivals board records. Both were `console.log("check-in", id)`.
  const handleBoardingCheckIn = (bookingId: number) => {
    const pet = nameFor(kennels, bookingId);
    boardingCheckIn.mutate(bookingId, {
      onSuccess: () => {
        setKennels((prev) =>
          prev.map((k) =>
            k.bookingId === bookingId
              ? { ...k, status: "occupied", bookingStatus: "checked_in" }
              : k,
          ),
        );
        toast.success(fill("checkedIn", { pet }));
      },
      onError: (error) =>
        toast.error(t("notSaved"), { description: error.message }),
    });
  };
  const handleBoardingCheckOut = (bookingId: number) => {
    const pet = nameFor(kennels, bookingId);
    boardingStay.mutate(
      { bookingRef: bookingId, checkOut: true },
      {
        onSuccess: () => {
          setKennels((prev) =>
            prev.map((k) =>
              k.bookingId === bookingId
                ? {
                    id: k.id,
                    name: k.name,
                    categoryId: k.categoryId,
                    dailyRate: k.dailyRate,
                    status: "vacant",
                  }
                : k,
            ),
          );
          toast.success(fill("checkedOut", { pet }));
        },
        onError: (error) =>
          toast.error(t("notSaved"), { description: error.message }),
      },
    );
  };

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
          {/* ── §2b territory 3: CAPACITY. ─────────────────────────────────
              "The occupancy meter... solid orange fill on an --inset track,
              figure in body ink beside it. At capacity it does NOT turn red —
              full is not an error."

              This screen is literally called Occupancy and had no meter on
              it: four count tiles and a grid, so how full the building is was
              something you worked out by reading two numbers and subtracting.

              The tiles below stay on their status tones, because vacant /
              occupied / reserved / maintenance are STATES of a room. The
              meter is the one orange idea here. */}
          <div className="border-line bg-card shadow-card rounded-2xl border p-[18px]">
            <OccupancyMeter
              used={statusCounts.occupied}
              capacity={kennels.length}
              label={
                statusCounts.vacant > 0
                  ? `${statusCounts.vacant} ${statusCounts.vacant === 1 ? "room" : "rooms"} free`
                  : "Full"
              }
              sublabel="Rooms occupied right now"
            />
          </div>

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
              onUpdateBooking={(kennelId, checkIn, checkOut) =>
                handleResizeStay(kennelId, checkIn, checkOut)
              }
              onMoveBooking={handleMoveBooking}
              onCheckIn={handleBoardingCheckIn}
              onCheckOut={handleBoardingCheckOut}
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
