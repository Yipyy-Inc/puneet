"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";
import { loyaltyLedgerQueries } from "@/lib/api/loyalty-ledger";
import type { LoyaltyVoucherRow } from "@/app/api/loyalty/vouchers/route";
import {
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Ban,
} from "lucide-react";

// ============================================================================
// Every reward this facility has issued, and what became of it.
//
// ── WHAT IT READ BEFORE ───────────────────────────────────────────────────
//
// `src/data/loyalty-redemptions` — hand-authored rows keyed by `facilityId: 1`,
// so every facility on the platform was shown the same log and none of it had
// happened. A voucher this facility really issued appeared nowhere.
//
// ── TWO COLUMNS ARE GONE, DELIBERATELY ────────────────────────────────────
//
// **Method.** The fixture carried a `redeemMethod` — portal / staff / auto /
// checkout — and nothing records it. There is no column, no argument and no
// caller that says how a voucher was applied, so any value shown here would
// have been invented. Dropped rather than defaulted.
//
// **The dollar total.** The header summed `rewardValue` across every row and
// labelled it "$". That adds a 10 (ten PER CENT) to a 25 (twenty-five DOLLARS)
// and calls the answer money. Points spent is exact and is on the row, so that
// is what the total counts now. The dollar cost of rewards needs what was
// actually taken off each bill, and that belongs with the loyalty reports.
//
// ── AND THE STATUS IS THE DERIVED ONE ─────────────────────────────────────
//
// Nothing flips a voucher to `expired` — there is no scheduler — so a reward
// past its expiry sits at `active` in the column while the database refuses to
// spend it. The route derives `effectiveStatus` against its own clock; the
// Expired tile could previously only ever read zero.
// ============================================================================

type Status = LoyaltyVoucherRow["effectiveStatus"];

const REWARD_LABELS: Record<LoyaltyVoucherRow["rewardType"], string> = {
  discount_pct: "Percentage discount",
  discount_fixed: "Fixed discount",
  free_service: "Free service",
  credit_balance: "Account credit",
};

const STATUS_STYLES: Record<Status, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  used: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** What the reward is worth, in its own unit. A percentage is not dollars. */
function rewardAmount(v: LoyaltyVoucherRow): string {
  switch (v.rewardType) {
    case "discount_pct":
      return `${v.rewardValue}% off`;
    case "discount_fixed":
    case "credit_balance":
      return `$${v.rewardValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "free_service":
      return v.appliesToServices?.length
        ? v.appliesToServices.join(", ")
        : "Any service";
  }
}

const columns: ColumnDef<LoyaltyVoucherRow>[] = [
  {
    accessorKey: "issuedAt",
    header: "Issued",
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        {formatDate(row.original.issuedAt)}
      </div>
    ),
  },
  {
    accessorKey: "clientName",
    header: "Customer",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">
          {row.original.clientName ?? "—"}
        </div>
        {row.original.clientRef !== null && (
          <div className="text-muted-foreground text-xs">
            #{row.original.clientRef}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "rewardType",
    header: "Reward",
    cell: ({ row }) => (
      <div>
        <Badge variant="outline">
          {REWARD_LABELS[row.original.rewardType]}
        </Badge>
        <div className="text-muted-foreground mt-1 text-sm">
          {rewardAmount(row.original)}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "pointsSpent",
    header: "Cost",
    cell: ({ row }) =>
      row.original.pointsSpent > 0 ? (
        <span className="tabular-nums">
          {row.original.pointsSpent.toLocaleString()} pts
        </span>
      ) : (
        // Zero is not missing data: a tier reward and a badge reward are both
        // GIVEN rather than bought, and they post at no points on purpose.
        <span className="text-muted-foreground text-xs">Awarded</span>
      ),
  },
  {
    accessorKey: "effectiveStatus",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
          STATUS_STYLES[row.original.effectiveStatus],
        )}
      >
        {row.original.effectiveStatus}
      </span>
    ),
  },
  {
    accessorKey: "usedOnBookingRef",
    header: "Spent on",
    cell: ({ row }) =>
      row.original.usedOnBookingRef !== null ? (
        <span className="font-mono text-xs">
          #{row.original.usedOnBookingRef}
        </span>
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
        <span className="text-muted-foreground">No expiry</span>
      ),
  },
];

export default function RedemptionsPage() {
  const { data: vouchers = [], isPending } = useQuery(
    loyaltyLedgerQueries.allVouchers(),
  );

  const count = (status: Status) =>
    vouchers.filter((v) => v.effectiveStatus === status).length;

  const active = count("active");
  const used = count("used");
  const expired = count("expired");
  const cancelled = count("cancelled");

  const pointsSpent = vouchers.reduce((sum, v) => sum + v.pointsSpent, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Redemptions</h2>
        <p className="text-muted-foreground text-sm">
          Every reward this facility has issued — what it cost the customer in
          points, and whether it has been spent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Rewards Issued"
          value={vouchers.length}
          hint={`${pointsSpent.toLocaleString()} points spent`}
          icon={Receipt}
          tone="indigo"
        />
        <KpiTile
          label="Spent"
          value={used}
          hint="Applied to a bill"
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Outstanding"
          value={active}
          hint="Still redeemable"
          icon={Clock}
          tone="amber"
        />
        <KpiTile
          label="Expired"
          value={expired}
          // The tile counts EXPIRED. Cancelled is a fourth state and belongs
          // in the same tile — it is the other way a reward ends unspent — but
          // it has to say so, or the hint reads as the value's own caption.
          hint={
            cancelled > 0
              ? `Lapsed unused · plus ${cancelled} cancelled`
              : "Lapsed unused"
          }
          icon={expired > 0 ? XCircle : Ban}
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
                {vouchers.length} reward{vouchers.length === 1 ? "" : "s"}{" "}
                issued at this facility
              </p>
            </div>
            <div className="bg-muted/40 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm">
              <Sparkles className="size-4 text-amber-500" />
              <span className="font-semibold tabular-nums">
                {pointsSpent.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-xs">
                points redeemed
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="bg-muted/30 h-64 animate-pulse rounded-lg border" />
          ) : vouchers.length === 0 ? (
            // Said here rather than through the table's own empty row: this
            // `DataTable` is the simple one (`ui/data-table`), which renders a
            // bare "No data found". The richer `ui/DataTable` takes an
            // `emptyState`, and swapping which table this screen uses is not
            // part of making it read real rows.
            <div className="text-muted-foreground py-12 text-center">
              <Receipt className="mx-auto mb-3 size-10 opacity-40" />
              <p className="font-medium">No rewards issued yet</p>
              <p className="mt-1 text-xs">
                A reward appears here the moment a customer redeems points,
                reaches a tier, or earns a badge that carries one.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={vouchers}
              searchColumn="clientName"
              searchPlaceholder="Search by customer..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
