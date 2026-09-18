"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  CreditCard,
  Banknote,
  Wallet,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { invoiceHeaderHtml } from "@/lib/invoice-header";
import { useReceiptFacility } from "@/hooks/use-receipt-facility";
import { escapeHtml } from "@/lib/email/shell";
import { formatDateLong, formatMoney, formatTime } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceTotal: number;
  amountPaid: number;
  items: { name: string; price: number }[];
  /**
   * May return a promise. If it does, the receipt is not printed and the dialog
   * is not closed until it RESOLVES — see handleConfirm.
   */
  onConfirm: (refund: {
    amount: number;
    method: string;
    reason: string;
    type: "full" | "partial" | "by_item";
  }) => void | Promise<void>;
}

type RefundType = "full" | "partial" | "by_item";
type RefundMethod = "original" | "store_credit" | "cash";

const TYPE_KEYS: Record<RefundType, string> = {
  full: "typeFull",
  partial: "typePartial",
  by_item: "typeByItem",
};

const METHODS = [
  { value: "original" as const, key: "toCard", icon: CreditCard },
  { value: "store_credit" as const, key: "toCredit", icon: Wallet },
  { value: "cash" as const, key: "toCash", icon: Banknote },
];

// The refund receipt’s print styles: ink only, since on paper every colour
// drops out (§6 rule 10).
const RECEIPT_CSS =
  "body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:420px;margin:0 auto}h1{font-size:18px;margin:0}h2{font-size:12px;color:#444;margin:4px 0 20px;font-weight:400}.row{display:flex;justify-content:space-between;gap:16px;padding:5px 0;font-size:13px;border-bottom:1px solid #ccc}.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}.section{margin-top:14px;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.stamp{border:1px solid #111;padding:6px 14px;text-align:center;margin-top:14px;font-weight:700;font-size:13px}.note{border:1px solid #ccc;padding:10px;margin-top:14px;font-size:11px;color:#444}.footer{margin-top:24px;text-align:center;font-size:10px;color:#444}";

// Chosen is a 2px ring, never a tint (§6 rules 1 and 2).
const CHOSEN =
  "border-primary text-primary shadow-[inset_0_0_0_2px_var(--primary)]";

export function RefundModal({
  open,
  onOpenChange,
  amountPaid,
  items,
  onConfirm,
}: RefundModalProps) {
  // The facility's OWN header, not the fixture's — see use-receipt-facility.
  const receiptFacility = useReceiptFacility();
  const { t, fill, locale } = useStaffText("refund");
  const money = (value: number) => formatMoney(value, locale);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [refundType, setRefundType] = useState<RefundType>("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [method, setMethod] = useState<RefundMethod>("original");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const refundAmount =
    refundType === "full"
      ? amountPaid
      : refundType === "partial"
        ? parseFloat(partialAmount) || 0
        : items
            .filter((_, i) => selectedItems.has(i))
            .reduce((s, item) => s + item.price, 0);

  const methodLabel = t(
    METHODS.find((m) => m.value === method)?.key ?? "toCard",
  );

  const toggleItem = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── THE RECEIPT WAITS FOR THE REFUND ─────────────────────────────────────
  //
  // This used to call onConfirm, immediately open a window headed REFUND
  // PROCESSED, and close itself — all synchronously, before anything had
  // reached a processor. On a card that receipt was a printed claim about money
  // that had not moved, and if the refund then failed the customer was holding
  // the evidence.
  //
  // Now the promise is awaited. Failure keeps the dialog open, says why, and
  // prints nothing. The receipt is in the viewer's language, with the reason
  // they typed escaped rather than written into the page as markup, and in ink
  // only: on paper every colour drops out (§6 rule 10).
  const handleConfirm = async () => {
    if (step === "select") {
      setStep("confirm");
      return;
    }

    setBusy(true);
    setProblem(null);
    try {
      await onConfirm({
        amount: refundAmount,
        method,
        reason,
        type: refundType,
      });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("notRefunded"));
      return;
    } finally {
      setBusy(false);
    }

    const w = window.open("", "_blank", "width=500,height=600");
    if (w) {
      const now = new Date();
      const row = (label: string, value: string) =>
        `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
      w.document
        .write(`<!DOCTYPE html><html lang="${locale}"><head><title>${escapeHtml(t("receiptTitle"))}</title>
<style>${RECEIPT_CSS}</style></head><body>
${invoiceHeaderHtml(receiptFacility)}
<h1>${escapeHtml(t("receiptTitle"))}</h1>
<h2>${escapeHtml(fill("receiptDate", { date: formatDateLong(now, locale) }))}</h2>
<div class="section">${escapeHtml(t("receiptDetails"))}</div>
${row(t("receiptType"), t(TYPE_KEYS[refundType]))}
${row(t("receiptMethod"), methodLabel)}
${reason ? row(t("receiptReason"), reason) : ""}
${
  refundType === "by_item"
    ? `<div class="section">${escapeHtml(t("receiptItems"))}</div>${items
        .filter((_, i) => selectedItems.has(i))
        .map((item) => row(item.name, money(item.price)))
        .join("")}`
    : ""
}
<div class="row total"><span>${escapeHtml(t("receiptAmount"))}</span><span>${escapeHtml(money(refundAmount))}</span></div>
<div class="stamp">${escapeHtml(t("receiptStamp"))}</div>
<div class="note">${escapeHtml(t("receiptNote"))}</div>
<div class="footer">${escapeHtml(fill("receiptFooter", { time: formatTime(now, locale) }))}</div>
</body></html>`);
      w.document.close();
    }

    onOpenChange(false);
    setStep("select");
    setRefundType("full");
    setPartialAmount("");
    setSelectedItems(new Set());
    setReason("");
    setProblem(null);
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("select");
    } else {
      onOpenChange(false);
    }
  };

  const typeOption = (
    type: RefundType,
    Icon: typeof RotateCcw,
    title: string,
    help: string,
  ) => (
    <button
      type="button"
      aria-pressed={refundType === type}
      onClick={() => setRefundType(type)}
      className={cn(
        "border-line flex w-full items-center gap-3 rounded-2xl border p-4 text-left",
        refundType === type && CHOSEN,
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="min-w-0">
        <span className="text-body-ink block text-sm font-semibold">
          {title}
        </span>
        <span className="text-ink-secondary block text-xs">{help}</span>
      </span>
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setStep("select");
          setRefundType("full");
          setProblem(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-5 py-2">
            {/* Refund type */}
            <div className="space-y-2">
              <p className="text-ink-tertiary text-xs font-bold tracking-[.06em] uppercase">
                {t("typeHeading")}
              </p>
              <div className="space-y-1.5">
                {typeOption(
                  "full",
                  RotateCcw,
                  t("fullTitle"),
                  fill("fullHelp", { amount: money(amountPaid) }),
                )}
                {typeOption(
                  "partial",
                  Banknote,
                  t("partialTitle"),
                  t("partialHelp"),
                )}
                {typeOption(
                  "by_item",
                  Check,
                  t("byItemTitle"),
                  t("byItemHelp"),
                )}
              </div>
            </div>

            {/* Partial amount input */}
            {refundType === "partial" && (
              <div>
                <label
                  htmlFor="refund-amount"
                  className="text-ink-secondary mb-1.5 block text-xs"
                >
                  {fill("amountLabel", { max: money(amountPaid) })}
                </label>
                <Input
                  id="refund-amount"
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  min={0}
                  max={amountPaid}
                  step={0.01}
                  className="text-center text-xl font-bold tabular-nums"
                  autoFocus
                />
              </div>
            )}

            {/* Item selection */}
            {refundType === "by_item" && (
              <div className="space-y-1.5">
                <p className="text-ink-secondary text-xs">{t("chooseItems")}</p>
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={selectedItems.has(idx)}
                    onClick={() => toggleItem(idx)}
                    className={cn(
                      "border-line flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left",
                      selectedItems.has(idx) && CHOSEN,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          !selectedItems.has(idx) && "invisible",
                        )}
                      />
                      <span className="text-body-ink text-sm">{item.name}</span>
                    </span>
                    <span className="text-body-ink text-sm font-semibold tabular-nums">
                      {money(item.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Refund method */}
            <div>
              <p className="text-ink-tertiary mb-2 text-xs font-bold tracking-[.06em] uppercase">
                {t("toHeading")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={method === m.value}
                      onClick={() => setMethod(m.value)}
                      className={cn(
                        "border-line text-body-ink flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-2xl border p-3",
                        method === m.value && CHOSEN,
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="text-center text-xs font-semibold">
                        {t(m.key)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="refund-reason"
                className="text-ink-secondary mb-1.5 block text-xs"
              >
                {t("reasonLabel")}
              </label>
              <Input
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                className="text-sm"
              />
            </div>
          </div>
        ) : (
          /* Confirmation step */
          <div className="space-y-5 py-2">
            <div className="border-warning flex items-start gap-3 rounded-2xl border p-4">
              <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-body-ink text-sm font-semibold">
                  {t("confirmTitle")}
                </p>
                <p className="text-ink-secondary mt-0.5 text-sm">
                  {t("confirmBody")}
                </p>
              </div>
            </div>

            <dl className="border-line space-y-2.5 rounded-2xl border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-secondary">{t("receiptType")}</dt>
                <dd className="font-semibold">{t(TYPE_KEYS[refundType])}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-secondary">{t("receiptMethod")}</dt>
                <dd className="font-semibold">{methodLabel}</dd>
              </div>
              {reason && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-secondary">{t("receiptReason")}</dt>
                  <dd className="max-w-[200px] text-right">{reason}</dd>
                </div>
              )}
              <Separator />
              <div className="flex items-baseline justify-between gap-4">
                <dt className="font-semibold">{t("receiptAmount")}</dt>
                <dd className="text-body-ink text-2xl font-bold tabular-nums">
                  {money(refundAmount)}
                </dd>
              </div>
            </dl>

            {problem && (
              <p className="text-destructive text-sm" role="alert">
                {problem}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleBack} disabled={busy}>
            {step === "confirm" ? t("back") : t("keep")}
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            loading={busy}
            disabled={refundAmount <= 0 || refundAmount > amountPaid}
            variant={step === "confirm" ? "destructive" : "default"}
          >
            <RotateCcw className="size-4" />
            {fill(step === "confirm" ? "confirmAction" : "continueAction", {
              amount: money(refundAmount),
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
