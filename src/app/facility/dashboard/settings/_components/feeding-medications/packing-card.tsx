"use client";

import { ChoicePill } from "@/components/ui/choice-pill";
import { packLabel } from "@/lib/feeding/labels";
import { PACKS, type FoodPack } from "@/lib/feeding/vocabulary";
import { isPluralOne } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";

import { SetupCard } from "./setup-card";

// ============================================================================
// PACKING & SUPPLY: how an owner may pack their own food, and how many extra
// meals' worth to bring in case pickup is late — the number the booking
// form's packing totals add.
// ============================================================================

const MAX_EXTRA = 14;

export function PackingCard({
  packs,
  extraMeals,
  onPacks,
  onExtra,
  changed,
  onReset,
  t,
  bt,
  locale,
}: {
  packs: FoodPack[];
  extraMeals: number;
  onPacks: (packs: FoodPack[]) => void;
  onExtra: (extra: number) => void;
  changed: boolean;
  onReset: () => void;
  t: (key: string) => string;
  bt: (key: string) => string;
  locale: AppLocale;
}) {
  const stepButton =
    "focus-visible:outline-primary text-body-ink flex size-[42px] items-center justify-center bg-(--stepper-bg) text-[18px] disabled:text-ink-disabled focus-visible:outline-2";
  return (
    <SetupCard
      id="f-packing"
      title={t("packingTitle")}
      help={t("packingHelp")}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex min-w-0 flex-col gap-2.5 px-5 py-[18px] sm:px-6">
        <span
          id="f-packing-accepted"
          className="text-body-ink text-[14px] font-medium"
        >
          {t("acceptedPacking")}
        </span>
        <div
          role="group"
          aria-labelledby="f-packing-accepted"
          className="flex flex-wrap gap-2"
        >
          {PACKS.map((pack) => (
            <ChoicePill
              key={pack}
              type="checkbox"
              value={pack}
              checked={packs.includes(pack)}
              onChange={() =>
                onPacks(
                  packs.includes(pack)
                    ? packs.filter((p) => p !== pack)
                    : PACKS.filter((p) => p === pack || packs.includes(p)),
                )
              }
            >
              {packLabel(bt, pack)}
            </ChoicePill>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-(--row-line) px-5 py-4 sm:px-6">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-ink text-[15px] font-medium">
            {t("extraTitle")}
          </span>
          <span className="text-ink-tertiary text-[13px]">
            {t("extraHelp")}
          </span>
        </span>
        <div className="flex items-center gap-2.5">
          <div className="border-line-strong bg-card flex h-[42px] items-center overflow-hidden rounded-[12px] border">
            <button
              type="button"
              aria-label={t("extraFewer")}
              disabled={extraMeals <= 0}
              onClick={() => onExtra(Math.max(0, extraMeals - 1))}
              className={stepButton}
            >
              <span aria-hidden>−</span>
            </button>
            <span
              aria-live="polite"
              className="text-body-ink min-w-11 text-center text-[16px] font-semibold tabular-nums"
            >
              {extraMeals}
            </span>
            <button
              type="button"
              aria-label={t("extraMore")}
              disabled={extraMeals >= MAX_EXTRA}
              onClick={() => onExtra(Math.min(MAX_EXTRA, extraMeals + 1))}
              className={stepButton}
            >
              <span aria-hidden>+</span>
            </button>
          </div>
          <span className="text-ink-secondary text-[14px]">
            {t(
              isPluralOne(extraMeals, locale)
                ? "extraMealOne"
                : "extraMealOther",
            )}
          </span>
        </div>
      </div>
    </SetupCard>
  );
}
