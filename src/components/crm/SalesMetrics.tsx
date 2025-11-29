"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trend.value}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progress}% of target
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface SalesMetricsData {
  totalLeads: number;
  newLeadsThisMonth: number;
  conversionRate: number;
  conversionRateTrend: number;
  avgDealSize: number;
  avgDealSizeTrend: number;
  avgTimeToClose: number;
  winLossRatio: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  revenueTarget: number;
  currentRevenue: number;
}

interface SalesMetricsProps {
  data: SalesMetricsData;
}

export function SalesMetrics({ data }: SalesMetricsProps) {
  const revenueProgress = Math.round(
    (data.currentRevenue / data.revenueTarget) * 100,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Leads in Pipeline"
        value={data.totalLeads}
        subtitle={`+${data.newLeadsThisMonth} new this month`}
        icon={<Users className="h-4 w-4" />}
      />
      <MetricCard
        title="Conversion Rate"
        value={`${data.conversionRate}%`}
        subtitle="Leads to customers"
        icon={<TrendingUp className="h-4 w-4" />}
        trend={{
          value: Math.abs(data.conversionRateTrend),
          isPositive: data.conversionRateTrend >= 0,
        }}
      />
      <MetricCard
        title="Average Deal Size"
        value={`$${data.avgDealSize.toLocaleString()}`}
        subtitle="Per closed deal"
        icon={<DollarSign className="h-4 w-4" />}
        trend={{
          value: Math.abs(data.avgDealSizeTrend),
          isPositive: data.avgDealSizeTrend >= 0,
        }}
      />
      <MetricCard
        title="Avg. Time to Close"
        value={`${data.avgTimeToClose} days`}
        subtitle="From lead to customer"
        icon={<Clock className="h-4 w-4" />}
      />
      <MetricCard
        title="Win/Loss Ratio"
        value={data.winLossRatio.toFixed(2)}
        subtitle="Closed won vs. closed lost"
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard
        title="Total Pipeline Value"
        value={`$${data.totalPipelineValue.toLocaleString()}`}
        subtitle="All active opportunities"
        icon={<BarChart3 className="h-4 w-4" />}
      />
      <MetricCard
        title="Weighted Pipeline"
        value={`$${data.weightedPipelineValue.toLocaleString()}`}
        subtitle="Probability-adjusted value"
        icon={<DollarSign className="h-4 w-4" />}
      />
      <MetricCard
        title="Revenue Forecast"
        value={`$${data.currentRevenue.toLocaleString()}`}
        subtitle={`Target: $${data.revenueTarget.toLocaleString()}`}
        icon={<TrendingUp className="h-4 w-4" />}
        progress={revenueProgress}
      />
    </div>
  );
}
