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
import { Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PrepaymentResult {
  amount: number;
  method: "card" | "cash" | "terminal" | "ach";
  note?: string;
}

interface PrepaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingDue: number;
  invoiceTotal: number;
  alreadyCollected: number;
  onConfirm: (result: PrepaymentResult) => void;
}

const METHODS = [
  { value: "card" as const, label: "Card on file", Icon: CreditCard },
  { value: "cash" as const, label: "Cash", Icon: Banknote },
  { value: "terminal" as const, label: "Terminal", Icon: Smartphone },
  { value: "ach" as const, label: "Bank/ACH", Icon: Wallet },
];

export function PrepaymentModal({
  open,
  onOpenChange,
  remainingDue,
  invoiceTotal,
  alreadyCollected,
  onConfirm,
}: PrepaymentModalProps) {
  const [amount, setAmount] = useState<string>(remainingDue.toFixed(2));
  const [method, setMethod] = useState<PrepaymentResult["method"]>("card");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(remainingDue.toFixed(2));
      setMethod("card");
      setNote("");
    }
  }, [open, remainingDue]);

  const numericAmount = parseFloat(amount) || 0;
  const valid = numericAmount > 0 && numericAmount <= remainingDue + 0.01;
  const isFull = Math.abs(numericAmount - remainingDue) < 0.01;
  const newRemaining = Math.max(0, remainingDue - numericAmount);

  const presetAmounts = [
    { label: "25%", value: Math.round(remainingDue * 0.25 * 100) / 100 },
    { label: "50%", value: Math.round(remainingDue * 0.5 * 100) / 100 },
    { label: "Full", value: remainingDue },
  ].filter((p) => p.value > 0);

  const handleSubmit = () => {
    if (!valid) return;
    onConfirm({ amount: numericAmount, method, note: note || undefined });
    toast.success(
      isFull
        ? `Prepayment of $${numericAmount.toFixed(2)} collected — invoice fully prepaid, stays open for add-ons`
        : `Prepayment of $${numericAmount.toFixed(2)} collected — $${newRemaining.toFixed(2)} remaining`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Take Prepayment</DialogTitle>
          <DialogDescription>
            Collect a partial or full payment without closing the invoice. The
            booking stays active and more items can still be added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Balance summary */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Invoice total</span>
              <span className="font-[tabular-nums]">
                ${invoiceTotal.toFixed(2)}
              </span>
            </div>
            {alreadyCollected > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Already collected</span>
                <span className="font-[tabular-nums] text-emerald-700">
                  -${alreadyCollected.toFixed(2)}
                </span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t pt-1.5 text-sm font-medium">
              <span>Remaining due</span>
              <span className="font-[tabular-nums]">
                ${remainingDue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Prepayment amount
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                max={remainingDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 text-right font-[tabular-nums] text-base"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presetAmounts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setAmount(p.value.toFixed(2))}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    Math.abs(numericAmount - p.value) < 0.01
                      ? "border-foreground bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p.label} (${p.value.toFixed(2)})
                </button>
              ))}
            </div>
            {!isFull && numericAmount > 0 && (
              <p className="text-muted-foreground text-[11px]">
                After this prepayment:{" "}
                <span className="text-foreground font-medium font-[tabular-nums]">
                  ${newRemaining.toFixed(2)}
                </span>{" "}
                will remain due at checkout.
              </p>
            )}
            {isFull && (
              <p className="text-[11px] text-emerald-700">
                Invoice will be fully prepaid. The booking stays Open so add-ons
                can still be billed at pickup.
              </p>
            )}
          </div>

          {/* Method */}
          <div>
            <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
              Payment method
            </p>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all",
                    method === value
                      ? "border-primary ring-1 ring-primary text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Note (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Prepay for boarding stay nights 1-3"
              className="mt-1 h-16 resize-none text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            Charge ${numericAmount.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
