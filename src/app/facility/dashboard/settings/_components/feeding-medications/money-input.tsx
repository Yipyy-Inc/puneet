"use client";

import { useState } from "react";

import { formatNumber } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// A price, typed: the dollar sign where the reader's language puts it — "$"
// before the amount in English, after it in French (§5r: "42,50 $") — and the
// amount in the reader's notation, "0.75" or "0,75", on the pill a control is
// (§1). What is being typed stays as typed until the field is left.
// ============================================================================

const MAX = 1000;

/** "1,000.50" or "1 000,50" as a number; null when it is not one. */
function parseTyped(text: string, locale: AppLocale): number | null {
  const plain = text.replace(/[\s  $]/g, "");
  const normal =
    locale === "fr" ? plain.replace(",", ".") : plain.replace(/,/g, "");
  if (normal === "") return 0;
  if (!/^\d*\.?\d*$/.test(normal)) return null;
  const amount = Math.round(Number(normal) * 100) / 100;
  return Number.isFinite(amount) && amount <= MAX ? amount : null;
}

export function MoneyInput({
  id,
  value,
  onChange,
  label,
  locale,
  disabled,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  label: string;
  locale: AppLocale;
  disabled?: boolean;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  const invalid = typing !== null && parseTyped(typing, locale) === null;
  const sign = (
    <span aria-hidden className="text-ink-tertiary text-[14px]">
      $
    </span>
  );
  return (
    <div
      data-invalid={invalid}
      className="border-line-strong bg-card has-focus-visible:border-primary has-focus-visible:outline-primary data-[invalid=true]:border-destructive flex h-[38px] w-full min-w-24 items-center gap-1 rounded-[10px] border px-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
    >
      {locale === "fr" ? null : sign}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        disabled={disabled}
        value={typing ?? formatNumber(value, locale, 2)}
        onChange={(event) => {
          const text = event.target.value;
          setTyping(text);
          const amount = parseTyped(text, locale);
          if (amount !== null) onChange(amount);
        }}
        onBlur={() => setTyping(null)}
        className="text-body-ink w-full min-w-0 border-0 bg-transparent text-[14px] tabular-nums outline-none"
      />
      {locale === "fr" ? sign : null}
    </div>
  );
}
