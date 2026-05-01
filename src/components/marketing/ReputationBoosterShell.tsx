"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  LayoutDashboard,
  List,
  Trophy,
  Globe,
  Settings2,
  Zap,
  Send,
  Shield,
  TrendingUp,
} from "lucide-react";
import { reputationQueries } from "@/lib/api/reputation";
import { ReputationOverviewTab } from "@/components/marketing/ReputationOverviewTab";
import { ReputationRequestsTab } from "@/components/marketing/ReputationRequestsTab";
import { ReputationPerformanceTab } from "@/components/marketing/ReputationPerformanceTab";
import { ReputationPublicReviewsTab } from "@/components/marketing/ReputationPublicReviewsTab";
import { ReputationSettingsTab } from "@/components/marketing/ReputationSettingsTab";

export function ReputationBoosterShell() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: settings } = useQuery(reputationQueries.settings());
  const { data: stats } = useQuery(reputationQueries.stats());
  const { data: requests = [] } = useQuery(reputationQueries.requests());

  const escalatedCount = requests.filter((r) => r.escalatedToManager).length;
  const isEnabled = settings?.enabled ?? false;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Reputation Booster</h1>
            <Badge
              variant={isEnabled ? "default" : "secondary"}
              className={`gap-1 ${isEnabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0" : ""}`}
            >
              <Zap className="h-3 w-3" />
              {isEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Capture every rating inside Yipyy before it goes public. Push happy clients to Google, Facebook, and Yelp — keep negative experiences private and resolved.
          </p>
        </div>

        {/* Quick stats strip */}
        {stats && (
          <div className="flex items-center gap-4 rounded-xl border bg-muted/30 px-4 py-3 shrink-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground leading-none">Avg Rating</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold">{stats.averageRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground leading-none">Response Rate</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-lg font-bold">{stats.responseRate}%</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground leading-none">5-Star %</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-lg font-bold">{stats.fiveStarPercentage}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10 gap-1">
          <TabsTrigger value="overview" className="gap-2 text-sm px-3">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 text-sm px-3 relative">
            <List className="h-4 w-4" />
            Requests
            {escalatedCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {escalatedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2 text-sm px-3">
            <Trophy className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="public-reviews" className="gap-2 text-sm px-3">
            <Globe className="h-4 w-4" />
            Public Reviews
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 text-sm px-3">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ReputationOverviewTab onTabChange={setActiveTab} />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <ReputationRequestsTab />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <ReputationPerformanceTab />
        </TabsContent>

        <TabsContent value="public-reviews" className="mt-6">
          <ReputationPublicReviewsTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ReputationSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
