"use client";

import { useMemo, useState } from "react";
import { Check, Receipt, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePricingRules } from "@/lib/api/facility-settings";
import { formatMoney } from "@/lib/i18n/format";
import {
  applicableServiceCharges,
  serviceChargeLine,
  serviceChargesTotal,
  type ServiceChargeLine,
} from "@/lib/pricing/service-charge-lines";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { cn } from "@/lib/utils";

// ============================================================================
// "ADD SERVICE CHARGES" — the facility's own fees, put on a bill by hand.
//
// MoéGo's default for a custom fee is no auto-apply at all: somebody chooses
// it at the till. We offered that mode in the editor, persisted it, and then
// had nowhere to choose it from — so `autoApply: "none"` meant "never".
//
// ── IT SHOWS THE WHOLE LIST, NOT THE ADDABLE PART OF IT ──────────────────
//
// Automatic fees appear here too, marked as already on the bill. That is
// MoéGo's "each fee can only be added once per appointment" made VISIBLE,
// before the 409 rather than after it: a cleaning fee the create path already
// wrote is shown as added and cannot be chosen twice. Hiding those rows would
// leave staff hunting for a fee that is sitting on the invoice.
//
// ── THE FIGURE HERE IS THE FIGURE THAT IS WRITTEN ────────────────────────
//
// Every amount comes from `serviceChargeLine()`, the same function the server
// uses. A dialog doing its own percentage arithmetic is how a till comes to
// offer one number and charge another.
// ============================================================================

interface AddServiceChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which service was booked — a fee can be scoped to some and not others. */
  serviceId: string;
  /** How many pets the bill covers; `scope: "per_pet"` multiplies by it. */
  petCount: number;
  /** The SERVICE's price — what a percentage fee is a percentage OF. */
  serviceTotal: number;
  /**
   * Which branch this booking is at. A fee narrowed to some branches is not
   * offered at the others; absent means every branch, so a single-location
   * facility is unaffected.
   */
  locationId?: string | null;
  /** Fee ids already on this bill, from `booking_line_items.fee_id`. */
  appliedFeeIds: readonly string[];
  /** Called with the chosen lines. The caller writes them. */
  onAdd: (lines: ServiceChargeLine[]) => void;
}

export function AddServiceChargeDialog({
  open,
  onOpenChange,
  serviceId,
  petCount,
  serviceTotal,
  locationId,
  appliedFeeIds,
  onAdd,
}: AddServiceChargeDialogProps) {
  const { t, fill, locale } = useStaffText("addServiceCharge");
  const money = (value: number) => formatMoney(value, locale);
  const { rules, isPending } = usePricingRules();
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const already = useMemo(() => new Set(appliedFeeIds), [appliedFeeIds]);

  // Every active fee for this service, with what it would cost. A fee that
  // comes to nothing (a percentage of an unpriced booking) is not offered:
  // `serviceChargeLine` returns null and there is nothing to add.
  const offered = useMemo(() => {
    return applicableServiceCharges(rules.customFees, serviceId, locationId)
      .map((fee) => ({
        fee,
        // `locationId` is not optional here just because the filter above
        // already used it: this branch may price the fee differently, and
        // what this dialog shows is EXACTLY what it writes. Leaving it out
        // put the facility-wide amount on a branch's bill.
        line: serviceChargeLine(fee, {
          serviceId,
          petCount,
          serviceTotal,
          locationId,
        }),
      }))
      .filter(
        (row): row is { fee: (typeof row)["fee"]; line: ServiceChargeLine } =>
          row.line !== null,
      );
  }, [rules.customFees, serviceId, locationId, petCount, serviceTotal]);

  const picked = offered.filter(
    (row) => chosen.has(row.fee.id) && !already.has(row.fee.id),
  );
  const total = serviceChargesTotal(picked.map((row) => row.line));

  const toggle = (feeId: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(feeId)) next.delete(feeId);
      else next.add(feeId);
      return next;
    });

  const close = () => {
    setChosen(new Set());
    onOpenChange(false);
  };

  const confirm = () => {
    onAdd(picked.map((row) => row.line));
    close();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[80vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <div className="border-line shrink-0 border-b p-5 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-ink-tertiary mt-1 text-xs">{t("subtitle")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* §5s: loading is a state this component owns, not an absence. */}
          {isPending ? (
            <div className="grid gap-2" aria-hidden>
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="yy-skel border-line min-h-16 rounded-2xl border"
                />
              ))}
            </div>
          ) : offered.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="text-ink-disabled mx-auto size-6" />
              <p className="text-body-ink mt-3 text-sm">{t("none")}</p>
              <p className="text-ink-tertiary mt-1 text-xs">{t("noneHint")}</p>
            </div>
          ) : (
            <ul className="grid gap-2">
              {offered.map(({ fee, line }) => {
                const isOn = already.has(fee.id);
                const isChosen = chosen.has(fee.id) && !isOn;
                return (
                  <li key={fee.id}>
                    <button
                      type="button"
                      disabled={isOn}
                      aria-pressed={isChosen}
                      onClick={() => toggle(fee.id)}
                      // Chosen is a 2px ring, never a tint (§6 rules 1 and 2).
                      className={cn(
                        "border-line grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left",
                        "min-h-16 transition-[box-shadow,background] duration-200",
                        // Focus is an OUTSIDE outline, chosen is an INSIDE
                        // ring: both are `--primary` by §1, so without this
                        // the two states look identical and a keyboard user
                        // cannot tell what is focused from what is picked.
                        "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
                        isOn
                          ? "cursor-not-allowed"
                          : "hover:bg-surface-inset cursor-pointer",
                        isChosen && "shadow-[inset_0_0_0_2px_var(--primary)]",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="text-body-ink block text-sm/tight font-semibold wrap-break-word">
                          {fee.name}
                        </span>
                        <span className="text-ink-tertiary mt-0.5 block text-xs">
                          {isOn
                            ? t("alreadyOnBill")
                            : line.quantity > 1
                              ? fill("perPet", {
                                  each: money(Math.abs(line.unitPrice)),
                                  n: line.quantity,
                                })
                              : fee.feeType === "percentage"
                                ? fill("percentOf", {
                                    pct: String(fee.amount),
                                    base: money(serviceTotal),
                                  })
                                : t("oncePerBooking")}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-body-ink text-sm font-bold tabular-nums">
                          {money(line.unitPrice * line.quantity)}
                        </span>
                        {isOn ? (
                          <Check className="text-success size-4" />
                        ) : isChosen ? (
                          <Check className="text-primary size-4" />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-line shrink-0 space-y-3 border-t p-5">
          {picked.length > 0 && (
            <ul className="grid gap-1.5">
              {picked.map(({ fee, line }) => (
                <li
                  key={fee.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2"
                >
                  <span className="text-body-ink min-w-0 truncate text-xs font-semibold">
                    {fee.name}
                  </span>
                  <span className="text-body-ink text-right text-xs font-semibold tabular-nums">
                    {money(line.unitPrice * line.quantity)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={fill("remove", { name: fee.name })}
                    onClick={() => toggle(fee.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1" onClick={close}>
              {t("goBack")}
            </Button>
            <Button
              className="flex-1"
              onClick={confirm}
              disabled={picked.length === 0}
            >
              <Check className="size-4" />
              {picked.length > 0
                ? fill("addWithTotal", { amount: money(total) })
                : t("addToBill")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
