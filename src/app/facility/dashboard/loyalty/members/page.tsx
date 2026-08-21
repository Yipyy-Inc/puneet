"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { LoyaltyMembersTable } from "@/components/loyalty/LoyaltyMembersTable";
import { loyaltyLedgerQueries } from "@/lib/api/loyalty-ledger";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Coins, Wallet, Gift } from "lucide-react";

export default function MembersPage() {
  // ── FROM POSTGRES ──────────────────────────────────────────────────────
  //
  // These four tiles read `src/data/loyalty-accounts` until 2026-08-21, and for
  // a few hours after the ledger became real they were the most misleading
  // numbers on the platform: "Points Outstanding" is a LIABILITY a facility
  // owes its customers, and it was being summed from a seed file that had
  // nothing to do with the balances the database held.
  const { data: accounts = [], isPending } = useQuery(
    loyaltyLedgerQueries.accounts(),
  );

  const pointsOutstanding = accounts.reduce((s, a) => s + a.pointsBalance, 0);
  const creditOutstanding = accounts.reduce((s, a) => s + a.creditBalance, 0);
  const lifetimeRedeemed = accounts.reduce(
    (s, a) => s + a.lifetimePointsRedeemed,
    0,
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-muted-foreground text-sm">
          Every customer with a loyalty account at this facility — points,
          credit, tier, spend, activity, and status. Search, filter, sort, and
          export, or act on any member.
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
        </CardHeader>
        <CardContent>
          <LoyaltyMembersTable />
        </CardContent>
      </Card>
    </div>
  );
}
