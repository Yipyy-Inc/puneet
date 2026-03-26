"use client";

import { useState } from "react";
import { SubscriptionAnalytics } from "@/components/subscriptions/SubscriptionAnalytics";
import { FacilitySubscriptionsTable } from "@/components/subscriptions/FacilitySubscriptionsTable";
import { SubscriptionTiersGrid } from "@/components/subscriptions/SubscriptionTiersGrid";
import { ModulesManagement } from "@/components/subscriptions/ModulesManagement";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Building2, Layers, Puzzle } from "lucide-react";

const tabs = [
  {
    id: "overview",
    name: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "subscriptions",
    name: "Facility Subscriptions",
    icon: Building2,
  },
  {
    id: "tiers",
    name: "Subscription Tiers",
    icon: Layers,
  },
  {
    id: "modules",
    name: "Modules",
    icon: Puzzle,
  },
];

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <SubscriptionAnalytics />;
      case "subscriptions":
        return <FacilitySubscriptionsTable />;
      case "tiers":
        return <SubscriptionTiersGrid />;
      case "modules":
        return <ModulesManagement />;
      default:
        return <SubscriptionAnalytics />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted/50 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Subscription & Module Management
            </h1>
            <p className="text-muted-foreground">
              Manage subscription tiers, modules, and facility subscriptions
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  `flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors`,
                  "hover:bg-muted/50",
                  isActive
                    ? "border-primary bg-background text-primary border-b-2"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">{renderTabContent()}</div>
    </div>
  );
}
