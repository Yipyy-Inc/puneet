import { cn } from "@/lib/utils";

// ============================================================================
// The wizard's illustrations.
//
// ── WHY THEY ARE DRAWN HERE ───────────────────────────────────────────────
//
// Inline SVG rather than image files: nothing to ship, nothing to request,
// nothing to 404 — and, the part that actually matters, they are drawn in
// `currentColor` and two token-derived accents, so they carry their own weight
// in dark mode instead of being a light-mode PNG on a dark card.
//
// They are decorative. Every one is aria-hidden, and every screen states in
// text whatever the picture is gesturing at, so a reader who never sees them
// loses nothing.
// ============================================================================

const SHELL = "mx-auto h-40 w-auto sm:h-48";

/** Sky-500 at rest, lighter in dark mode — the same pair the hero uses. */
const ACCENT = "text-sky-500 dark:text-sky-400";
const DEEP = "text-teal-600 dark:text-teal-400";

/**
 * Step 1 — connecting an account.
 *
 * Two rounded panels joined by a link: the facility's business on one side, the
 * merchant account on the other. Not an ID card, deliberately. The spec drew a
 * passport scan because it assumed a Stripe-style identity check; Clover has no
 * such step, and an illustration promising one would be the first thing on the
 * screen to be untrue.
 */
export function ConnectIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 260 150"
      fill="none"
      className={cn(SHELL, className)}
    >
      <rect
        x="10"
        y="34"
        width="94"
        height="82"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      <rect
        x="156"
        y="34"
        width="94"
        height="82"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      {/* The building — the facility. */}
      <path
        d="M38 92V64l19-13 19 13v28"
        className={cn("stroke-current", DEEP)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="50"
        y="74"
        width="14"
        height="18"
        rx="2"
        className={cn("stroke-current", DEEP)}
        strokeWidth="3"
      />
      {/* The card — the merchant account. */}
      <rect
        x="176"
        y="58"
        width="54"
        height="36"
        rx="6"
        className={cn("stroke-current", ACCENT)}
        strokeWidth="3"
      />
      <path
        d="M176 70h54"
        className={cn("stroke-current", ACCENT)}
        strokeWidth="3"
      />
      {/* The link, and the lock on it. */}
      <path
        d="M110 75h40"
        className="stroke-border"
        strokeWidth="3"
        strokeDasharray="6 6"
        strokeLinecap="round"
      />
      <circle
        cx="130"
        cy="75"
        r="15"
        className={cn("fill-background stroke-current", ACCENT)}
        strokeWidth="3"
      />
      <path
        d="M125 74v-3a5 5 0 0110 0v3"
        className={cn("stroke-current", ACCENT)}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect
        x="124"
        y="74"
        width="12"
        height="9"
        rx="2"
        className={cn("fill-current", ACCENT)}
      />
    </svg>
  );
}

/**
 * Step 2 — the business, read back.
 *
 * A document with three lines and a tick, because that is literally what the
 * step is: Yipyy shows what Clover already holds and the facility confirms it
 * is theirs. No form, no upload — there is nowhere to send either.
 */
export function BusinessIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 260 150"
      fill="none"
      className={cn(SHELL, className)}
    >
      <rect
        x="66"
        y="18"
        width="112"
        height="118"
        rx="10"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      <path
        d="M88 48h68M88 68h68M88 88h44"
        className="stroke-border"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M88 48h30"
        className={cn("stroke-current", DEEP)}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* The confirmation, overlapping the sheet so it reads as applied to it. */}
      <circle
        cx="176"
        cy="106"
        r="27"
        className={cn("fill-background stroke-current", ACCENT)}
        strokeWidth="3"
      />
      <path
        d="M164 106l8 9 17-19"
        className="stroke-emerald-600 dark:stroke-emerald-400"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Step 3 — preferences, and the money that follows them.
 *
 * A slider stack over a rising bar chart: the choices on this step are the ones
 * that change what lands in the bank.
 */
export function PreferencesIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 260 150"
      fill="none"
      className={cn(SHELL, className)}
    >
      <rect
        x="26"
        y="20"
        width="120"
        height="110"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2"
      />
      {[46, 74, 102].map((y, index) => (
        <g key={y}>
          <path
            d={`M46 ${y}h80`}
            className="stroke-border"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            cx={index === 1 ? 104 : 68}
            cy={y}
            r="9"
            className={cn(
              "fill-background stroke-current",
              index === 1 ? DEEP : ACCENT,
            )}
            strokeWidth="3.5"
          />
        </g>
      ))}
      {/* What the choices add up to. */}
      <path
        d="M170 122v-26M198 122v-46M226 122v-70"
        className={cn("stroke-current", ACCENT)}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M160 132h76"
        className="stroke-border"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A terminal, for the empty state on the Devices tab.
 *
 * Shown when the merchant account owns no card reader — which is a purchasing
 * situation, not an error, so the drawing is a device rather than a warning.
 */
export function TerminalIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 160"
      fill="none"
      className={cn("mx-auto h-28 w-auto", className)}
    >
      <rect
        x="46"
        y="18"
        width="68"
        height="124"
        rx="12"
        className="fill-muted stroke-border"
        strokeWidth="2.5"
      />
      <rect
        x="58"
        y="34"
        width="44"
        height="52"
        rx="5"
        className={cn("stroke-current", ACCENT)}
        strokeWidth="3"
      />
      <path
        d="M58 100h44M58 114h30"
        className="stroke-border"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* The contactless arcs. */}
      <path
        d="M118 62a16 16 0 010 22M128 54a28 28 0 010 38"
        className={cn("stroke-current", DEEP)}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
