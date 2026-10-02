import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

// ============================================================================
// The booking wizard's footer, as the client's mock lays it out: Previous on
// the left ("Back" on a phone), the running estimate, Cancel (from 1024px;
// below that the top bar's close does it), and the step's own action. On a
// phone the action takes the rest of the row — it is the one thing the thumb
// is there for (§5m: the primary action lives in the bottom third).
//
// While saving, the action keeps its label and shows a spinner (§5s Loading).
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
}: WizardFooterProps) {
  return (
    <footer className="border-line bg-background flex flex-col border-t">
      {notices}
      <div className="flex items-center gap-2 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:gap-3 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4">
        {showPrevious ? (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={previousDisabled}
          >
            <span className="sm:hidden">{backLabel}</span>
            <span className="max-sm:hidden">{previousLabel}</span>
          </Button>
        ) : null}
        <div className="flex-1 max-sm:hidden" />
        {estimate ? (
          <div className="mr-2 flex shrink-0 flex-col items-end">
            <span className="text-micro text-ink-tertiary uppercase">
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
            variant="outline"
            onClick={onCancel}
            className="max-lg:hidden"
          >
            {cancelLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          size="prominent"
          onClick={onNext}
          disabled={nextDisabled}
          loading={busy}
          className="max-sm:flex-1"
        >
          {nextLabel}
        </Button>
      </div>
    </footer>
  );
}
