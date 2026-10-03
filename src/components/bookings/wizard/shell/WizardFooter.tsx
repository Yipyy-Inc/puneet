import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { WizardFlavour } from "./WizardRail";

// ============================================================================
// The booking wizard's footer, as the client's mock lays it out: Previous on
// the left ("Back" on a phone), the running estimate, Cancel (from 1024px;
// below that the top bar's close does it), and the step's own action. On a
// phone the action takes the rest of the row — it is the one thing the thumb
// is there for (§5m: the primary action lives in the bottom third).
//
// While saving, the action keeps its label and shows a spinner (§5s Loading).
//
// Sizes and colours are the mocks' own (2026-10-02, CLAUDE.md § "Client mocks
// decide the look"): 46px buttons (52px on touch), a plain outline, the
// accent's glow under the action. The evaluation flow's footer is its mock's:
// white, Back · what is chosen so far · the action, no glow.
// ============================================================================

export interface WizardFooterProps {
  /** Warnings that belong above the buttons (hours not set, a rate gap). */
  notices?: ReactNode;
  showPrevious: boolean;
  previousDisabled: boolean;
  onPrevious: () => void;
  previousLabel: string;
  backLabel: string;
  /** The running total, formatted; null hides the block. */
  estimate: string | null;
  estimateLabel: string;
  showCancel: boolean;
  onCancel: () => void;
  cancelLabel: string;
  nextLabel: string;
  onNext: () => void;
  nextDisabled: boolean;
  busy?: boolean;
  flavour?: WizardFlavour;
  /** The evaluation flow's line between Back and the action. */
  note?: string | null;
}

export function WizardFooter({
  notices,
  showPrevious,
  previousDisabled,
  onPrevious,
  previousLabel,
  backLabel,
  estimate,
  estimateLabel,
  showCancel,
  onCancel,
  cancelLabel,
  nextLabel,
  onNext,
  nextDisabled,
  busy = false,
  flavour = "booking",
  note = null,
}: WizardFooterProps) {
  if (flavour === "evaluation") {
    return (
      <footer className="border-line bg-card flex flex-col border-t">
        {notices}
        <div className="flex items-center gap-2.5 px-[clamp(16px,3vw,32px)] pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))]">
          {showPrevious ? (
            <Button
              type="button"
              variant="quiet"
              size="wizard"
              onClick={onPrevious}
              disabled={previousDisabled}
              className="px-[18px] text-[14.5px] max-lg:h-[46px]"
            >
              {backLabel}
            </Button>
          ) : null}
          <span className="text-ink-tertiary min-w-0 flex-1 truncate text-[13px]">
            {note}
          </span>
          <Button
            type="button"
            size="wizard"
            onClick={onNext}
            disabled={nextDisabled}
            loading={busy}
            className="px-6 text-[14.5px] font-bold [--sh-cta:none] max-lg:h-[46px] [&:disabled:not([data-loading])]:bg-(--next-disabled-flat) [&:disabled:not([data-loading])]:text-white"
          >
            {nextLabel}
          </Button>
        </div>
      </footer>
    );
  }
  return (
    <footer className="border-line bg-background flex flex-col border-t">
      {notices}
      <div className="flex items-center gap-2 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4">
        {showPrevious ? (
          <Button
            type="button"
            variant="quiet"
            size="wizard"
            onClick={onPrevious}
            disabled={previousDisabled}
            className="max-sm:px-[18px]"
          >
            <span className="sm:hidden">{backLabel}</span>
            <span className="max-sm:hidden">{previousLabel}</span>
          </Button>
        ) : null}
        <div className="flex-1 max-sm:hidden" />
        {estimate ? (
          <div className="mr-2 flex shrink-0 flex-col items-end">
            <span className="text-ink-tertiary text-[10.5px] font-semibold tracking-[0.07em] uppercase">
              {estimateLabel}
            </span>
            <span className="text-body-ink text-[17px] font-bold tabular-nums">
              {estimate}
            </span>
          </div>
        ) : null}
        {showCancel ? (
          <Button
            type="button"
            variant="quiet"
            size="wizard"
            onClick={onCancel}
            className="max-lg:hidden"
          >
            {cancelLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          size="wizard"
          onClick={onNext}
          disabled={nextDisabled}
          loading={busy}
          className={cn(
            "px-[26px] max-sm:flex-1",
            "[&:disabled:not([data-loading])]:bg-line",
          )}
        >
          {nextLabel}
        </Button>
      </div>
    </footer>
  );
}
