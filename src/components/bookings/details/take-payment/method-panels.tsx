"use client";

import { toast } from "sonner";

import {
  CloverCardFields,
  type CloverCardFieldsHandle,
} from "@/components/payments/clover-card-fields";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { formatDateShort, formatMoney } from "@/lib/i18n/format";
import { cashQuickAmounts } from "@/lib/payments/take-payment-math";
import { cn } from "@/lib/utils";

import { MoneyField } from "./money-field";
import { ChoiceCard } from "./choice-card";
import type { TakePayment } from "./use-take-payment";
import {
  usePendingTransfers,
  useRecordTransferArrival,
} from "./use-pending-transfers";

// ============================================================================
// The panel under the chosen method — the mock's slate box (#F8FAFC on
// #F1F5F9) holding that method's own questions.
// ============================================================================

const PANEL =
  "bg-surface-inset border-line-soft flex flex-col gap-2.5 rounded-[12px] border p-3.5";

/** Saved cards (the client's consented ones) and "Use a new card". */
export function CardPanel({ tp }: { tp: TakePayment }) {
  const { t, fill, data, pay } = tp;
  return (
    <div className={cn(PANEL, "gap-2")}>
      <div
        role="radiogroup"
        aria-label={t("methodCard")}
        className="flex flex-col gap-2"
      >
        {data.cards.map((card) => (
          <ChoiceCard
            key={card.id}
            name="take-payment-card"
            checked={pay.cardId === card.id}
            onChange={() => pay.setCard(card.id)}
          >
            <span className="min-w-0 flex-1 text-left">
              {`${card.brand ?? t("cardFallback")} •••• ${card.last4 ?? ""}`}
            </span>
            {card.expMonth && card.expYear ? (
              <span className="text-ink-tertiary text-[13px] tabular-nums">
                {fill("cardExpiry", {
                  date: `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`,
                })}
              </span>
            ) : null}
          </ChoiceCard>
        ))}
        {data.newCardConfig ? (
          <ChoiceCard
            name="take-payment-card"
            checked={pay.cardId === "new"}
            onChange={() => pay.setCard("new")}
          >
            <span className="min-w-0 flex-1 text-left">{t("useNewCard")}</span>
          </ChoiceCard>
        ) : null}
      </div>
      {pay.cardId === "new" && data.newCardConfig ? (
        <>
          <NewCardFields
            config={data.newCardConfig}
            register={tp.setCardFields}
            onReadyChange={pay.setCardReady}
          />
          {tp.props.clientRowId ? (
            <label className="text-ink-secondary flex cursor-pointer items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={pay.saveCard}
                onChange={(event) => pay.setSaveCard(event.target.checked)}
                className="accent-primary size-[18px]"
              />
              <span>{t("saveCard")}</span>
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Clover's hosted fields, in the mock's row of pills. */
function NewCardFields({
  config,
  register,
  onReadyChange,
}: {
  config: { publicApiKey: string; merchantId: string; sdkUrl: string };
  register: (handle: CloverCardFieldsHandle | null) => void;
  onReadyChange: (ready: boolean) => void;
}) {
  return (
    <CloverCardFields
      ref={register}
      variant="pills"
      publicApiKey={config.publicApiKey}
      merchantId={config.merchantId}
      sdkUrl={config.sdkUrl}
      onReadyChange={onReadyChange}
    />
  );
}

/** Amount received, the quick amounts, and what the change is. */
export function CashPanel({ tp }: { tp: TakePayment }) {
  const { t, fill, money, pay } = tp;
  const cashCents = pay.cashLeg?.totalCents ?? 0;
  const quick = cashQuickAmounts(cashCents);
  const given = pay.givenCents;
  const change = pay.changeCents;
  return (
    <div className={PANEL}>
      <span className="text-ink-tertiary text-[13px]">
        {t("amountReceived")}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <MoneyField
          value={pay.cashGiven}
          onChange={pay.setCashGiven}
          locale={tp.locale}
          label={t("amountReceived")}
          placeholder={(cashCents / 100).toFixed(2)}
          step="0.05"
          className="w-[130px]"
        />
        {quick.map((value, index) => (
          <Button
            key={value}
            variant="quiet"
            size="bd-38q"
            onClick={() => pay.setCashGiven((value / 100).toFixed(2))}
          >
            {index === 0 ? t("exact") : money(value)}
          </Button>
        ))}
      </div>
      <div
        className={cn(
          "text-[15px] font-semibold tabular-nums",
          given === null
            ? "text-ink-tertiary"
            : change < 0
              ? "text-bad"
              : "text-success",
        )}
      >
        {given === null
          ? t("enterCash")
          : change < 0
            ? fill("shortBy", { amount: money(-change) })
            : fill("changeDue", { amount: money(change) })}
      </div>
      {change > 0 ? (
        <div
          role="radiogroup"
          aria-label={t("changeChoice")}
          className="flex flex-wrap gap-2"
        >
          <ChoicePill
            type="radio"
            name="take-payment-change"
            checked={!pay.changeAsCredit}
            onChange={() => pay.setChangeAsCredit(false)}
          >
            {t("changeBack")}
          </ChoicePill>
          <ChoicePill
            type="radio"
            name="take-payment-change"
            checked={pay.changeAsCredit}
            onChange={() => pay.setChangeAsCredit(true)}
          >
            {fill("changeAsCredit", { amount: money(change) })}
          </ChoicePill>
        </div>
      ) : null}
    </div>
  );
}

/** A code, "Check balance", and what the card covers. */
export function GiftPanel({ tp }: { tp: TakePayment }) {
  const { t, fill, money, pay } = tp;
  const covers =
    pay.gift !== null &&
    Math.round(pay.gift.balance * 100) >= tp.figures.dueCents;
  return (
    <div className={PANEL}>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void pay.checkGift();
        }}
      >
        <Input
          value={pay.giftCode}
          onChange={(event) =>
            pay.setGiftCode(event.target.value.toUpperCase())
          }
          placeholder={t("giftPlaceholder")}
          aria-label={t("giftPlaceholder")}
          autoComplete="off"
          className="min-w-0 flex-1 uppercase [--bd-field-fs:15px] [--bd-field-h:42px]"
        />
        <Button
          type="submit"
          variant="quiet"
          size="bd-42"
          className="px-3.5"
          disabled={!pay.giftCode.trim()}
        >
          {t("checkBalance")}
        </Button>
      </form>
      {pay.gift ? (
        <span className="text-[14px] font-medium text-(--bd-credit-ink)">
          {fill(covers ? "giftCoversAll" : "giftCoversPart", {
            amount: money(Math.round(pay.gift.balance * 100)),
          })}
        </span>
      ) : null}
      {pay.giftError ? (
        <span role="alert" className="text-bad text-[13px]">
          {pay.giftError}
        </span>
      ) : null}
    </div>
  );
}

/** A reference, "Mark as pending", and the transfers still on their way. */
export function ETransferPanel({ tp }: { tp: TakePayment }) {
  const { t, fill, pay } = tp;
  const booking = tp.props.booking;
  const { transfers } = usePendingTransfers(booking.id);
  const recordArrival = useRecordTransferArrival(booking);
  return (
    <div className={PANEL}>
      <Input
        value={pay.etRef}
        onChange={(event) => pay.setEtRef(event.target.value)}
        placeholder={t("etRefPlaceholder")}
        aria-label={t("etRefPlaceholder")}
        className="[--bd-field-fs:15px] [--bd-field-h:42px]"
      />
      {!pay.twoMethods ? (
        <label className="text-ink-secondary flex cursor-pointer items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={pay.etPending}
            onChange={(event) => pay.setEtPending(event.target.checked)}
            className="accent-primary size-[18px]"
          />
          <span>{t("etPending")}</span>
        </label>
      ) : null}
      {transfers.length > 0 ? (
        <div className="border-line-soft flex flex-col gap-2 border-t pt-2.5">
          <span className="text-ink-tertiary text-[13px]">
            {t("pendingTitle")}
          </span>
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="text-warning text-[14px] tabular-nums">
                {[
                  formatMoney(transfer.total, tp.locale),
                  transfer.reference,
                  formatDateShort(transfer.createdAt, tp.locale),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <Button
                variant="quiet"
                size="bd-34"
                disabled={recordArrival.isPending}
                data-loading={recordArrival.isPending || undefined}
                onClick={() =>
                  recordArrival.mutate(transfer, {
                    onSuccess: (taken) =>
                      toast.success(
                        fill("arrivalRecorded", {
                          amount: formatMoney(taken, tp.locale),
                        }),
                      ),
                    onError: (error) =>
                      toast.error(t("arrivalNotRecorded"), {
                        description:
                          error instanceof Error ? error.message : undefined,
                      }),
                  })
                }
              >
                {t("recordArrival")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
