"use client";

import { cn } from "@/lib/utils";

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

// Zone 1 — Today's Status Bar: live counts + revenue + package filter pills.
export function StatusBar({
  counts,
  packages,
  activeFilter,
  onFilter,
}: {
  counts: BoardCounts;
  packages: { id: string; name: string }[];
  activeFilter: string;
  onFilter: (id: string) => void;
}) {
  const tiles: { label: string; value: number; tone: string }[] = [
    {
      label: "Total Booked",
      value: counts.totalBooked,
      tone: "text-slate-700 dark:text-slate-200",
    },
    {
      label: "Checked In",
      value: counts.checkedIn,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "In Progress",
      value: counts.inProgress,
      tone: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Ready for Pickup",
      value: counts.ready,
      tone: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Completed",
      value: counts.completed,
      tone: "text-gray-500 dark:text-gray-400",
    },
    {
      label: "No-Shows",
      value: counts.noShows,
      tone: "text-red-600 dark:text-red-400",
    },
  ];
  return (
    <div className="bg-card space-y-3 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-16">
            <p
              className={cn(
                "text-2xl leading-none font-bold tabular-nums",
                t.tone,
              )}
            >
              {t.value}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] font-medium">
              {t.label}
            </p>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-6">
          <div>
            <p className="text-2xl leading-none font-bold text-slate-700 tabular-nums dark:text-slate-200">
              ${counts.expectedRevenue.toFixed(0)}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] font-medium">
              Expected Revenue
            </p>
          </div>
          <div>
            <p className="text-2xl leading-none font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
              ${counts.collectedRevenue.toFixed(0)}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] font-medium">
              Collected Revenue
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 border-t pt-3">
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
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "hover:bg-muted/60",
      )}
    >
      {label}
    </button>
  );
}
