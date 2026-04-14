"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  Scissors,
  Droplets,
  Wind,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GroomingStation, GroomingStationType } from "@/types/rooms";
import { RoomImageUpload } from "@/components/rooms/RoomImageUpload";
import { useGroomingStations } from "@/hooks/use-grooming-stations";

// ── Station type config ────────────────────────────────────────────────────────

type StationType = {
  value: GroomingStationType;
  label: string;
  plural: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  statColor: string;
  defaultImage: string;
};

const STATION_TYPES: StationType[] = [
  {
    value: "table",
    label: "Grooming Table",
    plural: "Tables",
    Icon: Scissors,
    iconBg: "bg-pink-100 dark:bg-pink-950/40",
    iconColor: "text-pink-600 dark:text-pink-300",
    statColor: "text-pink-600 dark:text-pink-400",
    defaultImage:
      "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=600&h=450&fit=crop",
  },
  {
    value: "tub",
    label: "Bathing Tub",
    plural: "Tubs",
    Icon: Droplets,
    iconBg: "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-300",
    statColor: "text-blue-600 dark:text-blue-400",
    defaultImage:
      "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=600&h=450&fit=crop",
  },
  {
    value: "cage_dryer",
    label: "Cage Dryer",
    plural: "Cage Dryers",
    Icon: Wind,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-300",
    statColor: "text-amber-600 dark:text-amber-400",
    defaultImage:
      "https://images.unsplash.com/photo-1587559070757-f72da2f829a8?w=600&h=450&fit=crop",
  },
  {
    value: "stand_dryer",
    label: "Stand Dryer",
    plural: "Stand Dryers",
    Icon: Zap,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-600 dark:text-violet-300",
    statColor: "text-violet-600 dark:text-violet-400",
    defaultImage:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=450&fit=crop",
  },
];

function blank(facilityId: number): GroomingStation {
  return {
    id: `gs-${Date.now()}`,
    facilityId,
    type: "table",
    name: "",
    active: true,
    staffNotes: "",
  };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  facilityId?: number;
}

// ── Client ─────────────────────────────────────────────────────────────────────

export function GroomingStationsClient({ facilityId = 11 }: Props) {
  const {
    stations: allStations,
    addStation,
    updateStation,
    deleteStation,
    toggleStation,
  } = useGroomingStations();
  const stations = allStations.filter((s) => s.facilityId === facilityId);

  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: GroomingStation | null;
  }>({ open: false, editing: null });
  const [form, setForm] = useState<GroomingStation>(() => blank(facilityId));

  const openDialog = (s?: GroomingStation) => {
    setForm(s ? { ...s } : blank(facilityId));
    setDialog({ open: true, editing: s ?? null });
  };
  const closeDialog = () => setDialog({ open: false, editing: null });

  const save = () => {
    if (!form.name.trim()) return;
    if (dialog.editing) {
      updateStation(form);
      toast.success("Station updated");
    } else {
      addStation(form);
      toast.success("Station added");
    }
    closeDialog();
  };

  const remove = (id: string) => {
    deleteStation(id);
    toast.success("Station removed");
  };

  const toggle = (id: string) => toggleStation(id);

  const activeCount = stations.filter((s) => s.active).length;
  const tableCount = stations.filter(
    (s) => s.type === "table" && s.active,
  ).length;
  const tubCount = stations.filter((s) => s.type === "tub" && s.active).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Grooming Stations
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage tables, tubs, and drying stations — active station count
            controls booking capacity
          </p>
        </div>
        <Button onClick={() => openDialog()} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add Station
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Active Stations
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            total operational
          </p>
        </div>
        <div className="bg-card rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Tables
          </p>
          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
            {tableCount}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            grooming tables
          </p>
        </div>
        <div className="bg-card rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Tubs
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {tubCount}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">bathing tubs</p>
        </div>
      </div>

      {/* Sections per type */}
      {stations.length === 0 ? (
        <EmptyGrooming onAdd={() => openDialog()} />
      ) : (
        <div className="space-y-8">
          {STATION_TYPES.map((sType) => {
            const typeStations = stations.filter((s) => s.type === sType.value);
            if (typeStations.length === 0) return null;
            return (
              <StationSection
                key={sType.value}
                sType={sType}
                stations={typeStations}
                onEdit={openDialog}
                onToggle={toggle}
                onDelete={remove}
              />
            );
          })}
        </div>
      )}

      {stations.length > 0 && (
        <Button
          variant="outline"
          onClick={() => openDialog()}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add Station
        </Button>
      )}

      {/* Dialog */}
      <StationDialog
        open={dialog.open}
        editing={dialog.editing}
        form={form}
        setForm={setForm}
        onClose={closeDialog}
        onSave={save}
      />
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

function StationSection({
  sType,
  stations,
  onEdit,
  onToggle,
  onDelete,
}: {
  sType: StationType;
  stations: GroomingStation[];
  onEdit: (s: GroomingStation) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { Icon, iconBg, iconColor, plural } = sType;
  const [expanded, setExpanded] = useState(false);
  const active = stations.filter((s) => s.active).length;
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <div className="hover:bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors">
          {expanded ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            iconBg,
          )}
        >
          <Icon className={cn("size-4", iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{plural}</h3>
          <p className="text-muted-foreground text-xs">
            {stations.length} total · {active} active
          </p>
        </div>
      </button>
      {expanded && (
        <div className="border-border/40 border-t p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {stations.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                sType={sType}
                onEdit={() => onEdit(s)}
                onToggle={() => onToggle(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Station card ───────────────────────────────────────────────────────────────

function StationCard({
  station,
  sType,
  onEdit,
  onToggle,
  onDelete,
}: {
  station: GroomingStation;
  sType: StationType;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { Icon, iconBg, iconColor, defaultImage } = sType;
  const displayImage = station.imageUrl ?? defaultImage;
  return (
    <div
      className={cn(
        "group bg-card overflow-hidden rounded-xl border transition-all hover:shadow-md",
        !station.active && "opacity-60",
      )}
    >
      {/* Station photo */}
      <div className="relative aspect-4/3">
        <img
          src={displayImage}
          alt={station.name}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Switch
            checked={station.active}
            onCheckedChange={onToggle}
            className="scale-75"
          />
        </div>
        <div
          className={cn(
            "absolute top-2 left-2 flex size-7 items-center justify-center rounded-lg shadow-sm",
            iconBg,
          )}
        >
          <Icon className={cn("size-3.5", iconColor)} />
        </div>
      </div>
      <div className="p-4 pt-2">
        <p className="truncate text-sm font-semibold">{station.name}</p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            station.active
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground",
          )}
        >
          {station.active ? "Active" : "Inactive"}
        </p>
        {station.maxWeightLbs && (
          <p className="text-muted-foreground mt-1 text-[11px]">
            Max {station.maxWeightLbs} lbs
          </p>
        )}
        {station.staffNotes && (
          <p
            className="text-muted-foreground mt-1 truncate text-[11px]"
            title={station.staffNotes}
          >
            {station.staffNotes}
          </p>
        )}
        <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs"
            onClick={onEdit}
          >
            <Pencil className="mr-1 size-3" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive/70 hover:text-destructive h-7 px-2"
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

function StationDialog({
  open,
  editing,
  form,
  setForm,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: GroomingStation | null;
  form: GroomingStation;
  setForm: React.Dispatch<React.SetStateAction<GroomingStation>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Station" : "Add Grooming Station"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Station Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v as GroomingStationType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATION_TYPES.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Station Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Table 1, Tub A, Cage Dryer 2…"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Max Weight (lbs)</Label>
            <Input
              type="number"
              min={0}
              value={form.maxWeightLbs ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxWeightLbs: parseInt(e.target.value) || undefined,
                })
              }
              placeholder="No limit"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Staff Notes</Label>
            <Textarea
              value={form.staffNotes ?? ""}
              onChange={(e) => setForm({ ...form, staffNotes: e.target.value })}
              placeholder="Internal notes…"
              rows={2}
              className="resize-none"
            />
          </div>
          <RoomImageUpload
            value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
            label="Station Photo"
            compact
          />
          <Separator />
          <div className="flex items-center gap-2.5">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label className="cursor-pointer text-sm font-normal">
              {form.active
                ? "Active — available for bookings"
                : "Inactive — hidden from bookings"}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim()} onClick={onSave}>
            {editing ? "Save Changes" : "Add Station"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyGrooming({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-muted/20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center">
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-2xl">
        <Scissors className="text-muted-foreground/50 size-8" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No grooming stations yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm">
        Add grooming tables, bathing tubs, and drying stations. Active station
        count controls how many appointments can be booked simultaneously.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 size-4" />
        Add First Station
      </Button>
    </div>
  );
}
