import { cn } from "@/lib/utils";

import type { WizardFlavour } from "./WizardRail";

// ============================================================================
// The open screen's title and what it asks for. The title is an <h2> and the
// line under it the <p> right after it — the e2e specs read the Details
// screen's name as `h2 + p`, so the two stay adjacent siblings.
// The "Boarding · Sam's Lodge" chip is the client's mock's; a phone has no
// room for it (the top bar already names the service).
//
// Drawn as the mocks draw it (2026-10-02, CLAUDE.md § "Client mocks decide the
// look"): the booking mock's 22px/600 title over a 14px line and a hairline
// chip; the evaluation mock's 24px/700 title and a soft accent chip.
// ============================================================================

export function WizardHeader({
  title,
  subtitle,
  chip,
  flavour = "booking",
  titleHidden = false,
}: {
  title: string;
  subtitle?: string | null;
  chip?: string | null;
  flavour?: WizardFlavour;
  /** The evaluation mock's done screen shows its title once, in the body. */
  titleHidden?: boolean;
}) {
  const evaluation = flavour === "evaluation";
  return (
    <header
      className={cn(
        "border-line flex justify-between gap-4 border-b",
        evaluation
          ? "items-start gap-3 px-[clamp(16px,3vw,32px)] pt-[22px] pb-3.5"
          : "items-end px-4 pt-3.5 pb-3 sm:px-6 sm:pt-[18px] sm:pb-3.5 lg:px-8 lg:pt-6 lg:pb-[18px]",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col",
          evaluation ? "gap-0.5" : "gap-1",
        )}
      >
        <h2
          className={cn(
            "text-heading tracking-[-0.01em]",
            evaluation
              ? "text-[24px] font-bold"
              : "text-[18px] font-semibold sm:text-[22px]",
            titleHidden && "sr-only",
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="text-ink-tertiary text-[14px]">{subtitle}</p>
        ) : null}
      </div>
      {chip ? (
        <span
          className={cn(
            "hidden shrink-0 rounded-full whitespace-nowrap sm:inline-flex",
            evaluation
              ? "bg-acc-soft text-acc-soft-text px-[11px] py-[5px] text-[12px] font-bold"
              : "border-line bg-card text-ink-secondary border px-3.5 py-1.5 text-[13px] font-medium",
          )}
        >
          {chip}
        </span>
      ) : null}
    </header>
  );
}
