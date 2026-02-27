"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  Gift,
  Award,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  getReferralRelationshipsByReferrer,
  getReferralStats,
  referralRelationships,
} from "@/data/referral-tracking";
import { customerLoyaltyData } from "@/data/marketing";
import { clients } from "@/data/clients";
import { invoices, payments } from "@/data/payments";
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
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

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
              You don't have permission to view loyalty reports.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate loyalty statistics
  const loyaltyStats = useMemo(() => {
    // Get all customers for this facility
    const facilityCustomers = customerLoyaltyData.filter(
      (loyalty) => loyalty.clientId // In production, filter by facilityId
    );

    // Total points issued (lifetime points)
    const totalPointsIssued = facilityCustomers.reduce(
      (sum, customer) => sum + customer.lifetimePoints,
      0
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
      (customer) => customer.points > 0
    ).length;

    // Current points balance
    const currentPointsBalance = facilityCustomers.reduce(
      (sum, customer) => sum + customer.points,
      0
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
      (rel) => rel.facilityId === MOCK_FACILITY_ID
    );

    // Total referrals
    const totalReferrals = facilityReferrals.length;

    // Completed referrals (where reward was issued)
    const completedReferrals = facilityReferrals.filter(
      (rel) => rel.referrerRewardStatus === "issued"
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
                rel.referrerRewardStatus === "issued"
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

  // Points activity over time (last 12 months)
  const pointsActivityData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      
      // Calculate points for this month (mock data - in production, query actual data)
      const earned = Math.floor(Math.random() * 5000) + 2000;
      const redeemed = Math.floor(Math.random() * 2000) + 500;
      
      months.push({
        month: monthName,
        earned,
        redeemed,
        net: earned - redeemed,
      });
    }
    return months;
  }, []);

  // Tier distribution
  const tierDistribution = useMemo(() => {
    const tiers = new Map<string, number>();
    customerLoyaltyData.forEach((customer) => {
      const current = tiers.get(customer.tier) || 0;
      tiers.set(customer.tier, current + 1);
    });

    return Array.from(tiers.entries()).map(([tier, count]) => ({
      name: tier.replace("tier-", "").charAt(0).toUpperCase() + tier.replace("tier-", "").slice(1),
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

  return (
    <LoyaltyModuleGuard requirePermission="reports">
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty & Referral Reports</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive analytics for your loyalty program and referral system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {dateRange.startDate} - {dateRange.endDate}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Points Issued */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Points Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loyaltyStats.totalPointsIssued.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>Lifetime total</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Points Redeemed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Points Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loyaltyStats.totalPointsRedeemed.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Gift className="h-3 w-3 text-blue-600" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Loyalty Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loyalty Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loyaltyStats.activeMembers}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Users className="h-3 w-3 text-purple-600" />
              <span>
                of {loyaltyStats.totalMembers} total members (
                {loyaltyStats.totalMembers > 0
                  ? ((loyaltyStats.activeMembers / loyaltyStats.totalMembers) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Current Points Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Points Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loyaltyStats.currentPointsBalance.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Star className="h-3 w-3 text-yellow-600" />
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Referral Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercentage(referralStats.conversionRate)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {referralStats.completedReferrals} of {referralStats.totalReferrals} referrals
              completed
            </div>
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue from Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(referralStats.revenueFromReferrals)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              From {referralStats.completedReferrals} completed referrals
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
              <ArrowUpRight className="h-3 w-3" />
              <span>From first bookings</span>
            </div>
          </CardContent>
        </Card>

        {/* Average Referral Value */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Referral Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {referralStats.completedReferrals > 0
                ? formatCurrency(
                    referralStats.revenueFromReferrals /
                      referralStats.completedReferrals
                  )
                : formatCurrency(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
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
                <CardTitle className="text-lg">Points Earned by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pointsActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="earned" fill="#10b981" name="Points Earned" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Points Redeemed by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pointsActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="redeemed" fill="#ef4444" name="Points Redeemed" />
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
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <div>
                          <div className="font-semibold">{tier.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {tier.value} members
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {loyaltyStats.totalMembers > 0
                          ? ((tier.value / loyaltyStats.totalMembers) * 100).toFixed(1)
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
                    <span className="text-sm text-muted-foreground">
                      Total Revenue
                    </span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(referralStats.revenueFromReferrals)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Completed Referrals
                    </span>
                    <span className="text-xl font-semibold">
                      {referralStats.completedReferrals}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Average Value
                    </span>
                    <span className="text-xl font-semibold">
                      {referralStats.completedReferrals > 0
                        ? formatCurrency(
                            referralStats.revenueFromReferrals /
                              referralStats.completedReferrals
                          )
                        : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">
                      Conversion Rate
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${referralStats.conversionRate}%` }}
                      >
                        <span className="text-xs text-white font-semibold">
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
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{referrer.name}</div>
                          {referrer.email && (
                            <div className="text-sm text-muted-foreground">
                              {referrer.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Referrals
                          </div>
                          <div className="text-lg font-bold">
                            {referrer.referralsCount}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
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
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-xs mt-1">
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
