import { JetBrains_Mono } from "next/font/google";

import { cn } from "@/lib/utils";

// ============================================================================
// Where a photo would be and there is none — a room, a service, an add-on, a
// product, a program. The client's mocks draw every such slot the same way,
// and the client asked for it everywhere (2026-10-02, CLAUDE.md § "Client
// mocks decide the look"): diagonal stripes in two warm greys, with a small
// monospaced line saying what belongs there ("room photo · set by facility").
//
// The stripe widens with the slot (5px on a 44px circle, 6px on a 52px tile,
// 8px on a card) as the mocks draw it. `soft` is the evaluation booking
// mock's paler stripe; `warm` the report card's.
//
// Decorative: the slot is aria-hidden, so a screen reader hears the card's own
// name rather than "room photo".
// ============================================================================

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

const SHAPES = {
  /** A card's photo band — full width, height from the caller. */
  band: "w-full",
  /** A service card's square (132px, 84px on a phone) — size from the caller. */
  square: "rounded-[16px] p-2 text-center",
  /** An add-on's 52px thumbnail. */
  tile: "size-13 rounded-[14px]",
  /** A person's 44px circle, with their initials. */
  circle: "size-11 rounded-full",
  /** The booking details mock's pet: a 52px circle saying "photo". */
  pet: "size-13 rounded-full",
  /** Its before & after: a square slot under a dashed line. */
  slot: "aspect-square w-full rounded-[14px] border-[1.5px] border-dashed border-(--check-off)",
} as const;

const STRIPE = {
  band: 8,
  square: 8,
  tile: 6,
  circle: 5,
  pet: 6,
  slot: 8,
} as const;

export function PhotoPlaceholder({
  shape,
  label,
  initials,
  tone = "default",
  className,
}: {
  shape: keyof typeof SHAPES;
  /** What belongs here — translated by the caller. */
  label?: string;
  /** A circle's initials. */
  initials?: string;
  tone?: "default" | "soft" | "warm";
  className?: string;
}) {
  const band = tone === "soft" ? 10 : STRIPE[shape];
  // The booking details mock leans its stripes the other way (45°), in its
  // own two greys: warm for the pet, cool for the before & after slots.
  const details = shape === "pet" || shape === "slot";
  const [a, b] =
    shape === "pet"
      ? ["var(--bd-stripe-a)", "var(--bd-stripe-b)"]
      : shape === "slot"
        ? ["var(--bd-slot-a)", "var(--bd-slot-b)"]
        : tone === "soft"
          ? ["var(--stripe-soft-a)", "var(--stripe-b)"]
          : tone === "warm"
            ? ["var(--stripe-warm-a)", "var(--stripe-warm-b)"]
            : ["var(--stripe-a)", "var(--stripe-b)"];
  return (
    <span
      aria-hidden
      data-slot="photo-placeholder"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        SHAPES[shape],
        className,
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(${details ? 45 : 135}deg, ${a} 0 ${band}px, ${b} ${band}px ${band * 2}px)`,
      }}
    >
      {initials ? (
        <span className="text-[14px] font-bold text-(--stripe-initials)">
          {initials}
        </span>
      ) : label ? (
        <span
          className={cn(
            mono.className,
            details ? "text-ink-disabled" : "text-(--stripe-label)",
            shape === "square"
              ? "text-[10.5px]"
              : shape === "pet"
                ? "text-[10px]"
                : shape === "slot"
                  ? "text-[12px]"
                  : "text-[11px]",
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
