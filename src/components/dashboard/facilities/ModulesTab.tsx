"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Users,
  UserCheck,
  CreditCard,
  MessageSquare,
  GraduationCap,
  Scissors,
  Package,
  Puzzle,
  Edit,
  CheckCircle,
} from "lucide-react";
import { availableModules } from "@/data/facilities";
import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { subscriptionTiers } from "@/data/subscription-tiers";
import { cn } from "@/lib/utils";

interface ModuleUsageData {
  usage: string;
  lastUsed: string;
  actions: number;
}

export interface ModuleConfig {
  enabledModules: string[];
  priceOverrides: Record<string, number>;
}

interface ModulesTabProps {
  facilityId: number;
  facilityName: string;
  enabledModules: string[];
  priceOverrides: Record<string, number>;
  moduleUsageData: Record<string, ModuleUsageData>;
  getModulePrice: (moduleId: string) => number;
  hasCustomPrice: (moduleId: string) => boolean;
  onSave: (config: ModuleConfig) => void;
}

// The Modules tab uses short ids (booking, scheduling…); the subscription tier
// model uses long ids (module-booking…). Bridge them to know what's included.
const SHORT_TO_LONG: Record<string, string> = {
  booking: "module-booking",
  scheduling: "module-staff-scheduling",
  customers: "module-customer-management",
  financial: "module-financial-reporting",
  communication: "module-communication",
  training: "module-training-education",
  grooming: "module-grooming-management",
  inventory: "module-inventory-management",
};

function getTierIncludedShortIds(facilityId: number): Set<string> {
  const sub = facilitySubscriptions.find((s) => s.facilityId === facilityId);
  const tier = sub
    ? subscriptionTiers.find((t) => t.id === sub.tierId)
    : undefined;
  const includedLong = new Set(tier?.availableModules ?? []);
  const out = new Set<string>();
  for (const [short, long] of Object.entries(SHORT_TO_LONG)) {
    if (includedLong.has(long)) out.add(short);
  }
  return out;
}

const getModuleIcon = (iconName: string) => {
  switch (iconName) {
    case "Calendar":
      return Calendar;
    case "Users":
      return Users;
    case "UserCheck":
      return UserCheck;
    case "CreditCard":
      return CreditCard;
    case "MessageSquare":
      return MessageSquare;
    case "GraduationCap":
      return GraduationCap;
    case "Scissors":
      return Scissors;
    case "Package":
      return Package;
    default:
      return Puzzle;
  }
};

export function ModulesTab({
  facilityId,
  facilityName,
  enabledModules,
  priceOverrides,
  moduleUsageData,
  getModulePrice,
  hasCustomPrice,
  onSave,
}: ModulesTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState<Set<string>>(
    () => new Set(enabledModules),
  );
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});

  const tierIncluded = useMemo(
    () => getTierIncludedShortIds(facilityId),
    [facilityId],
  );

  const openDrawer = () => {
    setDraftEnabled(new Set(enabledModules));
    setDraftPrices(
      Object.fromEntries(
        Object.entries(priceOverrides).map(([k, v]) => [k, String(v)]),
      ),
    );
    setDrawerOpen(true);
  };

  const toggleDraft = (id: string) =>
    setDraftEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setDraftPrice = (id: string, val: string) =>
    setDraftPrices((prev) => ({ ...prev, [id]: val }));

  const handleSave = () => {
    const overrides: Record<string, number> = {};
    for (const [id, str] of Object.entries(draftPrices)) {
      const t = str.trim();
      if (t === "") continue;
      const n = Number(t);
      if (!Number.isNaN(n) && n >= 0) overrides[id] = n;
    }
    onSave({ enabledModules: [...draftEnabled], priceOverrides: overrides });
    setDrawerOpen(false);
  };

  const draftMonthlyCost = [...draftEnabled].reduce((sum, id) => {
    const override = draftPrices[id]?.trim();
    if (override && override !== "") {
      const n = Number(override);
      if (!Number.isNaN(n)) return sum + n;
    }
    return sum + getModulePrice(id);
  }, 0);

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Puzzle className="size-5" />
          Enabled Modules
        </CardTitle>
        <Button variant="outline" size="sm" onClick={openDrawer}>
          <Edit className="mr-2 size-4" />
          Manage Modules
        </Button>
      </CardHeader>
      <CardContent>
        {enabledModules.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {availableModules
              .filter((m) => enabledModules.includes(m.id))
              .map((module) => {
                const Icon = getModuleIcon(module.icon);
                const usage = moduleUsageData[module.id];
                return (
                  <div
                    key={module.id}
                    className="bg-muted/50 hover:bg-muted rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex size-10 items-center justify-center rounded-xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        }}
                      >
                        <Icon className="size-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{module.name}</h4>
                          <span className="text-primary text-xs font-semibold">
                            ${getModulePrice(module.id).toFixed(2)}/mo
                          </span>
                          {hasCustomPrice(module.id) && (
                            <Badge
                              variant="secondary"
                              className="px-1.5 py-0 text-[10px]"
                            >
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    {usage && (
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                        <div>
                          <p className="text-muted-foreground text-xs">Usage</p>
                          <p className="text-sm font-semibold">
                            {usage.usage.split(" ")[0]}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {usage.usage.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Actions
                          </p>
                          <p className="text-sm font-semibold">
                            {usage.actions}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            this month
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Last Used
                          </p>
                          <p className="text-sm font-semibold">
                            {usage.lastUsed.split(" ")[0]}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {usage.lastUsed.split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                      </div>
                    )}
                    {!usage && (
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                        {["Usage", "Actions", "Last Used"].map((l) => (
                          <div key={l} className="space-y-1">
                            <p className="text-muted-foreground text-xs">{l}</p>
                            <Skeleton className="mx-auto h-4 w-10" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Puzzle className="text-muted-foreground mx-auto mb-3 size-12" />
            <p className="text-muted-foreground">No modules enabled</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={openDrawer}
            >
              Enable Modules
            </Button>
          </div>
        )}
      </CardContent>

      {/* Manage Modules drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b">
            <SheetTitle>Manage Modules</SheetTitle>
            <SheetDescription>
              Enable or disable modules for {facilityName}, and set a custom
              price (blank uses the tier default). Changes apply on save.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {availableModules.map((module) => {
              const Icon = getModuleIcon(module.icon);
              const enabled = draftEnabled.has(module.id);
              const isTierIncluded = tierIncluded.has(module.id);
              const priceStr = draftPrices[module.id] ?? "";
              const overridden = priceStr.trim() !== "";
              return (
                <div
                  key={module.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    enabled ? "border-primary/30 bg-primary/5" : "bg-muted/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        enabled ? "bg-primary/10" : "bg-muted",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5",
                          enabled ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="text-sm font-medium">{module.name}</h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0 text-[10px] font-normal",
                            isTierIncluded
                              ? "border-emerald-200 text-emerald-700 dark:text-emerald-300"
                              : "border-violet-200 text-violet-700 dark:text-violet-300",
                          )}
                        >
                          {isTierIncluded ? "Tier-included" : "Add-on"}
                        </Badge>
                        {overridden && (
                          <Badge
                            variant="secondary"
                            className="px-1.5 py-0 text-[10px]"
                          >
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {module.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative">
                          <span className="text-muted-foreground absolute top-1/2 left-2 -translate-y-1/2 text-xs">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            aria-label={`${module.name} price override`}
                            placeholder={module.basePrice.toFixed(2)}
                            className="h-8 w-28 pl-5 text-sm"
                            value={priceStr}
                            onChange={(e) =>
                              setDraftPrice(module.id, e.target.value)
                            }
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          /mo{" "}
                          {overridden
                            ? "(custom)"
                            : `· tier default $${module.basePrice.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleDraft(module.id)}
                      aria-label={`Toggle ${module.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <SheetFooter className="border-t">
            <div className="mr-auto flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-emerald-500" />
                {draftEnabled.size} of {availableModules.length} modules enabled
              </span>
              <span className="text-muted-foreground">
                Modules cost:{" "}
                <span className="text-foreground font-semibold">
                  ${draftMonthlyCost.toFixed(2)}/mo
                </span>
              </span>
            </div>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
