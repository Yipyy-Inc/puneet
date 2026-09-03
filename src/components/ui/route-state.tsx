import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { YipyyPose, type YipyyPoseProps } from "@/components/ui/yipyy-pose";
import { cn } from "@/lib/utils";

// ============================================================================
// A whole view that is in ONE state — failed, missing, loading, gated.
// docs/design-system/design-system.md §5d2 (the state ladder), §5d1, §5r.
//
// Every value below is measured off the reference page's own rendered
// "In place — a whole view that failed" panel, which is the only place the
// system draws this surface: card at --r-lg on --line/--card with --sh, 22px
// padding, 24px gap, the pose in a 132 slot on the left, and a column of
// glyph+heading / sentence / one 48px pill on the right.
//
// ── HE IS NEVER THE MESSAGE (§5d1) ────────────────────────────────────────
// The glyph, the status ink and the sentence carry it. `YipyyPose` collapses
// its own slot when a file is missing, so deleting the image leaves a surface
// that still reads — which is the stated definition of done for this stage.
// ============================================================================

type RouteStateAction =
  | { label: string; icon?: LucideIcon; href: string; onClick?: never }
  | { label: string; icon?: LucideIcon; onClick: () => void; href?: never };

export interface RouteStateProps {
  /** §5d2 assigns one to every rung of the state ladder. Look it up, never pick. */
  pose: YipyyPoseProps["name"];
  /** Tier 1, from docs/design-system/icon-map.json. Rendered at 20px (§5b1). */
  icon: LucideIcon;
  /**
   * The §1 status ink this state belongs to, as a `text-*` utility —
   * `text-destructive` (error), `text-violet`, `text-ink-secondary` (neutral).
   * A class rather than a value so no route state carries a hex (§5v).
   */
  inkClassName: string;
  /** 19/700 in heading ink. One line. */
  title: string;
  /** One sentence, wrapping in a 38ch column. */
  description: string;
  /** At most one, and it is the screen's single 48px prominent control (§1). */
  action?: RouteStateAction;
  /**
   * Spins the glyph — the loading view's one moving thing (§4). `yy-float` is
   * not an option here: `YipyyPose` refuses it on the whole moment family.
   */
  spin?: boolean;
  /** The centring box. Full-height at the root, shorter inside a layout. */
  className?: string;
}

export function RouteState({
  pose,
  icon: Icon,
  inkClassName,
  title,
  description,
  action,
  spin = false,
  className,
}: RouteStateProps) {
  return (
    <main
      className={cn(
        "flex min-h-[60vh] items-center justify-center p-6",
        className,
      )}
    >
      <div
        // w-full, not shrink-to-fit: without it each state sized itself to its
        // own longest line, so four cards that are one component came out four
        // different widths and the one with no action collapsed narrow enough
        // to wrap the pose above its own heading.
        className={`border-line bg-card shadow-card flex w-full max-w-2xl flex-wrap items-center gap-6 rounded-2xl border p-[22px]`}
      >
        <div className="shrink-0">
          <YipyyPose name={pose} size={132} priority />
        </div>
        {/* basis-80 is the reference's `flex: 1 1 320px`; min-w-0 is the
            flex-child rule every column in this repo needs (§6). */}
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-[11px]">
          <div className="flex items-center gap-[9px]">
            <Icon
              aria-hidden
              className={cn(
                "size-5 shrink-0",
                inkClassName,
                // The glyph is the only thing that moves, and it stops for
                // anyone who asked motion to stop (§4).
                spin && "animate-spin motion-reduce:animate-none",
              )}
            />
            <h1 className="text-heading text-state-title">{title}</h1>
          </div>
          <p className="text-ink-secondary text-body max-w-[38ch] text-pretty">
            {description}
          </p>
          {action ? (
            <Button
              type="button"
              asChild={"href" in action && action.href !== undefined}
              onClick={action.onClick}
              // 48px, full pill, §4's lift. This is the one prominent control
              // on the view, which is exactly the budget §1 allows.
              //
              // `font-semibold` is not redundant with `text-body-strong`:
              // the type step carries `font-weight: var(--tw-font-weight, 600)`
              // and shadcn's Button base sets `font-medium`, which Tailwind
              // emits AFTER it — measured at 500 in the browser. Naming the
              // weight lets tailwind-merge drop `font-medium` outright.
              className={`yy-cta text-body-strong mt-1 h-12 gap-[9px] self-start rounded-full px-6 font-semibold [&_svg]:size-5`}
            >
              {action.href !== undefined ? (
                <Link href={action.href}>
                  {action.icon ? <action.icon aria-hidden /> : null}
                  {action.label}
                </Link>
              ) : (
                <>
                  {action.icon ? <action.icon aria-hidden /> : null}
                  {action.label}
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
