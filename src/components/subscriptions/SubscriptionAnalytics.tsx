"use client";

import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";
import { modules } from "@/data/modules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Package,
  Target,
  Activity,
} from "lucide-react";

export function SubscriptionAnalytics() {
  // Calculate key metrics
  const totalSubscriptions = facilitySubscriptions.length;
  const activeSubscriptions = facilitySubscriptions.filter(
    (sub) => sub.status === "active",
  ).length;
  const trialSubscriptions = facilitySubscriptions.filter(
    (sub) => sub.status === "trial",
  ).length;

  // Calculate MRR (Monthly Recurring Revenue)
  const totalMRR = facilitySubscriptions.reduce((sum, sub) => {
    if (sub.status === "active") {
      if (sub.billingCycle === "monthly") {
        return sum + sub.billing.totalCost;
      } else if (sub.billingCycle === "quarterly") {
        return sum + sub.billing.totalCost / 3;
      } else if (sub.billingCycle === "yearly") {
        return sum + sub.billing.totalCost / 12;
      }
    }
    return sum;
  }, 0);

  // Calculate ARR (Annual Recurring Revenue)
  const totalARR = totalMRR * 12;

  // Distribution by tier
  const tierDistribution = subscriptionTiers.map((tier) => ({
    tier: tier.name,
    count: facilitySubscriptions.filter((sub) => sub.tierId === tier.id).length,
  }));

  // Most popular modules
  const moduleUsage = modules.map((module) => ({
    module: module.name,
    count: facilitySubscriptions.filter((sub) =>
      sub.enabledModules.includes(module.id),
    ).length,
  }));
  const topModules = moduleUsage.sort((a, b) => b.count - a.count).slice(0, 5);

  // Identify upsell opportunities (facilities using >80% of their tier limits)
  const upsellOpportunities = facilitySubscriptions.filter((sub) => {
    if (sub.status !== "active") return false;

    const tier = subscriptionTiers.find((t) => t.id === sub.tierId);
    if (!tier) return false;

    const userUsagePercent =
      tier.limitations.maxUsers === -1
        ? 0
        : (sub.usage.currentUsers / tier.limitations.maxUsers) * 100;

    return userUsagePercent > 80;
  }).length;

  // Expiring soon (within 30 days)
  const today = new Date();
  const expiringSoon = facilitySubscriptions.filter((sub) => {
    const endDate = new Date(sub.endDate);
    const daysUntilEnd = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilEnd <= 30 && daysUntilEnd > 0 && sub.status === "active";
  }).length;

  // Churn risk (suspended or not auto-renewing)
  const churnRisk = facilitySubscriptions.filter(
    (sub) => sub.status === "suspended" || !sub.autoRenew,
  ).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscriptions
            </CardTitle>
            <Building className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-muted-foreground text-xs">
              {activeSubscriptions} active · {trialSubscriptions} trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
            <p className="text-muted-foreground text-xs">
              {formatCurrency(totalARR)} ARR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upsell Opportunities
            </CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upsellOpportunities}</div>
            <p className="text-muted-foreground text-xs">
              High usage facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnRisk}</div>
            <p className="text-muted-foreground text-xs">
              {expiringSoon} expiring soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Distribution by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tierDistribution.map((item) => (
                <div
                  key={item.tier}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="text-muted-foreground size-4" />
                    <span className="text-sm font-medium">{item.tier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.count}</Badge>
                    <span className="text-muted-foreground text-sm">
                      {totalSubscriptions > 0
                        ? `${Math.round((item.count / totalSubscriptions) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Popular Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              Most Popular Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topModules.map((item) => (
                <div
                  key={item.module}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Target className="text-muted-foreground size-4" />
                    <span className="text-sm font-medium">{item.module}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.count}</Badge>
                    <span className="text-muted-foreground text-sm">
                      {activeSubscriptions > 0
                        ? `${Math.round((item.count / activeSubscriptions) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upsellOpportunities > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-blue-500/10 p-3">
                <TrendingUp className="mt-0.5 size-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Upsell Opportunity</p>
                  <p className="text-muted-foreground text-sm">
                    {upsellOpportunities} facilities are using over 80% of their
                    tier limits. Consider reaching out for an upgrade.
                  </p>
                </div>
              </div>
            )}

            {expiringSoon > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-orange-500/10 p-3">
                <AlertTriangle className="mt-0.5 size-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Expiring Subscriptions</p>
                  <p className="text-muted-foreground text-sm">
                    {expiringSoon} subscriptions are expiring within 30 days.
                    Follow up to ensure renewals.
                  </p>
                </div>
              </div>
            )}

            {trialSubscriptions > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-purple-500/10 p-3">
                <Users className="mt-0.5 size-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Active Trials</p>
                  <p className="text-muted-foreground text-sm">
                    {trialSubscriptions} facilities are currently on trial.
                    Monitor their usage and engage before trial ends.
                  </p>
                </div>
              </div>
            )}

            {churnRisk > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-red-500/10 p-3">
                <AlertTriangle className="mt-0.5 size-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Churn Risk</p>
                  <p className="text-muted-foreground text-sm">
                    {churnRisk} subscriptions are at risk (suspended or not
                    auto-renewing). Immediate action required.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
