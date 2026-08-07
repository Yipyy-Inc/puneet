import { AlertTriangle, CreditCard, Receipt } from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminFacilityRow } from "@/types/admin-facility";

// ============================================================================
// What this facility is on, and what it is paying.
//
// The subscription is REAL — `facility_subscriptions`, the table that makes
// suspension mean something. Everything the old tab showed around it (an
// invoice history, a card on file, a payment-method form) was mock, and none
// of it has a table. Nothing charges anybody yet.
//
// So the plan is shown and the rest is named as absent. An invoice list that
// renders "no invoices" for a facility we have never billed is not an empty
// state, it is a claim that they owe nothing.
// ============================================================================

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

export function FacilityBilling({ facility }: { facility: AdminFacilityRow }) {
  const subscription = facility.subscription;

  if (!subscription) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-600" />
            No subscription recorded
          </CardTitle>
          <CardDescription>
            This facility has no row in <code>facility_subscriptions</code>. It
            keeps working — the database treats a missing subscription as active
            rather than as a lockout, so a half-finished provisioning cannot
            leave a business nobody can enter — but nothing here can be billed
            or suspended until one exists.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const trialEnds = subscription.trialEndsAt?.slice(0, 10) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="text-muted-foreground size-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Plan">{subscription.tierName}</Row>
          <Row label="Status">
            <StatusBadge type="status" value={subscription.status} />
          </Row>
          <Row label="Amount">
            {money(subscription.amountCents, subscription.currency)} /{" "}
            {subscription.billingCycle.replace("ly", "")}
          </Row>
          <Row label="Period started">
            {subscription.periodStart.slice(0, 10)}
          </Row>
          <Row label="Period ends">
            {subscription.periodEnd?.slice(0, 10) ?? "—"}
          </Row>
          {trialEnds && <Row label="Trial ends">{trialEnds}</Row>}
          {subscription.cancelledAt && (
            <Row label="Cancelled">{subscription.cancelledAt.slice(0, 10)}</Row>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="text-muted-foreground size-4" />
            Invoices and payment method
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm">
          <p>
            Not shown, because nothing stores them. There is no invoice table,
            no payment processor connected and no card on file — no facility has
            ever been charged.
          </p>
          <p>
            An empty invoice list here would read as &ldquo;this facility owes
            nothing&rdquo;, which is a stronger claim than the truth: we have
            never asked.
          </p>
          <p className="text-xs">
            Suspending or reactivating a facility is real and takes effect
            immediately — use the menu at the top right.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
