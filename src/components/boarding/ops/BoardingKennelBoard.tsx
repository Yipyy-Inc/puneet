"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import type { PetType } from "@/data/boarding-ops";
import {
  BoardingMoveError,
  useAssignBoardingRoom,
  useBoardingRooms,
  useMoveBoardingStay,
} from "@/lib/api/boarding-rooms";
import type { RoomOccupancy } from "@/lib/api/mappers/boarding";
import { pgTimestamp } from "@/lib/boarding/stay-segments";
import { todayIso } from "@/lib/care-log-scheduler";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  RoomAssignmentBoard,
  type AssignableOccupant,
  type RoomAssignments,
} from "./RoomAssignmentBoard";

// ============================================================================
// Where the guests currently here are, and moving one.
//
// `PUT /api/boarding/stays` and `assign_boarding_room` shipped four changes
// ago, covered end to end, and NOTHING IN THE APP COULD CALL THEM. The only
// room-assignment surface was `BoardingRequestDialog`, which places a
// `BoardingBookingRequest` — a pre-booking object with no booking ref — so a
// kennel could be chosen when the stay was created and never changed
// afterwards. A guest who needed moving had to be moved in the database.
//
// This is that screen. It reuses `RoomAssignmentBoard` rather than growing a
// second drag-and-drop grid: the rules it enforces (a category's pet-type
// rules, capacity, a kennel already taken) are the same rules, and the second
// copy is the one that would drift.
//
// ── THE UNIT DRAGGED HERE IS A BOOKING, NOT A PET ─────────────────────────
//
// A booking may cover several pets and they stay together — a kennel is held
// by a BOOKING. That is why `AssignableOccupant.id` is neutral and this file
// puts a booking ref in it. A booking can move kennels part-way, so it holds
// its stays as a sequence; the board shows the one the guest sleeps in
// tonight, and dragging a guest who arrived before today moves them from
// tonight on (`POST /api/boarding/stays/move`) rather than rewriting the
// nights already slept.
//
// ── THE BOARD IS A COURTESY; THE CONSTRAINT IS THE RULE ───────────────────
//
// Taken kennels are greyed out from the same occupancy read the write is
// judged against, so the two agree. They can still disagree for the length of
// a drag, and when they do the exclusion constraint refuses and this shows the
// 409 rather than pretending the move happened.
// ============================================================================

/** Today, as the half-open instant pair the occupancy read expects. */
function today(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function BoardingKennelBoard() {
  const { from, to } = useMemo(today, []);
  const { data, isLoading, error } = useBoardingRooms();
  const assign = useAssignBoardingRoom();
  const moveStay = useMoveBoardingStay();
  const { fill } = useStaffText("kennelMoves");
  const [allowOverride, setAllowOverride] = useState(false);

  const occupied = useMemo(() => data?.occupied ?? [], [data]);

  /**
   * Each guest's stay TONIGHT — one per booking, not one per stay row.
   *
   * A guest who moves kennels today holds two stays that both touch today:
   * the kennel they leave and the one they sleep in. The card goes where they
   * sleep, which is the stay that began last.
   */
  const tonight = useMemo(() => {
    const byRef = new Map<number, RoomOccupancy>();
    for (const stay of occupied) {
      if (stay.bookingRef === 0) continue;
      const seen = byRef.get(stay.bookingRef);
      if (!seen || stay.from > seen.from) byRef.set(stay.bookingRef, stay);
    }
    return byRef;
  }, [occupied]);

  const occupants = useMemo<AssignableOccupant[]>(
    () =>
      [...tonight.values()].map((stay) => {
        const pets = stay.petNames.length > 0 ? stay.petNames : ["Guest"];
        return {
          id: stay.bookingRef,
          name: pets.join(", "),
          petType: (stay.petType as PetType) ?? "dog",
          // Already booked and already placed: eligibility was decided when
          // the stay was created. Re-litigating it here would grey out a guest
          // who is asleep in the kennel.
          eligible: true,
          detail: [stay.clientName, `#${stay.bookingRef}`]
            .filter(Boolean)
            .join(" · "),
        };
      }),
    [tonight],
  );

  const assignments = useMemo<RoomAssignments>(() => {
    const map: RoomAssignments = {};
    for (const stay of tonight.values()) {
      (map[stay.roomId] ??= []).push(stay.bookingRef);
    }
    return map;
  }, [tonight]);

  // EVERY occupied kennel, including the one each guest is already in. The
  // board takes this as a prop rather than per-drag, so it cannot know which
  // guest is in flight — and a kennel a guest already occupies is one they do
  // not need to be dropped into.
  //
  // After a move the mutation invalidates this read, so a kennel freed by
  // taking someone out becomes available on the refetch rather than at the
  // moment of the drop.
  const occupiedRoomIds = useMemo(
    () => occupied.map((o) => o.roomId),
    [occupied],
  );

  const move = (bookingRef: number, roomId: string | null) => {
    const stay = tonight.get(bookingRef);
    const leaves = stay ? pgTimestamp(stay.to) : null;
    // A guest staying tonight moves FROM TONIGHT: the nights already slept
    // stay in the kennel they were slept in, and a later move already planned
    // stays planned. Moving the whole booking rewrote all of it, so a kennel
    // somebody else had used earlier in the week refused a guest being moved
    // into it today. A guest leaving today has no night left to move, and is
    // moved whole, as before.
    if (roomId && stay && leaves !== null && leaves > Date.parse(to)) {
      const guest = stay.petNames.join(", ") || `#${bookingRef}`;
      const room = data?.rooms.find((r) => r.id === roomId)?.name ?? roomId;
      moveStay.mutate(
        {
          bookingRef,
          from: todayIso(),
          roomId,
          ...(allowOverride ? { overrideReason: "Manual override" } : {}),
        },
        {
          onSuccess: () =>
            toast.success(fill("movedFromTonight", { guest, room })),
          onError: (err) =>
            toast.error(
              fill(
                `refused_${err instanceof BoardingMoveError && err.reason ? err.reason : "failed"}`,
                { guest, room },
              ),
            ),
        },
      );
      return;
    }
    assign.mutate(
      {
        bookingRef,
        roomId,
        ...(allowOverride && roomId
          ? { overrideReason: "Manual override" }
          : {}),
      },
      {
        onSuccess: () =>
          toast.success(
            roomId
              ? `#${bookingRef} moved to ${roomId}`
              : `#${bookingRef} taken out of its kennel`,
          ),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertDescription>
          Could not load the kennels: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (occupants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Nobody is in a kennel today
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Guests appear here once a boarding booking covering today has a kennel
          assigned. A stay with no kennel is not shown — it has nothing to move.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Kennels today</h3>
        <p className="text-muted-foreground text-sm">
          {occupants.length} guest{occupants.length === 1 ? "" : "s"} in{" "}
          {Object.keys(assignments).length} kennel
          {Object.keys(assignments).length === 1 ? "" : "s"}. Drag a guest to
          move them; the database refuses a kennel that is already taken for
          these nights.
        </p>
      </div>

      <RoomAssignmentBoard
        rooms={data?.rooms ?? []}
        categories={data?.categories ?? []}
        pets={occupants}
        assignments={assignments}
        allowOverride={allowOverride}
        occupiedRoomIds={occupiedRoomIds}
        onToggleOverride={setAllowOverride}
        onAssign={(bookingRef, roomId) => move(bookingRef, roomId)}
        onUnassign={(bookingRef) => move(bookingRef, null)}
      />

      <p className="text-muted-foreground text-xs">
        Showing {new Date(from).toLocaleDateString()} —{" "}
        {new Date(to).toLocaleDateString()}.
      </p>
    </div>
  );
}
