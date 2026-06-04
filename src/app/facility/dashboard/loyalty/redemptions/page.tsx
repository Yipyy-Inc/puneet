"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type {
  RedemptionRecord,
  RedeemMethod,
  RedemptionRecordStatus,
} from "@/types/loyalty";
import { Receipt, CheckCircle2, Clock, XCircle, DollarSign } from "lucide-react";

const METHOD_LABELS: Record<RedeemMethod, string> = {
  portal_self: "Portal (self-serve)",
  staff_applied: "Staff applied",
  auto_applied: "Auto-applied",
  checkout_applied: "Checkout",
};

const STATUS_STYLES: Record<RedemptionRecordStatus, string> = {
  active:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  used: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const columns: ColumnDef<RedemptionRecord>[] = [
  {
    accessorKey: "redeemedAt",
    header: "Redeemed",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatDate(row.original.redeemedAt)}
      </div>
    ),
  },
  {
    accessorKey: "customerId",
    header: "Customer",
    cell: ({ row }) => `Client #${row.original.customerId}`,
  },
  {
    accessorKey: "rewardType",
    header: "Reward",
    cell: ({ row }) => (
      <div>
        <Badge variant="outline" className="capitalize">
          {row.original.rewardType.replace(/_/g, " ")}
        </Badge>
        <div className="text-muted-foreground mt-1 text-sm">
          {row.original.rewardValue}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "redeemMethod",
    header: "Method",
    cell: ({ row }) => (
      <Badge variant="secondary">{METHOD_LABELS[row.original.redeemMethod]}</Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
          STATUS_STYLES[row.original.status],
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: "invoiceId",
    header: "Reference",
    cell: ({ row }) =>
      row.original.invoiceId ? (
        <span className="font-mono text-xs">{row.original.invoiceId}</span>
      ) : row.original.bookingId ? (
        <span className="font-mono text-xs">{row.original.bookingId}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) =>
      row.original.expiresAt ? (
        formatDate(row.original.expiresAt)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export default function RedemptionsPage() {
  const { facilityId } = useLoyaltyProgram();
  const { data: redemptions = [] } = useQuery(
    loyaltyQueries.redemptions(facilityId),
  );

  const active = redemptions.filter((r) => r.status === "active").length;
  const used = redemptions.filter((r) => r.status === "used").length;
  const expired = redemptions.filter((r) => r.status === "expired").length;
  const totalValue = redemptions.reduce(
    (sum, r) => sum + (typeof r.rewardValue === "number" ? r.rewardValue : 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Redemptions</h2>
        <p className="text-muted-foreground text-sm">
          A record of every redemption — points cashed in, credits used, and
          loyalty discounts applied. This log feeds the analytics engine.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Total Redemptions"
          value={redemptions.length}
          hint={`${active} active`}
          icon={Receipt}
          tone="indigo"
        />
        <KpiTile
          label="Used"
          value={used}
          hint="Fully redeemed"
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Active"
          value={active}
          hint="Awaiting use"
          icon={Clock}
          tone="amber"
        />
        <KpiTile
          label="Expired"
          value={expired}
          hint="Lapsed unused"
          icon={XCircle}
          tone="rose"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="text-primary size-5" />
                Redemption Log
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {redemptions.length} redemption
                {redemptions.length === 1 ? "" : "s"} for this facility
              </p>
            </div>
            <div className="bg-muted/40 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm">
              <DollarSign className="size-4 text-emerald-500" />
              <span className="font-semibold tabular-nums">
                ${totalValue.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xs">value</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={redemptions}
            searchColumn="rewardType"
            searchPlaceholder="Search by reward type..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
