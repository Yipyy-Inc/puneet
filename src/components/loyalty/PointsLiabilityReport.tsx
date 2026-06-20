"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Coins, Wallet, TrendingDown } from "lucide-react";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useHydrated } from "@/hooks/use-hydrated";
import { computePointsLiability } from "@/lib/loyalty/liability-metrics";

const NOW_ISO = new Date().toISOString();

export function PointsLiabilityReport() {
  const hydrated = useHydrated();
  const { config, facilityId } = useLoyaltyProgram();
  const { data: accounts = [] } = useQuery(loyaltyQueries.accounts(facilityId));
  const { data: transactions = [] } = useQuery(
    loyaltyQueries.transactionsAll(facilityId),
  );
  const redemptionRate = config.redemptionRate ?? 100;

  const liability = useMemo(
    () =>
      computePointsLiability({
        accounts,
        transactions,
        redemptionRate,
        now: NOW_ISO,
      }),
    [accounts, transactions, redemptionRate],
  );

  if (!hydrated) {
    return <div className="bg-muted/30 h-48 animate-pulse rounded-xl border" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          label="Total Outstanding Points"
          value={liability.totalPoints.toLocaleString()}
          hint="Unredeemed across all members"
          icon={Coins}
          tone="amber"
        />
        <KpiTile
          label="Dollar Liability"
          value={`$${liability.dollarLiability.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          hint={`If all redeemed · ${redemptionRate} pts = $1`}
          icon={Wallet}
          tone="rose"
        />
        <KpiTile
          label="Avg Daily Redemptions"
          value={`${Math.round(liability.avgDailyRedeemedPoints).toLocaleString()} pts`}
          hint="Trailing 90-day average"
          icon={TrendingDown}
          tone="violet"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3">
            <div className="text-sm font-semibold">Redemption forecast</div>
            <p className="text-muted-foreground text-xs">
              Projected points (and dollar value) redeemed at the current
              average daily rate.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {liability.forecast.map((f) => (
              <div key={f.days} className="rounded-lg border p-4">
                <div className="text-muted-foreground text-xs font-medium">
                  Next {f.days} days
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {f.points.toLocaleString()}{" "}
                  <span className="text-muted-foreground text-sm font-normal">
                    pts
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 text-sm tabular-nums">
                  ≈ $
                  {f.dollars.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
