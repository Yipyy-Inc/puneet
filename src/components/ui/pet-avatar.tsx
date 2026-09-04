"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// The pet avatar. docs/design-system/design-system.md §2b territories 1 and 2.
//
// "A 2px #F08A3C ring at 2px offset on every pet avatar, everywhere one is
// drawn — lists, board blocks, search results, profile headers. A pet has
// one; a client and a staff member never do. THIS SINGLE CHANGE IS WHAT PUTS
// ORANGE ON NEARLY EVERY SCREEN."
//
// ── WHY A SEPARATE COMPONENT AND NOT A PROP ON `Avatar` ───────────────────
//
// The rule is not "an avatar may have a ring", it is "a pet has one and a
// person never does". A `ring` prop on the shared `Avatar` makes that a thing
// each of 38 call sites has to remember, and the failure is silent: a ringed
// client avatar looks fine and quietly says the wrong thing about who is an
// animal. A separate component makes the rule structural — you cannot give a
// client a ring without importing the component called PetAvatar.
//
// It also carries the other half of CLAUDE.md's asset rule: **pets get
// photographs, people get initials.** `Avatar` renders initials well and this
// one is built around an image, falling back to the pet's initial.
//
// ── THE RING IS A SHADOW, NOT A BORDER ────────────────────────────────────
//
// `0 0 0 2px <card>, 0 0 0 4px <brand>` — a white gap then the orange. A
// `border` would eat 2px of the image and change the element's size at every
// call site; a shadow sits outside the circle and costs no layout. It is also
// how the reference page draws it.
//
// Do NOT confuse this with the blue selected ring (§2b): that one is `inset`
// on the row or card, this one is on the avatar circle only. Two different
// objects, two different colours, and they can appear together without
// competing.
//
// ── THE PRESENCE DOT, AND WHY THE PULSE IS OPT-IN ─────────────────────────
//
// §2b: "The pet's ring gains a solid orange dot while they are physically
// here, and loses it at check-out. A badge that never turns off is
// decoration." So `present` is a fact about the record, and the dot is drawn
// wherever it is true — including down a list of forty.
//
// The PULSE is separate, because two rules meet here and only one reading
// satisfies both. §4 assigns `yy-breathe` to the presence dot; §4 also says
// "ONE MOVING THING PER VIEW". Forty breathing dots in a table would break
// the second rule, and §5p bans ambient loops on a surface showing data for
// the reason that "a moving thing beside a number is a thing you re-read to
// be sure it did not change".
//
// So the dot always renders and the pulse is opt-in: `pulse` belongs on the
// ONE place a view shows a single pet who is here — a profile header, an "on
// premises" tile — and never in a repeated row. Nothing is lost when it is
// off, because the dot and the words carry the meaning either way.
// ============================================================================

/**
 * The circle itself, in px. The ring sits OUTSIDE these numbers (it is a
 * shadow), so a 36px `md` still occupies 36px of layout.
 *
 * The size is set inline rather than by class because it drives three things
 * at once — the box, the intrinsic width/height on the <img>, and the initial
 * — and one source for them is what stops those three drifting apart. That
 * also means `className` cannot resize this: pick the size key, do not pass
 * `size-12` and expect it to win.
 */
const SIZES = {
  sm: { box: 28, text: "text-[11px]", dot: "size-2.5" },
  md: { box: 36, text: "text-[12.5px]", dot: "size-3" },
  lg: { box: 48, text: "text-[16px]", dot: "size-3.5" },
  xl: { box: 64, text: "text-[20px]", dot: "size-4" },
  "2xl": { box: 96, text: "text-[30px]", dot: "size-5" },
} as const;

export interface PetAvatarProps {
  /** The pet's name. Used for the initial and the accessible name. */
  name: string;
  /** `pet.imageUrl`. Falls back to the initial when absent or broken. */
  src?: string | null;
  size?: keyof typeof SIZES;
  /**
   * On premises right now. Draws the solid orange dot on the ring (§2b
   * territory 2). It must reflect the record — a dot that never turns off is
   * decoration, not presence.
   */
  present?: boolean;
  /**
   * Run `yy-breathe` on the dot. ONE per view, and never in a repeated row —
   * see the note above. Ignored unless `present`.
   */
  pulse?: boolean;
  className?: string;
}

export function PetAvatar({
  name,
  src,
  size = "md",
  present,
  pulse,
  className,
}: PetAvatarProps) {
  const s = SIZES[size];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      data-slot="pet-avatar"
      data-present={present ? "true" : undefined}
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: s.box, height: s.box }}
    >
      <span
        className="bg-surface-inset-2 text-ink-secondary relative block size-full overflow-hidden rounded-full"
        // The ring, as one shadow: a 2px card-coloured gap, then 2px of
        // brand orange. Written here rather than as a Tailwind arbitrary
        // value because it reads as one idea and takes two tokens.
        style={{
          boxShadow: `0 0 0 2px var(--card), 0 0 0 4px var(--brand-orange)`,
        }}
      >
        {src ? (
          // ── A PLAIN <img>, AND THAT IS DELIBERATE ────────────────────────
          //
          // Two reasons, both load-bearing. `pet.imageUrl` is an arbitrary
          // URL — an upload, a remote host — and `next/image` REFUSES a host
          // that is not in next.config's remotePatterns, at runtime, with a
          // 500. A pet photo is exactly the field that will one day hold a
          // host nobody listed.
          //
          // And the board block draws this inside a dragged, absolutely
          // positioned element; `next/image` emits its own inline positioning
          // and BookingBar already carries a comment saying so. One component
          // has to work in both places.
          //
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={s.box}
            height={s.box}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className={cn(
              "flex size-full items-center justify-center font-bold",
              s.text,
            )}
          >
            {initial}
          </span>
        )}
      </span>

      {present && (
        <>
          {/*
            The dot is 7px at the small end and scales with the circle — §2b's
            "7px dot" is the figure for a row-sized avatar. Body ink never sits
            on it because there is nothing written on a dot; the white outline
            is what separates it from the ring behind it.
          */}
          <span
            aria-hidden
            className={cn(
              "bg-brand-orange absolute right-0 bottom-0 rounded-full ring-2 ring-(--card)",
              s.dot,
              pulse && "yy-breathe",
            )}
          />
          {/*
            The words, for anyone who cannot see the dot. §2b's whole guardrail
            is that orange never becomes the only channel any more than colour
            does (§3) — delete the mark and the surface must still say it.
          */}
          <span className="sr-only">{name} is here now</span>
        </>
      )}
    </span>
  );
}
