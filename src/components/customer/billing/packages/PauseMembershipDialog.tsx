"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PauseCircle, Coins, CreditCard } from "lucide-react";
import type { Membership, MembershipPlan } from "@/data/services-pricing";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership;
  plan: MembershipPlan | undefined;
  onConfirm: (months: number) => void;
}

const PAUSE_OPTIONS = [1, 2, 3] as const;

/** Add whole months to an ISO date, returning a new ISO string. */
function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function PauseMembershipDialog({
  open,
  onOpenChange,
  membership,
  plan,
  onConfirm,
}: Props) {
  const { t, fill, locale } = useCustomerText("packages");
  const [months, setMonths] = useState<number>(1);

  const pauseStart = membership.nextBillingDate;
  const resumeDate = addMonths(pauseStart, months);

  const handleClose = (v: boolean) => {
    if (!v) setMonths(1);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="size-5 text-amber-500" />
            {fill("pausePlan", { plan: membership.planName })}
          </DialogTitle>
          <DialogDescription>{t("takeABreak")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 text-sm">
          {/* Duration selector */}
          <div>
            <p className="mb-2 font-medium">{t("pauseDuration")}</p>
            <div className="grid grid-cols-3 gap-2">
              {PAUSE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    months === m
                      ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className="block text-lg font-semibold">{m}</span>
                  <span className="text-muted-foreground text-xs">
                    {t(m === 1 ? "monthOne" : "monthOther")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Credit status during pause */}
          <div className="flex items-start gap-2 rounded-lg border p-3">
            <Coins className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{t("yourCreditsDuringThePause")}</p>
              <p className="text-muted-foreground text-xs">
                {plan && plan.credits === -1
                  ? t("noCreditsWhilePausedUnlimited")
                  : fill("noCreditsWhilePaused", {
                      n: membership.creditsRemaining,
                    })}
              </p>
            </div>
          </div>

          {/* Billing-pause confirmation */}
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">
                {t("noChargesWhilePaused")}
              </p>
              <p className="text-xs text-emerald-900/90 dark:text-emerald-200/90">
                {rich(t("billingPausesOn"), {
                  start: formatDateLong(pauseStart, locale),
                  resume: (
                    <span className="font-semibold">
                      {formatDateLong(resumeDate, locale)}
                    </span>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              onConfirm(months);
              handleClose(false);
            }}
          >
            {t("pauseMembership")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
