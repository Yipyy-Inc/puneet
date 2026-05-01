"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bed,
  Sun,
  Scissors,
  GraduationCap,
  Clock,
  Crown,
  Package,
  Users,
  CalendarCheck,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  CameraRuleSet,
  CameraAccessRule,
  CameraServiceType,
  PetCamAccessConfig,
} from "@/types/camera-integration";
import { membershipPlans, servicePackages } from "@/data/services-pricing";
import type { PetCam } from "@/data/additional-features";
import { cn } from "@/lib/utils";

interface CameraAccessRulesDialogProps {
  camera: PetCam;
  accessConfig: PetCamAccessConfig;
  globalRuleSet: CameraRuleSet;
  open: boolean;
  onClose: () => void;
  onSave: (config: PetCamAccessConfig) => void;
}

const SERVICE_OPTIONS: { value: CameraServiceType; label: string; icon: React.ElementType }[] = [
  { value: "boarding", label: "Boarding", icon: Bed },
  { value: "daycare", label: "Daycare", icon: Sun },
  { value: "grooming", label: "Grooming", icon: Scissors },
  { value: "training", label: "Training", icon: GraduationCap },
];

type RuleKey = "active_stay" | "operation_hours" | "membership" | "package" | "service_customer";

interface RuleState {
  active_stay: { enabled: boolean; services: CameraServiceType[] };
  operation_hours: { enabled: boolean };
  membership: { enabled: boolean; planIds: string[] };
  package: { enabled: boolean; packageIds: string[] };
  service_customer: { enabled: boolean; services: CameraServiceType[] };
}

function ruleSetToState(ruleSet: CameraRuleSet | undefined): RuleState {
  const defaults: RuleState = {
    active_stay: { enabled: false, services: ["boarding", "daycare"] },
    operation_hours: { enabled: false },
    membership: { enabled: false, planIds: [] },
    package: { enabled: false, packageIds: [] },
    service_customer: { enabled: false, services: [] },
  };
  if (!ruleSet) return defaults;

  for (const rule of ruleSet.rules) {
    if (rule.type === "active_stay") {
      defaults.active_stay = { enabled: true, services: rule.services };
    } else if (rule.type === "operation_hours") {
      defaults.operation_hours = { enabled: true };
    } else if (rule.type === "membership") {
      defaults.membership = { enabled: true, planIds: rule.membershipPlanIds };
    } else if (rule.type === "package") {
      defaults.package = { enabled: true, packageIds: rule.packageIds };
    } else if (rule.type === "service_customer") {
      defaults.service_customer = { enabled: true, services: rule.services };
    }
  }
  return defaults;
}

function stateToRuleSet(state: RuleState, logic: "any" | "all"): CameraRuleSet {
  const rules: CameraAccessRule[] = [];
  if (state.active_stay.enabled) {
    rules.push({ type: "active_stay", services: state.active_stay.services });
  }
  if (state.operation_hours.enabled) {
    rules.push({ type: "operation_hours" });
  }
  if (state.membership.enabled && state.membership.planIds.length > 0) {
    rules.push({ type: "membership", membershipPlanIds: state.membership.planIds });
  }
  if (state.package.enabled && state.package.packageIds.length > 0) {
    rules.push({ type: "package", packageIds: state.package.packageIds });
  }
  if (state.service_customer.enabled && state.service_customer.services.length > 0) {
    rules.push({ type: "service_customer", services: state.service_customer.services });
  }
  return { enabled: rules.length > 0, logic, rules };
}

interface RulePanelProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}

function RulePanel({ title, description, icon: Icon, iconColor, enabled, onToggle, children }: RulePanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-enabled={enabled}
      className="border-border rounded-xl border bg-card transition-all data-[enabled=true]:border-primary/30 data-[enabled=true]:bg-primary/5"
    >
      <div className="flex items-center gap-4 p-4">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconColor)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {enabled && children && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          )}
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>
      {enabled && children && expanded && (
        <div className="border-border border-t px-4 pb-4 pt-3">{children}</div>
      )}
    </div>
  );
}

export function CameraAccessRulesDialog({
  camera,
  accessConfig,
  globalRuleSet,
  open,
  onClose,
  onSave,
}: CameraAccessRulesDialogProps) {
  const sourceRuleSet = accessConfig.useGlobalRules
    ? globalRuleSet
    : accessConfig.customRuleSet;

  const [isCustomerVisible, setIsCustomerVisible] = useState(accessConfig.isCustomerVisible);
  const [cameraType, setCameraType] = useState<"public" | "private">(accessConfig.cameraType);
  const [useGlobalRules, setUseGlobalRules] = useState(accessConfig.useGlobalRules);
  const [logic, setLogic] = useState<"any" | "all">(sourceRuleSet?.logic ?? "any");
  const [rules, setRules] = useState<RuleState>(ruleSetToState(sourceRuleSet));

  const activePlans = membershipPlans.filter((p) => p.isActive);
  const activePackages = servicePackages.filter((p) => p.status === "active");

  function toggleService(
    key: "active_stay" | "service_customer",
    service: CameraServiceType,
  ) {
    setRules((prev) => {
      const current = prev[key].services;
      const next = current.includes(service)
        ? current.filter((s) => s !== service)
        : [...current, service];
      return { ...prev, [key]: { ...prev[key], services: next } };
    });
  }

  function togglePlan(planId: string) {
    setRules((prev) => {
      const current = prev.membership.planIds;
      const next = current.includes(planId)
        ? current.filter((id) => id !== planId)
        : [...current, planId];
      return { ...prev, membership: { ...prev.membership, planIds: next } };
    });
  }

  function togglePackage(packageId: string) {
    setRules((prev) => {
      const current = prev.package.packageIds;
      const next = current.includes(packageId)
        ? current.filter((id) => id !== packageId)
        : [...current, packageId];
      return { ...prev, package: { ...prev.package, packageIds: next } };
    });
  }

  function handleSave() {
    const customRuleSet = stateToRuleSet(rules, logic);
    onSave({
      isCustomerVisible,
      cameraType,
      useGlobalRules,
      customRuleSet: useGlobalRules ? undefined : customRuleSet,
    });
    onClose();
  }

  const enabledRuleCount = Object.values(rules).filter((r) => r.enabled).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Configure Camera Access
            <Badge variant="outline" className="text-xs font-normal">
              {camera.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Visibility & Type */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Camera Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="border-border rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Label className="text-sm font-medium">Customer Visible</Label>
                  <Switch
                    checked={isCustomerVisible}
                    onCheckedChange={setIsCustomerVisible}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Show this camera feed to eligible customers in their portal.
                </p>
              </div>
              <div className="border-border rounded-xl border p-4">
                <Label className="mb-3 block text-sm font-medium">Camera Type</Label>
                <Select
                  value={cameraType}
                  onValueChange={(v) => setCameraType(v as "public" | "private")}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public Area</SelectItem>
                    <SelectItem value="private">Private Suite / Kennel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-2 text-xs">
                  Private cameras show only to owners of pets in that space.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Access Rules Source */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Access Rules</h3>
              {!useGlobalRules && enabledRuleCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {enabledRuleCount} rule{enabledRuleCount > 1 ? "s" : ""} active
                </Badge>
              )}
            </div>

            <div
              data-enabled={useGlobalRules}
              className="border-border flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all data-[enabled=true]:border-primary/30 data-[enabled=true]:bg-primary/5"
              onClick={() => setUseGlobalRules((v) => !v)}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Info className="size-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Use Facility-Wide Default Rules</p>
                <p className="text-muted-foreground text-xs">
                  Inherit the global access policy configured for all cameras
                </p>
              </div>
              <Switch
                checked={useGlobalRules}
                onCheckedChange={setUseGlobalRules}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {!useGlobalRules && (
              <div className="space-y-3">
                {/* Logic selector */}
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground text-xs">Grant access when customer meets</span>
                  <Select value={logic} onValueChange={(v) => setLogic(v as "any" | "all")}>
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">ANY rule</SelectItem>
                      <SelectItem value="all">ALL rules</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-xs">below</span>
                </div>

                {/* Rule 1: Active Stay */}
                <RulePanel
                  title="Active Stay"
                  description="Customer has an active, confirmed booking at the facility"
                  icon={CalendarCheck}
                  iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  enabled={rules.active_stay.enabled}
                  onToggle={(v) => setRules((p) => ({ ...p, active_stay: { ...p.active_stay, enabled: v } }))}
                >
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Qualify for which services:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={rules.active_stay.services.includes(value)}
                          onCheckedChange={() => toggleService("active_stay", value)}
                        />
                        <Icon className="size-3.5 text-muted-foreground" />
                        {label}
                      </label>
                    ))}
                  </div>
                </RulePanel>

                {/* Rule 2: Operation Hours */}
                <RulePanel
                  title="Facility Operating Hours Only"
                  description="Camera access is restricted to the facility's open hours"
                  icon={Clock}
                  iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  enabled={rules.operation_hours.enabled}
                  onToggle={(v) => setRules((p) => ({ ...p, operation_hours: { enabled: v } }))}
                />

                {/* Rule 3: Membership */}
                <RulePanel
                  title="Membership Tier"
                  description="Customer holds a qualifying membership plan"
                  icon={Crown}
                  iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                  enabled={rules.membership.enabled}
                  onToggle={(v) => setRules((p) => ({ ...p, membership: { ...p.membership, enabled: v } }))}
                >
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Select qualifying membership plans:</p>
                  <div className="space-y-1.5">
                    {activePlans.map((plan) => (
                      <label
                        key={plan.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={rules.membership.planIds.includes(plan.id)}
                          onCheckedChange={() => togglePlan(plan.id)}
                        />
                        <span className="flex-1">{plan.name}</span>
                        {plan.tierLabel && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: plan.badgeColor, color: plan.badgeColor }}
                          >
                            {plan.tierLabel}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs">
                          ${plan.monthlyPrice}/mo
                        </span>
                      </label>
                    ))}
                  </div>
                </RulePanel>

                {/* Rule 4: Package */}
                <RulePanel
                  title="Package Purchase"
                  description="Customer has purchased a qualifying service package"
                  icon={Package}
                  iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                  enabled={rules.package.enabled}
                  onToggle={(v) => setRules((p) => ({ ...p, package: { ...p.package, enabled: v } }))}
                >
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Select qualifying packages:</p>
                  <div className="space-y-1.5">
                    {activePackages.map((pkg) => (
                      <label
                        key={pkg.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={rules.package.packageIds.includes(pkg.id)}
                          onCheckedChange={() => togglePackage(pkg.id)}
                        />
                        <span className="flex-1">{pkg.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ${pkg.packagePrice}
                        </span>
                      </label>
                    ))}
                  </div>
                </RulePanel>

                {/* Rule 5: Service Customer */}
                <RulePanel
                  title="Service Customer"
                  description="Customer is enrolled in or regularly uses a specific service"
                  icon={Users}
                  iconColor="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                  enabled={rules.service_customer.enabled}
                  onToggle={(v) => setRules((p) => ({ ...p, service_customer: { ...p.service_customer, enabled: v } }))}
                >
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Qualify for customers of:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={rules.service_customer.services.includes(value)}
                          onCheckedChange={() => toggleService("service_customer", value)}
                        />
                        <Icon className="size-3.5 text-muted-foreground" />
                        {label}
                      </label>
                    ))}
                  </div>
                </RulePanel>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Access Rules</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
