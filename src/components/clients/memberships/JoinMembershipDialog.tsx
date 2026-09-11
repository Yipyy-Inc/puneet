"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { useJoinMembership, useMembershipPlans } from "@/lib/api/memberships";
import { cyclePrice } from "@/lib/api/mappers/membership";
import { formatDateISO, formatMoney } from "@/lib/i18n/format";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { MembershipPlan } from "@/data/services-pricing";

// ============================================================================
// Put a client on a membership plan, at the desk.
//
// Nothing on the facility side could: the Subscribers tab listed another
// facility's members, and the client file's membership card read a `details`
// blob nothing wrote. Two writes, in order, like selling a package:
//
//   1. POST /api/memberships — the subscription, at the plan's price for its
//      own cycle; edit_clients decides, and one ACTIVE plan per client is the
//      table's own index (a second answers 409).
//   2. record_payment (POST /api/payments) — the first cycle, in the tender
//      the staff member took, with the facility's own tax. Skipped when the
//      staff member says it is not paid yet.
//
// Not one transaction: a refused payment after the join is said plainly, and
// the plan shows on the client file for someone to settle.
// ============================================================================

type Tender = "cash" | "terminal" | "e-transfer" | "later";

/** One cycle of the plan — the price the route sells the subscription at. */
function cyclePriceOf(plan: MembershipPlan): number {
  return cyclePrice(
    { billing_cycle: plan.billingCycle, monthly_price: plan.monthlyPrice },
    plan,
  );
}

export function JoinMembershipDialog({
  open,
  onOpenChange,
  clientRef,
  clientName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientRef: number;
  clientName: string;
}) {
  const { t, fill, locale } = useStaffText("joinMembership");
  const queryClient = useQueryClient();
  const { data: plans } = useMembershipPlans();
  const { mutateAsync: join } = useJoinMembership();
  const taxConfig = useFacilitySettings().settings.tax_config
    .value as TaxConfig;
  const [planId, setPlanId] = useState("");
  const [startsOn, setStartsOn] = useState(() => formatDateISO(new Date()));
  const [tender, setTender] = useState<Tender>("cash");
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () => (plans ?? []).filter((p) => p.isActive),
    [plans],
  );
  const chosen = options.find((p) => p.id === planId);
  const priceCents = Math.round((chosen ? cyclePriceOf(chosen) : 0) * 100);
  const taxCents = chosen ? computeTax(priceCents, taxConfig).totalCents : 0;
  const includesTax = taxConfig.pricesIncludeTax;
  const totalCents = includesTax ? priceCents : priceCents + taxCents;

  async function start() {
    if (!chosen || saving) return;
    setSaving(true);
    try {
      await join({ clientRef, planId: chosen.id, startsOn });
    } catch (error) {
      toast.error(t("notJoined"), {
        description: error instanceof Error ? error.message : undefined,
      });
      setSaving(false);
      return;
    }
    const done = fill("joined", { client: clientName, plan: chosen.name });
    if (tender === "later") {
      setSaving(false);
      toast.success(done, { description: t("unpaidNote") });
      setPlanId("");
      onOpenChange(false);
      return;
    }
    const total = totalCents / 100;
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientRef,
        method: tender,
        subtotal: (includesTax ? priceCents - taxCents : priceCents) / 100,
        tax: taxCents / 100,
        tip: 0,
        amountCharged: total,
        grandTotal: total,
        ...(tender === "cash" ? { cashReceived: total } : {}),
        serviceLabel: chosen.name,
        note: fill("paymentNote", { plan: chosen.name }),
      }),
    });
    setSaving(false);
    void queryClient.invalidateQueries({ queryKey: ["payments"] });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(fill("joinedUnpaid", { client: clientName }), {
        description: body?.error,
      });
      onOpenChange(false);
      return;
    }
    toast.success(done, {
      description: fill("paid", { total: formatMoney(total, locale) }),
    });
    setPlanId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fill("title", { client: clientName })}</DialogTitle>
          <DialogDescription>{t("intro")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("plan")}</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder={t("pickPlan")} />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 ? (
                  <div className="text-muted-foreground px-3 py-2 text-xs">
                    {t("noPlans")}
                  </div>
                ) : (
                  options.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatMoney(cyclePriceOf(p), locale)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="membership-starts">{t("startsOn")}</Label>
            <Input
              id="membership-starts"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("tender")}</Label>
            <Select
              value={tender}
              onValueChange={(v) => setTender(v as Tender)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("cash")}</SelectItem>
                <SelectItem value="terminal">{t("terminal")}</SelectItem>
                <SelectItem value="e-transfer">{t("eTransfer")}</SelectItem>
                <SelectItem value="later">{t("later")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {chosen && (
            <dl className="grid grid-cols-2 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">{t("firstCycle")}</dt>
              <dd className="text-right">
                {formatMoney(priceCents / 100, locale)}
              </dd>
              <dt className="text-muted-foreground">
                {includesTax ? t("taxIncluded") : t("tax")}
              </dt>
              <dd className="text-right">
                {formatMoney(taxCents / 100, locale)}
              </dd>
              <dt className="font-semibold">{t("total")}</dt>
              <dd className="text-right font-semibold">
                {formatMoney(totalCents / 100, locale)}
              </dd>
              {chosen.discountPercentage > 0 && (
                <dd className="text-muted-foreground col-span-2 pt-1 text-xs">
                  {fill("discountNote", { pct: chosen.discountPercentage })}
                </dd>
              )}
            </dl>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => void start()}
            disabled={!chosen || !startsOn || saving}
          >
            {chosen && tender !== "later"
              ? fill("joinNamed", {
                  total: formatMoney(totalCents / 100, locale),
                })
              : t("join")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
