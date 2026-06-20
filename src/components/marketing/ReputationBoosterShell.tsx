"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  LayoutDashboard,
  List,
  Trophy,
  Globe,
  Settings2,
  Zap,
  Shield,
  TrendingUp,
  MapPin,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { reputationQueries } from "@/lib/api/reputation";
import { useReputation } from "@/hooks/use-reputation";
import { ReputationOverviewTab } from "@/components/marketing/ReputationOverviewTab";
import { ReputationRequestsTab } from "@/components/marketing/ReputationRequestsTab";
import { ReputationEscalationsTab } from "@/components/marketing/ReputationEscalationsTab";
import { ReputationMessageBuilder } from "@/components/marketing/ReputationMessageBuilder";
import { ReputationPerformanceTab } from "@/components/marketing/ReputationPerformanceTab";
import { ReputationPublicReviewsTab } from "@/components/marketing/ReputationPublicReviewsTab";
import { ReputationSettingsTab } from "@/components/marketing/ReputationSettingsTab";
import { ReputationLocationsTab } from "@/components/marketing/ReputationLocationsTab";
import { useLocationContext } from "@/hooks/use-location-context";

export function ReputationBoosterShell() {
  const [activeTab, setActiveTab] = useState("overview");
  const { isMultiLocation } = useLocationContext();
  const { settings, requests } = useReputation();
  const { data: stats } = useQuery(reputationQueries.stats());

  const escalatedCount = requests.filter((r) => r.escalatedToManager).length;
  const openEscalations = requests.filter(
    (r) => r.escalatedToManager && r.status !== "closed",
  ).length;
  const isEnabled = settings.enabled;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Reputation Booster
            </h1>
            <Badge
              variant={isEnabled ? "default" : "secondary"}
              className={`gap-1 ${isEnabled ? "border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : ""}`}
            >
              <Zap className="h-3 w-3" />
              {isEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Capture every rating inside Yipyy before it goes public. Push happy
            clients to Google, Facebook, and Yelp — keep negative experiences
            private and resolved.
          </p>
        </div>

        {/* Quick stats strip */}
        {stats && (
          <div className="bg-muted/30 flex shrink-0 items-center gap-4 rounded-xl border px-4 py-3">
            <div className="text-center">
              <p className="text-muted-foreground text-xs leading-none">
                Avg Rating
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold">
                  {stats.averageRating.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="bg-border h-8 w-px" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs leading-none">
                Response Rate
              </p>
              <div className="mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-lg font-bold">{stats.responseRate}%</span>
              </div>
            </div>
            <div className="bg-border h-8 w-px" />
            <div className="text-center">
              <p className="text-muted-foreground text-xs leading-none">
                5-Star %
              </p>
              <div className="mt-1 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-lg font-bold">
                  {stats.fiveStarPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10 gap-1">
          <TabsTrigger value="overview" className="gap-2 px-3 text-sm">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative gap-2 px-3 text-sm">
            <List className="h-4 w-4" />
            Requests
            {escalatedCount > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {escalatedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="escalations"
            className="relative gap-2 px-3 text-sm"
          >
            <AlertTriangle className="h-4 w-4" />
            Escalations
            {openEscalations > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {openEscalations}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2 px-3 text-sm">
            <Trophy className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="public-reviews" className="gap-2 px-3 text-sm">
            <Globe className="h-4 w-4" />
            Public Reviews
          </TabsTrigger>
          {isMultiLocation && (
            <TabsTrigger value="locations" className="gap-2 px-3 text-sm">
              <MapPin className="h-4 w-4" />
              Locations
            </TabsTrigger>
          )}
          <TabsTrigger value="messages" className="gap-2 px-3 text-sm">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-3 text-sm">
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

        <TabsContent value="escalations" className="mt-6">
          <ReputationEscalationsTab />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <ReputationPerformanceTab />
        </TabsContent>

        <TabsContent value="public-reviews" className="mt-6">
          <ReputationPublicReviewsTab />
        </TabsContent>

        {isMultiLocation && (
          <TabsContent value="locations" className="mt-6">
            <ReputationLocationsTab />
          </TabsContent>
        )}

        <TabsContent value="messages" className="mt-6">
          <ReputationMessageBuilder />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ReputationSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
