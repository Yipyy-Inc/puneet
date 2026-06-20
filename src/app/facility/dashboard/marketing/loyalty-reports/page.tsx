"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  TrendingUp,
  Users,
  Gift,
  Download,
  Calendar,
  ArrowUpRight,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { referralRelationships } from "@/data/referral-tracking";
import { customerLoyaltyData, loyaltySettings } from "@/data/marketing";
import { clients } from "@/data/clients";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LoyaltyModuleGuard } from "@/components/loyalty/LoyaltyModuleGuard";
import { useLoyaltyConfig } from "@/hooks/use-loyalty-config";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getLoyaltyAccountsByFacility,
  getLoyaltyAccount,
} from "@/data/loyalty-accounts";
import { getRedemptionsByFacility } from "@/data/loyalty-redemptions";
import { bookings } from "@/data/bookings";
import { computeProgramPerformance } from "@/lib/loyalty/program-metrics";
import { referralsOverTime } from "@/lib/loyalty/referral-metrics";
import { computeLoyaltyRoi } from "@/lib/loyalty/roi-metrics";
import { MemberLifecycleFunnel } from "@/components/loyalty/MemberLifecycleFunnel";
import { RewardTypeBreakdown } from "@/components/loyalty/RewardTypeBreakdown";
import { PointsLiabilityReport } from "@/components/loyalty/PointsLiabilityReport";
import { BadgeAchievementReport } from "@/components/loyalty/BadgeAchievementReport";

// Mock facility ID - TODO: Get from context
const MOCK_FACILITY_ID = 1;
// Captured once at module load for the deterministic "this month" window.
const PERF_NOW_ISO = new Date().toISOString();

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function LoyaltyReportsPage() {
  const { isEnabled, canViewReports } = useLoyaltyConfig();
  const [dateRange, _setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Live program-performance metrics (deep-linked from the Loyalty tab banner).
  const searchParams = useSearchParams();
  const highlightMetric = searchParams.get("metric");
  const performance = useMemo(
    () =>
      computeProgramPerformance({
        accounts: getLoyaltyAccountsByFacility(MOCK_FACILITY_ID),
        redemptions: getRedemptionsByFacility(MOCK_FACILITY_ID),
        bookings: bookings.map((b) => ({
          clientId: b.clientId,
          startDate: b.startDate,
        })),
        now: PERF_NOW_ISO,
      }),
    [],
  );
  useEffect(() => {
    if (!highlightMetric) return;
    document
      .getElementById(`perf-${highlightMetric}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightMetric]);

  // Referrals sent vs completed, by ISO week.
  const referralTimeSeries = useMemo(
    () =>
      referralsOverTime(
        referralRelationships.filter((r) => r.facilityId === MOCK_FACILITY_ID),
      ),
    [],
  );

  // Loyalty ROI — incremental revenue vs cost of rewards (headline report).
  const roi = useMemo(
    () =>
      computeLoyaltyRoi({
        accounts: getLoyaltyAccountsByFacility(MOCK_FACILITY_ID),
        redemptions: getRedemptionsByFacility(MOCK_FACILITY_ID),
        bookings: bookings.map((b) => ({
          clientId: b.clientId,
          startDate: b.startDate,
        })),
        now: PERF_NOW_ISO,
        months: 6,
      }),
    [],
  );

  // Calculate loyalty statistics
  const loyaltyStats = useMemo(() => {
    // Get all customers for this facility
    const facilityCustomers = customerLoyaltyData.filter(
      (loyalty) => loyalty.clientId, // In production, filter by facilityId
    );

    // Total points issued (lifetime points)
    const totalPointsIssued = facilityCustomers.reduce(
      (sum, customer) => sum + customer.lifetimePoints,
      0,
    );

    // Total points redeemed (calculate from history)
    const totalPointsRedeemed = facilityCustomers.reduce((sum, customer) => {
      const redeemed = customer.pointsHistory
        .filter((entry) => entry.type === "redeemed")
        .reduce((s, e) => s + Math.abs(e.points), 0);
      return sum + redeemed;
    }, 0);

    // Active loyalty members (customers with points > 0)
    const activeMembers = facilityCustomers.filter(
      (customer) => customer.points > 0,
    ).length;

    // Current points balance
    const currentPointsBalance = facilityCustomers.reduce(
      (sum, customer) => sum + customer.points,
      0,
    );

    return {
      totalPointsIssued,
      totalPointsRedeemed,
      activeMembers,
      currentPointsBalance,
      totalMembers: facilityCustomers.length,
    };
  }, []);

  // Calculate referral statistics
  const referralStats = useMemo(() => {
    // Get all referral relationships for this facility
    const facilityReferrals = referralRelationships.filter(
      (rel) => rel.facilityId === MOCK_FACILITY_ID,
    );

    // Total referrals
    const totalReferrals = facilityReferrals.length;

    // Completed referrals (where reward was issued)
    const completedReferrals = facilityReferrals.filter(
      (rel) => rel.referrerRewardStatus === "issued",
    ).length;

    // Conversion rate
    const conversionRate =
      totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

    // Revenue from referrals (sum of first booking values)
    const revenueFromReferrals = facilityReferrals
      .filter((rel) => rel.firstBookingValue)
      .reduce((sum, rel) => sum + (rel.firstBookingValue || 0), 0);

    // Top referrers
    const referrerMap = new Map<number, number>();
    facilityReferrals.forEach((rel) => {
      if (rel.referrerRewardStatus === "issued") {
        const current = referrerMap.get(rel.referrerId) || 0;
        referrerMap.set(rel.referrerId, current + 1);
      }
    });

    const topReferrers = Array.from(referrerMap.entries())
      .map(([referrerId, count]) => {
        const customer = clients.find((c) => c.id === referrerId);
        const account = getLoyaltyAccount(MOCK_FACILITY_ID, referrerId);
        const tier = account?.currentTierId
          ? loyaltySettings.tiers.find((t) => t.id === account.currentTierId)
          : undefined;
        // Pending = referrals this referrer sent that aren't completed/cancelled.
        const pendingCount = facilityReferrals.filter(
          (rel) =>
            rel.referrerId === referrerId &&
            rel.referrerRewardStatus !== "issued" &&
            rel.status !== "cancelled",
        ).length;
        return {
          referrerId,
          name: customer?.name || `Customer #${referrerId}`,
          email: customer?.email,
          referralsCount: count,
          pendingCount,
          tierName: tier?.name,
          tierColor: tier?.color,
          lifetimeSpend: account?.totalSpend ?? 0,
          totalRevenue: facilityReferrals
            .filter(
              (rel) =>
                rel.referrerId === referrerId &&
                rel.referrerRewardStatus === "issued",
            )
            .reduce((sum, rel) => sum + (rel.firstBookingValue || 0), 0),
        };
      })
      .sort((a, b) => b.referralsCount - a.referralsCount)
      .slice(0, 10);

    return {
      totalReferrals,
      completedReferrals,
      conversionRate,
      revenueFromReferrals,
      topReferrers,
    };
  }, []);

  // Points activity over time (last 12 months) — deterministic mock data
  const pointsActivityData = useMemo(() => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const seedEarned = [
      4200, 3100, 5800, 2900, 4700, 3500, 6100, 2400, 5300, 3800, 4900, 3200,
    ];
    const seedRedeemed = [
      1800, 900, 2100, 1300, 1600, 700, 2400, 1100, 1900, 1400, 2000, 800,
    ];
    const now = new Date();
    return Array.from({ length: 12 }, (_, idx) => {
      const monthIdx = (now.getMonth() - 11 + idx + 12) % 12;
      const earned = seedEarned[idx];
      const redeemed = seedRedeemed[idx];
      return {
        month: monthNames[monthIdx],
        earned,
        redeemed,
        net: earned - redeemed,
      };
    });
  }, []);

  // Tier distribution
  const tierDistribution = useMemo(() => {
    const tiers = new Map<string, number>();
    customerLoyaltyData.forEach((customer) => {
      const current = tiers.get(customer.tier) || 0;
      tiers.set(customer.tier, current + 1);
    });

    return Array.from(tiers.entries()).map(([tier, count]) => ({
      name:
        tier.replace("tier-", "").charAt(0).toUpperCase() +
        tier.replace("tier-", "").slice(1),
      value: count,
    }));
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Check if loyalty is enabled and user has permission
  if (!isEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Program Not Enabled</CardTitle>
            <CardDescription>
              Enable the loyalty program in settings to view reports.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to view loyalty reports.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <LoyaltyModuleGuard requirePermission="reports">
      <div className="container mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Loyalty & Referral Reports</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive analytics for your loyalty program and referral
              system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 size-4" />
              {dateRange.startDate} - {dateRange.endDate}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 size-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Loyalty ROI — headline business metric */}
        <Card className="border-primary/30 from-primary/10 to-background bg-linear-to-br">
          <CardContent className="p-6">
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(0,360px)]">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Loyalty ROI · this month
                </p>
                <p className="mt-1 text-2xl font-semibold sm:text-3xl">
                  Your loyalty program generated an estimated{" "}
                  <span className="text-primary text-3xl font-bold tabular-nums sm:text-4xl">
                    {formatCurrency(roi.headlineIncrementalRevenue)}
                  </span>{" "}
                  in incremental revenue this month.
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  {roi.thisMonthRewardsCost > 0
                    ? `${roi.thisMonthRoi}% ROI · ${formatCurrency(
                        roi.thisMonthRewardsCost,
                      )} in rewards issued · vs estimated baseline spend`
                    : "No rewards issued yet this month"}
                </p>
              </div>
              <div className="h-40">
                <div className="text-muted-foreground mb-1 text-xs font-medium">
                  Monthly ROI %
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={roi.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis width={44} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value) => [`${value}%`, "ROI"]} />
                    <Line
                      type="monotone"
                      dataKey="roi"
                      stroke="#6366f1"
                      strokeWidth={2}
                      name="ROI %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program performance (this month) — deep-linked from the Loyalty banner */}
        <div className="grid gap-4 md:grid-cols-3">
          <PerfCard
            id="perf-revenue"
            active={highlightMetric === "revenue"}
            icon={DollarSign}
            tone="emerald"
            label="Revenue Retained (This Month)"
            value={`$${performance.revenueRetained.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}`}
            hint="Reward value applied this month"
          />
          <PerfCard
            id="perf-redemptions"
            active={highlightMetric === "redemptions"}
            icon={Gift}
            tone="amber"
            label="Redemption Rate (This Month)"
            value={`${Math.round(performance.redemptionRate * 100)}%`}
            hint={`${performance.membersRedeemed} of ${performance.totalMembers} members redeemed`}
          />
          <PerfCard
            id="perf-retention"
            active={highlightMetric === "retention"}
            icon={TrendingUp}
            tone="violet"
            label="Member Retention"
            value={`${Math.round(performance.memberRetention * 100)}%`}
            hint={`vs ${Math.round(
              performance.nonMemberRetention * 100,
            )}% non-members · rebooked ≤60 days`}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Points Issued */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Points Issued
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loyaltyStats.totalPointsIssued.toLocaleString()}
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <TrendingUp className="size-3 text-green-600" />
                <span>Lifetime total</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Points Redeemed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Points Redeemed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loyaltyStats.totalPointsRedeemed.toLocaleString()}
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <Gift className="size-3 text-blue-600" />
                <span>All time</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Loyalty Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Active Loyalty Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loyaltyStats.activeMembers}
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <Users className="size-3 text-purple-600" />
                <span>
                  of {loyaltyStats.totalMembers} total members (
                  {loyaltyStats.totalMembers > 0
                    ? (
                        (loyaltyStats.activeMembers /
                          loyaltyStats.totalMembers) *
                        100
                      ).toFixed(1)
                    : 0}
                  %)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Points Balance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Current Points Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loyaltyStats.currentPointsBalance.toLocaleString()}
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <Star className="size-3 text-yellow-600" />
                <span>Outstanding points</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Referral Conversion Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Referral Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatPercentage(referralStats.conversionRate)}
              </div>
              <div className="text-muted-foreground mt-2 text-sm">
                {referralStats.completedReferrals} of{" "}
                {referralStats.totalReferrals} referrals completed
              </div>
              <div className="mt-3">
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${referralStats.conversionRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue from Referrals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Revenue from Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(referralStats.revenueFromReferrals)}
              </div>
              <div className="text-muted-foreground mt-2 text-sm">
                From {referralStats.completedReferrals} completed referrals
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <ArrowUpRight className="size-3" />
                <span>From first bookings</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Referral Value */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Average Referral Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {referralStats.completedReferrals > 0
                  ? formatCurrency(
                      referralStats.revenueFromReferrals /
                        referralStats.completedReferrals,
                    )
                  : formatCurrency(0)}
              </div>
              <div className="text-muted-foreground mt-2 text-sm">
                Per completed referral
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Reports */}
        <Tabs defaultValue="points" className="space-y-4">
          <TabsList>
            <TabsTrigger value="points">Points Activity</TabsTrigger>
            <TabsTrigger value="tiers">Tier Distribution</TabsTrigger>
            <TabsTrigger value="referrals">Referral Analytics</TabsTrigger>
            <TabsTrigger value="top-referrers">Top Referrers</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
            <TabsTrigger value="reward-mix">Reward Mix</TabsTrigger>
            <TabsTrigger value="badges">Badge Performance</TabsTrigger>
            <TabsTrigger value="liability">Liability</TabsTrigger>
          </TabsList>

          {/* Points Activity Tab */}
          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Points Activity Over Time</CardTitle>
                <CardDescription>
                  Points earned vs redeemed over the last 12 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={pointsActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="earned"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Points Earned"
                    />
                    <Line
                      type="monotone"
                      dataKey="redeemed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Points Redeemed"
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Net Points"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Points Earned by Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pointsActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="earned"
                        fill="#10b981"
                        name="Points Earned"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Points Redeemed by Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pointsActivityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="redeemed"
                        fill="#ef4444"
                        name="Points Redeemed"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tier Distribution Tab */}
          <TabsContent value="tiers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tier Distribution</CardTitle>
                <CardDescription>
                  Number of customers in each loyalty tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsPieChart>
                      <Pie
                        data={tierDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {tierDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {tierDistribution.map((tier, index) => (
                      <div
                        key={tier.name}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-4 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <div>
                            <div className="font-semibold">{tier.name}</div>
                            <div className="text-muted-foreground text-sm">
                              {tier.value} members
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {loyaltyStats.totalMembers > 0
                            ? (
                                (tier.value / loyaltyStats.totalMembers) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Analytics Tab */}
          <TabsContent value="referrals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Referrals Over Time</CardTitle>
                <CardDescription>
                  Referrals sent vs completed, by week
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referralTimeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={referralTimeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sent"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Referrals Sent"
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Referrals Completed"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    No referral activity yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Referral Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          {
                            name: "Completed",
                            value: referralStats.completedReferrals,
                          },
                          {
                            name: "Pending",
                            value:
                              referralStats.totalReferrals -
                              referralStats.completedReferrals,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Referral Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Total Revenue
                      </span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(referralStats.revenueFromReferrals)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Completed Referrals
                      </span>
                      <span className="text-xl font-semibold">
                        {referralStats.completedReferrals}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Average Value
                      </span>
                      <span className="text-xl font-semibold">
                        {referralStats.completedReferrals > 0
                          ? formatCurrency(
                              referralStats.revenueFromReferrals /
                                referralStats.completedReferrals,
                            )
                          : formatCurrency(0)}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="text-muted-foreground mb-2 text-sm">
                        Conversion Rate
                      </div>
                      <div className="bg-muted h-3 w-full rounded-full">
                        <div
                          className="bg-primary flex h-3 items-center justify-end rounded-full pr-2"
                          style={{ width: `${referralStats.conversionRate}%` }}
                        >
                          <span className="text-xs font-semibold text-white">
                            {formatPercentage(referralStats.conversionRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Top Referrers Tab */}
          <TabsContent value="top-referrers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>
                  Customers who have referred the most friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referralStats.topReferrers.length > 0 ? (
                  <div className="space-y-4">
                    {referralStats.topReferrers.map((referrer, index) => (
                      <div
                        key={referrer.referrerId}
                        className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {referrer.name}
                              </span>
                              {referrer.tierName && (
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: `${referrer.tierColor ?? "#888"}22`,
                                    color: referrer.tierColor ?? undefined,
                                  }}
                                >
                                  {referrer.tierName}
                                </span>
                              )}
                            </div>
                            {referrer.email && (
                              <div className="text-muted-foreground text-sm">
                                {referrer.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">
                              Completed
                            </div>
                            <div className="text-lg font-bold">
                              {referrer.referralsCount}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">
                              Pending
                            </div>
                            <div className="text-lg font-bold text-amber-600">
                              {referrer.pendingCount}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">
                              Referral revenue
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(referrer.totalRevenue)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-xs">
                              Lifetime spend
                            </div>
                            <div className="text-lg font-bold">
                              {formatCurrency(referrer.lifetimeSpend)}
                            </div>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/facility/dashboard/clients/${referrer.referrerId}/messages?compose=${encodeURIComponent(
                                `Hi ${referrer.name.split(" ")[0]}, thank you so much for referring ${referrer.referralsCount} ${
                                  referrer.referralsCount === 1
                                    ? "friend"
                                    : "friends"
                                } to us — we truly appreciate your support! 🐾`,
                              )}`}
                            >
                              <MessageSquare className="mr-1.5 size-4" />
                              Send thank-you
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Users className="mx-auto mb-2 size-12 opacity-50" />
                    <p>No referrals yet</p>
                    <p className="mt-1 text-xs">
                      Start promoting your referral program to see top referrers
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Referrers Chart */}
            {referralStats.topReferrers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Referrers by Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={referralStats.topReferrers.slice(0, 5).map((r) => ({
                        name: r.name.split(" ")[0], // First name only for chart
                        referrals: r.referralsCount,
                        revenue: r.totalRevenue,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="referrals"
                        fill="#3b82f6"
                        name="Referrals"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="revenue"
                        fill="#10b981"
                        name="Revenue ($)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Member Lifecycle Tab */}
          <TabsContent value="lifecycle" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Member Lifecycle Funnel</CardTitle>
                <CardDescription>
                  How members progress from enrollment to active — find where
                  they drop off. Click any stage to see those customers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MemberLifecycleFunnel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reward Mix Tab */}
          <TabsContent value="reward-mix" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reward Type Breakdown</CardTitle>
                <CardDescription>
                  What customers actually redeem, and how quickly — to gauge
                  whether your reward mix drives fast repeat visits.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RewardTypeBreakdown />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badge Performance Tab */}
          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Badge Achievement Rate</CardTitle>
                <CardDescription>
                  Who earns each badge, how long it takes from their first
                  booking, and the revenue uplift after earning — to tell
                  whether each badge&apos;s condition is set at the right level.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BadgeAchievementReport />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Points Liability Tab */}
          <TabsContent value="liability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Points Liability</CardTitle>
                <CardDescription>
                  Outstanding points balance, dollar exposure if redeemed, and a
                  30/60/90-day redemption forecast for financial planning.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PointsLiabilityReport />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LoyaltyModuleGuard>
  );
}

function PerfCard({
  id,
  active,
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  id: string;
  active: boolean;
  icon: ElementType;
  tone: "emerald" | "amber" | "violet";
  label: string;
  value: string;
  hint: string;
}) {
  const toneText =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-violet-600 dark:text-violet-400";
  return (
    <div id={id} className="scroll-mt-24">
      <Card className={cn(active && "ring-primary ring-2")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <Icon className={cn("size-4", toneText)} />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("text-3xl font-bold tabular-nums", toneText)}>
            {value}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">{hint}</div>
        </CardContent>
      </Card>
    </div>
  );
}
