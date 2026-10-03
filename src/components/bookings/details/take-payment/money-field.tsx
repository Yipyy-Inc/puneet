"use client";

import { currencyAffix } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { cn } from "@/lib/utils";

// ============================================================================
// A money field as the Take payment mock draws them: the box, the sign in
// tertiary ink, a borderless number. The sign goes where the reader's own
// language puts it — before in English, after in French (§5q).
//
//   box    the custom amount: 46px, 12px corners, 16px type
//   pill   the tip, cash received, a split's share: 42px or 40px pills
// ============================================================================

export function MoneyField({
  value,
  onChange,
  locale,
  label,
  placeholder,
  shape = "pill",
  height = 42,
  step = "0.01",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: AppLocale;
  /** What the field is, for assistive technology. */
  label: string;
  placeholder?: string;
  shape?: "box" | "pill";
  height?: 40 | 42 | 46;
  step?: string;
  className?: string;
}) {
  const affix = currencyAffix(locale);
  const sign = (
    <span aria-hidden className="text-ink-tertiary">
      {affix.symbol}
    </span>
  );
  return (
    <div
      className={cn(
        "border-line-strong bg-card focus-within:border-primary flex min-w-0 items-center gap-1.5 border focus-within:shadow-[0_0_0_3px_var(--ring-halo)]",
        shape === "box" ? "rounded-[12px] px-3.5" : "rounded-full px-3",
        height === 46 ? "h-[46px]" : height === 42 ? "h-[42px]" : "h-10",
        className,
      )}
    >
      {affix.before ? sign : null}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "text-body-ink placeholder:text-ink-disabled min-w-0 flex-1 border-0 bg-transparent tabular-nums outline-none",
          shape === "box" ? "text-[16px]" : "text-[15px]",
        )}
      />
      {affix.before ? null : sign}
    </div>
  );
}
