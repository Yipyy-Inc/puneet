"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import type { CustomerLoyaltyAccount } from "@/types/loyalty";
import { Users, Coins, Wallet, Gift } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MembersPage() {
  const { config, facilityId } = useLoyaltyProgram();
  const { data: accounts = [] } = useQuery(
    loyaltyQueries.accounts(facilityId),
  );

  const tierMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const t of config.tierDefinitions ?? []) {
      map.set(t.id, { name: t.name, color: t.color });
    }
    return map;
  }, [config.tierDefinitions]);

  const pointsOutstanding = accounts.reduce(
    (sum, a) => sum + a.pointsBalance,
    0,
  );
  const creditOutstanding = accounts.reduce(
    (sum, a) => sum + a.creditBalance,
    0,
  );
  const lifetimeRedeemed = accounts.reduce(
    (sum, a) => sum + a.lifetimePointsRedeemed,
    0,
  );

  const columns: ColumnDef<CustomerLoyaltyAccount>[] = [
    {
      accessorKey: "customerId",
      header: "Customer",
      cell: ({ row }) => `Client #${row.original.customerId}`,
    },
    {
      accessorKey: "currentTierId",
      header: "Tier",
      cell: ({ row }) => {
        const tierId = row.original.currentTierId;
        const tier = tierId ? tierMap.get(tierId) : undefined;
        if (!tier) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${tier.color}22`,
              color: tier.color,
            }}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: tier.color }}
            />
            {tier.name}
          </span>
        );
      },
    },
    {
      accessorKey: "pointsBalance",
      header: "Points",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.pointsBalance.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "creditBalance",
      header: "Credit",
      cell: ({ row }) =>
        row.original.creditBalance > 0 ? (
          <span className="tabular-nums">
            ${row.original.creditBalance.toLocaleString()}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "lifetimePointsEarned",
      header: "Lifetime (earned / redeemed)",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {row.original.lifetimePointsEarned.toLocaleString()} /{" "}
          {row.original.lifetimePointsRedeemed.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "totalSpend",
      header: "Spend",
      cell: ({ row }) => (
        <span className="tabular-nums">
          ${row.original.totalSpend.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "totalVisits",
      header: "Visits",
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.totalVisits}</span>
      ),
    },
    {
      accessorKey: "referralCode",
      header: "Referral",
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-xs">{row.original.referralCode}</div>
          <div className="text-muted-foreground text-xs">
            {row.original.referralCount} referred
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-muted-foreground text-sm">
          Every customer with a loyalty account at this facility — points,
          credit, tier, spend, visits, and referral activity. One account is
          created per customer when they first book.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Members"
          value={accounts.length}
          hint="Loyalty accounts"
          icon={Users}
          tone="indigo"
        />
        <KpiTile
          label="Points Outstanding"
          value={pointsOutstanding.toLocaleString()}
          hint="Unredeemed balances"
          icon={Coins}
          tone="amber"
        />
        <KpiTile
          label="Credit Outstanding"
          value={`$${creditOutstanding.toLocaleString()}`}
          hint="Available account credit"
          icon={Wallet}
          tone="emerald"
        />
        <KpiTile
          label="Lifetime Redeemed"
          value={lifetimeRedeemed.toLocaleString()}
          hint="Points redeemed all-time"
          icon={Gift}
          tone="violet"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="text-primary size-5" />
            Member Accounts
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {accounts.length} member{accounts.length === 1 ? "" : "s"} at this
            facility
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={accounts}
            searchColumn="referralCode"
            searchPlaceholder="Search referral code..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
