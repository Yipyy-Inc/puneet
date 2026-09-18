"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftRight, Banknote, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

/**
 * Money already in hand — see DepositChargeModal: "Card on file" and
 * "Terminal" wrote card rows without charging a card.
 */
export interface PrepaymentResult {
  amount: number;
  method: "cash" | "e_transfer" | "ach";
  note?: string;
}

interface PrepaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingDue: number;
  invoiceTotal: number;
  alreadyCollected: number;
  /** The facility's tax on an amount — shown, and recorded with it. */
  taxFor?: (amount: number) => number;
  /** AWAITED: the dialog closes only once the payment is recorded. */
  onConfirm: (result: PrepaymentResult) => Promise<void>;
}

const METHODS = [
  { value: "cash" as const, key: "cash", Icon: Banknote },
  { value: "e_transfer" as const, key: "eTransfer", Icon: ArrowLeftRight },
  { value: "ach" as const, key: "bankTransfer", Icon: Wallet },
];

export function PrepaymentModal({
  open,
  onOpenChange,
  remainingDue,
  invoiceTotal,
  alreadyCollected,
  taxFor,
  onConfirm,
}: PrepaymentModalProps) {
  const [amount, setAmount] = useState<string>(remainingDue.toFixed(2));
  const [method, setMethod] = useState<PrepaymentResult["method"]>("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { t, fill, locale } = useStaffText("prepayment");
  const money = (value: number) => formatMoney(value, locale);

  useEffect(() => {
    if (open) {
      setAmount(remainingDue.toFixed(2));
      setMethod("cash");
      setNote("");
      setProblem(null);
    }
  }, [open, remainingDue]);

  const numericAmount = parseFloat(amount) || 0;
  const valid = numericAmount > 0 && numericAmount <= remainingDue + 0.01;
  const isFull = Math.abs(numericAmount - remainingDue) < 0.01;
  const newRemaining = Math.max(0, remainingDue - numericAmount);

  const presetAmounts = [
    {
      label: t("preset25"),
      value: Math.round(remainingDue * 0.25 * 100) / 100,
    },
    { label: t("preset50"), value: Math.round(remainingDue * 0.5 * 100) / 100 },
    { label: t("presetFull"), value: remainingDue },
  ].filter((p) => p.value > 0);

  const tax = taxFor && numericAmount > 0 ? taxFor(numericAmount) : 0;

  // "Prepayment collected" used to be said before anything was written, and
  // again when the write was refused.
  const handleSubmit = async () => {
    if (!valid) return;
    setBusy(true);
    setProblem(null);
    try {
      await onConfirm({
        amount: numericAmount,
        method,
        note: note || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("notRecorded"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Balance summary */}
          <div className="border-line rounded-2xl border px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-secondary">{t("invoiceTotal")}</span>
              <span className="tabular-nums">{money(invoiceTotal)}</span>
            </div>
            {alreadyCollected > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">{t("alreadyPaid")}</span>
                <span className="text-success tabular-nums">
                  −{money(alreadyCollected)}
                </span>
              </div>
            )}
            <div className="border-line mt-1 flex items-center justify-between border-t pt-1.5 text-sm font-semibold">
              <span>{t("remainingDue")}</span>
              <span className="tabular-nums">{money(remainingDue)}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label
              htmlFor="prepayment-amount"
              className="text-ink-tertiary text-xs font-bold tracking-[.06em] uppercase"
            >
              {t("amount")}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="prepayment-amount"
                type="number"
                min={0.01}
                step={0.01}
                max={remainingDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-right text-base tabular-nums"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presetAmounts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setAmount(p.value.toFixed(2))}
                  aria-pressed={Math.abs(numericAmount - p.value) < 0.01}
                  className={cn(
                    "min-h-10 rounded-full border px-3 text-xs font-semibold",
                    Math.abs(numericAmount - p.value) < 0.01
                      ? "border-primary text-primary shadow-[inset_0_0_0_2px_var(--primary)]"
                      : "text-body-ink",
                  )}
                >
                  {fill("preset", { label: p.label, amount: money(p.value) })}
                </button>
              ))}
            </div>
            {!isFull && numericAmount > 0 && (
              <p className="text-ink-secondary text-xs">
                {fill("afterThis", { amount: money(newRemaining) })}
              </p>
            )}
            {isFull && (
              <p className="text-success text-xs">{t("fullyPrepaid")}</p>
            )}
          </div>

          {/* Method */}
          <div>
            <p className="text-ink-tertiary mb-1.5 text-xs font-bold tracking-[.06em] uppercase">
              {t("method")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ value, key, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={method === value}
                  onClick={() => setMethod(value)}
                  className={cn(
                    "flex min-h-10 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-xs font-semibold",
                    method === value
                      ? "border-primary text-primary shadow-[inset_0_0_0_2px_var(--primary)]"
                      : "text-body-ink",
                  )}
                >
                  <Icon className="size-4" />
                  {t(key)}
                </button>
              ))}
            </div>
            <p className="text-ink-tertiary mt-2 text-xs">{t("inHandNote")}</p>
          </div>

          {/* Optional note */}
          <div>
            <label
              htmlFor="prepayment-note"
              className="text-ink-tertiary text-xs font-bold tracking-[.06em] uppercase"
            >
              {t("note")}
            </label>
            <Textarea
              id="prepayment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="mt-1 min-h-16 resize-none text-sm"
            />
          </div>
        </div>

        {tax > 0 && (
          <p className="text-ink-secondary text-sm tabular-nums">
            {fill("plusTax", {
              tax: money(tax),
              total: money(numericAmount + tax),
            })}
          </p>
        )}
        {problem && (
          <p role="alert" className="text-destructive text-sm">
            {problem}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!valid}
            loading={busy}
          >
            {fill("record", { amount: money(numericAmount + tax) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
