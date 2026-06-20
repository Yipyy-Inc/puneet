"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { LoyaltyMembersTable } from "@/components/loyalty/LoyaltyMembersTable";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { Users, Coins, Wallet, Gift } from "lucide-react";

export default function MembersPage() {
  const { facilityId } = useLoyaltyProgram();
  const { data: accounts = [] } = useQuery(loyaltyQueries.accounts(facilityId));

  const pointsOutstanding = accounts.reduce((s, a) => s + a.pointsBalance, 0);
  const creditOutstanding = accounts.reduce((s, a) => s + a.creditBalance, 0);
  const lifetimeRedeemed = accounts.reduce(
    (s, a) => s + a.lifetimePointsRedeemed,
    0,
  );

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
