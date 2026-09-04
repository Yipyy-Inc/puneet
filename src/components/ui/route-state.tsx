import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { YipyyPose, type YipyyPoseProps } from "@/components/ui/yipyy-pose";
import { cn } from "@/lib/utils";

// ============================================================================
// A whole view that is in ONE state — failed, missing, loading, gated.
// docs/design-system/design-system.md §5d2 (the state ladder), §5d1, §5r.
//
// ── TWO SURFACES, AND THE REFERENCE ONLY EVER DREW ONE ───────────────────
//
// The reference page draws this as a card: --r-lg on --line/--card with --sh,
// 22px padding, 24px gap, the pose in a 132 slot on the LEFT and a column of
// glyph+heading / sentence / one 48px pill on the right. Those values are
// measured off it and they are reproduced exactly by `surface="card"`.
//
// But read the label above that panel: **"In place — a whole view that
// failed."** In place means inside a layout, standing where a section used to
// be. A card is right there, because it sits among other cards.
//
// Every caller in this repo is the other case. `app/loading.tsx`,
// `error.tsx`, `not-found.tsx` and `forbidden.tsx` are ROUTE-level states
// that own the entire viewport — `min-h-screen`, nothing else on the page —
// and the reference never drew that. Rendering the in-place card there put a
// small left-aligned panel adrift in an empty screen, which reads as a
// fragment of a page that failed to finish rather than as a state.
//
// So `bare` is the default and the full-view answer: no card, no border, no
// shadow, one centred column with the pose ABOVE the words. The state sits
// directly on the ground, which is what a state that IS the whole page should
// do. The content is unchanged — same pose from §5d2's ladder, same glyph,
// same ink, same sentence, same single 48px control — but the pose renders at
// 320 rather than 132 here, which is the one deliberate deviation. See the
// note beside it for why.
//
// ── HE IS NEVER THE MESSAGE (§5d1) ────────────────────────────────────────
// The glyph, the status ink and the sentence carry it. `YipyyPose` collapses
// its own slot when a file is missing, so deleting the image leaves a surface
// that still reads — which is the stated definition of done for this stage.
// That is why the pose can move above the text without anything being lost:
// it was never the thing doing the talking.
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
  /**
   * `bare` (default) is a route-level state that owns the whole viewport: a
   * centred column on the ground, pose above the words.
   *
   * `card` is the reference page's "In place" panel, for a state standing
   * where a SECTION used to be. Nothing uses it yet; it exists because the
   * reference drew it and a section-level state will want it.
   */
  surface?: "bare" | "card";
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
  surface = "bare",
  className,
}: RouteStateProps) {
  const carded = surface === "card";

  return (
    <main
      className={cn(
        "flex min-h-[60vh] items-center justify-center p-6",
        className,
      )}
    >
      <div
        className={cn(
          carded
            ? // w-full, not shrink-to-fit: without it each state sized itself
              // to its own longest line, so four cards that are one component
              // came out four different widths and the one with no action
              // collapsed narrow enough to wrap the pose above its heading.
              "border-line bg-card shadow-card w-full max-w-2xl flex-row flex-wrap items-center gap-6 rounded-2xl border p-[22px]"
            : // Bare: one centred column, pose on top. `max-w-md` keeps the
              // sentence off the full width of a 1440px screen — the 38ch cap
              // below does the real work, this stops the pose drifting from
              // the text it belongs to.
              "max-w-md flex-col items-center gap-6 text-center",
          "flex",
        )}
      >
        {/* ── 320 ON THE FULL VIEW, 132 IN THE CARD ────────────────────────

            §5d1 assigns the moment family "compact 132 only", and says it
            twice — the second time naming "a dialog, a panel or a whole
            failed view". So this is a real deviation and not a gap the spec
            left, unlike the card-vs-full-view split above. It is here on the
            product owner's call: at 132, alone in the middle of an empty
            1440px viewport with nothing else on it, he reads as an icon
            somebody forgot to finish rather than as the subject of the
            screen.

            320 and not something between: §5d1's other half is "three sizes
            and no fourth", so the choice was 132, 320 or inventing a value.
            320 is the sanctioned one. The source files are 720x720, so it is
            still downscaling.

            The CARD keeps 132 exactly as specified — that is the dialog and
            panel case the rule was written for, and nothing about it
            changed. */}
        <div className="shrink-0">
          <YipyyPose name={pose} size={carded ? 132 : 320} priority />
        </div>
        {/* basis-80 is the reference's `flex: 1 1 320px`; min-w-0 is the
            flex-child rule every column in this repo needs (§6). Neither
            applies to the bare column, which is already centred and sized. */}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-[11px]",
            carded ? "flex-1 basis-80" : "items-center",
          )}
        >
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
              className={cn(
                "yy-cta text-body-strong mt-1 h-12 gap-[9px] rounded-full px-6 font-semibold [&_svg]:size-5",
                // Left-aligned in the card's right-hand column; centred under
                // the sentence when the whole state is one centred column.
                carded ? "self-start" : "self-center",
              )}
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
