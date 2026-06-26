"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  tenantModuleConfigs,
  type TenantModuleConfig,
} from "@/data/feature-toggles";
import {
  resolved,
  setTenantModule,
  usePlatformFlags,
} from "@/lib/platform-flags-store";
import { ModuleToggleList } from "./module-toggle-list";
import {
  formatDate,
  MODULE_CATALOG,
  type ModuleToggleItem,
  TIER_BADGE,
  tierDefaultModuleIds,
  tierName,
  TOTAL_MODULES,
} from "./flags-utils";

export function TenantModulesTab() {
  const overrides = usePlatformFlags();
  const [selected, setSelected] = useState<TenantModuleConfig | null>(null);

  const enabledCount = (config: TenantModuleConfig) =>
    MODULE_CATALOG.filter((m) =>
      resolved(
        overrides.tenantModules,
        `${config.tenantId}:${m.id}`,
        config.enabledModules.includes(m.id),
      ),
    ).length;

  const overrideCount = (config: TenantModuleConfig) => {
    const defaults = tierDefaultModuleIds(config.subscriptionTier);
    return MODULE_CATALOG.filter((m) => {
      const enabled = resolved(
        overrides.tenantModules,
        `${config.tenantId}:${m.id}`,
        config.enabledModules.includes(m.id),
      );
      return enabled !== defaults.has(m.id);
    }).length;
  };

  const columns: ColumnDef<TenantModuleConfig>[] = [
    {
      key: "tenantName",
      label: "Tenant",
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-medium">{c.tenantName}</p>
          <p className="text-muted-foreground text-xs">{c.tenantId}</p>
        </div>
      ),
    },
    {
      key: "subscriptionTier",
      label: "Tier",
      sortable: true,
      render: (c) => (
        <Badge variant="outline" className={cn(TIER_BADGE[c.subscriptionTier])}>
          {tierName(c.subscriptionTier)}
        </Badge>
      ),
    },
    {
      key: "enabledModules",
      label: "Enabled Modules",
      sortable: true,
      sortValue: (c) => enabledCount(c),
      render: (c) => (
        <span className="tabular-nums">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {enabledCount(c)}
          </span>
          <span className="text-muted-foreground">/{TOTAL_MODULES}</span>
        </span>
      ),
    },
    {
      key: "overrides",
      label: "Overrides",
      sortable: true,
      sortValue: (c) => overrideCount(c),
      render: (c) => {
        const n = overrideCount(c);
        return n > 0 ? (
          <Badge
            variant="outline"
            className="border-amber-400/60 text-amber-700 dark:text-amber-300"
          >
            {n} active
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        );
      },
    },
    {
      key: "lastUpdated",
      label: "Last Updated",
      sortable: true,
      sortValue: (c) => c.lastUpdated,
      render: (c) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(c.lastUpdated)}
        </span>
      ),
    },
  ];

  const items: ModuleToggleItem[] = useMemo(() => {
    if (!selected) return [];
    const defaults = tierDefaultModuleIds(selected.subscriptionTier);
    return MODULE_CATALOG.map((m) => {
      const enabled = resolved(
        overrides.tenantModules,
        `${selected.tenantId}:${m.id}`,
        selected.enabledModules.includes(m.id),
      );
      const tierIncluded = defaults.has(m.id);
      return {
        moduleId: m.id,
        name: m.name,
        category: m.category,
        enabled,
        tierIncluded,
        override: enabled !== tierIncluded,
      };
    });
  }, [selected, overrides]);

  return (
    <>
      <DataTable
        data={tenantModuleConfigs}
        columns={columns}
        searchKeys={["tenantName", "tenantId"]}
        searchPlaceholder="Search tenant…"
        itemsPerPage={10}
        onRowClick={(c) => setSelected(c)}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-lg"
        >
          {selected && (
            <>
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2">
                  {selected.tenantName}
                  <Badge
                    variant="outline"
                    className={cn(TIER_BADGE[selected.subscriptionTier])}
                  >
                    {tierName(selected.subscriptionTier)}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {enabledCount(selected)} of {TOTAL_MODULES} modules enabled ·
                  last updated {formatDate(selected.lastUpdated)} by{" "}
                  {selected.updatedBy}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <ModuleToggleList
                  items={items}
                  onToggle={(moduleId, enabled) => {
                    const mod = MODULE_CATALOG.find((m) => m.id === moduleId);
                    const name = mod?.name ?? "Module";
                    setTenantModule(
                      selected.tenantId,
                      moduleId,
                      enabled,
                      `${name} · ${selected.tenantName}`,
                    );
                    toast.success(
                      `${name} ${enabled ? "enabled" : "disabled"} for ${selected.tenantName}`,
                    );
                  }}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
