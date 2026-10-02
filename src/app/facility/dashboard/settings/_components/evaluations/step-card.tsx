"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// One numbered card of the evaluation setup page, as the client's mock frames
// each: "STEP 1" in micro type, the question as its title, the controls
// below. White, a hairline, the card radius — never a tint (§6 rule 2).
// ============================================================================

export function StepCard({
  id,
  step,
  title,
  children,
  className,
}: {
  id: string;
  /** "STEP 1" — already in the viewer's language. */
  step: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 gap-3.5 px-5 py-[18px] sm:px-6", className)}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-micro text-ink-tertiary uppercase">{step}</span>
        <h2 id={`${id}-title`} className="text-section text-heading">
          {title}
        </h2>
      </div>
      {children}
    </Card>
  );
}

/** A field's own small heading inside a step ("Days you offer evaluations"). */
export function FieldLabel({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <span id={id} className="text-meta text-body-ink font-semibold">
      {children}
    </span>
  );
}

/**
 * A number with its unit inside the field — "2 pets", "15 min", "24 hours",
 * "45 $ per pet" — under its label, as the mock lays them out.
 */
export function UnitField({
  id,
  label,
  unit,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className="text-meta text-body-ink font-semibold">{label}</span>
      <span className="border-line-strong bg-card has-focus-visible:outline-primary flex min-h-10 min-w-0 items-center gap-2 rounded-full border px-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 max-lg:min-h-12">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? Math.max(min, next) : min);
          }}
          className="text-body-strong text-body-ink min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
        <span className="text-meta text-ink-tertiary shrink-0">{unit}</span>
      </span>
    </label>
  );
}
