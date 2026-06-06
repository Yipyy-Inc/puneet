"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  rewardBreakdownByMonth,
  avgTimeToRedeemByType,
  REWARD_BUCKETS,
} from "@/lib/loyalty/reward-breakdown";

const NOW_ISO = new Date().toISOString();

const BUCKET_COLOR: Record<string, string> = {
  Credits: "#10b981",
  Discounts: "#6366f1",
  Freebies: "#f59e0b",
  "Gift cards": "#8b5cf6",
};

export function RewardTypeBreakdown() {
  const hydrated = useHydrated();
  const { facilityId } = useLoyaltyProgram();
  const { data: redemptions = [] } = useQuery(
    loyaltyQueries.redemptions(facilityId),
  );

  const monthly = useMemo(
    () => rewardBreakdownByMonth(redemptions, NOW_ISO, 6),
    [redemptions],
  );
  const timeToRedeem = useMemo(
    () => avgTimeToRedeemByType(redemptions),
    [redemptions],
  );

  if (!hydrated) {
    return <div className="bg-muted/30 h-80 animate-pulse rounded-xl border" />;
  }

  const fastest = timeToRedeem.reduce<{ bucket: string; avgDays: number } | null>(
    (best, r) => (best === null || r.avgDays < best.avgDays ? r : best),
    null,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold">Rewards redeemed by type</div>
        <p className="text-muted-foreground text-xs">
          Which reward types customers redeem each month
        </p>
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {REWARD_BUCKETS.map((b) => (
                <Bar
                  key={b}
                  dataKey={b}
                  stackId="rewards"
                  fill={BUCKET_COLOR[b]}
                  name={b}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold">Time from issuance to redemption</div>
        <p className="text-muted-foreground text-xs">
          How quickly each reward type drives a redemption — faster is more
          attractive.
          {fastest
            ? ` ${fastest.bucket} are redeemed within ${fastest.avgDays} days on average.`
            : ""}
        </p>
        <div className="mt-3 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward type</TableHead>
                <TableHead className="text-right">Avg days to redeem</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeToRedeem.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-muted-foreground py-6 text-center"
                  >
                    No redemptions with issuance dates yet.
                  </TableCell>
                </TableRow>
              ) : (
                timeToRedeem.map((r) => (
                  <TableRow key={r.bucket}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: BUCKET_COLOR[r.bucket] }}
                        />
                        {r.bucket}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {r.avgDays} {r.avgDays === 1 ? "day" : "days"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {r.count}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
