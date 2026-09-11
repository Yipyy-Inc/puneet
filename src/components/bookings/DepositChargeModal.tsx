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

  const amount = useRule ? ruleAmount : parseFloat(customAmount) || 0;
  const tax = taxFor && amount > 0 ? taxFor(amount) : 0;

  const methods: {
    value: DepositTender;
    label: string;
    icon: typeof Banknote;
  }[] = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "e_transfer", label: "E-Transfer", icon: ArrowLeftRight },
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
      setProblem(
        error instanceof Error
          ? error.message
          : "The deposit was not recorded.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Charge Deposit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-muted-foreground text-sm">
            Deposit Rule: {ruleLabel}
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
                Use rule amount:{" "}
                <strong className="tabular-nums">
                  ${ruleAmount.toFixed(2)}
                </strong>
              </span>
            </label>
            <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5">
              <input
                type="radio"
                checked={!useRule}
                onChange={() => setUseRule(false)}
                className="accent-primary"
              />
              <span className="text-sm">Custom amount:</span>
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setUseRule(false);
                }}
                className="ml-auto h-8 w-24 text-right tabular-nums"
                min={0}
                step={0.01}
                placeholder="0.00"
              />
            </label>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-all",
                      method === m.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className="size-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-ink-tertiary mt-2 text-xs">
              This records money already in hand. A card is charged at checkout,
              on the terminal or a saved card.
            </p>
          </div>
          {tax > 0 && (
            <p className="text-ink-secondary text-sm tabular-nums">
              Plus ${tax.toFixed(2)} tax — ${(amount + tax).toFixed(2)} in all
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
            Cancel
          </Button>
          <Button
            onClick={() => void handleCharge()}
            disabled={amount <= 0}
            loading={busy}
          >
            Record deposit ${(amount + tax).toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
