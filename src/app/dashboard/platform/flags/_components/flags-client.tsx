"use client";

import { useState } from "react";
import {
  Building2,
  Flag,
  History,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantModulesTab } from "./tenant-modules-tab";
import { GlobalFlagsTab } from "./global-flags-tab";
import { TierDefaultsTab } from "./tier-defaults-tab";
import { PerFacilityTab } from "./per-facility-tab";
import { ChangeHistoryTab } from "./change-history-tab";

export function FlagsClient() {
  const [tab, setTab] = useState("tenants");

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
        <p className="text-muted-foreground text-sm">
          Manage tenant modules, platform-wide flags, tier defaults, and
          per-facility overrides.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="tenants" className="gap-2">
            <Building2 className="size-4" />
            Tenant Modules
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            <Flag className="size-4" />
            Global Flags
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-2">
            <Layers className="size-4" />
            Tier Defaults
          </TabsTrigger>
          <TabsTrigger value="facility" className="gap-2">
            <SlidersHorizontal className="size-4" />
            Per-Facility Overrides
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-4" />
            Change History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          <TenantModulesTab />
        </TabsContent>
        <TabsContent value="global" className="mt-4">
          <GlobalFlagsTab />
        </TabsContent>
        <TabsContent value="tiers" className="mt-4">
          <TierDefaultsTab />
        </TabsContent>
        <TabsContent value="facility" className="mt-4">
          <PerFacilityTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ChangeHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
