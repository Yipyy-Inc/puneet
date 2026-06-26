"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUp,
  CalendarClock,
  Check,
  CreditCard,
  Download,
  Gift,
  Receipt,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";

import { facilityBillingQueries } from "@/lib/api/facility-billing";
import { recordBillingSelfServiceAction } from "@/lib/billing-self-service-store";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  BillingCycle,
  PaymentMethodOnFile,
} from "@/types/facility-billing";

import { UpgradePlanDialog } from "./upgrade-plan-dialog";
import { AllInvoicesDialog } from "./all-invoices-dialog";
import { UpdatePaymentMethodDialog } from "./update-payment-method-dialog";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";

const FACILITY_ID = 11;

function fmtDate(iso?: string): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

function cycleNoun(c: BillingCycle): string {
  return c === "yearly" ? "year" : c === "quarterly" ? "quarter" : "month";
}

function cardExpiry(card: PaymentMethodOnFile): string {
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
}

type DialogKey = null | "upgrade" | "invoices" | "card" | "cancel";

export function BillingSelfServiceView() {
  const subQ = useQuery(facilityBillingQueries.subscription(FACILITY_ID));
  const invQ = useQuery(facilityBillingQueries.invoices(FACILITY_ID));
  const pmQ = useQuery(facilityBillingQueries.paymentMethod(FACILITY_ID));
  const creditQ = useQuery(facilityBillingQueries.creditBalance(FACILITY_ID));
  const tiersQ = useQuery(facilityBillingQueries.tiers());

  const [dialog, setDialog] = useState<DialogKey>(null);
  const [localTierId, setLocalTierId] = useState<string | null>(null);
  const [localCard, setLocalCard] = useState<PaymentMethodOnFile | null>(null);
  const [canceledUntil, setCanceledUntil] = useState<string | null>(null);

  const sub = subQ.data ?? null;
  const tiers = tiersQ.data ?? [];
  const invoices = invQ.data ?? [];
  const credit = creditQ.data ?? null;
  const card = localCard ?? pmQ.data ?? null;

  const effectiveTier = tiers.find(
    (t) => t.id === (localTierId ?? sub?.tierId),
  );
  const billingCycle: BillingCycle = sub?.billingCycle ?? "monthly";
  const cyclePrice = effectiveTier?.pricing[billingCycle] ?? sub?.amount ?? 0;

  const upgradeTiers = useMemo(() => {
    const floor = effectiveTier?.pricing.monthly ?? 0;
    return tiers
      .filter((t) => t.isPublic !== false && t.pricing.monthly > floor)
      .sort((a, b) => a.pricing.monthly - b.pricing.monthly);
  }, [tiers, effectiveTier]);

  const recentInvoices = invoices.slice(0, 4);

  // --- self-service action handlers (each notifies the super admin) ---------

  function handleUpgrade(tier: (typeof tiers)[number]) {
    const fromName = effectiveTier?.name ?? sub?.planName ?? "current plan";
    setLocalTierId(tier.id);
    recordBillingSelfServiceAction({
      actionType: "upgrade",
      facilityId: FACILITY_ID,
      facilityName: sub?.facilityName ?? "Your facility",
      description: `${sub?.facilityName ?? "A facility"} upgraded from ${fromName} to ${tier.name}`,
      detail: `${fromName} → ${tier.name} · $${tier.pricing[billingCycle].toLocaleString()}/${cycleNoun(billingCycle)}`,
    });
    toast.success(
      `Upgraded to ${tier.name}. The Yipyy team has been notified.`,
    );
    setDialog(null);
  }

  function handleCardUpdate(next: PaymentMethodOnFile) {
    setLocalCard(next);
    recordBillingSelfServiceAction({
      actionType: "card_update",
      facilityId: FACILITY_ID,
      facilityName: sub?.facilityName ?? "Your facility",
      description: `${sub?.facilityName ?? "A facility"} updated their payment method`,
      detail: `${next.brand} ending ${next.last4}`,
    });
    toast.success("Payment method updated. The Yipyy team has been notified.");
    setDialog(null);
  }

  function handleCancel(reason: string) {
    const until = fmtDate(sub?.nextRenewalDate);
    setCanceledUntil(until);
    recordBillingSelfServiceAction({
      actionType: "cancel",
      facilityId: FACILITY_ID,
      facilityName: sub?.facilityName ?? "Your facility",
      description: `${sub?.facilityName ?? "A facility"} cancelled their subscription`,
      detail: `Reason: ${reason} · Access ends ${until}`,
    });
    toast.warning(`Subscription cancelled. Access continues until ${until}.`);
    setDialog(null);
  }

  function downloadInvoice(inv: (typeof invoices)[number]) {
    downloadInvoicePdf(`${inv.number}.pdf`, `Invoice ${inv.number}`, [
      `Facility: ${sub?.facilityName ?? "Your facility"}`,
      `Billing period: ${inv.periodLabel}`,
      `Issued: ${inv.issuedDate}`,
      inv.paidDate ? `Paid: ${inv.paidDate}` : `Status: ${inv.status}`,
      "",
      `Amount: ${inv.currency} $${inv.amount.toLocaleString()}`,
      "",
      "Yipyy - subscription invoice",
    ]);
  }

  // --- render ---------------------------------------------------------------

  if (subQ.isLoading || !sub) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Subscription &amp; Billing
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your plan, payment method, and invoices for {sub.facilityName}.
        </p>
      </div>

      {canceledUntil && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
          <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-medium text-rose-700 dark:text-rose-300">
              Subscription cancelled
            </p>
            <p className="text-muted-foreground">
              Your plan stays active until <strong>{canceledUntil}</strong>.
              After that your account downgrades to the free tier.
            </p>
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Current Plan"
          value={effectiveTier?.name ?? sub.planName}
          hint={`Billed ${billingCycle}`}
          icon={Sparkles}
          tone="indigo"
        />
        <KpiTile
          label={`Cost per ${cycleNoun(billingCycle)}`}
          value={`$${cyclePrice.toLocaleString()}`}
          hint={`≈ $${(effectiveTier?.pricing.monthly ?? sub.monthlyEquivalent).toLocaleString()}/mo`}
          icon={Wallet}
          tone="violet"
        />
        <KpiTile
          label="Next Renewal"
          value={canceledUntil ? "Cancelled" : fmtDate(sub.nextRenewalDate)}
          hint={canceledUntil ? `Access ends ${canceledUntil}` : "Auto-renews"}
          icon={CalendarClock}
          tone={canceledUntil ? "rose" : "amber"}
        />
        <KpiTile
          label="Credit Balance"
          value={`$${(credit?.balance ?? 0).toLocaleString()}`}
          hint="Applied to next invoice"
          icon={Gift}
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {effectiveTier?.name ?? sub.planName}
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    canceledUntil
                      ? "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
                  )}
                >
                  {canceledUntil ? `Cancels ${canceledUntil}` : "Active"}
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {effectiveTier?.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${cyclePrice.toLocaleString()}
              </div>
              <div className="text-muted-foreground text-xs">
                per {cycleNoun(billingCycle)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                What&apos;s included
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {(effectiveTier?.features ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={!!canceledUntil}
                onClick={() => setDialog("upgrade")}
              >
                <ArrowUp className="mr-1.5 size-4" />
                Upgrade Plan
              </Button>
              <Button
                variant="outline"
                className="text-rose-600 hover:text-rose-700"
                disabled={!!canceledUntil}
                onClick={() => setDialog("cancel")}
              >
                <XCircle className="mr-1.5 size-4" />
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment method + credit */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {card ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">
                      {card.brand} •••• {card.last4}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Expires {cardExpiry(card)}
                    </div>
                  </div>
                  <CreditCard className="text-muted-foreground size-5" />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No card on file.
                </p>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDialog("card")}
              >
                Update Payment Method
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="size-4" />
                Credit Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-emerald-600">
                ${(credit?.balance ?? 0).toLocaleString()}
              </div>
              <ul className="space-y-1.5">
                {(credit?.items ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4" />
            Invoices
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog("invoices")}
          >
            View All Invoices
          </Button>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          ) : (
            <ul className="divide-y">
              {recentInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{inv.number}</div>
                    <div className="text-muted-foreground text-xs">
                      {inv.periodLabel} · {inv.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium tabular-nums">
                      ${inv.amount.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Download ${inv.number} as PDF`}
                      onClick={() => downloadInvoice(inv)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UpgradePlanDialog
        open={dialog === "upgrade"}
        onOpenChange={(o) => setDialog(o ? "upgrade" : null)}
        currentTier={effectiveTier}
        upgradeTiers={upgradeTiers}
        billingCycle={billingCycle}
        onConfirm={handleUpgrade}
      />
      <AllInvoicesDialog
        open={dialog === "invoices"}
        onOpenChange={(o) => setDialog(o ? "invoices" : null)}
        invoices={invoices}
        facilityName={sub.facilityName}
      />
      <UpdatePaymentMethodDialog
        open={dialog === "card"}
        onOpenChange={(o) => setDialog(o ? "card" : null)}
        currentCard={card}
        onConfirm={handleCardUpdate}
      />
      <CancelSubscriptionDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => setDialog(o ? "cancel" : null)}
        renewalDate={fmtDate(sub.nextRenewalDate)}
        planName={effectiveTier?.name ?? sub.planName}
        onConfirm={handleCancel}
      />
    </div>
  );
}
