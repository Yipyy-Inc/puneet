"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  Award,
  Star,
  Gem,
  Trophy,
  Target,
  Users,
  TrendingUp,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { loyaltyQueries } from "@/lib/api/loyalty";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  computeBadgeAchievement,
  type BadgeAchievementRow,
} from "@/lib/loyalty/badge-achievement-metrics";
import { cn } from "@/lib/utils";

const NOW_ISO = new Date().toISOString();

const BADGE_ICONS: Record<string, LucideIcon> = {
  star: Star,
  gem: Gem,
  trophy: Trophy,
  target: Target,
};

function currency(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function BadgeAchievementReport() {
  const hydrated = useHydrated();
  const { config, facilityId } = useLoyaltyProgram();
  const badges = useMemo(() => config.badges ?? [], [config.badges]);
  const tierDefs = useMemo(
    () => config.tierDefinitions ?? [],
    [config.tierDefinitions],
  );
  const { data: customerBadges = [] } = useQuery(
    loyaltyQueries.customerBadges(facilityId),
  );
  const { data: spendEvents = [] } = useQuery(
    loyaltyQueries.spendEvents(facilityId),
  );

  const rows = useMemo(
    () =>
      computeBadgeAchievement({
        badges,
        customerBadges,
        spendEvents,
        now: NOW_ISO,
        tierName: (id) => tierDefs.find((t) => t.id === id)?.name,
      }),
    [badges, customerBadges, spendEvents, tierDefs],
  );

  const summary = useMemo(() => {
    const earned = rows.filter((r) => r.earnedByCount > 0);
    const totalAwarded = rows.reduce((s, r) => s + r.earnedByCount, 0);
    const upliftVals = earned
      .map((r) => r.revenueUpliftAbs)
      .filter((v) => v !== 0);
    const avgUplift = upliftVals.length
      ? Math.round(upliftVals.reduce((s, v) => s + v, 0) / upliftVals.length)
      : 0;
    const daysVals = earned
      .map((r) => r.avgDaysToEarn)
      .filter((v): v is number => v != null);
    const avgDays = daysVals.length
      ? Math.round(daysVals.reduce((s, v) => s + v, 0) / daysVals.length)
      : null;
    return { totalAwarded, avgUplift, avgDays };
  }, [rows]);

  if (!hydrated) {
    return <div className="bg-muted/30 h-64 animate-pulse rounded-xl border" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          label="Badges Awarded"
          value={summary.totalAwarded.toLocaleString()}
          hint="Across all members"
          icon={Users}
          tone="violet"
        />
        <KpiTile
          label="Avg Monthly Uplift"
          value={`+${currency(summary.avgUplift)}`}
          hint="Per member after earning a badge"
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiTile
          label="Avg Days to Earn"
          value={summary.avgDays != null ? `${summary.avgDays}d` : "—"}
          hint="From first booking"
          icon={CalendarClock}
          tone="amber"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Badge</TableHead>
              <TableHead className="text-right">Earned by</TableHead>
              <TableHead className="text-right">Avg days to earn</TableHead>
              <TableHead className="text-right">
                Revenue uplift / month
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <BadgeRow key={row.badgeId} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        Revenue uplift compares each earner&apos;s average monthly spend before
        vs. after earning the badge. A badge earned by very few members may mean
        its condition is set too high; one earned by nearly everyone may be too
        easy to motivate.
      </p>
    </div>
  );
}

function BadgeRow({ row }: { row: BadgeAchievementRow }) {
  const Icon = BADGE_ICONS[row.icon] ?? Award;
  const notEarned = row.earnedByCount === 0;

  return (
    <TableRow data-empty={notEarned ? "" : undefined}>
      <TableCell>
        <div className="flex items-start gap-3">
          <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="font-medium">{row.badgeName}</div>
            <div className="text-muted-foreground text-xs">
              {row.conditionText}
              {row.rewardText ? (
                <>
                  {" → "}
                  <span className="text-foreground/70">
                    Reward: {row.rewardText}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="text-right">
        <span className="font-semibold tabular-nums">{row.earnedByCount}</span>
        <span className="text-muted-foreground ml-1 text-xs">
          {row.earnedByCount === 1 ? "member" : "members"}
        </span>
      </TableCell>

      <TableCell className="text-muted-foreground text-right tabular-nums">
        {row.avgDaysToEarn != null ? `${row.avgDaysToEarn}d` : "—"}
      </TableCell>

      <TableCell className="text-right">
        {notEarned || row.revenueUpliftPct == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-col items-end">
            <span
              className={cn(
                "font-semibold tabular-nums",
                row.revenueUpliftAbs >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {row.revenueUpliftAbs >= 0 ? "+" : "−"}
              {currency(Math.abs(row.revenueUpliftAbs))}
              <span className="ml-1 text-xs font-normal">
                ({row.revenueUpliftPct >= 0 ? "+" : ""}
                {row.revenueUpliftPct}%)
              </span>
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {currency(row.monthlySpendBefore)} →{" "}
              {currency(row.monthlySpendAfter)}
            </span>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
