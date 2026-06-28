"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CreditCard,
  Download,
  Gift,
  Pause,
  Pencil,
  Percent,
  Play,
  Receipt,
  RefreshCcw,
  Wallet,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { facilityBillingQueries } from "@/lib/api/facility-billing";
import type {
  BillingCredit,
  InvoiceStatus,
  PaymentMethodOnFile,
  SubscriptionInvoice,
} from "@/types/facility-billing";

import {
  ChangePlanDialog,
  type ChangePlanResult,
} from "./billing/change-plan-dialog";
import { CancelSubscriptionDialog } from "./billing/cancel-subscription-dialog";
import { BillingAdjustmentDialog } from "./billing/billing-adjustment-dialog";

const CYCLE_LABEL: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Annual",
};
const CYCLE_SUFFIX: Record<string, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  yearly: "/yr",
};

const INVOICE_BADGE: Record<
  InvoiceStatus,
  "success" | "destructive" | "secondary" | "outline"
> = {
  Paid: "success",
  Overdue: "destructive",
  Draft: "secondary",
  Void: "outline",
};

const STATUS_BADGE: Record<
  string,
  "success" | "info" | "warning" | "destructive" | "outline"
> = {
  active: "success",
  trial: "info",
  paused: "warning",
  suspended: "warning",
  cancelled: "destructive",
  expired: "outline",
};

function fmtMoney(n: number, currency: string) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="mt-1 font-semibold">{children}</div>
    </div>
  );
}

export function BillingTab({
  facility,
}: {
  facility: { id: number; name: string };
}) {
  const { data: base, isLoading } = useQuery(
    facilityBillingQueries.subscription(facility.id),
  );
  const { data: invoices = [] } = useQuery(
    facilityBillingQueries.invoices(facility.id),
  );
  const { data: fetchedCard } = useQuery(
    facilityBillingQueries.paymentMethod(facility.id),
  );
  const { data: tiers = [] } = useQuery(facilityBillingQueries.tiers());

  // Local mutations applied on top of the fetched subscription.
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [planOverride, setPlanOverride] = useState<ChangePlanResult | null>(
    null,
  );
  const [addedCredits, setAddedCredits] = useState<BillingCredit[]>([]);
  const [cardOverride, setCardOverride] = useState<PaymentMethodOnFile | null>(
    null,
  );

  // Dialog state (conditional-mounted, so internal state stays fresh).
  const [changeOpen, setChangeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"credit" | "discount" | null>(
    null,
  );
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvc: "" });

  if (isLoading) {
    return <div className="bg-muted h-96 animate-pulse rounded-xl" />;
  }

  if (!base) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-16 text-center">
          This facility has no active subscription.
        </CardContent>
      </Card>
    );
  }

  const status = statusOverride ?? base.status;
  const tierId = planOverride?.tierId ?? base.tierId;
  const planName = planOverride?.planName ?? base.planName;
  const billingCycle = planOverride?.billingCycle ?? base.billingCycle;
  const amount = planOverride?.amount ?? base.amount;
  const credits = [...base.credits, ...addedCredits];
  const card = cardOverride ?? fetchedCard ?? null;

  const isCancelled = status === "cancelled";
  const isPaused = status === "paused";

  const applyAdjustment = (adj: Omit<BillingCredit, "id">) => {
    setAddedCredits((prev) => [...prev, { ...adj, id: `adj-${prev.length}` }]);
    toast.success(`${adj.kind === "credit" ? "Credit" : "Discount"} applied.`);
  };

  const handleChangePlan = (result: ChangePlanResult) => {
    setPlanOverride(result);
    toast.success(
      `Plan changed to ${result.planName} (${
        result.effective === "immediately" ? "effective now" : "at next renewal"
      }).`,
    );
  };

  const handleUpdateCard = () => {
    const digits = cardForm.number.replace(/\D/g, "");
    const [mm, yy] = cardForm.expiry.split("/");
    setCardOverride({
      brand: card?.brand ?? "Card",
      last4: digits.slice(-4) || card?.last4 || "0000",
      expMonth: Number(mm) || card?.expMonth || 1,
      expYear: yy ? 2000 + Number(yy) : (card?.expYear ?? 2027),
    });
    setCardOpen(false);
    setCardForm({ number: "", expiry: "", cvc: "" });
    toast.success("Payment method updated.");
  };

  const columns: ColumnDef<SubscriptionInvoice>[] = [
    {
      key: "number",
      label: "Invoice #",
      defaultVisible: true,
      render: (r) => (
        <span className="font-medium tabular-nums">{r.number}</span>
      ),
    },
    { key: "periodLabel", label: "Period", defaultVisible: true },
    {
      key: "amount",
      label: "Amount",
      defaultVisible: true,
      render: (r) => (
        <span className="tabular-nums">{fmtMoney(r.amount, r.currency)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (r) => (
        <Badge variant={INVOICE_BADGE[r.status]}>{r.status}</Badge>
      ),
    },
    {
      key: "issuedDate",
      label: "Date Issued",
      defaultVisible: true,
      render: (r) => fmtDate(r.issuedDate),
    },
    {
      key: "paidDate",
      label: "Date Paid",
      defaultVisible: true,
      render: (r) => fmtDate(r.paidDate),
    },
    {
      key: "id",
      label: "",
      defaultVisible: true,
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast.success(`Downloading ${r.number}.pdf`)}
        >
          <Download className="size-4" />
          PDF
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Section 1 — Current Subscription */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5" />
            Current Subscription
          </CardTitle>
          <Badge
            variant={STATUS_BADGE[status] ?? "secondary"}
            className="capitalize"
          >
            {status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Field label="Plan">{planName}</Field>
            <Field label="Billing cycle">
              {CYCLE_LABEL[billingCycle] ?? billingCycle}
            </Field>
            <Field label="Amount">
              {fmtMoney(amount, base.currency)}
              <span className="text-muted-foreground text-xs font-normal">
                {CYCLE_SUFFIX[billingCycle]}
              </span>
            </Field>
            <Field label="Next renewal">{fmtDate(base.nextRenewalDate)}</Field>
            <Field label="Start date">{fmtDate(base.startDate)}</Field>
          </div>

          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
              Active discounts &amp; credits
            </p>
            {credits.length === 0 ? (
              <p className="text-muted-foreground text-sm">None applied.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {credits.map((c) => (
                  <Badge key={c.id} variant="outline" className="gap-1.5 py-1">
                    {c.kind === "credit" ? (
                      <Gift className="size-3.5" />
                    ) : (
                      <Percent className="size-3.5" />
                    )}
                    {c.label} · {c.detail}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              size="sm"
              onClick={() => setChangeOpen(true)}
              disabled={isCancelled}
            >
              Change Plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdjustMode("credit")}
              disabled={isCancelled}
            >
              <Gift className="size-4" />
              Apply Credit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdjustMode("discount")}
              disabled={isCancelled}
            >
              <Percent className="size-4" />
              Apply Discount
            </Button>
            {isPaused ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatusOverride("active");
                  toast.success("Subscription resumed.");
                }}
              >
                <Play className="size-4" />
                Resume
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPauseOpen(true)}
                disabled={isCancelled}
              >
                <Pause className="size-4" />
                Pause Subscription
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 hover:text-rose-700"
              onClick={() => setCancelOpen(true)}
              disabled={isCancelled}
            >
              <XCircle className="size-4" />
              Cancel Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Invoice History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCcw className="size-5" />
            Invoice History
          </CardTitle>
          <Link
            href="/dashboard/financial"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
          >
            View All
            <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <DataTable
            data={invoices}
            columns={columns}
            searchKey="number"
            searchPlaceholder="Search invoices…"
            itemsPerPage={10}
            emptyState={{
              icon: Receipt,
              title: "No invoices yet",
              description:
                "Invoices will appear here once the facility is billed.",
            }}
          />
        </CardContent>
      </Card>

      {/* Section 3 — Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          {card ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-muted flex h-10 w-14 items-center justify-center rounded-lg">
                  <CreditCard className="size-5" />
                </span>
                <div>
                  <p className="font-medium">
                    {card.brand} •••• {card.last4}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Expires {String(card.expMonth).padStart(2, "0")}/
                    {card.expYear}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCardOpen(true)}
              >
                <Pencil className="size-4" />
                Update Card
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No payment method on file.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {changeOpen && (
        <ChangePlanDialog
          tiers={tiers}
          currentTierId={tierId}
          billingCycle={billingCycle}
          currency={base.currency}
          onConfirm={handleChangePlan}
          onClose={() => setChangeOpen(false)}
        />
      )}
      {cancelOpen && (
        <CancelSubscriptionDialog
          facilityName={facility.name}
          onConfirm={() => {
            setStatusOverride("cancelled");
            toast.success(
              `Subscription cancelled — ${facility.name} marked Cancelled.`,
            );
          }}
          onClose={() => setCancelOpen(false)}
        />
      )}
      {adjustMode && (
        <BillingAdjustmentDialog
          mode={adjustMode}
          currency={base.currency}
          onConfirm={applyAdjustment}
          onClose={() => setAdjustMode(null)}
        />
      )}

      {/* Pause confirm */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause subscription</DialogTitle>
            <DialogDescription>
              Billing for {facility.name} stops until you resume. The facility
              keeps read-only access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPauseOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setStatusOverride("paused");
                setPauseOpen(false);
                toast.success("Subscription paused.");
              }}
            >
              Pause subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update card */}
      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update card</DialogTitle>
            <DialogDescription>
              Enter the new card on file for {facility.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card number</Label>
              <Input
                id="card-number"
                value={cardForm.number}
                onChange={(e) =>
                  setCardForm((f) => ({ ...f, number: e.target.value }))
                }
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="card-expiry">Expiry (MM/YY)</Label>
                <Input
                  id="card-expiry"
                  value={cardForm.expiry}
                  onChange={(e) =>
                    setCardForm((f) => ({ ...f, expiry: e.target.value }))
                  }
                  placeholder="08/28"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-cvc">CVC</Label>
                <Input
                  id="card-cvc"
                  value={cardForm.cvc}
                  onChange={(e) =>
                    setCardForm((f) => ({ ...f, cvc: e.target.value }))
                  }
                  inputMode="numeric"
                  placeholder="123"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCardOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={cardForm.number.replace(/\D/g, "").length < 4}
              onClick={handleUpdateCard}
            >
              Save card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
