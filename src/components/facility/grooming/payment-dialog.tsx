"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Gift,
  PackageCheck,
  Receipt,
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
import { cn } from "@/lib/utils";
import type { GroomingAppointment } from "@/types/grooming";
import type { Client } from "@/types/client";
import type { CustomerPackageRecord } from "@/data/customer-packages";
import { computePackagePassDiscount } from "@/lib/grooming/package-pass";
import { toast } from "sonner";
import { useActiveLoyaltyDiscount } from "@/hooks/use-loyalty-discount";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { TipSelector } from "@/components/bookings/TipSelector";

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
  /** Pre-tax subtotal (base + price adjustments). Carried rather than
   *  re-derived: the dialog knows the breakdown and the ledger needs it, and
   *  `grandTotal - tax - tip` would be a reconstruction that drifts the moment
   *  another line is added. */
  subtotal: number;
  /** Tax charged on the pre-tax subtotal. */
  tax: number;
  /** Loyalty voucher value consumed. The third reduction, alongside the pass
   *  and store credit — see 20260806240000. */
  loyaltyDiscount: number;
  /** Package-pass value consumed. Carried rather than derived from the other
   *  five figures: a reduction the ledger has to record is a fact the dialog
   *  already knows. */
  packagePassDiscount: number;
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
  /** Pre-booking tip locked in by the customer online. When present, the tip
   *  picker is disabled and seeded with this value. */
  lockedTipAmount?: number;
  onConfirm: (result: PaymentResult) => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  apt,
  client,
  applicableCustomerPackages,
  lockedTipAmount,
  onConfirm,
}: PaymentDialogProps) {
  // ── NO CARD HERE ───────────────────────────────────────────────────────
  //
  // "Card on file" and "New card — enter card details at the terminal" were
  // offered, and confirming either wrote a CARD payment to the ledger through
  // record_payment without touching a card or a terminal: the groom read as
  // paid by card and no money moved. Cards are charged at the booking's own
  // checkout (Accept payment), which reaches the terminal and the saved card.
  // This dialog records what is in hand: cash, a package pass, store credit.
  const [method, setMethod] = useState<PaymentMethodKind>("cash");
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [applyPackagePassId, setApplyPackagePassId] = useState<string>("");
  const [storeCreditApplied, setStoreCreditApplied] = useState<number>(0);
  // An AMOUNT, not a percentage. The tips on offer are the facility's own
  // (Settings → Tips) and may be fixed dollars rather than percentages, so a
  // percent-shaped state cannot represent them. This dialog previously
  // hardcoded 0/15/18/20 — a set nobody had chosen.
  const [chosenTip, setChosenTip] = useState<number>(0);

  const savedCards = useMemo(() => client?.savedCards ?? [], [client]);
  const defaultCard =
    savedCards.find((c) => c.isDefault) ?? savedCards[0] ?? null;
  const storeCreditBalance = client?.storeCredit?.balance ?? 0;

  // Seed defaults whenever the dialog re-opens for a new appointment.
  useEffect(() => {
    if (!open) return;
    setMethod("cash");
    setSelectedSavedCardId(defaultCard?.id ?? "");
    setCashReceived("");
    setApplyPackagePassId("");
    setStoreCreditApplied(0);
    setChosenTip(lockedTipAmount ?? 0);
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
      clientRef: client?.id,
      subtotal: preTaxSubtotal,
      serviceType: "grooming",
    });
  const loyaltyDiscountAmount = loyaltyDiscount?.amount ?? 0;
  // The facility's tips, so this dialog offers what every other paying
  // surface offers. Falls back to the domain default when unconfigured.
  const { settings } = useFacilitySettings();
  const tipConfig = settings.tip_config.value;
  // ── THE FACILITY'S TAX, NOT A POSTAL CODE'S ────────────────────────────
  //
  // This took a single rate from the mobile-grooming settings, which live in
  // the browser's localStorage and default to Québec's 14.975% — so every
  // facility's grooming payment recorded Québec tax, whatever its province.
  // It is the facility's tax configuration now, the one the booking checkout
  // uses, line by line.
  const taxConfig = settings.tax_config.value as TaxConfig;

  if (!apt) return null;

  // ── Package pass — same helper BookingModal uses on Confirm so the
  //    discount amount stays identical across the two surfaces.
  const selectedPackage = applicableCustomerPackages.find(
    (p) => p.id === applyPackagePassId,
  );
  const packagePassDiscount = selectedPackage
    ? computePackagePassDiscount({ baseService })
    : 0;

  // A discount lowers the price of the supply, so it lowers the tax; store
  // credit is a way of paying and does not. Nothing is added where the
  // facility's prices already include tax.
  const tax = taxConfig.pricesIncludeTax
    ? { lines: [], totalCents: 0 }
    : computeTax(
        Math.round(
          Math.max(
            0,
            preTaxSubtotal - packagePassDiscount - loyaltyDiscountAmount,
          ) * 100,
        ),
        taxConfig,
      );
  const taxAmount = tax.totalCents / 100;

  // Tip: locked from booking, or computed from the chosen preset / custom.
  const tipAmount =
    lockedTipAmount !== undefined
      ? lockedTipAmount
      : Math.round(chosenTip * 100) / 100;

  const grandTotal = preTaxSubtotal + taxAmount + tipAmount;

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
    if (effectiveMethod === "cash" && cashShort) return false;
    return true;
  })();

  async function handleConfirm() {
    // No receipt channels: nothing sends a groom's receipt, and the SMS and
    // Email boxes this required were read as a promise that one went out.
    const channels: ("sms" | "email")[] = [];

    // ── THE REWARD IS SPENT FIRST, AND CAN REFUSE ──────────────────────────
    //
    // This used to call a `consume` that spliced an in-memory array and could
    // not fail, so a voucher another till had already taken still came off this
    // invoice. Spending it against the database first means a reward that has
    // gone stops the payment rather than discounting it silently.
    //
    // Unlike the two booking checkouts, grooming keeps its own arithmetic:
    // `amountCharged` already has the discount subtracted and that figure IS
    // what gets charged here, so there is no negative line item to write. The
    // gap that leaves — no release if the parent's recordPayment then fails —
    // is in the debt map; this money path does not run through `bookings`.
    if (loyaltyDiscountAmount > 0) {
      try {
        await consumeLoyaltyDiscount();
      } catch (error) {
        toast.error("That reward is no longer available", {
          description:
            error instanceof Error
              ? error.message
              : "It may have been used on another bill.",
        });
        return;
      }
    }

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
      subtotal: preTaxSubtotal,
      tax: taxAmount,
      loyaltyDiscount: loyaltyDiscountAmount,
      packagePassDiscount,
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

        {/* Payment status — prepaid online vs. collect at pickup (spec Table 19).
            When still owed, the "Charge / Collect Payment" footer button below
            handles collection. */}
        {(() => {
          const status = apt.paymentStatus ?? "pending";
          if (status === "paid") {
            return (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0" />
                Paid at booking — no collection needed
              </div>
            );
          }
          if (status === "refunded") {
            return (
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Receipt className="size-4 shrink-0" />
                Refunded
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <Banknote className="size-4 shrink-0" />
              Collect payment now
            </div>
          );
        })()}

        {/* 1 · Itemized total */}
        <Section icon={Receipt} title="Itemized total">
          <div className="bg-muted/30 space-y-1 rounded-lg border px-3 py-2.5 text-sm">
            <Row label={apt.packageName} value={baseService} />
            {apt.priceAdjustments.map((a) => (
              <Row key={a.id} label={a.description} value={a.amount} muted />
            ))}
            {tax.lines.length > 0 && (
              <>
                <Separator className="my-1.5" />
                <Row label="Subtotal" value={preTaxSubtotal} muted />
                {tax.lines.map((line) => (
                  <Row
                    key={line.name}
                    label={`${line.name} (${(line.rate * 100).toFixed(line.rate * 100 >= 10 ? 2 : 3)}%)`}
                    value={line.amountCents / 100}
                    muted
                  />
                ))}
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
          ) : tipConfig.enabled ? (
            <TipSelector
              tipConfig={tipConfig}
              subtotal={preTaxSubtotal}
              tipAmount={chosenTip}
              onTipChange={setChosenTip}
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              Tips are switched off for this facility.
            </p>
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
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                To pay by card, use Accept payment on the booking — that is
                where the terminal and saved cards are connected.
              </p>
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
