"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Medal,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { SalesTeamMember, TeamGoal } from "@/data/crm/sales-team";

interface TeamLeaderboardProps {
  members: SalesTeamMember[];
  goals?: TeamGoal[];
  period?: "monthly" | "quarterly" | "yearly";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
          <Trophy className="h-4 w-4 text-yellow-600" />
        </div>
      );
    case 2:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
          <Medal className="h-4 w-4 text-gray-500" />
        </div>
      );
    case 3:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100">
          <Medal className="h-4 w-4 text-amber-600" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium text-sm">
          {rank}
        </div>
      );
  }
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value}`;
}

const roleLabels: Record<SalesTeamMember["role"], string> = {
  sales_rep: "Sales Rep",
  sales_manager: "Sales Manager",
  account_executive: "Account Executive",
};

const statusColors: Record<SalesTeamMember["status"], string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  on_leave: "bg-yellow-100 text-yellow-800",
};

export function TeamLeaderboard({
  members,
  goals = [],
  period = "monthly",
}: TeamLeaderboardProps) {
  // Sort members by total revenue
  const sortedMembers = [...members]
    .filter((m) => m.status === "active")
    .sort((a, b) => b.performance.totalRevenue - a.performance.totalRevenue);

  const totalTeamRevenue = members.reduce(
    (sum, m) => sum + m.performance.totalRevenue,
    0,
  );

  const avgConversionRate =
    members.length > 0
      ? members.reduce((sum, m) => sum + m.performance.conversionRate, 0) /
        members.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Team Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalTeamRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">This {period}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Reps
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter((m) => m.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {members.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Conversion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
              Total Deals Won
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.reduce((sum, m) => sum + m.performance.dealsWon, 0)}
            </div>
            <p className="text-xs text-muted-foreground">This {period}</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Sales Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedMembers.map((member, index) => {
              const rank = index + 1;
              const target = member.targets[period];
              const progress = Math.min(
                (member.performance.totalRevenue / target) * 100,
                100,
              );

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    rank <= 3 ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Rank */}
                  {getRankBadge(rank)}

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{member.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {roleLabels[member.role]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex-1 max-w-[200px]">
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {progress.toFixed(0)}% of target
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">
                        {formatCurrency(member.performance.totalRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Revenue
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">
                        {member.performance.dealsWon}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Deals Won
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold flex items-center justify-center gap-1">
                        {member.performance.conversionRate}%
                        {member.performance.conversionRate >
                        avgConversionRate ? (
                          <ArrowUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Conversion
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active team members</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Goals */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Team Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals
                .filter((g) => g.assignedTo === "team")
                .map((goal) => {
                  const progress = Math.min(
                    (goal.currentValue / goal.targetValue) * 100,
                    100,
                  );

                  const statusColors = {
                    on_track: "text-green-600",
                    at_risk: "text-yellow-600",
                    behind: "text-red-600",
                    completed: "text-blue-600",
                  };

                  return (
                    <div
                      key={goal.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{goal.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {goal.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={statusColors[goal.status]}
                        >
                          {goal.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>
                            {goal.targetValue >= 1000
                              ? formatCurrency(goal.currentValue)
                              : goal.currentValue}
                          </span>
                          <span className="text-muted-foreground">
                            {goal.targetValue >= 1000
                              ? formatCurrency(goal.targetValue)
                              : goal.targetValue}{" "}
                            target
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MemberPerformanceCardProps {
  member: SalesTeamMember;
  rank?: number;
}

export function MemberPerformanceCard({
  member,
  rank,
}: MemberPerformanceCardProps) {
  const winRate =
    member.performance.dealsWon + member.performance.dealsLost > 0
      ? (member.performance.dealsWon /
          (member.performance.dealsWon + member.performance.dealsLost)) *
        100
      : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {rank && <div className="shrink-0">{getRankBadge(rank)}</div>}
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{member.name}</h4>
              <Badge
                variant="secondary"
                className={statusColors[member.status]}
              >
                {member.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {roleLabels[member.role]}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold">
              {formatCurrency(member.performance.totalRevenue)}
            </div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold">
              {formatCurrency(member.performance.avgDealSize)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Deal Size</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {member.performance.dealsWon}
            </div>
            <div className="text-xs text-muted-foreground">Deals Won</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold">{winRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Conversion Rate</span>
            <span className="font-medium">
              {member.performance.conversionRate}%
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Avg Time to Close</span>
            <span className="font-medium">
              {member.performance.avgTimeToClose} days
            </span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Active Leads</span>
            <span className="font-medium">{member.currentLeads.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
