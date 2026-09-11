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
  Gift,
} from "lucide-react";
import { useStaffText } from "@/lib/staff/use-staff-text";
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
import { formatMoney } from "@/lib/i18n/format";
import { useResolvedTerminal } from "@/lib/api/terminals";
import { useSavedCards } from "@/lib/api/saved-cards";
import {
  planSplit,
  TAKES_THE_REST,
  type SplitMethod,
  type SplitRow,
} from "@/lib/checkout/plan-split";
import { TerminalPicker } from "./TerminalPicker";
import { TipSelector } from "./TipSelector";
import { PromoCodeField } from "./PromoCodeField";

/** One priced line on the printed receipt — the service, an item, a fee. */
export interface ReceiptDetailLine {
  label: string;
  amount: number;
}

/**
 * What the dialog hands its caller. Supply, tax and tip are APART, because the
 * ledger records them apart: a booking's balance is the pre-tax supply
 * (20260819210000), and a single `amount` with the tax folded in was refused
 * as "more than is owed" at every facility that charges tax.
 */
export interface CheckoutPayment {
  method: PaymentMethod;
  /** The supply being paid for — what is owed, less the discounts shown. */
  subtotal: number;
  tax: number;
  tip: number;
  /** subtotal + tax + tip: the figure on the button. */
  amount: number;
  /** Cash handed over, when the tender is cash. */
  cashReceived?: number;
  changeAsCredit: boolean;
  changeAmount: number;
  /** Set in split mode: each part, planned by lib/checkout/plan-split. */
  splits?: SplitRow[];
  /** Which terminal to charge on, when a terminal is involved. */
  deviceSerial?: string;
  /** The card to charge, when the tender is `gift_card`. */
  giftCardCode?: string;
  /** The stored card to charge, when a saved card is involved. */
  savedCardId?: string;
  /** The payment note, which goes on the ledger row — not only on paper. */
  note?: string;
}

/**
 * What actually happened, so the dialog reports THAT rather than the total it
 * was showing. `stillOwed` is set when only part of the bill was covered —
 * store credit that did not stretch, say.
 */
export interface CheckoutResult {
  taken: number;
  stillOwed?: number;
  /** Said instead of "Payment complete" — e.g. nothing could be charged. */
  message?: string;
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
  /**
   * Offer "Gift card" as a tender. Opt-in: it pays through
   * `pay_booking_with_gift_card`, which only a caller that knows the booking
   * can call — so a till that cannot handle it never shows it.
   */
  giftCardTender?: boolean;
  /**
   * The client's uuid, so "Card on File" can offer the cards they actually
   * saved. Absent, or a client with no chargeable card: the tender is not
   * offered — it used to record a card payment without charging any card.
   */
  clientRowId?: string | null;
  /** Auto-applied loyalty discount voucher — shown as a line and netted off the
   *  amount due. The caller marks it used in its onConfirm handler. */
  loyaltyDiscount?: { label: string; amount: number };
  /** The client's membership discount — a line, netted off like the reward.
   *  The caller puts it on the bill in its onConfirm handler. */
  membershipDiscount?: { label: string; amount: number };
  /** The booking's ref — when given, a promo code can be put on its bill. */
  promoBookingRef?: number;
  /**
   * The dialog WAITS for this, and a throw keeps it open with the reason on
   * screen. Resolve only once the money has been recorded — the receipt and
   * "Payment complete" are claims about money that has moved.
   */
  onConfirm: (
    payment: CheckoutPayment,
  ) => void | CheckoutResult | Promise<void | CheckoutResult>;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  Wallet,
  Gift,
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
  giftCardTender = false,
  clientRowId = null,
  loyaltyDiscount,
  membershipDiscount,
  promoBookingRef,
  onConfirm,
}: PaymentCheckoutFlowProps) {
  // Cash first: "Card on File" is offered only when the client has a card
  // that can actually be charged (see `chargeableCards`).
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [giftCardCode, setGiftCardCode] = useState("");
  const { t: gcT, locale: gcLocale } = useStaffText("checkoutGiftCard");
  const { t: coT, fill: coFill } = useStaffText("checkout");
  const coMoney = (n: number) => formatMoney(n, gcLocale);
  const isGiftCard = method === "gift_card";
  const [cashCollected, setCashCollected] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [changeAsCredit, setChangeAsCredit] = useState(true);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<
    { method: SplitMethod; amount: string }[]
  >([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [savedCardId, setSavedCardId] = useState<string>("");
  // What really happened, for the receipt step — not the total on the button.
  const [result, setResult] = useState<CheckoutResult | null>(null);

  // The client's stored cards. Only a card with recorded consent can be
  // charged (the route refuses the rest), so only those are offered.
  const { data: savedCards } = useSavedCards(open ? clientRowId : null);
  const chargeableCards = (savedCards ?? []).filter((c) => c.chargeable);

  const facilitySettings = useFacilitySettings();
  // Always resolves: an unconfigured facility gets the domain's fallback
  // (see DEFAULT_TIPS in lib/settings/domains.ts), which is the same set the
  // Settings → Tips screen shows them. `.configured` says whether they have
  // actually chosen; nothing here needs to know, since the fallback is a
  // real answer rather than a placeholder.
  const tipConfig = facilitySettings.settings.tip_config.value;

  const loyaltyDiscountAmount = loyaltyDiscount?.amount ?? 0;
  const membershipDiscountAmount = membershipDiscount?.amount ?? 0;
  const netAmountDue = Math.max(
    0,
    amountDue - loyaltyDiscountAmount - membershipDiscountAmount,
  );
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
  const splitHasTerminal = splitPayments.some((p) => p.method === "terminal");
  const splitHasSavedCard = splitPayments.some(
    (p) => p.method === "card_on_file",
  );
  // The terminal asks the customer for the tip itself, so a tip picked here
  // alongside a terminal part would be charged twice or not at all.
  // Nor is one offered for cash (the change is the customer's to leave). A tip
  // picked under another tender and then left behind when the tender changed
  // must not ride along into the charge.
  const tipHere =
    tipAmount > 0 &&
    (splitMode
      ? !splitHasTerminal
      : method !== "terminal" && method !== "cash");
  const tipToCharge = tipHere ? tipAmount : 0;
  const remaining =
    Math.round((netAmountDue + taxDue + tipToCharge) * 100) / 100;
  const splitRows: SplitRow[] = splitPayments.map((p) => ({
    method: p.method,
    amount: parseFloat(p.amount) || 0,
  }));
  const splitTyped = splitRows
    .filter((r) => !TAKES_THE_REST.has(r.method))
    .reduce((s, r) => s + r.amount, 0);
  const splitLeftToPay = Math.round((remaining - splitTyped) * 100) / 100;
  const split = splitMode
    ? planSplit({
        subtotal: netAmountDue,
        tax: taxDue,
        tip: tipToCharge,
        rows: splitRows,
      })
    : null;
  const splitStoreCredit = splitRows
    .filter((r) => r.method === "store_credit")
    .reduce((s, r) => s + r.amount, 0);
  const splitProblem =
    split && !split.ok
      ? split.problem
      : splitStoreCredit > clientStoreCreditBalance + 0.005
        ? coFill("storeCreditShort", {
            amount: coMoney(clientStoreCreditBalance),
          })
        : null;
  // Left empty, the customer handed over exactly the total — the placeholder
  // says so. Typing a larger figure works out the change.
  const cashNum =
    cashCollected.trim() === "" ? remaining : parseFloat(cashCollected) || 0;
  const { change } = calculateChange(remaining, cashNum);
  const isCash = method === "cash";
  const isSavedCard = method === "card_on_file";

  const [confirming, setConfirming] = useState(false);
  // The facility's OWN header, not the fixture's — see use-receipt-facility.
  const receiptFacility = useReceiptFacility();
  // The facility's own tax, shown on the printed copy for the same reason the
  // terminal charges it — a receipt whose lines do not reach its total is the
  // sort of thing a customer photographs.
  const [step, setStep] = useState<"pay" | "receipt">("pay");
  const [busy, setBusy] = useState(false);
  /** Separate from `busy`: stopping the prompt is not taking the payment. */
  const [stopping, setStopping] = useState(false);
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
    let outcome: void | CheckoutResult;
    try {
      // AWAITED. This used to fire onConfirm, immediately declare success and
      // move to the receipt — all synchronously, before anything reached a
      // processor. On a terminal that is a printed claim about a card the
      // customer has not tapped yet.
      outcome = await onConfirm({
        method,
        subtotal: netAmountDue,
        tax: taxDue,
        tip: tipToCharge,
        amount: remaining,
        ...(isCash && !splitMode ? { cashReceived: cashNum } : {}),
        changeAsCredit: isCash && !splitMode && changeAsCredit,
        changeAmount: isCash && !splitMode ? change : 0,
        ...(splitMode ? { splits: splitRows } : {}),
        ...((isTerminal || (splitMode && splitHasTerminal)) && terminal
          ? { deviceSerial: terminal.serial }
          : {}),
        ...(isGiftCard ? { giftCardCode: giftCardCode.trim() } : {}),
        ...((isSavedCard || (splitMode && splitHasSavedCard)) && savedCardId
          ? { savedCardId }
          : {}),
        ...(paymentNote.trim() ? { note: paymentNote.trim() } : {}),
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

    // What the caller says was taken — not the figure on the button. A caller
    // that returns nothing is an older one, and means "all of it".
    const done: CheckoutResult = outcome ?? { taken: remaining };
    setResult(done);
    setConfirming(false);
    setStep("receipt");
    if (done.message) toast.info(done.message);
    else if (done.stillOwed && done.stillOwed > 0.005)
      toast.warning(
        coFill("takenOwed", {
          amount: coMoney(done.taken),
          owed: coMoney(done.stillOwed),
        }),
      );
    else toast.success(coFill("paymentTaken", { amount: coMoney(done.taken) }));
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
            <p className="text-3xl font-bold tabular-nums">
              ${netAmountDue.toFixed(2)}
            </p>
            {loyaltyDiscount && loyaltyDiscountAmount > 0 && (
              <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {loyaltyDiscount.label}: −${loyaltyDiscountAmount.toFixed(2)}{" "}
                applied
              </p>
            )}
            {membershipDiscount && membershipDiscountAmount > 0 && (
              <p className="text-success mt-1 text-xs font-medium tabular-nums">
                {membershipDiscount.label}: −
                {formatMoney(membershipDiscountAmount, gcLocale)}
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

          {promoBookingRef !== undefined && (
            <PromoCodeField bookingRef={promoBookingRef} />
          )}

          {/* "Other unpaid invoices" were offered here, charged to THIS booking
              alone and refused as more than it owed, while the dialog said
              the lot was paid. Several bills are settled together from the
              client file's bulk payment, which settles each one. */}

          {/* Payment Method */}
          <div>
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.filter(
                (m) =>
                  // "Custom" has no meaning the books recognise — the handler
                  // refused it AFTER the dialog had already said "Payment
                  // Complete". It is not offered.
                  m.value !== "custom" &&
                  // A stored card, only when there is one that can be charged.
                  (m.value !== "card_on_file" || chargeableCards.length > 0) &&
                  (m.value !== "store_credit" ||
                    clientStoreCreditBalance > 0) &&
                  (m.value !== "gift_card" || giftCardTender),
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
                    <span className="text-[11px] font-medium">
                      {m.value === "gift_card" ? gcT("tender") : m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Which terminal — only when a terminal is taking money. */}
          {(isTerminal || (splitMode && splitHasTerminal)) && (
            <TerminalPicker
              terminals={terminals}
              chosen={terminal}
              onChoose={chooseTerminal}
              isPending={terminalsPending}
              problem={problem}
            />
          )}

          {/* Which stored card. Charged through the card route, which asks
              Clover and works out the balance and tax itself. */}
          {(isSavedCard || (splitMode && splitHasSavedCard)) && (
            <div className="grid gap-1.5">
              <label htmlFor="saved-card" className="text-xs font-medium">
                {coT("cardToCharge")}
              </label>
              <select
                id="saved-card"
                value={savedCardId}
                onChange={(e) => setSavedCardId(e.target.value)}
                className="border-input bg-background min-h-10 rounded-full border px-3 text-sm max-lg:min-h-12"
              >
                <option value="">{coT("chooseCard")}</option>
                {chargeableCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.brand ?? "Card") + " ···" + (c.last4 ?? "")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Split payment toggle + entries */}
          {!splitMode ? (
            <button
              onClick={() => {
                setSplitMode(true);
                setSplitPayments([
                  {
                    method: (
                      [
                        "cash",
                        "e_transfer",
                        "store_credit",
                        "terminal",
                        "card_on_file",
                      ] as SplitMethod[]
                    ).includes(method as SplitMethod)
                      ? (method as SplitMethod)
                      : "cash",
                    amount: "",
                  },
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
                            ? { ...p, method: e.target.value as SplitMethod }
                            : p,
                        ),
                      );
                    }}
                    className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="e_transfer">E-Transfer</option>
                    {clientStoreCreditBalance > 0 && (
                      <option value="store_credit">{coT("storeCredit")}</option>
                    )}
                    {terminals.length > 0 && (
                      <option value="terminal">{coT("terminalRest")}</option>
                    )}
                    {chargeableCards.length > 0 && (
                      <option value="card_on_file">{coT("cardRest")}</option>
                    )}
                  </select>
                  {TAKES_THE_REST.has(sp.method) ? (
                    <span className="text-muted-foreground flex-1 text-xs tabular-nums">
                      {coFill("theRest", {
                        amount: coMoney(Math.max(0, splitLeftToPay)),
                      })}
                    </span>
                  ) : (
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
                      className="h-8 flex-1 text-xs tabular-nums"
                      min={0}
                      step={0.01}
                    />
                  )}
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
                    "text-xs font-medium tabular-nums",
                    splitProblem ? "text-warning" : "text-success",
                  )}
                >
                  {splitProblem ?? coT("balanced")}
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

          {/* Gift card: the code to charge. */}
          {isGiftCard && (
            <div className="space-y-1.5 rounded-2xl border p-3">
              <label htmlFor="gift-card-code" className="text-sm font-semibold">
                {gcT("codeLabel")}
              </label>
              <Input
                id="gift-card-code"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value)}
                placeholder={gcT("codePlaceholder")}
                autoComplete="off"
                className="font-mono"
              />
              <p className="text-ink-tertiary text-xs">{gcT("codeHelp")}</p>
            </div>
          )}

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
                  placeholder={remaining.toFixed(2)}
                  min={0}
                  step={0.01}
                  className="tabular-nums"
                />
              </div>
              {cashNum > 0 && change > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Change Due</span>
                    <span className="font-semibold tabular-nums">
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
            <div className="text-muted-foreground space-y-2 rounded-md border border-dashed p-3 text-xs">
              <p>The customer is asked for a tip on the terminal.</p>

              {/* ── STOPPING THE PROMPT ────────────────────────────────────
                  Our request gives up after 150 seconds; THE DEVICE DOES NOT.
                  Without this, a customer who decides to pay cash leaves the
                  terminal asking and the only remedy is to walk over to it.

                  The wording is deliberate. This stops a PROMPT — a card
                  approved a moment earlier is still paid, and calling it
                  "cancel payment" would tell somebody money came back. */}
              {busy && terminal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setStopping(true);
                    try {
                      await fetch("/api/payments/clover/device", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "cancel",
                          deviceSerial: terminal.serial,
                        }),
                      });
                    } finally {
                      setStopping(false);
                    }
                  }}
                  disabled={stopping}
                >
                  {stopping ? "Stopping…" : "Stop asking on the terminal"}
                </Button>
              )}
            </div>
          )}
          {/* The facility's OWN tips, from Settings → Tips — not three
              percentages hardcoded here. This dialog carried 10/15/20 while
              the grooming dialog carried 0/15/18/20 and the pay-by-link page
              carried another set again, so what a customer was offered
              depended on which screen took the money. `TipSelector` draws the
              presets, Custom and No Tip, and resolves the smart tier. */}
          {(splitMode ? !splitHasTerminal : !isTerminal && method !== "cash") &&
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
                <span className="tabular-nums">${invoiceTotal.toFixed(2)}</span>
              </div>
              {depositPaid > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Already paid</span>
                  <span className="tabular-nums">
                    -${depositPaid.toFixed(2)}
                  </span>
                </div>
              )}
              {taxDue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{coT("tax")}</span>
                  <span className="tabular-nums">${taxDue.toFixed(2)}</span>
                </div>
              )}
              {tipToCharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="tabular-nums">
                    ${tipToCharge.toFixed(2)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Amount to charge</span>
                <span className="tabular-nums">${remaining.toFixed(2)}</span>
              </div>
              {isCash && !splitMode && change > 0 && changeAsCredit && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>→ Store credit added</span>
                  <span className="tabular-nums">+${change.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Why it did not go through. Shown inside the terminal picker when a
            terminal is taking the money; every other tender used to fail in
            silence — the dialog stayed open with nothing said. */}
        {step === "pay" &&
          problem &&
          !(isTerminal || (splitMode && splitHasTerminal)) && (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          )}

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
              <p className="text-lg font-semibold">
                {result?.message
                  ? coT("checkedOut")
                  : result?.stillOwed && result.stillOwed > 0.005
                    ? coT("paymentRecorded")
                    : coT("paymentComplete")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {result?.message ??
                  (result?.stillOwed && result.stillOwed > 0.005
                    ? coFill("takenOwed", {
                        amount: coMoney(result.taken),
                        owed: coMoney(result.stillOwed),
                      })
                    : coFill("taken", {
                        amount: coMoney(result?.taken ?? remaining),
                      }))}
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
                  const methodLabel =
                    splitMode && split?.ok
                      ? split.parts
                          .map(
                            (p) =>
                              `${p.method.replace("_", " ")}: $${p.total.toFixed(2)}`,
                          )
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
${tipToCharge > 0 ? `<div class="row sub"><span>Tip</span><span>$${tipToCharge.toFixed(2)}</span></div>` : ""}
<div class="row total"><span>Total Charged</span><span>$${(result?.taken ?? remaining).toFixed(2)}</span></div>
${result?.stillOwed && result.stillOwed > 0.005 ? `<div class="row sub"><span>${coT("stillOwed")}</span><span>$${result.stillOwed.toFixed(2)}</span></div>` : ""}
<div class="row sub"><span>Payment Method</span><span>${methodLabel}</span></div>
${paymentNote ? `<div class="row sub"><span>Note</span><span>${paymentNote}</span></div>` : ""}
<div class="badge">${coT("paymentRecordedBadge")}</div>
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
                  (isGiftCard &&
                    !splitMode &&
                    giftCardCode.trim().length === 0) ||
                  (splitMode && splitProblem !== null) ||
                  // A terminal payment with no terminal is not a payment.
                  ((isTerminal || (splitMode && splitHasTerminal)) &&
                    !terminal) ||
                  // Nor is a card payment with no card.
                  ((isSavedCard || (splitMode && splitHasSavedCard)) &&
                    !savedCardId)
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
                setResult(null);
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
