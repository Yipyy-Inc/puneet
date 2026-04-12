"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { RoomCategory, FacilityRoom } from "@/types/rooms";
import { RoomCategoryCard } from "@/components/rooms/RoomCategoryCard";
import { CategoryFormDialog } from "@/components/rooms/CategoryFormDialog";
import { RoomUnitFormDialog } from "@/components/rooms/RoomUnitFormDialog";

interface Props {
  initialCategories: RoomCategory[];
  initialRooms: FacilityRoom[];
  facilityId?: number;
}

export function BoardingRoomsClient({ initialCategories, initialRooms, facilityId = 11 }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [rooms, setRooms] = useState(initialRooms);

  const [catDialog, setCatDialog] = useState<{ open: boolean; editing: RoomCategory | null }>({ open: false, editing: null });
  const [unitDialog, setUnitDialog] = useState<{ open: boolean; editing: FacilityRoom | null; categoryId: string }>({
    open: false, editing: null, categoryId: "",
  });

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalActive = rooms.filter((r) => r.active).length;
  const totalInactive = rooms.filter((r) => !r.active).length;
  const totalCapacity = rooms.filter((r) => r.active).reduce((sum, r) => {
    const cat = categories.find((c) => c.id === r.categoryId);
    return sum + (r.capacity ?? cat?.defaultCapacity ?? 1);
  }, 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const saveCategory = (cat: RoomCategory) => {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === cat.id);
      if (exists) return prev.map((c) => (c.id === cat.id ? cat : c));
      return [...prev, { ...cat, sortOrder: prev.length + 1 }];
    });
    toast.success(catDialog.editing ? "Category updated" : "Category created");
    setCatDialog({ open: false, editing: null });
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setRooms((prev) => prev.filter((r) => r.categoryId !== id));
    toast.success("Category and its units removed");
  };

  const saveUnit = (room: FacilityRoom) => {
    setRooms((prev) => {
      const exists = prev.find((r) => r.id === room.id);
      if (exists) return prev.map((r) => (r.id === room.id ? room : r));
      return [...prev, room];
    });
    toast.success(unitDialog.editing ? "Room updated" : "Room added");
    setUnitDialog({ open: false, editing: null, categoryId: "" });
  };

  const toggleUnit = (id: string) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));

  const deleteUnit = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    toast.success("Room removed");
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rooms & Suites</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure room categories, individual units, and client-facing booking rules
          </p>
        </div>
        <Button onClick={() => setCatDialog({ open: true, editing: null })} className="shrink-0 gap-1.5">
          <Plus className="size-4" />Add Category
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Capacity"   value={totalCapacity}        color="indigo"  sub="active units"     />
        <StatCard label="Active Rooms"     value={totalActive}          color="emerald" sub="ready for booking" />
        <StatCard label="Categories"       value={categories.length}    color="violet"  sub="room types"       />
        <StatCard label="Offline"          value={totalInactive}        color="amber"   sub="inactive rooms"   />
      </div>

      {/* Category cards */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <EmptyState onAdd={() => setCatDialog({ open: true, editing: null })} />
        ) : (
          categories
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => (
              <RoomCategoryCard
                key={cat.id}
                category={cat}
                rooms={rooms.filter((r) => r.categoryId === cat.id)}
                onEditCategory={() => setCatDialog({ open: true, editing: cat })}
                onDeleteCategory={() => deleteCategory(cat.id)}
                onAddUnit={() => setUnitDialog({ open: true, editing: null, categoryId: cat.id })}
                onEditUnit={(room) => setUnitDialog({ open: true, editing: room, categoryId: cat.id })}
                onToggleUnit={toggleUnit}
                onDeleteUnit={deleteUnit}
              />
            ))
        )}
      </div>

      {/* Dialogs */}
      <CategoryFormDialog
        open={catDialog.open}
        editing={catDialog.editing}
        facilityId={facilityId}
        onClose={() => setCatDialog({ open: false, editing: null })}
        onSave={saveCategory}
      />

      <RoomUnitFormDialog
        open={unitDialog.open}
        editing={unitDialog.editing}
        categoryId={unitDialog.categoryId}
        categoryName={categories.find((c) => c.id === unitDialog.categoryId)?.name}
        facilityId={facilityId}
        onClose={() => setUnitDialog({ open: false, editing: null, categoryId: "" })}
        onSave={saveUnit}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, color, sub,
}: {
  label: string; value: number; sub: string;
  color: "indigo" | "emerald" | "violet" | "amber";
}) {
  const text = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[color];
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-muted/20 flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
        <Building2 className="size-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No room categories yet</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Create categories like <span className="font-medium">Private Care Suite</span>,{" "}
        <span className="font-medium">Deluxe Suite</span>, or{" "}
        <span className="font-medium">Condominium</span> to define your boarding capacity.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 size-4" />Create First Category
      </Button>
    </div>
  );
}
