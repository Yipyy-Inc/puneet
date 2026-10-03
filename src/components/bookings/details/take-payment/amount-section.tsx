"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { formatMoney, formatPercent } from "@/lib/i18n/format";

import { MoneyField } from "./money-field";
import type { TakePayment } from "./use-take-payment";

// ============================================================================
// The top of the Take payment mock: what is owed and how much of it now, the
// client's account credit, a promo code, and the tip.
// ============================================================================

export function AmountSection({ tp }: { tp: TakePayment }) {
  const { t, fill, money, figures } = tp;
  return (
    <div className="border-line-soft flex flex-col gap-3.5 border-b px-6 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-ink-tertiary text-[13px]">
            {t("balanceDue")}
          </span>
          <span className="text-[30px] font-bold tracking-[-0.01em] tabular-nums">
            {money(figures.balanceCents)}
          </span>
        </div>
        <Segmented
          name="take-payment-amount"
          label={t("amountChoice")}
          value={tp.amount.mode}
          options={[
            { value: "full", label: t("fullBalance") },
            { value: "custom", label: t("customAmount") },
          ]}
          onChange={tp.amount.setMode}
        />
      </div>

      {tp.amount.mode === "custom" ? (
        <MoneyField
          shape="box"
          height={46}
          value={tp.amount.custom}
          onChange={tp.amount.setCustom}
          locale={tp.locale}
          label={t("customPlaceholder")}
          placeholder={t("customPlaceholder")}
        />
      ) : null}

      {tp.credit.available > 0 ? <CreditBox tp={tp} /> : null}

      <div className="flex flex-wrap items-center gap-4">
        {!tp.promo.open && tp.data.promoLines.length === 0 ? (
          <Button
            variant="bd-text"
            size="bd-text"
            onClick={() => tp.promo.setOpen(true)}
          >
            {t("addPromo")}
          </Button>
        ) : null}
        {tp.data.promoLines.map((line) => (
          <Chip key={line.id} tone="accent" size="bd-promo">
            {fill("promoChip", {
              code: line.promoCode ?? "",
              amount: formatMoney(Math.abs(line.price), tp.locale),
            })}
            <Button
              variant="ghost"
              size="bd-chip-x"
              className="text-acc-soft-text"
              onClick={() => tp.promo.remove(line.id)}
              disabled={tp.promo.removing}
              aria-label={fill("removePromo", { code: line.promoCode ?? "" })}
            >
              ×
            </Button>
          </Chip>
        ))}
      </div>
      {tp.promo.open ? (
        <div className="flex flex-col gap-1.5">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              tp.promo.submit();
            }}
          >
            <Input
              value={tp.promo.code}
              onChange={(event) =>
                tp.promo.setCode(event.target.value.toUpperCase())
              }
              placeholder={t("promoPlaceholder")}
              aria-label={t("promoLabel")}
              autoComplete="off"
              className="min-w-0 flex-1 uppercase [--bd-field-fs:15px] [--bd-field-h:42px]"
            />
            <Button
              type="submit"
              variant="quiet"
              size="bd-42"
              disabled={!tp.promo.code.trim() || tp.promo.applying}
              data-loading={tp.promo.applying || undefined}
            >
              {t("applyPromo")}
            </Button>
          </form>
          {tp.promo.error ? (
            <span role="alert" className="text-bad text-[13px]">
              {tp.promo.error}
            </span>
          ) : null}
        </div>
      ) : tp.promo.error ? (
        <span role="alert" className="text-bad text-[13px]">
          {tp.promo.error}
        </span>
      ) : null}

      {tp.tip.shown ? <TipRow tp={tp} /> : null}
    </div>
  );
}

function CreditBox({ tp }: { tp: TakePayment }) {
  const { t, fill, money, figures } = tp;
  const used = figures.credit.usedCents;
  const note = tp.credit.undecided
    ? t("creditAskNote")
    : tp.credit.on
      ? fill("creditAppliedNote", {
          used: money(used),
          rest: money(tp.credit.available - used),
        })
      : t("creditOffNote");
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-(--bd-ok-line) bg-(--bd-credit-bg) px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-(--bd-credit-ink)">
            {fill("creditAvailable", { amount: money(tp.credit.available) })}
          </span>
          <span className="text-[13px] text-(--bd-credit-sub)">{note}</span>
        </span>
        {!tp.credit.undecided ? (
          <Switch
            checked={tp.credit.on}
            onCheckedChange={(on) => tp.credit.set(on)}
            aria-label={t("creditUse")}
          />
        ) : null}
      </div>
      {tp.credit.undecided ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="bd-credit"
            size="bd-38-sq"
            className="font-semibold"
            onClick={() => tp.credit.set(true)}
          >
            {t("creditUseNow")}
          </Button>
          <Button
            variant="bd-credit-quiet"
            size="bd-38-sq"
            className="font-medium"
            onClick={() => tp.credit.set(false)}
          >
            {t("creditSave")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TipRow({ tp }: { tp: TakePayment }) {
  const { t, money } = tp;
  if (!tp.tip.allowed) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium">{t("tip")}</span>
        <span className="text-ink-tertiary text-[13px]">
          {tp.pay.method === "terminal"
            ? t("tipOnReader")
            : tp.tip.pledgedCents > 0
              ? tp.fill("tipPledgedNotHere", {
                  amount: money(tp.tip.pledgedCents),
                })
              : t("tipNotThisMethod")}
        </span>
      </div>
    );
  }
  const options: {
    key: string;
    label: string;
    sub: string;
    choice: "none" | "custom" | number;
  }[] = [
    { key: "none", label: t("noTip"), sub: "", choice: "none" },
    ...tp.tip.tier.options.map((option, index) => ({
      key: String(index),
      label:
        option.type === "percentage"
          ? formatPercent(option.value, tp.locale)
          : formatMoney(option.value, tp.locale),
      sub: money(tp.tip.presetCents(index)),
      choice: index,
    })),
    ...((tp.data.tipConfig.customTip ?? true)
      ? [
          {
            key: "custom",
            label: t("customTip"),
            sub: "",
            choice: "custom" as const,
          },
        ]
      : []),
  ];
  // Nothing chosen yet: the pledge, as a custom figure, or "No tip".
  const current =
    tp.tip.choice ?? (tp.tip.pledgedCents > 0 ? "pledged" : "none");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[14px] font-medium">{t("tip")}</span>
      <div
        role="radiogroup"
        aria-label={t("tip")}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <ChoicePill
            key={option.key}
            type="radio"
            name="take-payment-tip"
            size="md"
            className="group"
            checked={
              current === option.choice ||
              (current === "pledged" && option.choice === "custom")
            }
            onChange={() => {
              tp.tip.setChoice(option.choice);
              if (option.choice === "custom" && current === "pledged") {
                tp.tip.setCustom((tp.tip.pledgedCents / 100).toFixed(2));
              }
            }}
          >
            <span>{option.label}</span>
            {option.sub ? (
              <span className="text-[12px] text-(--bd-faded-2) tabular-nums group-has-checked:text-(--bd-faded-on)">
                {option.sub}
              </span>
            ) : null}
          </ChoicePill>
        ))}
      </div>
      {current === "custom" || current === "pledged" ? (
        <MoneyField
          value={
            current === "pledged"
              ? (tp.tip.pledgedCents / 100).toFixed(2)
              : tp.tip.custom
          }
          onChange={(value) => {
            tp.tip.setChoice("custom");
            tp.tip.setCustom(value);
          }}
          locale={tp.locale}
          label={t("customTip")}
          step="0.5"
          className="max-w-[180px]"
        />
      ) : null}
    </div>
  );
}
