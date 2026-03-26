"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { referralRelationships } from "@/data/referral-tracking";
import { customerLoyaltyData } from "@/data/marketing";
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

// Mock facility ID - TODO: Get from context
const MOCK_FACILITY_ID = 1;

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
        return {
          referrerId,
          name: customer?.name || `Customer #${referrerId}`,
          email: customer?.email,
          referralsCount: count,
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
                        className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-semibold">{referrer.name}</div>
                            {referrer.email && (
                              <div className="text-muted-foreground text-sm">
                                {referrer.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">
                              Referrals
                            </div>
                            <div className="text-lg font-bold">
                              {referrer.referralsCount}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-muted-foreground text-sm">
                              Revenue
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(referrer.totalRevenue)}
                            </div>
                          </div>
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
        </Tabs>
      </div>
    </LoyaltyModuleGuard>
  );
}
