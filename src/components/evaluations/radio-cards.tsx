"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================================
// The setup page's choice cards, laid out as the client's mock lays them:
// [glyph] name … (radio mark), the line under it. A radio group to the
// keyboard (arrows move the choice); the chosen card carries the 2px primary
// ring — never a tint (§6 rule 2, §5s). OptionCards (booking/care) puts its
// dot first and has no glyph, which is why this is its own.
// ============================================================================

export interface RadioCard<T extends string> {
  value: T;
  title: string;
  help: string;
  glyph?: LucideIcon;
}

export function RadioCards<T extends string>({
  labelledBy,
  value,
  options,
  onChange,
  className,
}: {
  labelledBy: string;
  value: T;
  options: RadioCard<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2.5",
        className,
      )}
      onKeyDown={(event) => {
        const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const step =
          event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const at = options.findIndex((option) => option.value === value);
        const next = options[(at + step + options.length) % options.length]!;
        onChange(next.value);
        event.currentTarget
          .querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
          ?.focus();
      }}
    >
      {options.map((option) => {
        const on = option.value === value;
        const Glyph = option.glyph;
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
            className="bg-card border-line-strong hover:border-ink-disabled focus-visible:outline-primary flex min-w-0 flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
          >
            <span className="flex min-w-0 items-center gap-2">
              {Glyph ? (
                <Glyph
                  aria-hidden
                  data-on={on}
                  className="text-ink-secondary data-[on=true]:text-primary size-5 shrink-0"
                />
              ) : null}
              <span className="text-body-strong text-body-ink min-w-0 flex-1">
                {option.title}
              </span>
              <span
                aria-hidden
                data-on={on}
                className="border-line-strong data-[on=true]:border-primary bg-card size-[18px] shrink-0 rounded-full border-[1.5px] data-[on=true]:border-[6px]"
              />
            </span>
            <span className="text-meta text-ink-secondary">{option.help}</span>
          </button>
        );
      })}
    </div>
  );
}
