"use client";

import type * as React from "react";
import { Filter, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================================
// Filter band. docs/design-system/design-system.md §5b pattern 03, §6 rule 2.
//
// "Search, an all-filters button, and a dashed + chip that adds one criterion
// at a time — each applied filter becoming a removable pill."
//
// Measured off the rendered specimen:
//
//   Band        --inset, radius 16, padding 16, flex wrap, gap 11
//   Search      40px pill, white, 1px --line-strong, flex 1 1 260px
//   All filters 40px outline pill with the `filter` glyph
//   Applied     36px SOLID --primary pill, white 13.5/600, an 18px x
//   Add         36px white pill, 1px DASHED --line-strong, 13.5/600
//
// ── THE BAND IS --inset, AND THAT IS NOT A TINT FILL ──────────────────────
//
// Rule 2 bans tint fills: white, or a solid. `--inset` (#F4F4F6) is a neutral
// surface, not a hue at low opacity — the reference says so where it
// introduces the band: "The band sits on --inset, which is a neutral surface
// and not a tint, so rule 04 holds." An applied filter is the other half of
// the same rule: where a state must dominate it is filled SOLID with the ink
// at full strength, which is why the applied pill is #1668E3 and not blue at
// 10%.
//
// ── THE REMOVE BUTTON IS 18px AND STILL PASSES RULE 7 ─────────────────────
//
// Rule 7 wants 48px tap targets on phone and tablet, tested at 599px. An 18px
// dot inside a 36px pill cannot BE 48px without destroying the pill. So below
// 1024px the target is expanded with a transparent pseudo-element — the hit
// area is 48px, the drawn dot stays 18. `-inset-[15px]` on an 18px box is
// exactly 48. The pill itself steps to 48 tall on the same breakpoint.
// ============================================================================

interface FilterBandProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBand({ children, className }: FilterBandProps) {
  return (
    <div
      data-slot="filter-band"
      className={cn(
        "bg-surface-inset flex flex-wrap items-center gap-[11px] rounded-xl p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FilterBandSearchProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "className"
> {
  /** What the field actually searches, so the placeholder is an answer:
   *  "Name, phone, pet, email" (§5r). */
  placeholder?: string;
  className?: string;
}

export function FilterBandSearch({
  placeholder = "Search",
  className,
  ...props
}: FilterBandSearchProps) {
  return (
    <div className={cn("relative min-w-0 flex-[1_1_260px]", className)}>
      <Search
        aria-hidden
        className="text-ink-tertiary pointer-events-none absolute top-1/2 left-[17px] size-5 -translate-y-1/2"
      />
      <Input
        type="search"
        placeholder={placeholder}
        className={cn(
          "border-line-strong bg-card h-10 rounded-full pr-4 pl-[46px] shadow-none max-lg:h-12",
          // `md:text-sm` sits in Input's own base string and wins at >=768px
          // over a bare `text-[14px]`, so the override has to be declared at
          // the same breakpoint. This exact collision has cost two bugs in
          // this redesign already.
          "text-[14px] md:text-[14px]",
          "focus-visible:border-primary focus-visible:ring-primary/12 focus-visible:border-2 focus-visible:ring-[3px]",
        )}
        {...props}
      />
    </div>
  );
}

interface AllFiltersButtonProps {
  onClick: () => void;
  /** How many filters are currently applied. Shown as a count in the label. */
  count?: number;
  label?: string;
}

export function AllFiltersButton({
  onClick,
  count,
  label = "All filters",
}: AllFiltersButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} className="shrink-0">
      <Filter aria-hidden />
      {label}
      {!!count && (
        <span className="text-primary text-[13.5px] font-bold tabular-nums">
          {count}
        </span>
      )}
    </Button>
  );
}

interface FilterPillProps {
  /** "Boarding", "Vaccines expiring" — the criterion, in the user's words. */
  label: string;
  /**
   * Removes this one criterion. The accessible name is the whole sentence,
   * because "Remove" alone announces nothing useful in a row of six.
   */
  onRemove: () => void;
  removeLabel?: string;
}

export function FilterPill({ label, onRemove, removeLabel }: FilterPillProps) {
  return (
    <span className="bg-primary inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-[15px] text-[13.5px] font-semibold whitespace-nowrap text-white max-lg:h-12">
      {label}
      <button
        type="button"
        aria-label={removeLabel ?? `Remove the ${label} filter`}
        onClick={onRemove}
        className={cn(
          `relative flex size-[18px] cursor-pointer items-center justify-center rounded-full bg-white/24 text-white outline-none`,
          `transition-[background-color] duration-120 ease-[ease] motion-reduce:transition-none`,
          `hover:bg-white/40 focus-visible:ring-2 focus-visible:ring-white`,
          // Rule 7: a 48px hit area below 1024px without a 48px dot.
          `before:absolute before:content-[''] max-lg:before:-inset-[15px]`,
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

interface AddFilterChipProps {
  onClick: () => void;
  label?: string;
}

export function AddFilterChip({
  onClick,
  label = "Add filter",
}: AddFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        `border-line-strong text-ink-secondary bg-card inline-flex h-9 shrink-0 cursor-pointer items-center gap-[7px] rounded-full border border-dashed px-[15px] text-[13.5px] font-semibold whitespace-nowrap outline-none max-lg:h-12`,
        `transition-[transform,color,border-color] duration-180 ease-[ease] motion-reduce:transition-none`,
        `hover:border-primary hover:text-primary hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`,
        `focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:ring-[3px]`,
      )}
    >
      <Plus className="size-[17px]" aria-hidden />
      {label}
    </button>
  );
}
