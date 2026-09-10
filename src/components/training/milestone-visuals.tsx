"use client";

/**
 * The milestone CARD and the trophy shelf. Consumed by:
 *   - the facility student-profile Overview "Milestones" section
 *   - the customer My Pets trophy shelf
 *   - the existing Progress sub-tab grid in pet-progress-charts
 *
 * The icon/colour TABLE these read now lives in
 * `milestone-visual-table.ts` — see its header for why the data and the
 * components had to be separated.
 */
import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/lib/pet-milestones";
import { MILESTONE_VISUAL } from "@/components/training/milestone-visual-table";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatDateLong } from "@/lib/i18n/format";

// A calendar date, read at local midnight so no zone can move it.
function localDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
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
  const t = useShellText("training");
  const locale = useShellLocale();
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
            {/* The title is looked up by KIND: `milestone.title` is the
                English label the milestone was computed with. */}
            {t(`milestone_${milestone.kind}`)}
          </p>
          {milestone.detail && (
            <p className="text-muted-foreground mt-0.5 truncate text-[11.5px]">
              {milestone.detail}
            </p>
          )}
          <p className="text-muted-foreground mt-1.5 text-[10.5px] tabular-nums">
            {formatDateLong(localDay(milestone.achievedISO), locale)}
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
  const t = useShellText("training");
  if (milestones.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-800">
          {t("trophyShelf").replace("{pet}", petName)}
        </h3>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {t("unlockedCount").replace("{n}", String(milestones.length))}
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
