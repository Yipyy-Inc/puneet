"use client";

/**
 * Shared milestone visuals — single source of truth for icon, gradient, and
 * accent color per `MilestoneKind`. Consumed by:
 *   - the facility student-profile Overview "Milestones" section
 *   - the customer My Pets trophy shelf
 *   - the existing Progress sub-tab grid in pet-progress-charts
 *
 * Pulling these into one place means renaming or restyling a milestone
 * propagates everywhere without drift.
 */
import {
  type LucideIcon,
  BookOpen,
  CalendarCheck,
  Crown,
  Flame,
  Footprints,
  GraduationCap,
  Medal,
  PartyPopper,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneKind } from "@/lib/pet-milestones";

interface MilestoneVisual {
  icon: LucideIcon;
  /** Card background gradient — `from-X via-Y to-Z` tokens. */
  gradient: string;
  /** Chip background — solid color on the icon plaque. */
  chip: string;
  /** Subtle ring/border tone — pairs with the gradient. */
  ring: string;
}

export const MILESTONE_VISUAL: Record<MilestoneKind, MilestoneVisual> = {
  "first-session": {
    icon: Footprints,
    gradient: "from-sky-100 via-white to-sky-50",
    chip: "bg-sky-500",
    ring: "ring-sky-200",
  },
  "first-mastered": {
    icon: Crown,
    gradient: "from-violet-100 via-white to-violet-50",
    chip: "bg-violet-500",
    ring: "ring-violet-200",
  },
  "first-series": {
    icon: GraduationCap,
    gradient: "from-amber-100 via-white to-amber-50",
    chip: "bg-amber-500",
    ring: "ring-amber-200",
  },
  "five-sessions": {
    icon: Medal,
    gradient: "from-teal-100 via-white to-teal-50",
    chip: "bg-teal-500",
    ring: "ring-teal-200",
  },
  "ten-sessions": {
    icon: Medal,
    gradient: "from-emerald-100 via-white to-emerald-50",
    chip: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  "twenty-five-sessions": {
    icon: Trophy,
    gradient: "from-fuchsia-100 via-white to-fuchsia-50",
    chip: "bg-fuchsia-500",
    ring: "ring-fuchsia-200",
  },
  "first-homework": {
    icon: BookOpen,
    gradient: "from-rose-100 via-white to-rose-50",
    chip: "bg-rose-500",
    ring: "ring-rose-200",
  },
  "seven-day-homework-streak": {
    icon: Flame,
    gradient: "from-orange-100 via-white to-orange-50",
    chip: "bg-orange-500",
    ring: "ring-orange-200",
  },
  "thirty-day-homework-streak": {
    icon: PartyPopper,
    gradient: "from-pink-100 via-white to-pink-50",
    chip: "bg-pink-500",
    ring: "ring-pink-200",
  },
  // Legacy — keeps existing derivations rendering until that compute path
  // is removed from the codebase.
  "four-week-streak": {
    icon: CalendarCheck,
    gradient: "from-sky-100 via-white to-sky-50",
    chip: "bg-sky-500",
    ring: "ring-sky-200",
  },
};

function formatMilestoneDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Compact single-milestone card. Renders the icon plaque + title + detail +
 *  achieved date — works in a grid, a trophy shelf, or inline. */
export function MilestoneCard({
  milestone,
  className,
}: {
  milestone: Milestone;
  className?: string;
}) {
  const visual = MILESTONE_VISUAL[milestone.kind];
  const Icon = visual.icon;
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-linear-to-br p-3 shadow-sm ring-1",
        visual.gradient,
        visual.ring,
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
            visual.chip,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px]/snug font-bold text-slate-800">
            {milestone.title}
          </p>
          {milestone.detail && (
            <p className="text-muted-foreground mt-0.5 truncate text-[11.5px]">
              {milestone.detail}
            </p>
          )}
          <p className="text-muted-foreground mt-1.5 text-[10.5px] tabular-nums">
            {formatMilestoneDate(milestone.achievedISO)}
          </p>
        </div>
      </div>
    </article>
  );
}

/** Horizontal scrolling trophy shelf — for the customer My Pets tab. Snaps
 *  to each card and wraps on wide screens so desktop users still see
 *  everything at once. */
export function MilestoneTrophyShelf({
  petName,
  milestones,
}: {
  petName: string;
  milestones: Milestone[];
}) {
  if (milestones.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-800">
          {petName}&apos;s trophy shelf
        </h3>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {milestones.length} unlocked
        </span>
      </div>
      <ol className="-mx-1 flex snap-x snap-mandatory items-stretch gap-2.5 overflow-x-auto px-1 pb-1">
        {milestones.map((m) => (
          <li
            key={`${m.kind}-${m.achievedISO}`}
            className="max-w-[260px] min-w-[220px] flex-1 snap-start"
          >
            <MilestoneCard milestone={m} />
          </li>
        ))}
      </ol>
    </section>
  );
}

// Re-export Sparkles so the existing pet-progress-charts MilestonesSection
// (which references it for empty-state copy) doesn't need a separate import
// when it migrates to this module later.
export { Sparkles };
