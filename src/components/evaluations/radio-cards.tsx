"use client";

import type { LucideIcon } from "lucide-react";

import { useLook } from "@/components/look/look-context";
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
  compact = false,
  className,
}: {
  labelledBy: string;
  value: T;
  options: RadioCard<T>[];
  onChange: (value: T) => void;
  /** The evaluation mock's approval cards: 12px 14px, 14px corners. */
  compact?: boolean;
  className?: string;
}) {
  // In a client-mock look (CLAUDE.md § "Client mocks decide the look"): the
  // evaluation mock's cards — chosen, the accent's line on its palest tint.
  const look = useLook();
  const mock =
    (look?.names.includes("booking") || look?.names.includes("eval-module")) ??
    false;
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
            className={
              mock
                ? cn(
                    "bg-card border-line-strong focus-visible:outline-primary data-[on=true]:border-primary flex min-w-0 flex-col border-[1.5px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:bg-(--acc-pale)",
                    compact
                      ? "gap-1 rounded-[14px] px-3.5 py-3"
                      : "gap-1.5 rounded-[16px] p-3.5",
                  )
                : "bg-card border-line-strong hover:border-ink-disabled focus-visible:outline-primary flex min-w-0 flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              {Glyph ? (
                <Glyph
                  aria-hidden
                  data-on={on}
                  className={cn(
                    "data-[on=true]:text-primary size-5 shrink-0",
                    mock ? "text-ink-tertiary" : "text-ink-secondary",
                  )}
                />
              ) : null}
              <span
                className={
                  mock
                    ? cn(
                        "text-body-ink min-w-0 flex-1 font-bold",
                        compact ? "text-[14px]" : "text-[14.5px]",
                      )
                    : "text-body-strong text-body-ink min-w-0 flex-1"
                }
              >
                {option.title}
              </span>
              <span
                aria-hidden
                data-on={on}
                className={cn(
                  "data-[on=true]:border-primary bg-card size-[18px] shrink-0 rounded-full border-[1.5px] data-[on=true]:border-[5px]",
                  mock ? "border-(--day-off)" : "border-line-strong",
                )}
              />
            </span>
            <span
              className={
                mock
                  ? compact
                    ? "text-ink-tertiary text-[12.5px]"
                    : "text-ink-secondary text-[12.5px] leading-[1.45]"
                  : "text-meta text-ink-secondary"
              }
            >
              {option.help}
            </span>
          </button>
        );
      })}
    </div>
  );
}
