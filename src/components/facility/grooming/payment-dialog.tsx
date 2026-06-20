"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Gift,
  Mail,
  PackageCheck,
  Receipt,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { GroomingAppointment } from "@/types/grooming";
import type { Client } from "@/types/client";
import type { CustomerPackageRecord } from "@/data/customer-packages";
import { computePackagePassDiscount } from "@/lib/grooming/package-pass";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";

export type PaymentMethodKind =
  | "card-on-file"
  | "new-card"
  | "cash"
  | "package-pass"
  | "store-credit";

export interface PaymentResult {
  method: PaymentMethodKind;
  /** Card id used (only set when method === "card-on-file"). */
  savedCardId?: string;
  /** Cash received from the customer; change = received − amountCharged. */
  cashReceived?: number;
  /** Customer package id whose pass was redeemed. */
  appliedPackagePassId?: string;
  /** Store-credit dollars applied to the booking. */
  appliedStoreCredit: number;
  /** Tip recorded at the counter (or pre-set from the booking). */
  tipAmount: number;
  /** Dollar amount actually charged to the payment method (post pass/credit). */
  amountCharged: number;
  /** Final ledger total = base + adjustments + tax + tip. */
  grandTotal: number;
  receiptChannels: ("sms" | "email")[];
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apt: GroomingAppointment | null;
  client: Client | undefined;
  /** Customer's active packages — drives the auto-detected "Apply 1 pass"
   *  affordance. Filtered down to ones with passes left + grooming module. */
  applicableCustomerPackages: CustomerPackageRecord[];
  /** Tax rate (0–1) applied to the pre-tax subtotal. */
  taxRate?: number;
  /** Pre-booking tip locked in by the customer online. When present, the tip
   *  picker is disabled and seeded with this value. */
  lockedTipAmount?: number;
  onConfirm: (result: PaymentResult) => void;
}

const TIP_PRESETS = [0, 15, 18, 20];

function brandLabel(brand: string): string {
  return (
    (
      {
        visa: "Visa",
        mastercard: "Mastercard",
        amex: "Amex",
        discover: "Discover",
        other: "Card",
      } as Record<string, string>
    )[brand] ?? "Card"
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  apt,
  client,
  applicableCustomerPackages,
  taxRate = 0,
  lockedTipAmount,
  onConfirm,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethodKind>("card-on-file");
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [applyPackagePassId, setApplyPackagePassId] = useState<string>("");
  const [storeCreditApplied, setStoreCreditApplied] = useState<number>(0);
  const [tipPercent, setTipPercent] = useState<number>(15);
  const [customTip, setCustomTip] = useState<string>("");
  const [receiptSms, setReceiptSms] = useState(true);
  const [receiptEmail, setReceiptEmail] = useState(true);

  const savedCards = useMemo(() => client?.savedCards ?? [], [client]);
  const defaultCard =
    savedCards.find((c) => c.isDefault) ?? savedCards[0] ?? null;
  const storeCreditBalance = client?.storeCredit?.balance ?? 0;

  // Seed defaults whenever the dialog re-opens for a new appointment.
  useEffect(() => {
    if (!open) return;
    setMethod(defaultCard ? "card-on-file" : "new-card");
    setSelectedSavedCardId(defaultCard?.id ?? "");
    setCashReceived("");
    setApplyPackagePassId("");
    setStoreCreditApplied(0);
    setTipPercent(lockedTipAmount !== undefined ? -1 : 15);
    setCustomTip(lockedTipAmount !== undefined ? String(lockedTipAmount) : "");
    setReceiptSms(true);
    setReceiptEmail(true);
  }, [open, apt?.id, defaultCard, lockedTipAmount]);

  // ── Itemized total ─────────────────────────────────────────────────────
  // Computed before the early return so the loyalty-discount hook runs
  // unconditionally (Rules of Hooks); guarded for a null appointment.
  const baseService = apt?.basePrice ?? 0;
  const adjustmentsTotal =
    apt?.priceAdjustments.reduce((s, a) => s + a.amount, 0) ?? 0;
  const preTaxSubtotal = baseService + adjustmentsTotal;

  // Auto-applied loyalty discount voucher (tier / badge / earn-rule reward).
  const { discount: loyaltyDiscount, consume: consumeLoyaltyDiscount } =
    useActiveLoyaltyDiscount({
      customerId: client?.id,
      subtotal: preTaxSubtotal,
      serviceType: "grooming",
    });
  const loyaltyDiscountAmount = loyaltyDiscount?.amount ?? 0;

  if (!apt) return null;

  const taxAmount = preTaxSubtotal * taxRate;

  // Tip: locked from booking, or computed from the chosen preset / custom.
  const tipAmount = (() => {
    if (lockedTipAmount !== undefined) return lockedTipAmount;
    if (tipPercent === -1) {
      const v = Number(customTip);
      return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    }
    return Math.round(preTaxSubtotal * (tipPercent / 100) * 100) / 100;
  })();

  const grandTotal = preTaxSubtotal + taxAmount + tipAmount;

  // ── Package pass — same helper BookingModal uses on Confirm so the
  //    discount amount stays identical across the two surfaces.
  const selectedPackage = applicableCustomerPackages.find(
    (p) => p.id === applyPackagePassId,
  );
  const packagePassDiscount = selectedPackage
    ? computePackagePassDiscount({ baseService })
    : 0;

  // ── Store credit — capped at the customer's balance and the post-pass total
  const postPassTotal = Math.max(
    0,
    grandTotal - packagePassDiscount - loyaltyDiscountAmount,
  );
  const maxStoreCredit = Math.min(storeCreditBalance, postPassTotal);
  const effectiveStoreCredit = Math.min(storeCreditApplied, maxStoreCredit);
  const amountCharged = Math.max(0, postPassTotal - effectiveStoreCredit);

  // When the pass/credit zeroes out the bill, force the method to whichever
  // one is being used so we don't try to also charge a card for $0.
  const effectiveMethod: PaymentMethodKind =
    amountCharged === 0 && selectedPackage
      ? "package-pass"
      : amountCharged === 0 && effectiveStoreCredit > 0
        ? "store-credit"
        : method;

  // ── Cash change calculation
  const cashReceivedNum = Number(cashReceived);
  const cashChange =
    effectiveMethod === "cash" &&
    Number.isFinite(cashReceivedNum) &&
    cashReceivedNum >= amountCharged
      ? cashReceivedNum - amountCharged
      : 0;
  const cashShort =
    effectiveMethod === "cash" &&
    Number.isFinite(cashReceivedNum) &&
    cashReceivedNum < amountCharged;

  const canConfirm = (() => {
    if (effectiveMethod === "package-pass" && !selectedPackage) return false;
    if (effectiveMethod === "card-on-file" && !selectedSavedCardId)
      return false;
    if (effectiveMethod === "cash" && cashShort) return false;
    if (!receiptSms && !receiptEmail) return false;
    return true;
  })();

  function handleConfirm() {
    const channels: ("sms" | "email")[] = [];
    if (receiptSms) channels.push("sms");
    if (receiptEmail) channels.push("email");
    // Mark the loyalty discount voucher used now that the invoice is finalized.
    if (loyaltyDiscountAmount > 0) consumeLoyaltyDiscount();
    onConfirm({
      method: effectiveMethod,
      savedCardId:
        effectiveMethod === "card-on-file" ? selectedSavedCardId : undefined,
      cashReceived: effectiveMethod === "cash" ? cashReceivedNum : undefined,
      appliedPackagePassId: selectedPackage?.id,
      appliedStoreCredit: effectiveStoreCredit,
      tipAmount,
      amountCharged,
      grandTotal,
      receiptChannels: channels,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4 text-emerald-600" />
            Payment — {apt.petName}
          </DialogTitle>
          <p className="text-muted-foreground text-xs">
            {apt.ownerName} · ready for pickup
          </p>
        </DialogHeader>

        {/* 1 · Itemized total */}
        <Section icon={Receipt} title="Itemized total">
          <div className="bg-muted/30 space-y-1 rounded-lg border px-3 py-2.5 text-sm">
            <Row label={apt.packageName} value={baseService} />
            {apt.priceAdjustments.map((a) => (
              <Row key={a.id} label={a.description} value={a.amount} muted />
            ))}
            {taxRate > 0 && (
              <>
                <Separator className="my-1.5" />
                <Row label="Subtotal" value={preTaxSubtotal} muted />
                <Row
                  label={`Tax (${(taxRate * 100).toFixed(2)}%)`}
                  value={taxAmount}
                  muted
                />
              </>
            )}
            {tipAmount > 0 && (
              <Row
                label={`Tip${lockedTipAmount !== undefined ? " (from booking)" : ""}`}
                value={tipAmount}
                muted
              />
            )}
            {packagePassDiscount > 0 && (
              <Row
                label={`Package pass · ${selectedPackage?.packageName}`}
                value={-packagePassDiscount}
                accentNegative
              />
            )}
            {loyaltyDiscount && loyaltyDiscountAmount > 0 && (
              <Row
                label={loyaltyDiscount.label}
                value={-loyaltyDiscountAmount}
                accentNegative
              />
            )}
            {effectiveStoreCredit > 0 && (
              <Row
                label="Store credit applied"
                value={-effectiveStoreCredit}
                accentNegative
              />
            )}
            <Separator className="my-1.5" />
            <div className="flex items-center justify-between text-base font-bold">
              <span>
                {amountCharged === 0 ? "Charged today" : "Amount to charge"}
              </span>
              <span className="text-emerald-700 tabular-nums dark:text-emerald-400">
                ${amountCharged.toFixed(2)}
              </span>
            </div>
          </div>
        </Section>

        <Separator />

        {/* 2 · Package pass — auto-surfaces when client has an active pack */}
        {applicableCustomerPackages.length > 0 && (
          <>
            <Section icon={PackageCheck} title="Package pass">
              <div className="space-y-1.5">
                {applicableCustomerPackages.map((p) => {
                  const left = p.passesTotal - p.passesUsed;
                  const isApplied = applyPackagePassId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setApplyPackagePassId(isApplied ? "" : p.id)
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                        isApplied
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {p.packageName}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {left} of {p.passesTotal} passes remaining
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                          isApplied
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
                        )}
                      >
                        {isApplied
                          ? `Applied · ${left - 1} left`
                          : `Apply 1 pass — ${left} remaining`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>
            <Separator />
          </>
        )}

        {/* 3 · Store credit */}
        {storeCreditBalance > 0 && (
          <>
            <Section icon={Gift} title="Store credit">
              <div className="bg-muted/30 rounded-lg border px-3 py-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Available balance:{" "}
                    <span className="font-semibold tabular-nums">
                      ${storeCreditBalance.toFixed(2)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setStoreCreditApplied(
                        storeCreditApplied > 0 ? 0 : maxStoreCredit,
                      )
                    }
                  >
                    {storeCreditApplied > 0
                      ? "Remove"
                      : `Apply $${maxStoreCredit.toFixed(2)}`}
                  </Button>
                </div>
                {storeCreditApplied > 0 && maxStoreCredit > 0 && (
                  <Input
                    type="number"
                    min={0}
                    max={maxStoreCredit}
                    step="0.01"
                    value={storeCreditApplied}
                    onChange={(e) =>
                      setStoreCreditApplied(
                        Math.max(
                          0,
                          Math.min(Number(e.target.value), maxStoreCredit),
                        ),
                      )
                    }
                    className="mt-2 h-8 text-sm tabular-nums"
                  />
                )}
              </div>
            </Section>
            <Separator />
          </>
        )}

        {/* 4 · Tip */}
        <Section icon={Sparkles} title="Tip">
          {lockedTipAmount !== undefined ? (
            <p className="rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <strong>${lockedTipAmount.toFixed(2)}</strong> · locked from
              online booking. Customer chose this at scheduling.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {TIP_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTipPercent(p)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-center text-xs transition-colors",
                    tipPercent === p
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "hover:bg-muted/60",
                  )}
                >
                  {p === 0 ? "No tip" : `${p}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTipPercent(-1)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-center text-xs transition-colors",
                  tipPercent === -1
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "hover:bg-muted/60",
                )}
              >
                Custom
              </button>
            </div>
          )}
          {tipPercent === -1 && lockedTipAmount === undefined && (
            <Input
              type="number"
              min={0}
              step="0.01"
              value={customTip}
              onChange={(e) => setCustomTip(e.target.value)}
              placeholder="0.00"
              className="mt-2 h-8 text-sm tabular-nums"
            />
          )}
        </Section>

        <Separator />

        {/* 5 · Payment method */}
        <Section icon={CreditCard} title="Payment method">
          {amountCharged === 0 ? (
            <p className="rounded-md border border-dashed bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
              Total covered by package pass / store credit — no charge today.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Card on file */}
              {savedCards.length > 0 && (
                <MethodCard
                  selected={method === "card-on-file"}
                  onClick={() => setMethod("card-on-file")}
                  icon={CreditCard}
                  label="Card on file"
                  sub={
                    savedCards.length === 1
                      ? `${brandLabel(savedCards[0].brand)} **** ${savedCards[0].last4} — tap to charge $${amountCharged.toFixed(2)}`
                      : `${savedCards.length} cards saved — pick one`
                  }
                >
                  {method === "card-on-file" && savedCards.length > 1 && (
                    <div className="mt-2 space-y-1">
                      {savedCards.map((c) => (
                        <label
                          key={c.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs",
                            selectedSavedCardId === c.id
                              ? "border-emerald-400 bg-emerald-50/60"
                              : "hover:bg-muted/40",
                          )}
                        >
                          <input
                            type="radio"
                            name="saved-card"
                            checked={selectedSavedCardId === c.id}
                            onChange={() => setSelectedSavedCardId(c.id)}
                          />
                          <span>
                            {brandLabel(c.brand)} **** {c.last4} ·{" "}
                            {String(c.expMonth).padStart(2, "0")}/
                            {String(c.expYear).slice(-2)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </MethodCard>
              )}
              {/* New card */}
              <MethodCard
                selected={method === "new-card"}
                onClick={() => setMethod("new-card")}
                icon={Smartphone}
                label="New card"
                sub="Enter card details at the terminal"
              />
              {/* Cash */}
              <MethodCard
                selected={method === "cash"}
                onClick={() => setMethod("cash")}
                icon={Banknote}
                label="Cash"
                sub="Enter amount received — change is calculated for you"
              >
                {method === "cash" && (
                  <div className="mt-2">
                    <Label className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      Amount received
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={amountCharged.toFixed(2)}
                      className="mt-0.5 h-8 text-sm tabular-nums"
                    />
                    <p
                      className={cn(
                        "mt-1 text-[11px]",
                        cashShort
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {cashShort
                        ? `Short by $${(amountCharged - cashReceivedNum).toFixed(2)}`
                        : `Change due: $${cashChange.toFixed(2)}`}
                    </p>
                  </div>
                )}
              </MethodCard>
            </div>
          )}
        </Section>

        <Separator />

        {/* 6 · Receipt delivery */}
        <Section icon={Mail} title="Receipt">
          <div className="flex items-center gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={receiptSms}
                onCheckedChange={(v) => setReceiptSms(!!v)}
              />
              SMS
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={receiptEmail}
                onCheckedChange={(v) => setReceiptEmail(!!v)}
              />
              Email
            </label>
            {!receiptSms && !receiptEmail && (
              <span className="text-destructive text-[11px]">
                Pick at least one channel.
              </span>
            )}
          </div>
        </Section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canConfirm}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleConfirm}
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {amountCharged === 0
              ? "Confirm & Complete"
              : `Charge $${amountCharged.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="text-muted-foreground size-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function MethodCard({
  selected,
  onClick,
  icon: Icon,
  label,
  sub,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={cn(
        "cursor-pointer rounded-lg border px-3 py-2 transition-colors",
        selected
          ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/20"
          : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="text-muted-foreground mt-0.5 size-4" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground truncate text-[11px]">{sub}</p>
        </div>
        {selected && (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        )}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accentNegative,
}: {
  label: string;
  value: number;
  muted?: boolean;
  accentNegative?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        muted && "text-muted-foreground text-xs",
        accentNegative && "text-emerald-700 dark:text-emerald-300",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="tabular-nums">
        {value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
}
