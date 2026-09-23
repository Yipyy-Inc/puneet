"use client";

import { useMemo } from "react";
import { ArrowRight, Ban, Check, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/i18n/format";
import {
  planGroomingChargeImport,
  type RefusalReason,
  type SkipReason,
} from "@/lib/pricing/import-grooming-charges";
import type { ServiceCharge } from "@/lib/settings/grooming-service-charges";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { CustomFee } from "@/types/boarding";

// ============================================================================
// "MOVE THESE TO SERVICE CHARGES" — the grooming fee domain's one-way exit.
//
// ── IT SHOWS ALL THREE OUTCOMES BEFORE IT WRITES ANYTHING ────────────────
//
// What moves, what will never move, and what is already there. A dialog that
// only listed the successes would let a facility click "move" on a list of
// three and end up with two, with no way to tell which one is missing or why
// — and the missing one is always the matting fee, which is the one that
// earns the most.
//
// So a refusal is not an error here. It is the answer for that charge, it
// says where the charge belongs instead, and it stays visible in the
// read-only list afterwards rather than appearing once and vanishing.
// ============================================================================

interface GroomingChargeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The facility's grooming charges, as stored. */
  charges: ServiceCharge[];
  /** The fees that already exist — the import appends to these. */
  existingFees: CustomFee[];
  /** True while either domain is still loading; the button stays disabled. */
  isPending: boolean;
  /** Called with the fees to append. The caller writes them. */
  onImport: (fees: CustomFee[]) => void;
}

export function GroomingChargeImportDialog({
  open,
  onOpenChange,
  charges,
  existingFees,
  isPending,
  onImport,
}: GroomingChargeImportDialogProps) {
  const { t, fill, locale } = useStaffText("groomingChargeImport");
  const money = (value: number) => formatMoney(value, locale);

  const plan = useMemo(
    () => planGroomingChargeImport(charges, existingFees),
    [charges, existingFees],
  );

  const refusalText: Record<RefusalReason, string> = {
    "per-15min": t("reasonPer15min"),
    "per-km": t("reasonPerKm"),
  };
  const skipText: Record<SkipReason, string> = {
    "already-imported": t("skipAlready"),
    "name-taken": t("skipNameTaken"),
  };

  const amountOf = (charge: ServiceCharge) =>
    charge.type === "percent"
      ? fill("percentAmount", { pct: String(charge.amount) })
      : money(charge.amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="border-line shrink-0 border-b p-5 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-ink-tertiary mt-1 text-xs">{t("subtitle")}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {plan.fees.length > 0 && (
            <section>
              <h3 className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
                {fill("movingHeading", { n: plan.fees.length })}
              </h3>
              <ul className="mt-2 grid gap-2">
                {plan.fees.map((fee) => (
                  <li
                    key={fee.id}
                    className="border-line grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3"
                  >
                    <span className="min-w-0">
                      <span className="text-body-ink block text-sm/tight font-semibold wrap-break-word">
                        {fee.name}
                      </span>
                      <span className="text-ink-tertiary mt-0.5 block text-xs">
                        {fee.isActive ? t("staysOn") : t("staysOff")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-body-ink text-sm font-bold tabular-nums">
                        {fee.feeType === "percentage"
                          ? fill("percentAmount", { pct: String(fee.amount) })
                          : money(fee.amount)}
                      </span>
                      <ArrowRight className="text-primary size-4" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.refused.length > 0 && (
            <section>
              <h3 className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
                {fill("stayingHeading", { n: plan.refused.length })}
              </h3>
              <ul className="mt-2 grid gap-2">
                {plan.refused.map(({ charge, reason }) => (
                  <li
                    key={charge.id}
                    className="border-line grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border p-3"
                  >
                    <Ban className="text-warning mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="text-body-ink block text-sm/tight font-semibold wrap-break-word">
                        {charge.name}
                      </span>
                      <span className="text-ink-tertiary mt-0.5 block text-xs">
                        {refusalText[reason]}
                      </span>
                    </span>
                    <span className="text-body-ink shrink-0 text-sm font-bold tabular-nums">
                      {amountOf(charge)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.skipped.length > 0 && (
            <section>
              <h3 className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
                {fill("alreadyHeading", { n: plan.skipped.length })}
              </h3>
              <ul className="mt-2 grid gap-2">
                {plan.skipped.map(({ charge, reason }) => (
                  <li
                    key={charge.id}
                    className="border-line grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-3"
                  >
                    <Check className="text-success mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="text-body-ink block text-sm/tight font-semibold wrap-break-word">
                        {charge.name}
                      </span>
                      <span className="text-ink-tertiary mt-0.5 block text-xs">
                        {skipText[reason]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="border-line shrink-0 border-t p-5">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("goBack")}
            </Button>
            <Button
              className="flex-1"
              disabled={isPending || plan.fees.length === 0}
              onClick={() => onImport(plan.fees)}
            >
              <ArrowRight className="size-4" />
              {plan.fees.length === 0
                ? t("nothingToMove")
                : plan.fees.length === 1
                  ? t("moveOne")
                  : fill("moveMany", { n: plan.fees.length })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
