"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Activity,
  Building2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { SalesMetrics, SalesMetricsData } from "@/components/crm/SalesMetrics";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { ConversionFunnel } from "@/components/crm/ConversionFunnel";
import { LeadCard } from "@/components/crm/LeadCard";
import {
  leads,
  pipelineStageLabels,
  pipelineStageColors,
  getLeadsCountByStage,
  getTotalPipelineValue,
  getWeightedPipelineValue,
} from "@/data/crm/leads";
import {
  getRecentActivities,
  getUpcomingActivities,
} from "@/data/crm/activities";
import { salesTeamMembers, getTeamTotalRevenue } from "@/data/crm/sales-team";
import { getPendingOnboardings } from "@/data/crm/onboarding";

export default function CRMDashboardPage() {
  const [activityTab, setActivityTab] = useState<"recent" | "upcoming">(
    "recent",
  );

  // Calculate metrics
  const stageCount = getLeadsCountByStage();
  const activeLeads = leads.filter(
    (l) => l.status !== "closed_won" && l.status !== "closed_lost",
  );
  const closedWonLeads = leads.filter((l) => l.status === "closed_won");
  const closedLostLeads = leads.filter((l) => l.status === "closed_lost");
  const totalPipelineValue = getTotalPipelineValue();
  const weightedPipelineValue = getWeightedPipelineValue();
  const teamRevenue = getTeamTotalRevenue();

  // New leads this month (mock: last 30 days)
  const newLeadsThisMonth = leads.filter((l) => {
    const created = new Date(l.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created >= thirtyDaysAgo;
  }).length;

  // Conversion rate
  const totalClosedLeads = closedWonLeads.length + closedLostLeads.length;
  const conversionRate =
    totalClosedLeads > 0
      ? ((closedWonLeads.length / totalClosedLeads) * 100).toFixed(1)
      : 0;

  // Average deal size
  const avgDealSize =
    closedWonLeads.length > 0
      ? Math.round(
          closedWonLeads.reduce((sum, l) => sum + l.estimatedAnnualValue, 0) /
            closedWonLeads.length,
        )
      : 0;

  // Win/Loss ratio
  const winLossRatio =
    closedLostLeads.length > 0
      ? closedWonLeads.length / closedLostLeads.length
      : closedWonLeads.length;

  const metricsData: SalesMetricsData = {
    totalLeads: activeLeads.length,
    newLeadsThisMonth,
    conversionRate: parseFloat(conversionRate.toString()),
    conversionRateTrend: 5.2,
    avgDealSize,
    avgDealSizeTrend: 12.3,
    avgTimeToClose: 21,
    winLossRatio,
    totalPipelineValue,
    weightedPipelineValue: Math.round(weightedPipelineValue),
    revenueTarget: 500000,
    currentRevenue: teamRevenue,
  };

  const recentActivities = getRecentActivities(5);
  const upcomingActivities = getUpcomingActivities(5);
  const pendingOnboardings = getPendingOnboardings();

  // Get top leads (highest value in active pipeline)
  const topLeads = [...activeLeads]
    .sort((a, b) => b.estimatedAnnualValue - a.estimatedAnnualValue)
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM Dashboard</h1>
          <p className="text-muted-foreground">
            Manage leads, track deals, and grow your customer base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/crm/leads">
              <Users className="h-4 w-4 mr-2" />
              View All Leads
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/crm/leads?action=new">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* Sales Metrics */}
      <SalesMetrics data={metricsData} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Pipeline Overview & Funnel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline Stage Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pipeline Overview</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/leads">
                  View Pipeline
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {(
                  [
                    "new_lead",
                    "contacted",
                    "demo_scheduled",
                    "demo_completed",
                    "proposal_sent",
                    "negotiation",
                    "closed_won",
                    "closed_lost",
                  ] as const
                ).map((stage) => (
                  <div
                    key={stage}
                    className="text-center p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${pipelineStageColors[stage]}`}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {pipelineStageLabels[stage]}
                      </span>
                    </div>
                    <div className="text-xl font-bold">{stageCount[stage]}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <ConversionFunnel leads={leads} />

          {/* Top Opportunities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Top Opportunities</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/deals">
                  View All Deals
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {topLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activities & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/crm/leads?action=new">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Lead
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/crm/activities?action=new">
                  <Activity className="h-4 w-4 mr-2" />
                  Log Activity
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/crm/contacts">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Contacts
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/dashboard/crm/reports">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Reports
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Activities</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/crm/activities">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activityTab}
                onValueChange={(v) =>
                  setActivityTab(v as "recent" | "upcoming")
                }
              >
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="recent" className="flex-1">
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="flex-1">
                    Upcoming
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="recent">
                  <ActivityTimeline
                    activities={recentActivities}
                    showFilters={false}
                    compact
                  />
                </TabsContent>
                <TabsContent value="upcoming">
                  <ActivityTimeline
                    activities={upcomingActivities}
                    showFilters={false}
                    compact
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Pending Onboardings */}
          {pendingOnboardings.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">Pending Onboardings</CardTitle>
                <Badge variant="secondary">{pendingOnboardings.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingOnboardings.slice(0, 3).map((onboarding) => {
                  const completedSteps = onboarding.steps.filter(
                    (s) => s.completed,
                  ).length;
                  const progress = Math.round(
                    (completedSteps / onboarding.steps.length) * 100,
                  );

                  return (
                    <div
                      key={onboarding.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {onboarding.facilityName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {completedSteps}/{onboarding.steps.length} steps •{" "}
                          {progress}%
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" className="w-full" size="sm" asChild>
                  <Link href="/dashboard/crm/onboarding">
                    View All Onboardings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Team Performance Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Team Performance</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/team">
                  View Team
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {salesTeamMembers
                .filter((m) => m.status === "active")
                .slice(0, 3)
                .map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                            ? "bg-gray-100 text-gray-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.performance.dealsWon} deals won
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      ${member.performance.totalRevenue.toLocaleString()}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
