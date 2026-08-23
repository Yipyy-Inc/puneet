import { cn } from "@/lib/utils";

// ============================================================================
// The Yipyy Pay brand furniture.
//
// ── WHY THIS IS ITS OWN FILE ──────────────────────────────────────────────
//
// "Powered by Clover" appears in four places, all of them deliberate: the
// landing hero, the dashboard header, and both sides of the redirect boundary —
// the notice on the step that hands the facility over, and the screen they land
// on coming back. That is a product decision, not a styling one:
// the facility buys Yipyy Pay, and the processor behind it is an attribution,
// the way MoeGo shows "Powered by Stripe" at setup and nowhere else.
//
// One component makes the rule visible and countable. Four hand-rolled badges
// would drift into five, and the fifth is the one that turns an attribution
// back into branding.
//
// ── THE COLOURS ARE THE APP'S OWN ─────────────────────────────────────────
//
// Sky into teal, from `--primary`. The written spec asks for purple; Yipyy is
// not purple, and a payments product that looks like a different company's is
// how a facility ends up wondering who is holding their money. Deepened rather
// than inverted in dark mode, so the wordmark keeps its contrast either way.
// ============================================================================

/**
 * Clover's four-leaf mark, drawn rather than imported.
 *
 * Lifted verbatim from the card this replaced: no asset to 404, and it inherits
 * `currentColor` so the badge can render it muted without a second file.
 */
export function CloverMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <g fill="currentColor">
        <path d="M24 22.5c0-4 .8-7 2.6-8.9 1.7-1.8 4-2.6 6.6-2.6 2.4 0 4.4.7 5.8 2.2 1.4 1.4 2.1 3.2 2.1 5.3 0 2.3-.8 4.2-2.4 5.6-1.6 1.4-3.8 2.1-6.5 2.1H24v-3.7z" />
        <path d="M25.5 24c4 0 7 .8 8.9 2.6 1.8 1.7 2.6 4 2.6 6.6 0 2.4-.7 4.4-2.2 5.8-1.4 1.4-3.2 2.1-5.3 2.1-2.3 0-4.2-.8-5.6-2.4-1.4-1.6-2.1-3.8-2.1-6.5V24h3.7z" />
        <path d="M24 25.5c0 4-.8 7-2.6 8.9-1.7 1.8-4 2.6-6.6 2.6-2.4 0-4.4-.7-5.8-2.2-1.4-1.4-2.1-3.2-2.1-5.3 0-2.3.8-4.2 2.4-5.6 1.6-1.4 3.8-2.1 6.5-2.1H24v3.7z" />
        <path d="M22.5 24c-4 0-7-.8-8.9-2.6-1.8-1.7-2.6-4-2.6-6.6 0-2.4.7-4.4 2.2-5.8C14.6 7.6 16.4 7 18.5 7c2.3 0 4.2.8 5.6 2.4 1.4 1.6 2.1 3.8 2.1 6.5V24h-3.7z" />
      </g>
    </svg>
  );
}

/**
 * The attribution. Small, muted, and never the headline.
 *
 * @param tone "on-brand" for the gradient hero, where the surroundings are
 *   already saturated; "muted" for a card on the page background.
 */
export function PoweredByClover({
  tone = "muted",
  className,
}: {
  tone?: "on-brand" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        tone === "on-brand" ? "text-white/70" : "text-muted-foreground",
        className,
      )}
    >
      <CloverMark className="size-3.5 opacity-80" />
      Powered by Clover
    </span>
  );
}

/**
 * The wordmark: "Yipyy" solid, "Pay" lighter beside it.
 *
 * Sized by prop rather than by the caller's font classes so the dashboard's 60%
 * version and the hero's full one stay in the same proportion — a wordmark that
 * changes shape between screens reads as two different products.
 */
export function YipyyPayWordmark({
  size = "lg",
  tone = "on-brand",
  className,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "on-brand" | "ink";
  className?: string;
}) {
  const scale = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl sm:text-5xl",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 leading-none tracking-tight",
        scale,
        tone === "on-brand" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span className="font-extrabold">Yipyy</span>
      <span
        className={cn(
          "font-medium",
          tone === "on-brand" ? "text-white/75" : "text-muted-foreground",
        )}
      >
        Pay
      </span>
    </span>
  );
}

/**
 * The gradient panel both the landing hero and the dashboard header sit on.
 *
 * ── ONE SHELL, TWO HEIGHTS ────────────────────────────────────────────────
 *
 * The landing page is a sales moment and the dashboard is a status bar, so they
 * are drawn at different sizes — but they must be recognisably the same
 * surface, because the dashboard is what a facility sees for years after the
 * landing page they saw once.
 *
 * ── THE MOTIF IS INLINE SVG ───────────────────────────────────────────────
 *
 * Not a background image: an asset would be a file to ship, a request to make
 * and a thing to 404. It is decorative, so it is aria-hidden and drawn at low
 * opacity — legible enough to be texture, quiet enough not to fight the copy.
 */
export function YipyyPayHero({
  size = "lg",
  children,
  className,
}: {
  size?: "sm" | "lg";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl",
        // Sky into teal. Written as explicit stops rather than through the
        // `--primary` token because a gradient needs two related colours and
        // the token is only one of them.
        "bg-[linear-gradient(135deg,#0ea5e9_0%,#0891b2_45%,#0f766e_100%)]",
        "dark:bg-[linear-gradient(135deg,#0369a1_0%,#0e7490_45%,#115e59_100%)]",
        size === "lg" ? "px-6 py-10 sm:px-10 sm:py-12" : "p-5 sm:px-6",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -right-10 h-[130%] w-auto opacity-[0.13]"
        viewBox="0 0 200 200"
        fill="none"
      >
        {/* A card, and a paw — what this product is and whose it is. */}
        <rect
          x="24"
          y="52"
          width="128"
          height="82"
          rx="12"
          stroke="white"
          strokeWidth="3"
        />
        <path d="M24 78h128" stroke="white" strokeWidth="3" />
        <circle cx="152" cy="48" r="11" fill="white" />
        <circle cx="176" cy="62" r="9" fill="white" />
        <circle cx="134" cy="34" r="9" fill="white" />
        <ellipse cx="160" cy="92" rx="21" ry="17" fill="white" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
