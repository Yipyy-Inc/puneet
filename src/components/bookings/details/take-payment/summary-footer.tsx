"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TillBlock } from "@/lib/payments/take-payment-math";
import { cn } from "@/lib/utils";

import type { TakePayment } from "./use-take-payment";

// ============================================================================
// The bottom of the Take payment mock: the summary on slate, the payment note
// and where the receipt goes, then the reason it cannot be taken yet (in red)
// beside Cancel and the one button that takes it.
// ============================================================================

export function SummaryAndFooter({ tp }: { tp: TakePayment }) {
  const { t, fill, money, figures } = tp;
  const rows: { key: string; label: string; value: string }[] = [
    {
      key: "balance",
      label: t("balanceDue"),
      value: money(figures.balanceCents),
    },
    ...(tp.amount.mode === "custom"
      ? [
          {
            key: "now",
            label: t("collectingNow"),
            value: money(figures.collect.totalCents),
          },
        ]
      : []),
    ...(figures.credit.usedCents > 0
      ? [
          {
            key: "credit",
            label: t("accountCredit"),
            value: money(-figures.credit.usedCents),
          },
        ]
      : []),
    ...(figures.tipCents > 0
      ? [{ key: "tip", label: t("tip"), value: money(figures.tipCents) }]
      : []),
  ];
  const legs = figures.legs.length > 1 ? figures.legs : [];
  const reason = tp.problem ?? (tp.block ? blockText(tp, tp.block) : "");

  return (
    <>
      <div className="bg-surface-inset border-line-soft flex flex-col gap-2 border-b px-6 py-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className="text-ink-secondary flex justify-between gap-3 text-[14px]"
          >
            <span>{row.label}</span>
            <span className="tabular-nums">{row.value}</span>
          </div>
        ))}
        <div className="border-line text-body-ink flex justify-between gap-3 border-t pt-2 text-[17px] font-bold">
          <span>{t("totalToCollect")}</span>
          <span className="tabular-nums">{money(figures.dueCents)}</span>
        </div>
        {legs.map((leg, index) => (
          <div
            key={`${leg.method}-${index}`}
            className="text-ink-tertiary flex justify-between gap-3 ps-3 text-[13px]"
          >
            <span>{tp.pay.legLabel(leg.method)}</span>
            <span className="tabular-nums">{money(leg.totalCents)}</span>
          </div>
        ))}
      </div>

      <div className="border-line-soft flex flex-wrap items-center gap-4 border-b px-6 py-3.5">
        <Input
          value={tp.note}
          onChange={(event) => tp.setNote(event.target.value)}
          placeholder={t("notePlaceholder")}
          aria-label={t("notePlaceholder")}
          className="min-w-[200px] flex-1"
        />
        <div className="text-ink-secondary flex flex-wrap items-center gap-3.5 text-[14px]">
          <span>{t("receiptLabel")}</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={tp.receipt.email}
              onChange={(event) => tp.receipt.setEmail(event.target.checked)}
              className="accent-primary size-4"
            />
            {t("receiptEmail")}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={tp.receipt.sms}
              onChange={(event) => tp.receipt.setSms(event.target.checked)}
              className="accent-primary size-4"
            />
            {t("receiptText")}
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-4">
        <span
          role={tp.problem ? "alert" : undefined}
          className={cn("text-bad min-w-0 text-[13px]", !reason && "sr-only")}
        >
          {reason}
        </span>
        <div className="ms-auto flex gap-2.5">
          <Button
            variant="quiet"
            size="bd-46"
            onClick={() => tp.props.onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="bd-submit"
            size="bd-46"
            className="px-[22px] font-semibold whitespace-nowrap"
            disabled={tp.block !== null}
            onClick={() => void tp.submit()}
          >
            {submitText(tp)}
          </Button>
        </div>
      </div>
    </>
  );

  function submitText(state: TakePayment) {
    const w = state.wording;
    switch (w.key) {
      case "confirm":
        return t("submitConfirm");
      case "recordETransfer":
        return t("submitETransfer");
      case "applyCredit":
        return fill("submitApplyCredit", { amount: money(w.amountCents) });
      case "collect":
        return fill("submitCollect", { amount: money(w.amountCents) });
      case "charge":
        return fill("submitCharge", { amount: money(w.amountCents) });
      case "sendToReader":
        return fill("submitReader", { amount: money(w.amountCents) });
      case "recordCash":
        return fill("submitCash", { amount: money(w.amountCents) });
      case "redeem":
        return fill("submitRedeem", { amount: money(w.amountCents) });
    }
  }
}

function blockText(tp: TakePayment, block: TillBlock): string {
  switch (block.key) {
    case "chooseSecond":
      return tp.fill("blockSecond", { amount: tp.money(block.amountCents) });
    default:
      return tp.t(
        {
          enterAmount: "blockAmount",
          askCredit: "blockCredit",
          chooseMethod: "blockMethod",
          checkGift: "blockGift",
          cashShort: "blockCash",
          chooseCard: "blockCard",
          cardNotReady: "blockCardForm",
          chooseReader: "blockReader",
        }[block.key],
      );
  }
}
