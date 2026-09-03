"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// Saved views. docs/design-system/design-system.md §5b pattern 02, §6 rule 1.
//
// The reference page calls this "the single largest idea here, and Yipyy has
// nothing like it": a list of 1,054 clients is unusable as one list; the same
// list under six named views is six short lists. THE COUNT BELONGS IN THE
// LABEL — "it is the difference between a tab and an answer".
//
// Measured off the rendered specimen:
//
//   Strip      open rail, gap 22, overflow-x auto, min-width min-content
//   Item       48px tall, 15/600, --ink-secondary, gap 7 to its count
//   Active     15/700, --primary, 2px --primary under its own label
//   Count      13.5, --ink-tertiary, tabular
//   Save       32px dashed circle, +, margin-left 4
//
// ── THIS IS THE ONE LEGAL UNDERLINE, AND THE TEST IS MECHANICAL ───────────
//
// Rule 1 bans an accent line on any edge — border-left, border-bottom,
// border-top, border-right, on rows, cards, tiles, list items, calendar
// blocks or any selected state. The tab strip is the single exception, and
// the reference states the condition rather than leaving it to taste: "an
// open rail with no radius, no fill and no border box, where the line sits
// under its own label. The test is mechanical — give this strip a radius or a
// background and the ban applies again."
//
// So this component has NO rounded class, NO background and NO border box,
// and it must not acquire one. The sidebar is a different component and keeps
// its solid pill.
//
// CLAUDE.md's `border-b-2 border-…` guardrail grep DOES fire on this file,
// and it is meant to. This is the sanctioned exception, so the grep's job
// here is to make somebody read the paragraph above and check the three
// conditions still hold — not to be silenced. If a future edit gives this
// strip a radius, a fill or a border box, the hit stops being a false
// positive and becomes the violation the grep was written to find.
//
// ── 48px IS BOTH THE SPEC AND THE TAP TARGET ──────────────────────────────
//
// §1's control table calls 48px the "tab strip item" height, and rule 7 puts
// the tap-target floor at 48 on phone and tablet. They agree, so the item
// needs no breakpoint. On a phone the strip scrolls sideways with a chip half
// in view (§5m), which is what `overflow-x-auto` + `min-w-min` give.
// ============================================================================

export interface SavedView {
  key: string;
  /** Sentence case, and the name the user gave it (§5r). */
  label: string;
  /**
   * The answer, not decoration. Omit only where the count is genuinely
   * unknown — a view showing "0" is information; a view showing nothing is a
   * tab.
   */
  count?: number;
}

interface SavedViewsProps {
  views: SavedView[];
  activeKey: string;
  onSelect: (key: string) => void;
  /**
   * Saves the current filter set as a new view. Omit and the dashed `+` does
   * not render — rule 9 in reverse: a control that performs nothing is worse
   * than an absent one.
   */
  onSaveView?: () => void;
  /** The accessible name for the `+`, as a full sentence (§5r). */
  saveLabel?: string;
  className?: string;
}

export function SavedViews({
  views,
  activeKey,
  onSelect,
  onSaveView,
  saveLabel = "Save current filters as a view",
  className,
}: SavedViewsProps) {
  return (
    <div
      data-slot="saved-views"
      className={cn("w-full overflow-x-auto", className)}
    >
      <div className="flex w-max min-w-min items-center gap-[22px]">
        {views.map((view) => {
          const isActive = view.key === activeKey;
          return (
            <button
              key={view.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(view.key)}
              className={cn(
                `inline-flex h-12 shrink-0 cursor-pointer items-center gap-[7px] border-b-2 border-b-transparent whitespace-nowrap outline-none`,
                // Rule 3: one transition declaration on this element.
                `transition-[color,border-color] duration-180 ease-[ease] motion-reduce:transition-none`,
                `focus-visible:border-b-primary focus-visible:text-primary`,
                isActive
                  ? "border-b-primary text-primary text-[15px] font-bold"
                  : "text-ink-secondary hover:text-primary text-[15px] font-semibold",
              )}
            >
              {view.label}
              {view.count !== undefined && (
                <span
                  className={cn(
                    "text-ink-tertiary text-[13.5px] tabular-nums",
                    isActive && "font-semibold",
                  )}
                >
                  {view.count.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
        {onSaveView && (
          <button
            type="button"
            aria-label={saveLabel}
            onClick={onSaveView}
            className={cn(
              `border-line-strong text-ink-tertiary bg-card ml-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed outline-none max-lg:size-12`,
              `transition-[transform,color,border-color] duration-180 ease-[ease] motion-reduce:transition-none`,
              `hover:border-primary hover:text-primary hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`,
              `focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:ring-[3px]`,
            )}
          >
            <Plus className="size-[19px]" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
