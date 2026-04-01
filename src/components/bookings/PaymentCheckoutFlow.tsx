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

interface OtherUnpaidInvoice {
  invoiceId: string;
  service: string;
  amount: number;
}

interface PaymentCheckoutFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  depositPaid: number;
  invoiceTotal: number;
  clientStoreCreditBalance?: number;
  otherUnpaidInvoices?: OtherUnpaidInvoice[];
  onConfirm: (payment: {
    method: PaymentMethod;
    amount: number;
    tip: number;
    changeAsCredit: boolean;
    changeAmount: number;
    includedInvoices?: string[];
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
  otherUnpaidInvoices = [],
  onConfirm,
}: PaymentCheckoutFlowProps) {
  const [method, setMethod] = useState<PaymentMethod>("card_on_file");
  const [cashCollected, setCashCollected] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [changeAsCredit, setChangeAsCredit] = useState(true);
  const [includedInvoices, setIncludedInvoices] = useState<Set<string>>(
    new Set(),
  );
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<
    { method: PaymentMethod; amount: string }[]
  >([]);
  const [paymentNote, setPaymentNote] = useState("");

  const otherTotal = otherUnpaidInvoices
    .filter((i) => includedInvoices.has(i.invoiceId))
    .reduce((s, i) => s + i.amount, 0);

  const remaining = amountDue + tipAmount + otherTotal;
  const splitTotal = splitPayments.reduce(
    (s, p) => s + (parseFloat(p.amount) || 0),
    0,
  );
  const splitLeftToPay = remaining - splitTotal;
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
      includedInvoices:
        includedInvoices.size > 0 ? [...includedInvoices] : undefined,
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

          {/* Other unpaid invoices notice */}
          {otherUnpaidInvoices.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                This client has {otherUnpaidInvoices.length} other unpaid
                invoice{otherUnpaidInvoices.length !== 1 ? "s" : ""} (
                <span className="font-[tabular-nums]">
                  $
                  {otherUnpaidInvoices
                    .reduce((s, i) => s + i.amount, 0)
                    .toFixed(2)}
                </span>
                )
              </p>
              <p className="mt-1 mb-2 text-xs text-amber-600">
                Include them in this payment to settle all at once
              </p>
              <div className="space-y-1">
                {otherUnpaidInvoices.map((inv) => (
                  <label
                    key={inv.invoiceId}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border bg-white px-3 py-2 transition-all",
                      includedInvoices.has(inv.invoiceId)
                        ? "border-amber-400"
                        : "border-amber-200 hover:border-amber-300",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={includedInvoices.has(inv.invoiceId)}
                      onChange={() => {
                        setIncludedInvoices((prev) => {
                          const next = new Set(prev);
                          if (next.has(inv.invoiceId))
                            next.delete(inv.invoiceId);
                          else next.add(inv.invoiceId);
                          return next;
                        });
                      }}
                      className="accent-primary size-3.5"
                    />
                    <span className="flex-1 text-xs">
                      {inv.invoiceId} · {inv.service}
                    </span>
                    <span className="font-[tabular-nums] text-xs font-medium">
                      ${inv.amount.toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
              {includedInvoices.size > 0 && (
                <p className="mt-2 text-xs font-medium text-amber-800">
                  +${otherTotal.toFixed(2)} added to this payment
                </p>
              )}
            </div>
          )}

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

          {/* Split payment toggle + entries */}
          {!splitMode ? (
            <button
              onClick={() => {
                setSplitMode(true);
                setSplitPayments([
                  { method, amount: "" },
                ]);
              }}
              className="text-primary text-xs font-medium hover:underline"
            >
              Split Payment →
            </button>
          ) : (
            <div className="animate-in fade-in space-y-3 rounded-lg border p-3 duration-150">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Split Payment</p>
                <button
                  onClick={() => {
                    setSplitMode(false);
                    setSplitPayments([]);
                  }}
                  className="text-muted-foreground text-xs hover:underline"
                >
                  Cancel Split
                </button>
              </div>
              {splitPayments.map((sp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={sp.method}
                    onChange={(e) => {
                      setSplitPayments((prev) =>
                        prev.map((p, i) =>
                          i === idx
                            ? { ...p, method: e.target.value as PaymentMethod }
                            : p,
                        ),
                      );
                    }}
                    className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                  >
                    <option value="card_on_file">Card</option>
                    <option value="cash">Cash</option>
                    <option value="terminal">Terminal</option>
                    <option value="e_transfer">E-Transfer</option>
                  </select>
                  <Input
                    type="number"
                    value={sp.amount}
                    onChange={(e) => {
                      setSplitPayments((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, amount: e.target.value } : p,
                        ),
                      );
                    }}
                    placeholder="Amount"
                    className="h-8 flex-1 font-[tabular-nums] text-xs"
                    min={0}
                    step={0.01}
                  />
                  {splitPayments.length > 1 && (
                    <button
                      onClick={() =>
                        setSplitPayments((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setSplitPayments((prev) => [
                      ...prev,
                      { method: "cash", amount: "" },
                    ])
                  }
                  className="text-primary text-xs font-medium hover:underline"
                >
                  + Add Method
                </button>
                <span
                  className={cn(
                    "font-[tabular-nums] text-xs font-medium",
                    splitLeftToPay > 0.01
                      ? "text-amber-600"
                      : splitLeftToPay < -0.01
                        ? "text-red-600"
                        : "text-emerald-600",
                  )}
                >
                  {splitLeftToPay > 0.01
                    ? `$${splitLeftToPay.toFixed(2)} left`
                    : splitLeftToPay < -0.01
                      ? `$${Math.abs(splitLeftToPay).toFixed(2)} over`
                      : "Balanced ✓"}
                </span>
              </div>
            </div>
          )}

          {/* Payment note */}
          <Input
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            placeholder="Payment note (optional)"
            className="h-8 text-xs"
          />

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
              {otherTotal > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>
                    + {includedInvoices.size} other invoice
                    {includedInvoices.size !== 1 ? "s" : ""}
                  </span>
                  <span className="font-[tabular-nums]">
                    ${otherTotal.toFixed(2)}
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
            disabled={
              (isCash && !splitMode && cashNum < remaining) ||
              (splitMode && Math.abs(splitLeftToPay) > 0.01)
            }
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
