"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// `BoardingRoom` is gone from this import: rooms come from the facility's own
// model now (20260806660000), where a room belongs to a CATEGORY that carries
// its capacity, its booking rules and the messages shown to clients. The old
// shape flattened all of that onto the room and had a `typeId` enum no row
// ever held.
import { PetType } from "@/data/boarding-ops";
import type { FacilityRoom, RoomCategory, RoomRule } from "@/types/rooms";
import { GripVertical, X } from "lucide-react";

/**
 * Something that can be dragged onto a kennel.
 *
 * `id` is WHATEVER THE CALLER ASSIGNS BY, and the two callers differ:
 *
 *   BoardingRequestDialog  a pet id — a request is placed pet by pet, and the
 *                          whole thing is local until it becomes a booking
 *   BoardingKennelBoard    a BOOKING ref — `PUT /api/boarding/stays` moves a
 *                          booking, and a booking may cover several pets
 *
 * It was called `AssignablePet` with a `petId`, which was true of the first
 * caller only. Passing a booking ref in a field named `petId` is how this
 * codebase ended up with four room models and five tender lists; the field is
 * neutral instead, and this comment says what each caller puts in it.
 */
export interface AssignableOccupant {
  id: number;
  name: string;
  petType: PetType;
  eligible: boolean;
  reason?: string;
  /** Shown under the name — the client, or the nights being stayed. */
  detail?: string;
}

/** Kennel id → the occupant ids in it. */
export type RoomAssignments = Record<string, number[]>;

/**
 * The pet types a category admits, from its `pet_type` rules.
 *
 * No rule means no restriction — an empty list here would refuse every pet,
 * which is the opposite of what "unrestricted" means.
 */
function allowedPetTypes(rules: RoomRule[]): PetType[] | null {
  const values = rules
    .filter((r) => r.enabled && r.type === "pet_type")
    .flatMap((r) => (Array.isArray(r.value) ? r.value : [String(r.value)]));
  return values.length > 0 ? (values as PetType[]) : null;
}

function canDrop({
  category,
  capacity,
  pet,
  assignedPetIds,
  allowOverride,
  takenByAnotherStay,
}: {
  category: RoomCategory | undefined;
  capacity: number;
  pet: AssignableOccupant;
  assignedPetIds: number[];
  allowOverride: boolean;
  takenByAnotherStay: boolean;
}) {
  if (allowOverride) return true;
  if (!pet.eligible) return false;
  const admits = allowedPetTypes(category?.rules ?? []);
  if (admits && !admits.includes(pet.petType)) return false;
  // `assignedPetIds` only ever describes THIS booking, so this line was never
  // a capacity rule — it could not see another guest. `takenByAnotherStay`
  // comes from /api/boarding/rooms and is what the exclusion constraint on
  // boarding_stays will judge, so the board and the save now agree.
  if (takenByAnotherStay) return false;
  if (assignedPetIds.length >= capacity) return false;
  return true;
}

export function RoomAssignmentBoard({
  rooms,
  categories,
  pets,
  assignments,
  allowOverride,
  occupiedRoomIds = [],
  onAssign,
  onUnassign,
  onToggleOverride,
}: {
  rooms: FacilityRoom[];
  categories: RoomCategory[];
  pets: AssignableOccupant[];
  assignments: RoomAssignments;
  allowOverride: boolean;
  /** Rooms already held by another stay across these dates. */
  occupiedRoomIds?: string[];
  onAssign: (occupantId: number, roomId: string) => void;
  onUnassign: (occupantId: number) => void;
  onToggleOverride: (checked: boolean) => void;
}) {
  const takenIds = useMemo(() => new Set(occupiedRoomIds), [occupiedRoomIds]);
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const assignedPetIds = useMemo(() => {
    const all = new Set<number>();
    Object.values(assignments).forEach((petIds) =>
      petIds.forEach((id) => all.add(id)),
    );
    return all;
  }, [assignments]);

  const unassignedPets = useMemo(() => {
    return pets.filter((p) => !assignedPetIds.has(p.id));
  }, [pets, assignedPetIds]);

  const petById = useMemo(() => {
    const map = new Map<number, AssignableOccupant>();
    pets.forEach((p) => map.set(p.id, p));
    return map;
  }, [pets]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Room Type Assignment</CardTitle>
            <div className="text-muted-foreground mt-1 text-xs">
              Drag pets into rooms. Capacity and pet-type restrictions apply
              unless override is enabled.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={allowOverride ? "warning" : "outline"}
              className="data-[enabled=true]:border-warning data-[enabled=true]:text-warning"
              data-enabled={allowOverride}
            >
              Override {allowOverride ? "ON" : "OFF"}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant={allowOverride ? "default" : "outline"}
              onClick={() => onToggleOverride(!allowOverride)}
            >
              Toggle
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Unassigned */}
          <div className="bg-muted/20 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Unassigned</div>
              <Badge variant="secondary">{unassignedPets.length}</Badge>
            </div>
            <div
              className="mt-3 grid gap-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const raw = e.dataTransfer.getData("text/plain");
                const petId = Number(raw);
                if (!Number.isFinite(petId)) return;
                onUnassign(petId);
              }}
              data-dropzone="unassigned"
            >
              {unassignedPets.length === 0 ? (
                <div className="text-muted-foreground text-xs">
                  All pets are assigned.
                </div>
              ) : (
                unassignedPets.map((pet) => (
                  <div
                    key={pet.id}
                    className={[
                      "bg-background flex items-center justify-between gap-2 rounded-md border px-3 py-2",
                      "data-[eligible=false]:border-destructive/40 data-[eligible=false]:bg-destructive/5",
                      "data-[eligible=false]:opacity-80",
                    ].join(" ")}
                    data-eligible={pet.eligible}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(pet.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {pet.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        <span className="capitalize">
                          {pet.detail ?? pet.petType}
                        </span>
                        {!pet.eligible && pet.reason ? (
                          <span className="ml-2">• {pet.reason}</span>
                        ) : null}
                      </div>
                    </div>
                    <GripVertical className="text-muted-foreground size-4 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rooms */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => {
              const assigned = assignments[room.id] ?? [];
              const taken = takenIds.has(room.id);
              const category = categoryById.get(room.categoryId);
              // The room's own number when it has one, otherwise the
              // category's default. NULL means "whatever the category says",
              // so it is resolved here rather than copied onto the room.
              const capacity = room.capacity ?? category?.defaultCapacity ?? 1;
              const admits = allowedPetTypes(category?.rules ?? []);
              const isFull = taken || assigned.length >= capacity;
              return (
                <div
                  key={room.id}
                  className={[
                    "bg-background rounded-md border p-3",
                    "data-[full=true]:border-warning/40 data-[full=true]:bg-warning/5",
                  ].join(" ")}
                  data-full={isFull}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const raw = e.dataTransfer.getData("text/plain");
                    const petId = Number(raw);
                    if (!Number.isFinite(petId)) return;
                    const pet = petById.get(petId);
                    if (!pet) return;
                    if (
                      !canDrop({
                        category,
                        capacity,
                        pet,
                        assignedPetIds: assigned,
                        allowOverride,
                        takenByAnotherStay: takenIds.has(room.id),
                      })
                    ) {
                      return;
                    }
                    onAssign(petId, room.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {room.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {(category?.name ?? "Uncategorised").toUpperCase()} •
                        Cap {assigned.length}/{capacity}
                      </div>
                      {taken && (
                        <div className="text-muted-foreground text-xs">
                          Booked for these dates
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline" className="capitalize">
                        {admits ? admits.join(", ") : "any pet"}
                      </Badge>
                      {capacity > 1 ? (
                        <Badge variant="secondary">Shared</Badge>
                      ) : (
                        <Badge variant="outline">Private</Badge>
                      )}
                    </div>
                  </div>

                  {/* The category's own client-facing rule messages, which the
                      old model had nowhere to keep — it carried opaque
                      `restrictions` strings on each room instead. */}
                  {(category?.rules ?? []).filter((r) => r.enabled).length >
                    0 && (
                    <div className="text-muted-foreground mt-2 text-[11px]">
                      {(category?.rules ?? [])
                        .filter((r) => r.enabled)
                        .map((r) => r.clientMessage)
                        .join(" • ")}
                    </div>
                  )}

                  <div className="mt-3 grid gap-2">
                    {assigned.length === 0 ? (
                      <div className="text-muted-foreground text-xs">
                        Drop pet here
                      </div>
                    ) : (
                      assigned.map((petId) => {
                        const pet = petById.get(petId);
                        if (!pet) return null;
                        return (
                          <div
                            key={pet.id}
                            className="bg-muted/20 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {pet.name}
                              </div>
                              {/* `detail` over `petType` here for the same
                                  reason as the pool card: on the Kennels board
                                  it names the owner and the booking, which is
                                  what somebody standing at the kennel needs.
                                  The request dialog passes no detail and keeps
                                  the species. */}
                              <div className="text-muted-foreground text-xs capitalize">
                                {pet.detail ?? pet.petType}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => onUnassign(pet.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Override helper */}
        <div className="bg-muted/10 text-muted-foreground rounded-md border p-3 text-xs">
          <div className="text-foreground mb-1 font-medium">
            Manual override
          </div>
          <div>
            When enabled, staff can place ineligible pets or exceed capacity
            temporarily. Use this only with manager approval.
          </div>
          <div className="mt-2">
            <Input placeholder="Override reason (optional)..." />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
