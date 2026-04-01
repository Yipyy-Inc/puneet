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
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  Wallet,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PAYMENT_METHODS,
  calculateChange,
  type PaymentMethod,
} from "@/lib/invoice-lifecycle";

interface PaymentCheckoutFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  depositPaid: number;
  invoiceTotal: number;
  clientStoreCreditBalance?: number;
  onConfirm: (payment: {
    method: PaymentMethod;
    amount: number;
    tip: number;
    changeAsCredit: boolean;
    changeAmount: number;
  }) => void;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  Wallet,
  MoreHorizontal: CreditCard,
};

const TIP_PRESETS = [
  { label: "10%", multiplier: 0.1 },
  { label: "15%", multiplier: 0.15 },
  { label: "20%", multiplier: 0.2 },
];

export function PaymentCheckoutFlow({
  open,
  onOpenChange,
  amountDue,
  depositPaid,
  invoiceTotal,
  clientStoreCreditBalance = 0,
  onConfirm,
}: PaymentCheckoutFlowProps) {
  const [method, setMethod] = useState<PaymentMethod>("card_on_file");
  const [cashCollected, setCashCollected] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [changeAsCredit, setChangeAsCredit] = useState(true);

  const remaining = amountDue + tipAmount;
  const cashNum = parseFloat(cashCollected) || 0;
  const { change } = calculateChange(remaining, cashNum);
  const isCash = method === "cash";

  const handleTipPreset = (multiplier: number) => {
    setTipAmount(Math.round(amountDue * multiplier * 100) / 100);
    setCustomTip("");
  };

  const handleCustomTip = (val: string) => {
    setCustomTip(val);
    setTipAmount(parseFloat(val) || 0);
  };

  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onConfirm({
      method,
      amount: remaining,
      tip: tipAmount,
      changeAsCredit: isCash && changeAsCredit,
      changeAmount: isCash ? change : 0,
    });
    onOpenChange(false);
    setConfirming(false);
    toast.success(`Payment of $${remaining.toFixed(2)} processed`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Amount */}
          <div className="bg-muted/30 rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">Amount Due</p>
            <p className="font-[tabular-nums] text-3xl font-bold">
              ${amountDue.toFixed(2)}
            </p>
            {depositPaid > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                Deposit paid: ${depositPaid.toFixed(2)} · Invoice total: $
                {invoiceTotal.toFixed(2)}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.filter(
                (m) =>
                  m.value !== "store_credit" || clientStoreCreditBalance > 0,
              ).map((m) => {
                const Icon = ICONS[m.icon] ?? CreditCard;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                      method === m.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="text-[11px] font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Store credit info */}
          {method === "store_credit" && (
            <div className="animate-in fade-in rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 duration-150">
              <p className="font-medium">
                Store Credit Balance: ${clientStoreCreditBalance.toFixed(2)}
              </p>
              {clientStoreCreditBalance >= remaining ? (
                <p className="mt-1 text-xs">
                  Full amount will be covered by store credit.
                </p>
              ) : (
                <p className="mt-1 text-xs">
                  ${clientStoreCreditBalance.toFixed(2)} will be applied.
                  Remaining ${(remaining - clientStoreCreditBalance).toFixed(2)}{" "}
                  due by another method.
                </p>
              )}
            </div>
          )}

          {/* Cash payment */}
          {isCash && (
            <div className="animate-in fade-in space-y-3 rounded-lg border p-3 duration-150">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Amount Collected</label>
                <Input
                  type="number"
                  value={cashCollected}
                  onChange={(e) => setCashCollected(e.target.value)}
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                  className="font-[tabular-nums]"
                />
              </div>
              {cashNum > 0 && change > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Change Due</span>
                    <span className="font-[tabular-nums] font-semibold">
                      ${change.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs">
                      <input
                        type="radio"
                        checked={!changeAsCredit}
                        onChange={() => setChangeAsCredit(false)}
                        className="accent-primary"
                      />
                      Return change to client
                    </label>
                    <label className="hover:bg-muted/30 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs">
                      <input
                        type="radio"
                        checked={changeAsCredit}
                        onChange={() => setChangeAsCredit(true)}
                        className="accent-primary"
                      />
                      Keep as store credit (${change.toFixed(2)})
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tip — not shown for cash, check, or custom payments */}
          {method !== "cash" && method !== "custom" && (
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                Add Tip (optional)
              </p>
              <div className="flex gap-2">
                {TIP_PRESETS.map((t) => {
                  const amt = Math.round(amountDue * t.multiplier * 100) / 100;
                  const active = tipAmount === amt && !customTip;
                  return (
                    <button
                      key={t.label}
                      onClick={() => handleTipPreset(t.multiplier)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all",
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <p>{t.label}</p>
                      <p className="text-muted-foreground mt-0.5 font-[tabular-nums] text-[10px]">
                        ${amt.toFixed(2)}
                      </p>
                    </button>
                  );
                })}
                <div className="flex-1">
                  <Input
                    type="number"
                    value={customTip}
                    onChange={(e) => handleCustomTip(e.target.value)}
                    placeholder="Custom"
                    min={0}
                    step={0.01}
                    className="h-full text-center text-xs"
                  />
                </div>
                <button
                  onClick={() => {
                    setTipAmount(0);
                    setCustomTip("");
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                    tipAmount === 0
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted/50",
                  )}
                >
                  No Tip
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-muted/20 rounded-lg border p-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Services & Products
                </span>
                <span className="font-[tabular-nums]">
                  ${invoiceTotal.toFixed(2)}
                </span>
              </div>
              {depositPaid > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Deposit paid</span>
                  <span className="font-[tabular-nums]">
                    -${depositPaid.toFixed(2)}
                  </span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="font-[tabular-nums]">
                    ${tipAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Amount to charge</span>
                <span className="font-[tabular-nums]">
                  ${remaining.toFixed(2)}
                </span>
              </div>
              {isCash && change > 0 && changeAsCredit && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>→ Store credit added</span>
                  <span className="font-[tabular-nums]">
                    +${change.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {confirming && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Please review all details — date, time, staff, services, discounts,
            and tips — before confirming payment.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (confirming) {
                setConfirming(false);
              } else {
                onOpenChange(false);
              }
            }}
          >
            {confirming ? "Go Back" : "Back to Invoice"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCash && cashNum < remaining}
            className={cn(
              "gap-1.5",
              confirming && "bg-emerald-600 hover:bg-emerald-700",
            )}
          >
            <Check className="size-4" />
            {confirming
              ? `Confirm & Charge $${remaining.toFixed(2)}`
              : `Checkout & Charge $${remaining.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
