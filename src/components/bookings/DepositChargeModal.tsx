"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeftRight, Banknote } from "lucide-react";
import { formatMoney } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

/**
 * Money already in hand. "Card on File" and "Terminal" were offered here and
 * wrote a ledger row saying a card had been charged — without asking any card
 * network or device for a cent. A card is charged at checkout, where it
 * really is.
 */
export type DepositTender = "cash" | "e_transfer";

interface DepositChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleAmount: number;
  ruleLabel: string;
  /** The facility's tax on an amount — shown, and recorded with it. */
  taxFor?: (amount: number) => number;
  /** AWAITED: the dialog closes only once the deposit is recorded. */
  onCharge: (amount: number, method: DepositTender) => Promise<void>;
}

export function DepositChargeModal({
  open,
  onOpenChange,
  ruleAmount,
  ruleLabel,
  taxFor,
  onCharge,
}: DepositChargeModalProps) {
  const [useRule, setUseRule] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<DepositTender>("cash");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const { t, fill, locale } = useStaffText("depositCharge");
  const money = (value: number) => formatMoney(value, locale);

  const amount = useRule ? ruleAmount : parseFloat(customAmount) || 0;
  const tax = taxFor && amount > 0 ? taxFor(amount) : 0;

  const methods: {
    value: DepositTender;
    label: string;
    icon: typeof Banknote;
  }[] = [
    { value: "cash", label: t("cash"), icon: Banknote },
    { value: "e_transfer", label: t("eTransfer"), icon: ArrowLeftRight },
  ];

  // The toast used to say "charged" before the page had written anything —
  // and again when the write was refused.
  const handleCharge = async () => {
    if (amount <= 0) return;
    setBusy(true);
    setProblem(null);
    try {
      await onCharge(amount, method);
      onOpenChange(false);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("notRecorded"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-muted-foreground text-sm">
            {fill("ruleLine", { rule: ruleLabel })}
          </p>

          {/* Amount selection */}
          <div className="space-y-2">
            <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5">
              <input
                type="radio"
                checked={useRule}
                onChange={() => setUseRule(true)}
                className="accent-primary"
              />
              <span className="text-sm">
                {t("useRule")}{" "}
                <strong className="tabular-nums">{money(ruleAmount)}</strong>
              </span>
            </label>
            <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5">
              <input
                type="radio"
                checked={!useRule}
                onChange={() => setUseRule(false)}
                className="accent-primary"
              />
              <span className="text-sm">{t("customAmount")}</span>
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setUseRule(false);
                }}
                aria-label={t("customAmountLabel")}
                className="ml-auto w-28 text-right tabular-nums"
                min={0}
                step={0.01}
                placeholder="0.00"
              />
            </label>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-ink-tertiary mb-2 text-xs font-bold tracking-[.06em] uppercase">
              {t("method")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={method === m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      // Selected is a 2px ring and the primary ink, never a
                      // tint (§6 rules 1 and 2).
                      "flex min-h-10 flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-xs font-semibold",
                      method === m.value
                        ? "border-primary text-primary shadow-[inset_0_0_0_2px_var(--primary)]"
                        : "text-body-ink",
                    )}
                  >
                    <Icon className="size-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-ink-tertiary mt-2 text-xs">{t("inHandNote")}</p>
          </div>
          {tax > 0 && (
            <p className="text-ink-secondary text-sm tabular-nums">
              {fill("plusTax", { tax: money(tax), total: money(amount + tax) })}
            </p>
          )}
          {problem && (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button
            onClick={() => void handleCharge()}
            disabled={amount <= 0}
            loading={busy}
          >
            {fill("record", { amount: money(amount + tax) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
