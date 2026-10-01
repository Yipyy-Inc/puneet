"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// Two or three choices as cards with a radio dot — "Which days?" and "Who
// supplies the pill pockets?". A radio group to the keyboard and to assistive
// technology (arrows move, the choice follows). The chosen card carries a
// full 2px ring, never a tint or an edge line (§6 rules 1 and 2); the dot is
// the radio's own mark. After AddOnOptionCards, which has no dot.
// ============================================================================

export interface OptionCard<T extends string> {
  value: T;
  title: string;
  hint?: string;
  /** Shown at the end, like a price. */
  trailing?: string;
}

export function OptionCards<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = "sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]",
}: {
  label: string;
  value: T;
  options: OptionCard<T>[];
  onChange: (value: T) => void;
  columns?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid grid-cols-1 gap-2.5", columns)}
      onKeyDown={(event) => {
        if (
          !["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(
            event.key,
          )
        ) {
          return;
        }
        event.preventDefault();
        const step =
          event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const at = options.findIndex((option) => option.value === value);
        const next = options[(at + step + options.length) % options.length];
        onChange(next.value);
        event.currentTarget
          .querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
          ?.focus();
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            data-value={option.value}
            data-on={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            className="bg-card border-line-strong hover:border-ink-disabled focus-visible:outline-primary flex min-h-12 min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
          >
            <span
              aria-hidden
              data-on={on}
              className="border-line-strong data-[on=true]:border-primary bg-card size-[18px] shrink-0 rounded-full border-[1.5px] data-[on=true]:border-[6px]"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-strong text-body-ink">
                {option.title}
              </span>
              {option.hint ? (
                <span className="text-meta text-ink-tertiary">
                  {option.hint}
                </span>
              ) : null}
            </span>
            {option.trailing ? (
              <span className="text-body-strong text-body-ink shrink-0 tabular-nums">
                {option.trailing}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
