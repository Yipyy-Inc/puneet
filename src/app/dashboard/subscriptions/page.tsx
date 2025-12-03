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
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b">
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
        <nav className="px-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                  "hover:bg-muted/50",
                  isActive
                    ? "bg-background border-b-2 border-primary text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
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
