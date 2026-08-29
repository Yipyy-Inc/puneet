"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  LayoutDashboard,
  List,
  Globe,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { ReputationAnalyticsTab } from "@/components/marketing/ReputationAnalyticsTab";
import { ReputationRequestsTab } from "@/components/marketing/ReputationRequestsTab";
import { ReputationEscalationsTab } from "@/components/marketing/ReputationEscalationsTab";
import { ReputationPublicReviewsTab } from "@/components/marketing/ReputationPublicReviewsTab";
import { ReputationSettingsTab } from "@/components/marketing/ReputationSettingsTab";

export function ReputationBoosterShell() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500 shadow-sm">
              <Star className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Reputation Booster
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Ask every client for a review, send happy ones to Google and
            Facebook, and route unhappy ones to a manager before they leave.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-10 gap-1">
          <TabsTrigger value="overview" className="gap-2 px-3 text-sm">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 px-3 text-sm">
            <List className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="escalations" className="gap-2 px-3 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Escalations
          </TabsTrigger>
          <TabsTrigger value="public-reviews" className="gap-2 px-3 text-sm">
            <Globe className="h-4 w-4" />
            Booking page reviews
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-3 text-sm">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ReputationAnalyticsTab />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <ReputationRequestsTab />
        </TabsContent>

        <TabsContent value="escalations" className="mt-6">
          <ReputationEscalationsTab />
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
