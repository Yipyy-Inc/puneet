"use client";

import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Gift,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import type { PayMethod } from "@/lib/payments/take-payment-math";
import { cn } from "@/lib/utils";

import { ChoiceCard } from "./choice-card";
import {
  CardPanel,
  CashPanel,
  ETransferPanel,
  GiftPanel,
} from "./method-panels";
import { MoneyField } from "./money-field";
import type { TakePayment } from "./use-take-payment";

// ============================================================================
// "Pay with" — the mock's method cards, the panel for the chosen one, and the
// split. A card that cannot be used is not offered at all: no card on file
// and no Clover connection means no "Card on file"; no reader, no "Terminal".
// ============================================================================

const ICON: Record<PayMethod, LucideIcon> = {
  card: CreditCard,
  terminal: Smartphone,
  cash: Banknote,
  gift: Gift,
  etransfer: ArrowLeftRight,
};

export function PayWith({ tp }: { tp: TakePayment }) {
  const { t, fill, money, figures, pay } = tp;
  const subOf: Record<PayMethod, string> = {
    card:
      pay.cardId === "new"
        ? t("newCard")
        : (() => {
            const card = tp.data.cards.find((c) => c.id === pay.cardId);
            return card
              ? `${card.brand ?? t("cardFallback")} •••• ${card.last4 ?? ""}`
              : t("cardSub");
          })(),
    terminal: t("terminalSub"),
    cash: t("cashSub"),
    gift: t("giftSub"),
    etransfer: t("etransferSub"),
  };
  const labelOf: Record<PayMethod, string> = {
    card: t("methodCard"),
    terminal: t("methodTerminal"),
    cash: t("methodCash"),
    gift: t("methodGift"),
    etransfer: t("methodETransfer"),
  };
  const first = figures.legs[0];
  const restCents = figures.dueCents - (first?.totalCents ?? 0);
  const secondOptions = pay.methods.filter(
    (m) => m !== pay.method && m !== "gift",
  );
  const showSplitLink =
    figures.dueCents > 0 && pay.method !== "gift" && pay.methods.length > 1;

  return (
    <div className="border-line-soft flex flex-col gap-3 border-b px-6 py-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink-disabled text-[12px] font-semibold tracking-[0.08em] uppercase">
          {t("payWith")}
        </span>
        <span className="text-ink-tertiary text-[13px] tabular-nums">
          {fill("toCollect", { amount: money(figures.dueCents) })}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={t("payWith")}
        className="flex flex-col gap-2"
      >
        {pay.methods.map((m, index) => {
          const Icon = ICON[m];
          return (
            <ChoiceCard
              key={m}
              name="take-payment-method"
              checked={pay.method === m}
              onChange={() => pay.setMethod(m)}
            >
              <span className="bg-surface-inset-2 grid size-[38px] shrink-0 place-items-center rounded-[10px]">
                <Icon aria-hidden className="text-ink-secondary size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="text-[15px] font-medium">{labelOf[m]}</span>
                <span className="text-ink-tertiary truncate text-[13px]">
                  {subOf[m]}
                </span>
              </span>
              {m === "card" && index === 0 ? (
                <Chip tone="accent" size="bd-default">
                  {t("defaultTag")}
                </Chip>
              ) : null}
            </ChoiceCard>
          );
        })}
      </div>

      {pay.method === "card" ? <CardPanel tp={tp} /> : null}
      {pay.method === "terminal" ? <ReaderPanel tp={tp} /> : null}
      {pay.method === "cash" ? <CashPanel tp={tp} /> : null}
      {pay.method === "gift" ? <GiftPanel tp={tp} /> : null}
      {pay.method === "etransfer" ? <ETransferPanel tp={tp} /> : null}

      {showSplitLink ? (
        <Button
          variant="bd-text"
          size="bd-text"
          className="self-start"
          onClick={pay.toggleSplit}
        >
          {pay.split ? t("removeSplit") : t("splitStart")}
        </Button>
      ) : null}

      {pay.twoMethods ? (
        <div className="flex flex-col gap-2.5 rounded-[12px] border border-dashed border-(--bd-off) p-3.5">
          {pay.split && pay.method ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-ink-secondary text-[14px]">
                {fill("firstPays", { method: pay.legLabel(pay.method) })}
              </span>
              <MoneyField
                height={40}
                value={pay.splitAmount}
                onChange={pay.setSplitAmount}
                locale={tp.locale}
                label={fill("firstPays", { method: pay.legLabel(pay.method) })}
                className="w-[130px]"
              />
            </div>
          ) : null}
          <span className="text-[14px] font-medium">
            {fill(pay.giftShort ? "payRemainingWith" : "remainingWith", {
              amount: money(restCents),
            })}
          </span>
          <div
            role="radiogroup"
            aria-label={t("secondMethod")}
            className="flex flex-wrap gap-2"
          >
            {secondOptions.map((m) => (
              <ChoicePill
                key={m}
                type="radio"
                name="take-payment-second"
                size="md"
                checked={pay.method2 === m}
                onChange={() => pay.setMethod2(m)}
              >
                {pay.legLabel(m)}
              </ChoicePill>
            ))}
          </div>
          {pay.method2 === "card" ? <CardPanel tp={tp} /> : null}
          {pay.method2 === "terminal" ? <ReaderPanel tp={tp} /> : null}
          {pay.method2 === "etransfer" ? (
            <Input
              value={pay.etRef}
              onChange={(event) => pay.setEtRef(event.target.value)}
              placeholder={t("etRefPlaceholder")}
              aria-label={t("etRefPlaceholder")}
              className="[--bd-field-fs:15px] [--bd-field-h:42px]"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The readers, each Online or Offline; an offline one cannot be chosen. */
function ReaderPanel({ tp }: { tp: TakePayment }) {
  const { t, data } = tp;
  return (
    <div className="bg-surface-inset border-line-soft flex flex-col gap-2 rounded-[12px] border p-3.5">
      <span className="text-ink-tertiary text-[13px]">{t("sendToReader")}</span>
      <div
        role="radiogroup"
        aria-label={t("sendToReader")}
        className="flex flex-col gap-2"
      >
        {data.readers.map((reader) => {
          const state = tp.readerState(reader.serial);
          return (
            <ChoiceCard
              key={reader.serial}
              name="take-payment-reader"
              checked={data.reader?.serial === reader.serial}
              disabled={state === "offline"}
              onChange={() => data.chooseReader(reader.serial)}
            >
              <span className="min-w-0 flex-1 text-left">
                {data.readerName(reader)}
              </span>
              <span
                className={cn(
                  "text-[13px] font-semibold",
                  state === "online" ? "text-success" : "text-ink-disabled",
                )}
              >
                {t(
                  state === "online"
                    ? "online"
                    : state === "offline"
                      ? "offline"
                      : "checking",
                )}
              </span>
            </ChoiceCard>
          );
        })}
      </div>
    </div>
  );
}
