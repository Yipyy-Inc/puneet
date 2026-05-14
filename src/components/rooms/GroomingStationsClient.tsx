"use client";

import { useEffect, useState } from "react";
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
  CheckCircle2,
  Sparkles,
  AlertOctagon,
  PauseCircle,
  User,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  GroomingStation,
  GroomingStationPetSize,
  GroomingStationStatus,
  GroomingStationType,
} from "@/types/rooms";
import { RoomImageUpload } from "@/components/rooms/RoomImageUpload";
import { useGroomingStations } from "@/hooks/use-grooming-stations";
import { KpiTile, type KpiTone } from "@/components/facility/dashboard/kpi-tile";

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

// ── Station status config ──────────────────────────────────────────────────────

type StatusMeta = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  /** Used for the prominent status pill on each card. */
  pill: string;
  /** Used for the summary tile + the colored top bar on each card. */
  bar: string;
  text: string;
};

type BoardPalette = {
  /** Card background — soft, fills the whole tile so it scans from across the room. */
  cardBg: string;
  /** Border that pairs with cardBg. */
  cardBorder: string;
  /** Solid pill used on the colored card (high-contrast). */
  solidPill: string;
  /** Body text color on the colored card. */
  cardText: string;
};

const STATUS_META: Record<
  GroomingStationStatus,
  StatusMeta & { board: BoardPalette }
> = {
  available: {
    label: "Available",
    Icon: CheckCircle2,
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    board: {
      cardBg: "bg-emerald-50 dark:bg-emerald-950/30",
      cardBorder: "border-emerald-300 dark:border-emerald-800",
      solidPill: "bg-emerald-600 text-white",
      cardText: "text-emerald-950 dark:text-emerald-100",
    },
  },
  "in-use": {
    label: "In Use",
    Icon: User,
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    board: {
      cardBg: "bg-amber-50 dark:bg-amber-950/30",
      cardBorder: "border-amber-300 dark:border-amber-800",
      solidPill: "bg-amber-600 text-white",
      cardText: "text-amber-950 dark:text-amber-100",
    },
  },
  "needs-cleaning": {
    label: "Needs Cleaning",
    Icon: Sparkles,
    pill: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    board: {
      cardBg: "bg-red-50 dark:bg-red-950/30",
      cardBorder: "border-red-300 dark:border-red-800",
      solidPill: "bg-red-600 text-white",
      cardText: "text-red-950 dark:text-red-100",
    },
  },
  "out-of-service": {
    label: "Out of Service",
    Icon: AlertOctagon,
    pill: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    bar: "bg-slate-500",
    text: "text-slate-600 dark:text-slate-400",
    board: {
      cardBg: "bg-slate-100 dark:bg-slate-900/40",
      cardBorder: "border-slate-300 dark:border-slate-700",
      solidPill: "bg-slate-600 text-white",
      cardText: "text-slate-700 dark:text-slate-300",
    },
  },
};

// Map each station status to the matching dashboard KpiTile tone + a short
// hint sentence so the tiles read consistently with the rest of the app.
const STATUS_KPI_TONE: Record<GroomingStationStatus, KpiTone> = {
  available: "emerald",
  "in-use": "amber",
  "needs-cleaning": "rose",
  "out-of-service": "slate",
};

const STATUS_KPI_HINT: Record<GroomingStationStatus, string> = {
  available: "Ready for the next pet",
  "in-use": "Currently grooming",
  "needs-cleaning": "Needs sanitizing",
  "out-of-service": "See station notes",
};

function formatCompletion(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  const timeLabel = date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const mins = Math.round((date.getTime() - Date.now()) / 60_000);
  if (mins > 1) return { timeLabel, relative: `in ${mins} min`, overdue: false };
  if (mins >= 0)
    return { timeLabel, relative: "any minute now", overdue: false };
  return {
    timeLabel,
    relative: `${Math.abs(mins)} min overdue`,
    overdue: true,
  };
}

function getStatus(s: GroomingStation): GroomingStationStatus {
  if (s.active === false) return "out-of-service";
  return s.status ?? "available";
}

// ── Pet size capacity ─────────────────────────────────────────────────────────

const PET_SIZE_OPTIONS: { value: GroomingStationPetSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "giant", label: "Giant" },
];

const SIZE_BADGE_PALETTE: Record<GroomingStationPetSize, string> = {
  small: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  medium: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
  large: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  giant: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300",
};

/**
 * True if the station can accept a pet of `size`. Empty allowedPetSizes (or
 * undefined) means multi-purpose — accepts every size.
 */
export function isStationEligibleForPetSize(
  station: GroomingStation,
  size: GroomingStationPetSize,
): boolean {
  if (!station.allowedPetSizes || station.allowedPetSizes.length === 0) {
    return true;
  }
  return station.allowedPetSizes.includes(size);
}

function PetSizeBadges({
  sizes,
  className,
}: {
  sizes?: GroomingStationPetSize[];
  className?: string;
}) {
  const isAll = !sizes || sizes.length === 0 || sizes.length === 4;
  if (isAll) {
    return (
      <span
        className={cn(
          "rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 uppercase dark:bg-slate-800 dark:text-slate-300",
          className,
        )}
      >
        Any size
      </span>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {sizes!.map((s) => (
        <span
          key={s}
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize",
            SIZE_BADGE_PALETTE[s],
          )}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function formatRelative(iso?: string): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

/**
 * Returns true once the component has mounted on the client. Use this to gate
 * any rendering that depends on `Date.now()` so SSR output (which is computed
 * at a different wall-clock moment) doesn't mismatch the first client render.
 * Auto-ticks every minute so "X min ago" / "in Y min" labels stay fresh while
 * the board is open.
 */
function useNowTick(intervalMs = 60_000): boolean {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return mounted;
}

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
    setStationStatus,
  } = useGroomingStations();
  const stations = allStations.filter((s) => s.facilityId === facilityId);

  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: GroomingStation | null;
  }>({ open: false, editing: null });
  const [form, setForm] = useState<GroomingStation>(() => blank(facilityId));
  const [view, setView] = useState<"board" | "manage">("board");
  const [statusFilter, setStatusFilter] = useState<GroomingStationStatus | null>(
    null,
  );

  function toggleStatusFilter(s: GroomingStationStatus) {
    setStatusFilter((prev) => (prev === s ? null : s));
  }

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

  // Real-time status counts — drives the status board summary at the top.
  const statusCounts = stations.reduce(
    (acc, s) => {
      const status = getStatus(s);
      acc[status] += 1;
      return acc;
    },
    {
      available: 0,
      "in-use": 0,
      "needs-cleaning": 0,
      "out-of-service": 0,
    } as Record<GroomingStationStatus, number>,
  );

  const handleStatusChange = (
    id: string,
    next: GroomingStationStatus,
  ) => {
    setStationStatus(id, next);
    toast.success(`Station marked ${STATUS_META[next].label.toLowerCase()}`);
  };

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
            {view === "board"
              ? "Live floor view — see which stations are free for the next walk-in"
              : "Manage tables, tubs, and drying stations — active station count controls booking capacity"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border bg-card p-1 shadow-sm">
            {(["board", "manage"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-4 py-1 text-sm font-medium capitalize transition-all",
                  view === v
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {view === "manage" && (
            <Button onClick={() => openDialog()} className="shrink-0 gap-1.5">
              <Plus className="size-4" />
              Add Station
            </Button>
          )}
        </div>
      </div>

      {/* Real-time status board — clickable KPI tiles double as filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            "available",
            "in-use",
            "needs-cleaning",
            "out-of-service",
          ] as GroomingStationStatus[]
        ).map((status) => {
          const meta = STATUS_META[status];
          return (
            <KpiTile
              key={status}
              label={meta.label}
              value={statusCounts[status]}
              hint={STATUS_KPI_HINT[status]}
              icon={meta.Icon as LucideIcon}
              tone={STATUS_KPI_TONE[status]}
              onClick={() => toggleStatusFilter(status)}
              active={statusFilter === status}
            />
          );
        })}
      </div>
      {statusFilter && view === "board" && (
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className="self-start text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Showing {STATUS_META[statusFilter].label.toLowerCase()} stations ·{" "}
          <span className="underline">clear filter</span>
        </button>
      )}

      {view === "board" && (
        <StationBoard
          stations={stations}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
        />
      )}

      {view === "manage" && (
      <>
      {/* Capacity stats */}
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
                onStatusChange={handleStatusChange}
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
      </>
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
  onStatusChange,
}: {
  sType: StationType;
  stations: GroomingStation[];
  onEdit: (s: GroomingStation) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, next: GroomingStationStatus) => void;
}) {
  const { Icon, iconBg, iconColor, plural } = sType;
  // Expanded by default so the status board is glanceable at first paint.
  const [expanded, setExpanded] = useState(true);
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
                onStatusChange={(next) => onStatusChange(s.id, next)}
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
  onStatusChange,
}: {
  station: GroomingStation;
  sType: StationType;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onStatusChange: (next: GroomingStationStatus) => void;
}) {
  const { Icon, iconBg, iconColor, defaultImage } = sType;
  const displayImage = station.imageUrl ?? defaultImage;
  const status = getStatus(station);
  const statusMeta = STATUS_META[status];
  // Defer Date.now()-derived text until after mount so SSR/CSR match;
  // hook also ticks every minute so "X min ago" stays fresh.
  const mounted = useNowTick();
  const relative = mounted ? formatRelative(station.statusChangedAt) : "";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md",
      )}
    >
      {/* Status accent bar — lets a manager scan a wall of cards at a glance. */}
      <span
        className={cn("absolute inset-x-0 top-0 z-10 h-1", statusMeta.bar)}
        aria-hidden
      />

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
            title="Active for bookings"
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
        <div
          className={cn(
            "absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm",
            statusMeta.pill,
          )}
        >
          <statusMeta.Icon className="size-3" />
          {statusMeta.label}
        </div>
      </div>

      <div className="p-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{station.name}</p>
          {relative && (
            <span
              className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground"
              title={`Status changed ${relative}`}
            >
              <Clock className="size-2.5" />
              {relative}
            </span>
          )}
        </div>

        {/* Occupancy info when in use */}
        {status === "in-use" && (station.currentPetName || station.currentStylistName) && (
          <div className="mt-2 rounded-lg bg-blue-50/70 px-2.5 py-1.5 text-[11px] text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            {station.currentPetName && (
              <p className="truncate font-semibold">
                {station.currentPetName}
              </p>
            )}
            {station.currentStylistName && (
              <p className="truncate text-blue-700/80 dark:text-blue-300/80">
                with {station.currentStylistName}
              </p>
            )}
          </div>
        )}

        <PetSizeBadges sizes={station.allowedPetSizes} className="mt-2" />
        {station.maxWeightLbs && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Max {station.maxWeightLbs} lbs
          </p>
        )}
        {station.staffNotes && (
          <p
            className="mt-1 truncate text-[11px] text-muted-foreground"
            title={station.staffNotes}
          >
            {station.staffNotes}
          </p>
        )}

        {/* Primary status action — visible per state */}
        <div className="mt-3 flex flex-col gap-1.5">
          {status === "in-use" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => onStatusChange("needs-cleaning")}
            >
              <Sparkles className="size-3.5" />
              Check Out → Needs Cleaning
            </Button>
          )}
          {status === "needs-cleaning" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onStatusChange("available")}
            >
              <CheckCircle2 className="size-3.5" />
              Mark Clean
            </Button>
          )}
          {status === "available" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => onStatusChange("out-of-service")}
            >
              <PauseCircle className="size-3.5" />
              Take Out of Service
            </Button>
          )}
          {status === "out-of-service" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => onStatusChange("available")}
            >
              <CheckCircle2 className="size-3.5" />
              Bring Back Online
            </Button>
          )}

          {/* Secondary row — appears on hover, keeps the card glanceable */}
          <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
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
              className="h-7 px-2 text-destructive/70 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Station Board (front-of-house view) ───────────────────────────────────────

function StationBoard({
  stations,
  statusFilter,
  onStatusChange,
}: {
  stations: GroomingStation[];
  statusFilter: GroomingStationStatus | null;
  onStatusChange: (id: string, next: GroomingStationStatus) => void;
}) {
  // Defer time-relative text to post-mount (Date.now() / module-load timestamps
  // mismatch between server render and client hydration). Hook also ticks every
  // minute so "in X min" / "X min ago" labels stay fresh on the live board.
  const mounted = useNowTick();

  if (stations.length === 0) return null;

  // Action priority drives the visual order so what needs attention sits up top.
  const STATUS_ORDER: GroomingStationStatus[] = [
    "needs-cleaning",
    "in-use",
    "available",
    "out-of-service",
  ];
  const filtered = statusFilter
    ? stations.filter((s) => getStatus(s) === statusFilter)
    : stations;

  const sorted = [...filtered].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(getStatus(a));
    const bi = STATUS_ORDER.indexOf(getStatus(b));
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  if (sorted.length === 0 && statusFilter) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        No stations are currently {STATUS_META[statusFilter].label.toLowerCase()}.
      </div>
    );
  }

  const typeMeta = (type: GroomingStationType) =>
    STATION_TYPES.find((t) => t.value === type) ?? STATION_TYPES[0];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {sorted.map((station) => {
        const status = getStatus(station);
        const meta = STATUS_META[status];
        const sType = typeMeta(station.type);
        const completion = mounted
          ? formatCompletion(station.estimatedCompletionAt)
          : null;
        const lastUsedRelative = mounted
          ? formatRelative(station.statusChangedAt)
          : "";
        return (
          <div
            key={station.id}
            className={cn(
              "flex flex-col rounded-xl border px-2.5 py-2 shadow-sm transition-all",
              meta.board.cardBg,
              meta.board.cardBorder,
              meta.board.cardText,
            )}
          >
            {/* Top row — type icon + status pill */}
            <div className="flex items-start justify-between gap-1.5">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg bg-white/70 shadow-sm dark:bg-slate-900/60",
                )}
              >
                <sType.Icon className={cn("size-3.5", sType.iconColor)} />
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase shadow-sm",
                  meta.board.solidPill,
                )}
              >
                <meta.Icon className="size-2.5" />
                {meta.label}
              </span>
            </div>

            {/* Station identity */}
            <p className="mt-1.5 text-sm/tight font-extrabold truncate">
              {station.name}
            </p>
            <p className="mt-0.5 text-[10px] opacity-70 truncate">
              {sType.label}
            </p>
            <PetSizeBadges
              sizes={station.allowedPetSizes}
              className="mt-1"
            />

            {/* In-use details — pet + completion time */}
            {status === "in-use" && (station.currentPetName || completion) && (
              <div className="mt-1.5 rounded-lg bg-white/60 px-2 py-1.5 shadow-sm dark:bg-slate-900/40">
                {station.currentPetName && (
                  <p className="truncate text-xs/tight font-bold">
                    {station.currentPetName}
                  </p>
                )}
                {station.currentStylistName && (
                  <p className="truncate text-[10px] opacity-80">
                    with {station.currentStylistName}
                  </p>
                )}
                {completion && (
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-semibold">
                    <Clock className="size-3" />
                    {completion.timeLabel}
                    <span
                      className={cn(
                        "text-[10px] font-normal",
                        completion.overdue
                          ? "rounded-full bg-red-600 px-1 py-0.5 text-white"
                          : "opacity-70",
                      )}
                    >
                      {completion.relative}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Cleaning notice */}
            {status === "needs-cleaning" && (
              <p className="mt-1.5 text-[10px] font-medium opacity-80">
                Last used {lastUsedRelative || "moments ago"}.
              </p>
            )}

            {/* Out-of-service notes (e.g., maintenance) */}
            {status === "out-of-service" && station.staffNotes && (
              <p
                className="mt-1.5 truncate text-[10px] italic opacity-80"
                title={station.staffNotes}
              >
                {station.staffNotes}
              </p>
            )}

            {/* Primary action — kept prominent on the board so floor staff
                can act fast without hunting for menus. */}
            <div className="mt-auto pt-2">
              {status === "needs-cleaning" && (
                <Button
                  size="sm"
                  className="h-7 w-full gap-1 px-2 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => onStatusChange(station.id, "available")}
                >
                  <CheckCircle2 className="size-3" />
                  Mark Clean
                </Button>
              )}
              {status === "in-use" && (
                <Button
                  size="sm"
                  className="h-7 w-full gap-1 px-2 text-xs bg-red-600 text-white hover:bg-red-700"
                  onClick={() =>
                    onStatusChange(station.id, "needs-cleaning")
                  }
                >
                  <Sparkles className="size-3" />
                  Check Out
                </Button>
              )}
              {status === "out-of-service" && (
                <Button
                  size="sm"
                  className="h-7 w-full gap-1 px-2 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => onStatusChange(station.id, "available")}
                >
                  <CheckCircle2 className="size-3" />
                  Bring Back Online
                </Button>
              )}
              {status === "available" && (
                <p className="text-center text-[10px] font-medium opacity-70">
                  Ready for next pet
                </p>
              )}
            </div>
          </div>
        );
      })}
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
            <Label>Accepts Pet Sizes</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PET_SIZE_OPTIONS.map((opt) => {
                const checked =
                  !form.allowedPetSizes ||
                  form.allowedPetSizes.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    htmlFor={`size-${opt.value}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                      checked
                        ? "border-foreground/20 bg-muted/60"
                        : "border-input hover:bg-muted/30",
                    )}
                  >
                    <Checkbox
                      id={`size-${opt.value}`}
                      checked={checked}
                      onCheckedChange={(c) => {
                        const current =
                          form.allowedPetSizes && form.allowedPetSizes.length > 0
                            ? form.allowedPetSizes
                            : (PET_SIZE_OPTIONS.map(
                                (o) => o.value,
                              ) as GroomingStationPetSize[]);
                        const next = c
                          ? Array.from(new Set([...current, opt.value]))
                          : current.filter((v) => v !== opt.value);
                        setForm({
                          ...form,
                          // Empty array stays as empty (no size accepted) so the
                          // staff explicitly sees the warning below; toggling all
                          // four back on cleans it to undefined = multi-purpose.
                          allowedPetSizes:
                            next.length === 4 ? undefined : next,
                        });
                      }}
                    />
                    <span className="capitalize">{opt.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {!form.allowedPetSizes || form.allowedPetSizes.length === 0
                ? form.allowedPetSizes
                  ? "No sizes selected — this station will be hidden from bookings."
                  : "Multi-purpose — accepts every pet size."
                : `Will appear in bookings for ${form.allowedPetSizes.join(", ")} pets only.`}
            </p>
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
