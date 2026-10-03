"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useReceiptFacility } from "@/hooks/use-receipt-facility";

import { printTakePaymentReceipt } from "./print-receipt";
import type { TakePayment } from "./use-take-payment";

// ============================================================================
// The mock's two other faces: waiting on the money, and what was taken.
// ============================================================================

/**
 * Before the form: the client's credit, cards and readers, and the bill's
 * lines, still answering. They decide the figures and the method offered
 * first, so the form waits for them rather than change once it is shown.
 */
export function LoadingView({ tp }: { tp: TakePayment }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3.5 px-6 py-12 text-center"
    >
      <div
        aria-hidden
        className="border-t-primary size-14 animate-spin rounded-full border-4 border-(--ring-halo) motion-reduce:animate-none"
      />
      <span className="text-ink-tertiary text-[14px]">
        {tp.t("loadingTill")}
      </span>
    </div>
  );
}

export function ProcessingView({ tp }: { tp: TakePayment }) {
  const { t, fill, money } = tp;
  const reader = tp.figures.legs.find((leg) => leg.method === "terminal");
  const [stopping, setStopping] = useState(false);
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3.5 px-6 py-12 text-center"
    >
      <div
        aria-hidden
        className="border-t-primary size-14 animate-spin rounded-full border-4 border-(--ring-halo) motion-reduce:animate-none"
      />
      <span className="text-[17px] font-semibold">
        {reader ? t("waitingCustomer") : t("processing")}
      </span>
      <span className="text-ink-tertiary text-[14px]">
        {reader && tp.data.reader
          ? fill("sentToReader", {
              amount: money(reader.totalCents),
              reader: tp.data.readerName(tp.data.reader),
            })
          : t("processingSub")}
      </span>
      {reader ? (
        // Stops the PROMPT. A card approved a moment earlier is still paid,
        // which is why it is not called "cancel payment".
        <Button
          variant="quiet"
          size="bd-40"
          className="font-normal"
          disabled={stopping}
          data-loading={stopping || undefined}
          onClick={async () => {
            setStopping(true);
            try {
              await tp.stopReader();
            } finally {
              setStopping(false);
            }
          }}
        >
          {t("cancel")}
        </Button>
      ) : null}
    </div>
  );
}

export function DoneView({ tp }: { tp: TakePayment }) {
  const { t, fill, money } = tp;
  const facility = useReceiptFacility();
  const done = tp.done;
  if (!done) return null;
  const sub = done.result.message
    ? done.result.message
    : done.receipt.kind === "sent"
      ? t(
          done.receipt.channels.length > 1
            ? "receiptSentBoth"
            : done.receipt.channels[0] === "sms"
              ? "receiptSentText"
              : "receiptSentEmail",
        )
      : done.receipt.kind === "failed"
        ? done.receipt.detail
          ? fill("receiptFailedWhy", { detail: done.receipt.detail })
          : t("receiptFailed")
        : t("receiptNone");
  const lines = [
    ...(done.creditCents > 0
      ? [{ label: t("accountCredit"), value: money(done.creditCents) }]
      : []),
    ...done.lines.map((line) => ({
      label: line.label,
      value: money(line.cents),
    })),
    { label: t("remainingBalance"), value: money(done.remainingCents) },
  ];
  return (
    <>
      <div
        role="status"
        className="flex flex-col items-center gap-2.5 px-6 pt-9 pb-6 text-center"
      >
        <div
          aria-hidden
          className="bg-wash-success text-success grid size-14 place-items-center rounded-full text-[28px] font-bold"
        >
          ✓
        </div>
        <span className="text-[19px] font-semibold">
          {done.pending
            ? t("donePending")
            : done.result.message
              ? t("doneCheckedOut")
              : t("doneTitle")}
        </span>
        <span className="text-ink-tertiary text-[14px]">{sub}</span>
      </div>
      <div className="border-line-soft mx-6 flex flex-col gap-2 rounded-[12px] border px-4 py-3">
        {lines.map((line) => (
          <div
            key={line.label}
            className="flex justify-between gap-3 text-[14px]"
          >
            <span className="text-ink-secondary">{line.label}</span>
            <span className="font-semibold tabular-nums">{line.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2.5 px-6 py-5">
        <Button
          variant="quiet"
          size="bd-44"
          className="text-[15px] font-normal"
          onClick={() => printTakePaymentReceipt(tp, facility)}
        >
          {t("printReceipt")}
        </Button>
        <Button
          variant="bd-cta"
          size="bd-44-cta"
          className="px-5"
          onClick={() => tp.props.onOpenChange(false)}
        >
          {t("done")}
        </Button>
      </div>
    </>
  );
}
