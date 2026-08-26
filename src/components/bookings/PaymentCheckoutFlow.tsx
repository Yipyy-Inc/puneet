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
import { invoiceHeaderHtml } from "@/lib/invoice-header";
import { useReceiptFacility } from "@/hooks/use-receipt-facility";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { useResolvedTerminal } from "@/lib/api/terminals";
import { TerminalPicker } from "./TerminalPicker";
import { TipSelector } from "./TipSelector";

/** One priced line on the printed receipt — the service, an item, a fee. */
export interface ReceiptDetailLine {
  label: string;
  amount: number;
}

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
  /**
   * What the customer is actually being charged FOR.
   *
   * Optional so the other callers of this dialog are unaffected, but a printed
   * receipt without it is the bug being fixed: this window used to show
   * "Amount / Total Charged" and nothing else, which is a total with no
   * evidence behind it.
   */
  receiptLines?: ReceiptDetailLine[];
  /** The booking's ref, so a printed receipt can be traced back from a counter. */
  receiptReference?: string | null;
  /** "19 Aug 2026, 8:00 a.m. - 6:00 p.m." — already in the facility's clock. */
  receiptServiceWindow?: string | null;
  clientStoreCreditBalance?: number;
  otherUnpaidInvoices?: OtherUnpaidInvoice[];
  /** Auto-applied loyalty discount voucher — shown as a line and netted off the
   *  amount due. The caller marks it used in its onConfirm handler. */
  loyaltyDiscount?: { label: string; amount: number };
  /**
   * May return a promise. When it does, the dialog waits — a terminal payment
   * is held open while the customer finds their card, and a receipt printed
   * before that resolves is a claim about money that has not moved.
   */
  onConfirm: (payment: {
    method: PaymentMethod;
    amount: number;
    tip: number;
    changeAsCredit: boolean;
    changeAmount: number;
    includedInvoices?: string[];
    /** Which terminal to charge on, when the tender is `terminal`. */
    deviceSerial?: string;
  }) => void | Promise<void>;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  Wallet,
  MoreHorizontal: CreditCard,
};

export function PaymentCheckoutFlow({
  open,
  onOpenChange,
  amountDue,
  depositPaid,
  invoiceTotal,
  receiptLines,
  receiptReference,
  receiptServiceWindow,
  clientStoreCreditBalance = 0,
  otherUnpaidInvoices = [],
  loyaltyDiscount,
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

  const facilitySettings = useFacilitySettings();
  // Always resolves: an unconfigured facility gets the domain's fallback
  // (see DEFAULT_TIPS in lib/settings/domains.ts), which is the same set the
  // Settings → Tips screen shows them. `.configured` says whether they have
  // actually chosen; nothing here needs to know, since the fallback is a
  // real answer rather than a placeholder.
  const tipConfig = facilitySettings.settings.tip_config.value;

  const otherTotal = otherUnpaidInvoices
    .filter((i) => includedInvoices.has(i.invoiceId))
    .reduce((s, i) => s + i.amount, 0);

  const loyaltyDiscountAmount = loyaltyDiscount?.amount ?? 0;
  const netAmountDue = Math.max(0, amountDue - loyaltyDiscountAmount);
  // Tax is part of what is COLLECTED, not a note on the receipt. The terminal
  // charges subtotal + tax server-side, so a dialog that totalled the pre-tax
  // figure would print "$49.01" on its own button while the customer was asked
  // for $56.35. Computed on the discounted amount, because a discount reduces
  // the price of the supply and therefore the tax on it.
  const taxOnDue = computeTax(
    Math.round(netAmountDue * 100),
    facilitySettings.settings.tax_config.value as TaxConfig,
  );
  const taxDue = facilitySettings.settings.tax_config.value.pricesIncludeTax
    ? 0
    : taxOnDue.totalCents / 100;
  const remaining = netAmountDue + taxDue + tipAmount + otherTotal;
  const splitTotal = splitPayments.reduce(
    (s, p) => s + (parseFloat(p.amount) || 0),
    0,
  );
  const splitLeftToPay = remaining - splitTotal;
  const cashNum = parseFloat(cashCollected) || 0;
  const { change } = calculateChange(remaining, cashNum);
  const isCash = method === "cash";

  const handleTipPreset = (multiplier: number) => {
    setTipAmount(Math.round(netAmountDue * multiplier * 100) / 100);
    setCustomTip("");
  };

  const handleCustomTip = (val: string) => {
    setCustomTip(val);
    setTipAmount(parseFloat(val) || 0);
  };

  const [confirming, setConfirming] = useState(false);
  // The facility's OWN header, not the fixture's — see use-receipt-facility.
  const receiptFacility = useReceiptFacility();
  // The facility's own tax, shown on the printed copy for the same reason the
  // terminal charges it — a receipt whose lines do not reach its total is the
  // sort of thing a customer photographs.
  const [step, setStep] = useState<"pay" | "receipt">("pay");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // The terminal this till reaches for. Resolved here rather than inside the
  // picker so the confirm handler can send it.
  const {
    terminals,
    chosen: terminal,
    choose: chooseTerminal,
    isPending: terminalsPending,
  } = useResolvedTerminal();
  const isTerminal = method === "terminal";

  const handleConfirm = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setBusy(true);
    setProblem(null);
    try {
      // AWAITED. This used to fire onConfirm, immediately declare success and
      // move to the receipt — all synchronously, before anything reached a
      // processor. On a terminal that is a printed claim about a card the
      // customer has not tapped yet.
      await onConfirm({
        method,
        amount: remaining,
        tip: tipAmount,
        changeAsCredit: isCash && changeAsCredit,
        changeAmount: isCash ? change : 0,
        includedInvoices:
          includedInvoices.size > 0 ? [...includedInvoices] : undefined,
        ...(isTerminal && terminal ? { deviceSerial: terminal.serial } : {}),
      });
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "That payment did not go through.",
      );
      return;
    } finally {
      setBusy(false);
    }

    setConfirming(false);
    setStep("receipt");
    toast.success(`Payment of $${remaining.toFixed(2)} taken`);
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
              ${netAmountDue.toFixed(2)}
            </p>
            {loyaltyDiscount && loyaltyDiscountAmount > 0 && (
              <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {loyaltyDiscount.label}: −${loyaltyDiscountAmount.toFixed(2)}{" "}
                applied
              </p>
            )}
            {depositPaid > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                {/* "Already paid", not "Deposit paid". This figure is
                    `bookings.amount_paid` — everything the customer has handed
                    over on this booking, which is a deposit only sometimes. It
                    used to read the fixture invoice's `depositCollected`, and
                    calling a part payment a deposit is the kind of small lie
                    that makes somebody reconcile two numbers by hand. */}
                Already paid: ${depositPaid.toFixed(2)} · Invoice total: $
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

          {/* Which terminal — only when that is the tender. */}
          {isTerminal && (
            <TerminalPicker
              terminals={terminals}
              chosen={terminal}
              onChoose={chooseTerminal}
              isPending={terminalsPending}
              problem={problem}
            />
          )}

          {/* Split payment toggle + entries */}
          {!splitMode ? (
            <button
              onClick={() => {
                setSplitMode(true);
                setSplitPayments([{ method, amount: "" }]);
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

          {/* Tip — not shown for cash, check, or custom payments, and NOT for
              the terminal: there the customer is asked on the device itself
              (lib/clover/print.ts readTipOnDevice), and the route ignores
              anything picked here. Leaving these buttons on screen would let
              staff select 20%, watch the customer choose nothing, and be handed
              a total that matches neither. */}
          {isTerminal && (
            <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
              The customer is asked for a tip on the terminal.
            </div>
          )}
          {/* The facility's OWN tips, from Settings → Tips — not three
              percentages hardcoded here. This dialog carried 10/15/20 while
              the grooming dialog carried 0/15/18/20 and the pay-by-link page
              carried another set again, so what a customer was offered
              depended on which screen took the money. `TipSelector` draws the
              presets, Custom and No Tip, and resolves the smart tier. */}
          {!isTerminal &&
            method !== "cash" &&
            method !== "custom" &&
            tipConfig.enabled && (
              <div>
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                  Add Tip (optional)
                </p>
                <TipSelector
                  tipConfig={tipConfig}
                  subtotal={netAmountDue}
                  tipAmount={tipAmount}
                  onTipChange={setTipAmount}
                />
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
                  <span>Already paid</span>
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

        {step === "pay" && confirming && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Please review all details — date, time, staff, services, discounts,
            and tips — before confirming payment.
          </div>
        )}

        {/* Receipt step — shown after successful payment */}
        {step === "receipt" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4 py-4 text-center duration-300">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="size-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Payment Complete</p>
              <p className="text-muted-foreground mt-1 text-sm">
                ${remaining.toFixed(2)} charged successfully
              </p>
            </div>
            <Separator />
            {/* ── EMAIL AND SMS ARE GONE, AND THAT IS THE HONEST STATE ────
                Both were `toast.success("Receipt sent via email" | "via SMS")`
                and nothing else. No route was called, nothing was sent, and
                the customer standing at the counter was told their receipt was
                on its way.

                Emailing an itemised receipt IS built — `emailItemisedReceipt`
                and `smsItemisedReceipt` in `lib/clover/receipt-delivery.ts`,
                used for real by the terminal route when the customer picks a
                channel on the device. What is missing is an API route that
                lets a NON-terminal tender reach them. Until that exists this
                dialog offers Print, which really prints. */}
            <p className="text-muted-foreground text-xs">
              Print a receipt for the client?
            </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const w = window.open("", "_blank", "width=500,height=600");
                  if (!w) return;
                  const methodLabel = splitMode
                    ? splitPayments
                        .map((p) => `${p.method}: $${p.amount}`)
                        .join(", ")
                    : method.replace("_", " ");
                  w.document
                    .write(`<!DOCTYPE html><html><head><title>Receipt</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:420px;margin:0 auto}
h1{font-size:18px;margin:0}h2{font-size:12px;color:#666;margin:4px 0 20px}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid #eee}
.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}
.row.sub{color:#666}
.badge{background:#ecfdf5;color:#059669;padding:8px 16px;border-radius:8px;text-align:center;margin-top:16px;font-weight:600;font-size:13px}
.footer{margin-top:24px;text-align:center;font-size:10px;color:#999}
@media print{body{padding:20px}}</style></head><body>
${invoiceHeaderHtml(receiptFacility)}
<h1>Payment Receipt</h1>
<h2>${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2>
${receiptReference ? `<div class="row sub"><span>Reference</span><span>${receiptReference}</span></div>` : ""}
${receiptServiceWindow ? `<div class="row sub"><span>Service</span><span>${receiptServiceWindow}</span></div>` : ""}
${
  receiptLines && receiptLines.length > 0
    ? receiptLines
        .map(
          (l) =>
            `<div class="row"><span>${l.label}</span><span>$${l.amount.toFixed(2)}</span></div>`,
        )
        .join("")
    : `<div class="row"><span>Amount</span><span>$${amountDue.toFixed(2)}</span></div>`
}
<div class="row"><span>Subtotal</span><span>$${amountDue.toFixed(2)}</span></div>
${taxOnDue.lines
  .map(
    (t) =>
      `<div class="row sub"><span>${t.name} ${Number((t.rate * 100).toFixed(4))}%</span><span>$${(t.amountCents / 100).toFixed(2)}</span></div>`,
  )
  .join("")}
${depositPaid > 0 ? `<div class="row sub"><span>Already Paid</span><span>-$${depositPaid.toFixed(2)}</span></div>` : ""}
${tipAmount > 0 ? `<div class="row sub"><span>Tip</span><span>$${tipAmount.toFixed(2)}</span></div>` : ""}
${otherTotal > 0 ? `<div class="row sub"><span>Other Invoices</span><span>$${otherTotal.toFixed(2)}</span></div>` : ""}
<div class="row total"><span>Total Charged</span><span>$${remaining.toFixed(2)}</span></div>
<div class="row sub"><span>Payment Method</span><span>${methodLabel}</span></div>
${paymentNote ? `<div class="row sub"><span>Note</span><span>${paymentNote}</span></div>` : ""}
<div class="badge">PAYMENT COMPLETE</div>
<div class="footer">Thank you for your business!<br>${receiptFacility?.name ?? ""}</div>
</body></html>`);
                  w.document.close();
                  w.print();
                  toast.success("Receipt sent to printer");
                }}
              >
                Print
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "pay" && (
            <>
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
                onClick={() => void handleConfirm()}
                disabled={
                  busy ||
                  (isCash && !splitMode && cashNum < remaining) ||
                  (splitMode && Math.abs(splitLeftToPay) > 0.01) ||
                  // A terminal payment with no terminal is not a payment.
                  (isTerminal && !terminal)
                }
                className={cn(
                  "gap-1.5",
                  confirming && "bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                <Check className="size-4" />
                {busy
                  ? isTerminal
                    ? "Waiting for the card…"
                    : "Taking payment…"
                  : confirming
                    ? `Confirm & Charge $${remaining.toFixed(2)}`
                    : `Checkout & Charge $${remaining.toFixed(2)}`}
              </Button>
            </>
          )}
          {step === "receipt" && (
            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                setStep("pay");
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
