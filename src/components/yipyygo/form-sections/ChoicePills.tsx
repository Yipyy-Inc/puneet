"use client";

// ============================================================================
// A few answers to choose between, as pills.
//
// Native radio and checkbox inputs underneath, so arrow keys and a screen
// reader behave as they do everywhere else; the pill is their label. Selected
// is §5s's recipe — a full 2px primary ring, the label one step darker — never
// a tint or an edge line. 40px, and 48px below 1024px (§6 rule 7).
// ============================================================================

const PILL =
  "border-line-strong bg-card text-body-ink hover:border-ink-disabled has-checked:text-primary-hover has-focus-visible:outline-primary flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-[14.5px] font-semibold has-checked:shadow-[inset_0_0_0_2px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 max-lg:min-h-12";

interface Option<T extends string> {
  value: T;
  label: string;
}

export function ChoicePills<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: T | undefined;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-body-ink mb-1.5 text-[13.5px] font-semibold">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={PILL}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TogglePills({
  legend,
  hint,
  values,
  options,
  onToggle,
}: {
  legend: string;
  hint?: string;
  values: string[];
  options: Option<string>[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-body-ink mb-1.5 flex flex-wrap items-baseline gap-2 text-[13.5px] font-semibold">
        {legend}
        {hint && (
          <span className="text-ink-tertiary text-[13px] font-normal">
            {hint}
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={PILL}>
            <input
              type="checkbox"
              value={option.value}
              checked={values.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
