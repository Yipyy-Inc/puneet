"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarClock,
  Clock,
  Download,
  Gift,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";

import { facilityBillingQueries } from "@/lib/api/facility-billing";
import { usePlanChangeRequests } from "@/lib/plan-change-requests-store";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  BillingCycle,
  InvoiceStatus,
  SubscriptionInvoice,
} from "@/types/facility-billing";

const FACILITY_ID = 11;

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Annual",
};

// Map the raw subscription status to the four owner-facing states.
const STATUS_META: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  trial: {
    label: "Trial",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
  },
  paused: {
    label: "Paused",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  },
  suspended: {
    label: "Past Due",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  },
};

function statusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      className:
        "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    }
  );
}

const INVOICE_STATUS_CLASS: Record<InvoiceStatus, string> = {
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Overdue: "border-rose-200 bg-rose-50 text-rose-700",
  Draft: "border-amber-200 bg-amber-50 text-amber-700",
  Void: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

function fmtDate(iso?: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

function SummaryTile({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Wallet;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{children}</div>
    </div>
  );
}

export function MySubscriptionView() {
  const subQ = useQuery(facilityBillingQueries.subscription(FACILITY_ID));
  const invQ = useQuery(facilityBillingQueries.invoices(FACILITY_ID));
  const creditQ = useQuery(facilityBillingQueries.creditBalance(FACILITY_ID));
  const requests = usePlanChangeRequests();

  const sub = subQ.data ?? null;
  const invoices = invQ.data ?? [];
  const credit = creditQ.data ?? null;

  const pendingRequest = requests.find(
    (r) => r.facilityId === FACILITY_ID && r.status === "pending",
  );

  const downloadInvoice = (inv: SubscriptionInvoice) => {
    downloadInvoicePdf(`${inv.number}.pdf`, `Invoice ${inv.number}`, [
      `Facility: ${sub?.facilityName ?? "Your facility"}`,
      `Billing period: ${inv.periodLabel}`,
      `Issued: ${inv.issuedDate}`,
      inv.paidDate ? `Paid: ${inv.paidDate}` : `Status: ${inv.status}`,
      "",
      `Amount: ${inv.currency} $${inv.amount.toLocaleString()}`,
      "",
      "Yipyy — subscription invoice",
    ]);
  };

  const columns: ColumnDef<SubscriptionInvoice>[] = [
    { key: "number", label: "Invoice #" },
    { key: "periodLabel", label: "Period" },
    {
      key: "amount",
      label: "Amount",
      sortValue: (inv) => inv.amount,
      render: (inv) => (
        <span className="tabular-nums">${inv.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (inv) => (
        <Badge
          variant="outline"
          className={cn("font-medium", INVOICE_STATUS_CLASS[inv.status])}
        >
          {inv.status}
        </Badge>
      ),
    },
    {
      key: "issuedDate",
      label: "Date Issued",
      sortValue: (inv) => inv.issuedDate,
      render: (inv) => fmtDate(inv.issuedDate),
    },
    {
      key: "paidDate",
      label: "Date Paid",
      sortValue: (inv) => inv.paidDate ?? "",
      render: (inv) => fmtDate(inv.paidDate),
    },
  ];

  if (subQ.isLoading || !sub) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const status = statusMeta(sub.status);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Subscription
          </h1>
          <p className="text-muted-foreground text-sm">
            Your Yipyy plan, billing and invoices for {sub.facilityName}.
          </p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/facility/account/subscription/change-plan">
            <ArrowUpRight className="size-4" />
            Upgrade / Change Plan
          </Link>
        </Button>
      </div>

      {pendingRequest && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-950/30">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Plan change requested — pending Yipyy review
            </p>
            <p className="text-muted-foreground">
              You requested a change to{" "}
              <strong>{pendingRequest.toPlanName}</strong>. Your current plan
              stays active until a Yipyy staffer approves the change.
            </p>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-primary size-5" />
            {sub.planName}
            <Badge
              variant="outline"
              className={cn("font-medium", status.className)}
            >
              {status.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile icon={CalendarClock} label="Billing cycle">
              {CYCLE_LABEL[sub.billingCycle]}
            </SummaryTile>
            <SummaryTile icon={CalendarClock} label="Next billing date">
              {fmtDate(sub.nextRenewalDate)}
            </SummaryTile>
            <SummaryTile icon={Wallet} label="Amount due">
              ${sub.amount.toLocaleString()}
            </SummaryTile>
            <SummaryTile icon={Sparkles} label="Status">
              {status.label}
            </SummaryTile>
          </div>
        </CardContent>
      </Card>

      {/* Active Discounts & Credits (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="size-4" />
            Active Discounts &amp; Credits
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Applied by Yipyy. Read-only — managed from the Yipyy Credits &amp;
            Discounts section.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {credit && credit.items.length > 0 ? (
            <>
              <ul className="divide-y">
                {credit.items.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {c.kind}
                      </Badge>
                      {c.label}
                    </span>
                    <span className="font-medium tabular-nums">{c.detail}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Credit balance applied to next invoice
                </span>
                <span className="text-lg font-semibold text-emerald-600">
                  ${credit.balance.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No active discounts or credits on this account.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4" />
            Invoice History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={invoices}
            columns={columns}
            searchKeys={["number", "periodLabel"]}
            searchPlaceholder="Search by invoice # or period…"
            itemsPerPage={8}
            actions={(inv) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadInvoice(inv)}
              >
                <Download className="mr-1.5 size-3.5" />
                PDF
              </Button>
            )}
            emptyState={{
              icon: Receipt,
              title: "No invoices yet",
              description: "Your Yipyy subscription invoices will appear here.",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
