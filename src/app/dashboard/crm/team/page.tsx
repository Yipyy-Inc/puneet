"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Trophy,
  Target,
  TrendingUp,
  Plus,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  TeamLeaderboard,
  MemberPerformanceCard,
} from "@/components/crm/TeamLeaderboard";
import {
  salesTeamMembers,
  teamGoals,
  getActiveTeamMembers,
  getTeamTotalRevenue,
  getTeamAvgConversionRate,
  SalesTeamMember,
} from "@/data/crm/sales-team";

const roleLabels: Record<SalesTeamMember["role"], string> = {
  sales_rep: "Sales Rep",
  sales_manager: "Sales Manager",
  account_executive: "Account Executive",
};

export default function TeamPage() {
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">(
    "monthly",
  );
  const [selectedMember, setSelectedMember] = useState<SalesTeamMember | null>(
    null,
  );

  const activeMembers = getActiveTeamMembers();
  const totalRevenue = getTeamTotalRevenue();
  const avgConversionRate = getTeamAvgConversionRate();

  const totalDealsWon = salesTeamMembers.reduce(
    (sum, m) => sum + m.performance.dealsWon,
    0,
  );
  const totalDealsLost = salesTeamMembers.reduce(
    (sum, m) => sum + m.performance.dealsLost,
    0,
  );
  const winRate =
    totalDealsWon + totalDealsLost > 0
      ? (totalDealsWon / (totalDealsWon + totalDealsLost)) * 100
      : 0;

  const avgTimeToClose =
    activeMembers.length > 0
      ? activeMembers.reduce(
          (sum, m) => sum + m.performance.avgTimeToClose,
          0,
        ) / activeMembers.length
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Team</h1>
          <p className="text-muted-foreground">
            Manage your sales team and track performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={period}
            onValueChange={(v) =>
              setPeriod(v as "monthly" | "quarterly" | "yearly")
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Team Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesTeamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeMembers.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This {period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Conversion
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgConversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Lead to customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {totalDealsWon} won / {totalDealsLost} lost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Close Time
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgTimeToClose.toFixed(0)} days
            </div>
            <p className="text-xs text-muted-foreground">Lead to close</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-6">
          <TeamLeaderboard
            members={salesTeamMembers}
            goals={teamGoals}
            period={period}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {salesTeamMembers.map((member, index) => (
              <MemberPerformanceCard
                key={member.id}
                member={member}
                rank={index + 1}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <div className="space-y-6">
            {/* Team Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamGoals
                    .filter((g) => g.assignedTo === "team")
                    .map((goal) => {
                      const progress = Math.min(
                        (goal.currentValue / goal.targetValue) * 100,
                        100,
                      );

                      const statusColors = {
                        on_track: "bg-green-100 text-green-800",
                        at_risk: "bg-yellow-100 text-yellow-800",
                        behind: "bg-red-100 text-red-800",
                        completed: "bg-blue-100 text-blue-800",
                      };

                      return (
                        <div
                          key={goal.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{goal.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {goal.description}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={statusColors[goal.status]}
                            >
                              {goal.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>
                                {goal.targetValue >= 1000
                                  ? `$${(goal.currentValue / 1000).toFixed(0)}K`
                                  : goal.currentValue}
                              </span>
                              <span className="text-muted-foreground">
                                Target:{" "}
                                {goal.targetValue >= 1000
                                  ? `$${(goal.targetValue / 1000).toFixed(0)}K`
                                  : goal.targetValue}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              {progress.toFixed(0)}% complete
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Individual Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Individual Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamGoals
                    .filter((g) => g.assignedTo !== "team")
                    .map((goal) => {
                      const member = salesTeamMembers.find(
                        (m) => m.id === goal.assignedTo,
                      );
                      const progress = Math.min(
                        (goal.currentValue / goal.targetValue) * 100,
                        100,
                      );

                      const statusColors = {
                        on_track: "bg-green-100 text-green-800",
                        at_risk: "bg-yellow-100 text-yellow-800",
                        behind: "bg-red-100 text-red-800",
                        completed: "bg-blue-100 text-blue-800",
                      };

                      return (
                        <div
                          key={goal.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {member?.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("") || "?"}
                              </div>
                              <div>
                                <h4 className="font-medium">{goal.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {member?.name || "Unknown"}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={statusColors[goal.status]}
                            >
                              {goal.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>
                                ${(goal.currentValue / 1000).toFixed(0)}K
                              </span>
                              <span className="text-muted-foreground">
                                Target: ${(goal.targetValue / 1000).toFixed(0)}K
                              </span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
