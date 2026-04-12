"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, Scissors, Droplets, Wind, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GroomingStation, GroomingStationType } from "@/types/rooms";

// ── Station type config ────────────────────────────────────────────────────────

type StationType = {
  value: GroomingStationType;
  label: string;
  plural: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  statColor: string;
};

const STATION_TYPES: StationType[] = [
  {
    value: "table",       label: "Grooming Table", plural: "Tables",
    Icon: Scissors,
    iconBg:    "bg-pink-100 dark:bg-pink-950/40",
    iconColor: "text-pink-600 dark:text-pink-300",
    statColor: "text-pink-600 dark:text-pink-400",
  },
  {
    value: "tub",         label: "Bathing Tub",    plural: "Tubs",
    Icon: Droplets,
    iconBg:    "bg-blue-100 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-300",
    statColor: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "cage_dryer",  label: "Cage Dryer",      plural: "Cage Dryers",
    Icon: Wind,
    iconBg:    "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-300",
    statColor: "text-amber-600 dark:text-amber-400",
  },
  {
    value: "stand_dryer", label: "Stand Dryer",     plural: "Stand Dryers",
    Icon: Zap,
    iconBg:    "bg-violet-100 dark:bg-violet-950/40",
    iconColor: "text-violet-600 dark:text-violet-300",
    statColor: "text-violet-600 dark:text-violet-400",
  },
];

function blank(facilityId: number): GroomingStation {
  return { id: `gs-${Date.now()}`, facilityId, type: "table", name: "", active: true, staffNotes: "" };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  initialStations: GroomingStation[];
  facilityId?: number;
}

// ── Client ─────────────────────────────────────────────────────────────────────

export function GroomingStationsClient({ initialStations, facilityId = 11 }: Props) {
  const [stations, setStations] = useState(initialStations);
  const [dialog, setDialog] = useState<{ open: boolean; editing: GroomingStation | null }>({ open: false, editing: null });
  const [form, setForm] = useState<GroomingStation>(() => blank(facilityId));

  const openDialog = (s?: GroomingStation) => {
    setForm(s ? { ...s } : blank(facilityId));
    setDialog({ open: true, editing: s ?? null });
  };
  const closeDialog = () => setDialog({ open: false, editing: null });

  const save = () => {
    if (!form.name.trim()) return;
    setStations((prev) => {
      const exists = prev.find((s) => s.id === form.id);
      if (exists) return prev.map((s) => (s.id === form.id ? form : s));
      return [...prev, form];
    });
    toast.success(dialog.editing ? "Station updated" : "Station added");
    closeDialog();
  };

  const remove = (id: string) => {
    setStations((prev) => prev.filter((s) => s.id !== id));
    toast.success("Station removed");
  };

  const toggle = (id: string) =>
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));

  const activeCount = stations.filter((s) => s.active).length;
  const tableCount  = stations.filter((s) => s.type === "table" && s.active).length;
  const tubCount    = stations.filter((s) => s.type === "tub"   && s.active).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Grooming Stations</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage tables, tubs, and drying stations — active station count controls booking capacity
          </p>
        </div>
        <Button onClick={() => openDialog()} className="shrink-0 gap-1.5">
          <Plus className="size-4" />Add Station
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Active Stations</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          <p className="text-muted-foreground text-xs mt-0.5">total operational</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Tables</p>
          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{tableCount}</p>
          <p className="text-muted-foreground text-xs mt-0.5">grooming tables</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Tubs</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tubCount}</p>
          <p className="text-muted-foreground text-xs mt-0.5">bathing tubs</p>
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
        <Button variant="outline" onClick={() => openDialog()} className="gap-1.5">
          <Plus className="size-4" />Add Station
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
  sType, stations, onEdit, onToggle, onDelete,
}: {
  sType: StationType;
  stations: GroomingStation[];
  onEdit: (s: GroomingStation) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { Icon, iconBg, iconColor, plural } = sType;
  const active = stations.filter((s) => s.active).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-9 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("size-4", iconColor)} />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{plural}</h3>
          <p className="text-muted-foreground text-xs">{stations.length} total · {active} active</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {stations.map((s) => (
          <StationCard
            key={s.id} station={s} sType={sType}
            onEdit={() => onEdit(s)} onToggle={() => onToggle(s.id)} onDelete={() => onDelete(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Station card ───────────────────────────────────────────────────────────────

function StationCard({
  station, sType, onEdit, onToggle, onDelete,
}: {
  station: GroomingStation;
  sType: StationType;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { Icon, iconBg, iconColor } = sType;
  return (
    <div className={cn(
      "group rounded-xl border bg-card p-4 transition-all hover:shadow-md",
      !station.active && "opacity-60",
    )}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("flex size-9 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("size-4", iconColor)} />
        </div>
        <Switch checked={station.active} onCheckedChange={onToggle} className="scale-75 -mt-0.5" />
      </div>
      <p className="font-semibold text-sm truncate">{station.name}</p>
      <p className={cn("text-xs mt-0.5", station.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
        {station.active ? "Active" : "Inactive"}
      </p>
      {station.maxWeightLbs && (
        <p className="text-[11px] text-muted-foreground mt-1">Max {station.maxWeightLbs} lbs</p>
      )}
      {station.staffNotes && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate" title={station.staffNotes}>
          {station.staffNotes}
        </p>
      )}
      <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={onEdit}>
          <Pencil className="size-3 mr-1" />Edit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive/70 hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

function StationDialog({
  open, editing, form, setForm, onClose, onSave,
}: {
  open: boolean;
  editing: GroomingStation | null;
  form: GroomingStation;
  setForm: React.Dispatch<React.SetStateAction<GroomingStation>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Station" : "Add Grooming Station"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Station Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as GroomingStationType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATION_TYPES.map((st) => (
                  <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Station Name <span className="text-destructive">*</span></Label>
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
              type="number" min={0}
              value={form.maxWeightLbs ?? ""}
              onChange={(e) => setForm({ ...form, maxWeightLbs: parseInt(e.target.value) || undefined })}
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
          <Separator />
          <div className="flex items-center gap-2.5">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label className="cursor-pointer font-normal text-sm">
              {form.active ? "Active — available for bookings" : "Inactive — hidden from bookings"}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
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
    <div className="rounded-2xl border-2 border-dashed bg-muted/20 flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
        <Scissors className="size-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No grooming stations yet</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Add grooming tables, bathing tubs, and drying stations. Active station count controls how many appointments can be booked simultaneously.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 size-4" />Add First Station
      </Button>
    </div>
  );
}
