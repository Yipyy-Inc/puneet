"use client";

import { cn } from "@/lib/utils";

/**
 * Two or three mutually exclusive choices as cards — the reference's
 * "No / Yes", "All services / Select specific services", "All / Customize".
 *
 * A radio group to assistive technology and the keyboard (arrows move, the
 * choice follows). The chosen card carries a full 2px ring: §6 rule 1 bans an
 * edge accent, rule 2 a tint.
 */
export function AddOnOptionCards<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      onKeyDown={(e) => {
        if (
          !["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(e.key)
        )
          return;
        e.preventDefault();
        const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
        const at = options.findIndex((o) => o.value === value);
        const next = options[(at + step + options.length) % options.length];
        onChange(next.value);
        const target = e.currentTarget.querySelector<HTMLButtonElement>(
          `[data-value="${next.value}"]`,
        );
        target?.focus();
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
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "bg-card min-h-12 min-w-0 rounded-2xl border px-4 py-3 text-left",
              "transition-[box-shadow,border-color] duration-150",
              on
                ? "border-transparent shadow-[inset_0_0_0_2px_var(--primary)]"
                : "border-(--line) hover:border-(--line-strong)",
            )}
          >
            <span className="block text-[15px] font-semibold">
              {option.title}
            </span>
            {option.hint ? (
              <span className="text-muted-foreground mt-0.5 block text-[13.5px]">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
