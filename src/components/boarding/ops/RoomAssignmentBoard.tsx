"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BoardingRoom, PetType } from "@/data/boarding-ops";
import { GripVertical, X } from "lucide-react";

export interface AssignablePet {
  petId: number;
  petName: string;
  petType: PetType;
  eligible: boolean;
  reason?: string;
}

export type RoomAssignments = Record<string, number[]>;

function canDrop({
  room,
  pet,
  assignedPetIds,
  allowOverride,
}: {
  room: BoardingRoom;
  pet: AssignablePet;
  assignedPetIds: number[];
  allowOverride: boolean;
}) {
  if (allowOverride) return true;
  if (!pet.eligible) return false;
  if (!room.allowedPetTypes.includes(pet.petType)) return false;
  if (assignedPetIds.length >= room.capacity) return false;
  return true;
}

export function RoomAssignmentBoard({
  rooms,
  pets,
  assignments,
  allowOverride,
  onAssign,
  onUnassign,
  onToggleOverride,
}: {
  rooms: BoardingRoom[];
  pets: AssignablePet[];
  assignments: RoomAssignments;
  allowOverride: boolean;
  onAssign: (petId: number, roomId: string) => void;
  onUnassign: (petId: number) => void;
  onToggleOverride: (checked: boolean) => void;
}) {
  const assignedPetIds = useMemo(() => {
    const all = new Set<number>();
    Object.values(assignments).forEach((petIds) =>
      petIds.forEach((id) => all.add(id)),
    );
    return all;
  }, [assignments]);

  const unassignedPets = useMemo(() => {
    return pets.filter((p) => !assignedPetIds.has(p.petId));
  }, [pets, assignedPetIds]);

  const petById = useMemo(() => {
    const map = new Map<number, AssignablePet>();
    pets.forEach((p) => map.set(p.petId, p));
    return map;
  }, [pets]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Room Type Assignment</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Drag pets into rooms. Capacity and pet-type restrictions apply unless override is enabled.
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
          <div className="rounded-md border bg-muted/20 p-3">
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
                <div className="text-xs text-muted-foreground">
                  All pets are assigned.
                </div>
              ) : (
                unassignedPets.map((pet) => (
                  <div
                    key={pet.petId}
                    className={[
                      "rounded-md border bg-background px-3 py-2 flex items-center justify-between gap-2",
                      "data-[eligible=false]:border-destructive/40 data-[eligible=false]:bg-destructive/5",
                      "data-[eligible=false]:opacity-80",
                    ].join(" ")}
                    data-eligible={pet.eligible}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(pet.petId));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {pet.petName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="capitalize">{pet.petType}</span>
                        {!pet.eligible && pet.reason ? (
                          <span className="ml-2">• {pet.reason}</span>
                        ) : null}
                      </div>
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rooms */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => {
              const assigned = assignments[room.id] ?? [];
              const isFull = assigned.length >= room.capacity;
              return (
                <div
                  key={room.id}
                  className={[
                    "rounded-md border bg-background p-3",
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
                        room,
                        pet,
                        assignedPetIds: assigned,
                        allowOverride,
                      })
                    ) {
                      return;
                    }
                    onAssign(petId, room.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {room.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {room.typeId.toUpperCase()} • Cap {assigned.length}/
                        {room.capacity}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <Badge variant="outline" className="capitalize">
                        {room.allowedPetTypes.join(", ")}
                      </Badge>
                      {room.allowsShared ? (
                        <Badge variant="secondary">Shared</Badge>
                      ) : (
                        <Badge variant="outline">Private</Badge>
                      )}
                    </div>
                  </div>

                  {room.restrictions.length > 0 && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {room.restrictions.join(" • ")}
                    </div>
                  )}

                  <div className="mt-3 grid gap-2">
                    {assigned.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        Drop pet here
                      </div>
                    ) : (
                      assigned.map((petId) => {
                        const pet = petById.get(petId);
                        if (!pet) return null;
                        return (
                          <div
                            key={pet.petId}
                            className="rounded-md border bg-muted/20 px-2 py-1.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {pet.petName}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {pet.petType}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onUnassign(pet.petId)}
                            >
                              <X className="h-4 w-4" />
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
        <div className="rounded-md border bg-muted/10 p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1">
            Manual override
          </div>
          <div>
            When enabled, staff can place ineligible pets or exceed capacity temporarily. Use this only with manager approval.
          </div>
          <div className="mt-2">
            <Input placeholder="Override reason (optional)..." />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

