"use client";

import type { UnitNaming } from "@/lib/api/lodging-units";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { RoomCategory, FacilityRoom } from "@/types/rooms";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRoomCategoryCard } from "@/components/rooms/SortableRoomCategoryCard";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { reorderedClasses } from "@/lib/rooms/reorder-classes";
import { CategoryFormDialog } from "@/components/rooms/CategoryFormDialog";
import { RoomUnitFormDialog } from "@/components/rooms/RoomUnitFormDialog";
import { useRooms } from "@/hooks/use-rooms";
import { useBoardingServices } from "@/lib/api/boarding-catalogue";
import { lodgingTypesNoServiceCanBook } from "@/lib/pricing/boarding-service-choice";
import { NoServiceNotice } from "@/components/rooms/NoServiceNotice";

export function BoardingRoomsClient() {
  const {
    categories: allCategories,
    rooms: allRooms,
    isLoading,
    isSaving,
    addCategory,
    updateCategory,
    deleteCategory,
    addRoom,
    updateRoom,
    deleteRoom,
    toggleRoom,
  } = useRooms();

  // Scope to the BOARDING service, and to nothing else.
  //
  // There was a `c.facilityId === facilityId` here too, against a hardcoded 11
  // handed down by the page. `/api/rooms` already answers with this facility's
  // rooms — `activeFacilityIdForStaff()` plus RLS — and stamps each row with
  // the facility's OWN `legacyRef`, 0 for anything created since the mock era.
  // So the filter did not narrow the list, it emptied it: every facility whose
  // legacy ref is not 11 saw no boarding rooms at all, on the screen that
  // exists to manage them.
  const categories = allCategories.filter((c) => c.service === "boarding");
  const categoryIds = new Set(categories.map((c) => c.id));
  const rooms = allRooms.filter((r) => categoryIds.has(r.categoryId));

  // ── DRAG TO SORT ─────────────────────────────────────────────────────────
  //
  // `sort_order` decides the order kennel classes are offered in, here and in
  // the booking form, and it could only be set by creating classes in the
  // order wanted. A drop shows the new order at once and saves the classes
  // whose position changed. The dropped order is shown only while the server
  // still has the order it was dropped ON: writes refetch in the background,
  // so clearing it on success would flash the old order back, and holding it
  // past the refetch would hide somebody else's later change.
  const { t: orderT, fill: orderFill } = useStaffText("roomsOrder");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const serverOrder = categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const serverSignature = serverOrder
    .map((c) => `${c.id}:${c.sortOrder}`)
    .join("|");
  const [dropped, setDropped] = useState<{
    ids: string[];
    basedOn: string;
  } | null>(null);
  const ordered =
    dropped && dropped.basedOn === serverSignature
      ? [
          ...dropped.ids.flatMap((id) => {
            const category = serverOrder.find((c) => c.id === id);
            return category ? [category] : [];
          }),
          ...serverOrder.filter((c) => !dropped.ids.includes(c.id)),
        ]
      : serverOrder;

  // What a screen reader hears while a class is moved. dnd-kit's own are
  // English and name the raw id ("draggable item cat-1786136174939"); these
  // name the class, in the facility's language.
  const nameOf = (id: string | number | undefined) =>
    ordered.find((c) => c.id === String(id))?.name ?? String(id ?? "");
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      orderFill("pickedUp", { name: nameOf(active.id) }),
    // Not "X is over X": dnd-kit fires it the moment a class is picked up,
    // and it would replace "Picked up X." before anybody heard that.
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? orderFill("over", { name: nameOf(active.id), over: nameOf(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? orderFill("dropped", {
            name: nameOf(active.id),
            over: nameOf(over.id),
          })
        : orderFill("droppedNowhere", { name: nameOf(active.id) }),
    onDragCancel: ({ active }) =>
      orderFill("cancelled", { name: nameOf(active.id) }),
  };
  const accessibility = {
    screenReaderInstructions: { draggable: orderT("instructions") },
    announcements,
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const change = reorderedClasses(
      ordered,
      String(active.id),
      String(over.id),
    );
    if (!change) return;
    setDropped({ ids: change.ids, basedOn: serverSignature });

    const results = await Promise.all(
      change.moves.map((c) => updateCategory(c)),
    );
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      setDropped(null);
      toast.error(orderT("saveFailed"), { description: failed.error });
    }
  };

  // The offered classes no active service can be booked into. Until the menu
  // has loaded nothing is flagged — no services means no warning — so a
  // facility never sees the notice flash over a class that is covered.
  const { data: services } = useBoardingServices();
  const unbookable = new Set(
    lodgingTypesNoServiceCanBook(
      categories.filter((c) => c.active),
      services ?? [],
    ).map((c) => c.id),
  );

  const [catDialog, setCatDialog] = useState<{
    open: boolean;
    editing: RoomCategory | null;
  }>({ open: false, editing: null });
  const [unitDialog, setUnitDialog] = useState<{
    open: boolean;
    editing: FacilityRoom | null;
    categoryId: string;
  }>({
    open: false,
    editing: null,
    categoryId: "",
  });

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalActive = rooms.filter((r) => r.active).length;
  const totalInactive = rooms.filter((r) => !r.active).length;
  const totalCapacity = rooms
    .filter((r) => r.active)
    .reduce((sum, r) => {
      const cat = categories.find((c) => c.id === r.categoryId);
      return sum + (r.capacity ?? cat?.defaultCapacity ?? 1);
    }, 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  //
  // Every one of these AWAITS its write before saying anything. They used to
  // announce "Category created" in the statement after `addCategory(...)` —
  // before the request had been sent, let alone answered — and close the
  // dialog on top of it. A refusal (the `manage_services` policy, a category
  // that still holds rooms, a room with stays recorded against it) then
  // arrived as a second toast contradicting the first, with the typed values
  // already thrown away.
  const saveCategory = async (cat: RoomCategory, naming: UnitNaming) => {
    const isNew = !catDialog.editing;
    const result = isNew
      ? await addCategory(cat, naming)
      : await updateCategory(cat);
    if (!result.ok) {
      toast.error(result.error);
      return; // The dialog stays open, still holding what was typed.
    }
    toast.success(
      !isNew
        ? "Category updated"
        : naming.count > 0
          ? `Category created with ${naming.count} unit${naming.count > 1 ? "s" : ""}`
          : "Category created",
    );
    setCatDialog({ open: false, editing: null });
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteCategory(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Category and its units removed");
  };

  const saveUnit = async (room: FacilityRoom) => {
    const result = unitDialog.editing
      ? await updateRoom(room)
      : await addRoom(room);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(unitDialog.editing ? "Room updated" : "Room added");
    setUnitDialog({ open: false, editing: null, categoryId: "" });
  };

  const handleDeleteUnit = async (id: string) => {
    const result = await deleteRoom(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Room removed");
  };

  const handleToggleUnit = async (id: string) => {
    const result = await toggleRoom(id);
    if (!result.ok) toast.error(result.error);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rooms & Suites</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Configure room categories, individual units, and client-facing
            booking rules
          </p>
        </div>
        <Button
          onClick={() => setCatDialog({ open: true, editing: null })}
          className="shrink-0 gap-1.5"
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Capacity"
          value={totalCapacity}
          color="indigo"
          sub="active units"
          loading={isLoading}
        />
        <StatCard
          label="Active Rooms"
          value={totalActive}
          color="emerald"
          sub="ready for booking"
          loading={isLoading}
        />
        <StatCard
          label="Categories"
          value={categories.length}
          color="violet"
          sub="room types"
          loading={isLoading}
        />
        <StatCard
          label="Offline"
          value={totalInactive}
          color="amber"
          sub="inactive rooms"
          loading={isLoading}
        />
      </div>

      {/* Category cards */}
      <div className="space-y-4">
        {isLoading ? (
          // NOT the empty state. The catalogue is a round trip away, and while
          // it was in flight this screen said "No room categories yet" over
          // four zeroes — a facility with rooms was told it had none, under a
          // button offering to create the first. One facility has three
          // categories called "Suites", two of them 24 seconds apart.
          <LoadingState />
        ) : categories.length === 0 ? (
          <EmptyState
            onAdd={() => setCatDialog({ open: true, editing: null })}
          />
        ) : (
          <DndContext
            sensors={sensors}
            accessibility={accessibility}
            collisionDetection={closestCenter}
            onDragEnd={(event) => void handleDragEnd(event)}
          >
            <SortableContext
              items={ordered.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {ordered.map((cat) => (
                <SortableRoomCategoryCard
                  key={cat.id}
                  category={cat}
                  rooms={rooms.filter((r) => r.categoryId === cat.id)}
                  notice={
                    unbookable.has(cat.id) ? <NoServiceNotice /> : undefined
                  }
                  onEditCategory={() =>
                    setCatDialog({ open: true, editing: cat })
                  }
                  onDeleteCategory={() => handleDeleteCategory(cat.id)}
                  onAddUnit={() =>
                    setUnitDialog({
                      open: true,
                      editing: null,
                      categoryId: cat.id,
                    })
                  }
                  onEditUnit={(room) =>
                    setUnitDialog({
                      open: true,
                      editing: room,
                      categoryId: cat.id,
                    })
                  }
                  onToggleUnit={handleToggleUnit}
                  onDeleteUnit={handleDeleteUnit}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Dialogs */}
      <CategoryFormDialog
        open={catDialog.open}
        editing={catDialog.editing}
        saving={isSaving}
        onClose={() => setCatDialog({ open: false, editing: null })}
        onSave={saveCategory}
      />

      <RoomUnitFormDialog
        open={unitDialog.open}
        editing={unitDialog.editing}
        saving={isSaving}
        categoryId={unitDialog.categoryId}
        categoryName={
          categories.find((c) => c.id === unitDialog.categoryId)?.name
        }
        onClose={() =>
          setUnitDialog({ open: false, editing: null, categoryId: "" })
        }
        onSave={saveUnit}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sub,
  loading = false,
}: {
  label: string;
  value: number;
  sub: string;
  color: "indigo" | "emerald" | "violet" | "amber";
  /** A count nobody has read yet is not zero. */
  loading?: boolean;
}) {
  const text = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[color];
  return (
    <div className="bg-card rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      {loading ? (
        <Skeleton className="my-1 h-6 w-10" />
      ) : (
        <p className={`text-2xl font-bold ${text}`}>{value}</p>
      )}
      <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
    </div>
  );
}

/** Three card-shaped placeholders — "still reading", not "there is nothing". */
function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center">
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-2xl">
        <Building2 className="text-muted-foreground/50 size-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No room categories yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        Create categories like{" "}
        <span className="font-medium">Private Care Suite</span>,{" "}
        <span className="font-medium">Deluxe Suite</span>, or{" "}
        <span className="font-medium">Condominium</span> to define your boarding
        capacity.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 size-4" />
        Create First Category
      </Button>
    </div>
  );
}
