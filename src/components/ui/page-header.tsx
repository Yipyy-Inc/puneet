import type * as React from "react";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// Page header. docs/design-system/design-system.md §5b patterns 01, §1.
//
// The reference page's own heading for this is the whole argument: "the page
// header is a component, not a layout accident". 81 files under
// facility/dashboard alone open with a hand-written `text-2xl font-bold` and
// a row of buttons, and no two of them agree on the size, the gap or which
// button is the important one.
//
// Measured off the rendered specimen:
//
//   Title       32 / 700 / -0.028em, --heading. ONE per screen
//   Rename      34px circle beside the title, only where the object is named
//               by the user
//   Secondary   40px outline pills
//   Primary     THE 48px prominent control (§1: "exactly one per screen")
//   Row         flex, wrap, space-between, gap 16 / 10
//
// ── NO CARD, NO BORDER, NO SHADOW ─────────────────────────────────────────
//
// The reference draws every specimen inside a framed demo box, and that frame
// is the page's presentation of the specimen, not part of it. Section 02 says
// so out loud about the tab strip it frames the same way — "an open rail with
// no radius, no fill and no border box". So this is layout and type only.
//
// ── WHY 34px FOR THE RENAME BUTTON, WHEN §1 SAYS CONTROLS ARE 40 ──────────
//
// The page renders it at 34, and where the prose and the page disagree the
// page is right. But 34 is a mouse-sized target, and rule 7 puts the floor at
// 48 on phone and tablet — "floor staff are standing and holding an animal".
// Both hold: 34 at >=1024px where there is a pointer, 48 below it. That is
// the same shape `Button`'s icon sizes already take.
// ============================================================================

interface PageHeaderProps {
  /** One per screen. Renders as the page's only `h1`. */
  title: React.ReactNode;
  /** One line of context under the title. Optional and usually unnecessary. */
  description?: React.ReactNode;
  /**
   * What sits inline with the title, to the right of it.
   *
   * Two things legitimately live here, and both are §5b pattern 01's "sits
   * inline with it":
   *
   *   - The rename affordance, `<PageHeaderRenameButton />`, where the object
   *     carries a name the user typed — a service, a saved view, a room —
   *     and never on a fixed screen like "Bookings".
   *   - The status chips on an ENTITY page. A client, a facility or a pet is
   *     titled by its own name and its state belongs beside that name, not
   *     out on the right with the actions: "Amara Osei · Active" is one fact
   *     about one record.
   *
   * It was called `rename` when stage 7 built it and nothing had used it yet.
   * Broadened here rather than pressing status chips into a slot named for
   * something else.
   */
  inline?: React.ReactNode;
  /** 40px outline controls. Never the prominent one. */
  secondary?: React.ReactNode;
  /**
   * The single 48px prominent control on the screen (§1). Pass a
   * `<Button size="prominent">` whose label is a verb and its object
   * (§5r: "Add boarding service", never "Submit").
   */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  inline,
  secondary,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "flex flex-wrap items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-[11px]">
        <div className="min-w-0">
          {/* text-balance rather than a fixed height: `common.save` grows 175%
              in French and growth is not monotonic, so nothing here may be
              measured in advance (§5g). */}
          <h1 className="text-heading text-page-title text-balance">{title}</h1>
          {description && (
            <p className="text-ink-secondary text-body mt-1 max-w-[76ch] text-pretty">
              {description}
            </p>
          )}
        </div>
        {inline}
      </div>
      {(secondary || action) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {secondary}
          {action}
        </div>
      )}
    </div>
  );
}

interface PageHeaderRenameButtonProps {
  /**
   * The full sentence, because it is the accessible name: "Rename Boarding
   * services", never "Rename" or "Edit" (§5r — a control says what happens).
   */
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * The 34px circle beside the title. It is deliberately NOT `<Button
 * size="icon">`: that is the system's 40px icon button for a toolbar, and
 * this one sits inside a line of 32px type where 40 outweighs the title.
 */
export function PageHeaderRenameButton({
  label,
  onClick,
  disabled,
}: PageHeaderRenameButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        `border-line-strong text-ink-tertiary bg-card flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border outline-none max-lg:size-12`,
        // Rule 3: one transition declaration, and this is it.
        `transition-[transform,box-shadow,color,border-color] duration-180 ease-[ease] motion-reduce:transition-none`,
        `hover:border-primary hover:text-primary hover:shadow-raised hover:-translate-y-0.5 motion-reduce:hover:translate-y-0`,
        `focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:ring-[3px]`,
        `disabled:text-ink-disabled disabled:pointer-events-none disabled:cursor-not-allowed`,
      )}
    >
      <Pencil className="size-[18px]" aria-hidden />
    </button>
  );
}
