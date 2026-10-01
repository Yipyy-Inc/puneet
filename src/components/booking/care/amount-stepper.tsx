"use client";

import { Minus, Plus } from "lucide-react";

// ============================================================================
// − amount +. A form counted in whole things shows its amount as words
// ("1½"); a measured one (Liquid, Injection) can be typed exactly. The
// buttons step by the form's own size and never go below one step.
// ============================================================================

const STEP_BUTTON =
  "text-body-ink hover:bg-surface-inset focus-visible:outline-primary flex size-10 shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 max-lg:size-12";

export function AmountStepper({
  amount,
  label,
  typed,
  step,
  onDown,
  onUp,
  onType,
  decreaseLabel,
  increaseLabel,
  inputLabel,
}: {
  amount: number;
  /** The amount as the form shows it, e.g. "1½". */
  label: string;
  /** A measured amount is typed. */
  typed: boolean;
  step: number;
  onDown: () => void;
  onUp: () => void;
  onType: (amount: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  inputLabel: string;
}) {
  return (
    <div className="border-line-strong bg-card flex items-center overflow-hidden rounded-full border">
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={onDown}
        className={STEP_BUTTON}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      {typed ? (
        <input
          type="number"
          min={0}
          step={step}
          inputMode="decimal"
          aria-label={inputLabel}
          value={amount}
          onChange={(event) => {
            const value = Number.parseFloat(event.target.value);
            onType(Number.isNaN(value) ? 0 : value);
          }}
          className="text-body-strong text-body-ink w-16 [appearance:textfield] border-0 bg-transparent text-center tabular-nums outline-none focus-visible:underline [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <output
          aria-label={inputLabel}
          aria-live="polite"
          className="text-body-strong text-body-ink min-w-14 text-center tabular-nums"
        >
          {label}
        </output>
      )}
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={onUp}
        className={STEP_BUTTON}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
