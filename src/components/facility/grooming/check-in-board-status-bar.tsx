"use client";

import {
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  LogIn,
  PackageCheck,
  Scissors,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KpiTile,
  type KpiTone,
} from "@/components/facility/dashboard/kpi-tile";

export interface BoardCounts {
  totalBooked: number;
  checkedIn: number;
  inProgress: number;
  ready: number;
  completed: number;
  noShows: number;
  expectedRevenue: number;
  collectedRevenue: number;
}

const STATUS_TILES: {
  key: keyof BoardCounts;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: KpiTone;
}[] = [
  {
    key: "totalBooked",
    label: "Total Booked",
    hint: "Appointments today",
    icon: CalendarCheck,
    tone: "slate",
  },
  {
    key: "checkedIn",
    label: "Checked In",
    hint: "Arrived & waiting",
    icon: LogIn,
    tone: "emerald",
  },
  {
    key: "inProgress",
    label: "In Progress",
    hint: "Being groomed",
    icon: Scissors,
    tone: "indigo",
  },
  {
    key: "ready",
    label: "Ready for Pickup",
    hint: "Awaiting pickup",
    icon: PackageCheck,
    tone: "violet",
  },
  {
    key: "completed",
    label: "Completed",
    hint: "Finished today",
    icon: CheckCircle2,
    tone: "slate",
  },
  {
    key: "noShows",
    label: "No-Shows",
    hint: "Did not arrive",
    icon: UserX,
    tone: "rose",
  },
];

// Zone 1 — Today's Status Bar: dashboard-style KPI tiles + revenue tiles, with
// the package filter pills below (matches the main-dashboard Live Activity Board
// look).
export function StatusBar({
  counts,
  packages,
  activeFilter,
  onFilter,
  canSeeAmounts = true,
}: {
  counts: BoardCounts;
  packages: { id: string; name: string }[];
  activeFilter: string;
  onFilter: (id: string) => void;
  /**
   * Section 3C / Table 5 — when false (viewer lacks view_booking_financials),
   * the Expected/Collected Revenue tiles are omitted from the DOM; the rest of
   * the KPI row still renders. Defaults true so admin surfaces are unaffected.
   */
  canSeeAmounts?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {STATUS_TILES.map((t) => (
          <KpiTile
            key={t.key}
            label={t.label}
            value={counts[t.key]}
            hint={t.hint}
            icon={t.icon}
            tone={t.tone}
          />
        ))}
        {canSeeAmounts && (
          <>
            <KpiTile
              label="Expected Revenue"
              value={`$${counts.expectedRevenue.toFixed(0)}`}
              hint="If all appointments complete"
              icon={DollarSign}
              tone="amber"
            />
            <KpiTile
              label="Collected Revenue"
              value={`$${counts.collectedRevenue.toFixed(0)}`}
              hint="Paid so far today"
              icon={DollarSign}
              tone="emerald"
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterPill
          label="All"
          active={activeFilter === "all"}
          onClick={() => onFilter("all")}
        />
        {packages.map((p) => (
          <FilterPill
            key={p.id}
            label={p.name}
            active={activeFilter === p.id}
            onClick={() => onFilter(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-all hover:-translate-y-px hover:shadow-sm",
        active
          ? "border-transparent bg-sky-500 text-white shadow-md"
          : "border-border/70 bg-background hover:bg-muted/60",
      )}
    >
      {label}
    </button>
  );
}
