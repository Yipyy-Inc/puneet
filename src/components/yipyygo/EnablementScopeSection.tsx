"use client";

import { useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ServiceYipyyGoConfig, ServiceType } from "@/data/yipyygo-config";
import type { YipyyGoSettings } from "@/lib/settings/yipyy-go";
import { type YipyyGoRequirement } from "@/data/yipyygo-config";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useServiceTypeLabel, useRequirementLabel } from "./use-yipyygo-labels";
import { useCustomServices } from "@/hooks/use-custom-services";
import { isExpressCheckInEnabled } from "@/data/custom-services";

interface EnablementScopeSectionProps {
  config: YipyyGoSettings;
  onConfigChange: (updates: Partial<YipyyGoSettings>) => void;
}

export function EnablementScopeSection({
  config,
  onConfigChange,
}: EnablementScopeSectionProps) {
  const t = useSettingsText().section("yipyygo");
  const serviceLabel = useServiceTypeLabel();
  const requirementLabel = useRequirementLabel();
  const handleServiceToggle = (serviceType: ServiceType, enabled: boolean) => {
    const updated = config.serviceConfigs.map((sc) =>
      sc.serviceType === serviceType ? { ...sc, enabled } : sc,
    );
    onConfigChange({ serviceConfigs: updated });
  };

  const handleRequirementChange = (
    serviceType: ServiceType,
    requirement: YipyyGoRequirement,
  ) => {
    const updated = config.serviceConfigs.map((sc) =>
      sc.serviceType === serviceType ? { ...sc, requirement } : sc,
    );
    onConfigChange({ serviceConfigs: updated });
  };

  const handleAddCustomService = () => {
    const newService: ServiceYipyyGoConfig = {
      serviceType: "custom",
      customServiceName: "",
      enabled: true,
      requirement: "optional",
    };
    onConfigChange({
      serviceConfigs: [...config.serviceConfigs, newService],
    });
  };

  const handleRemoveCustomService = (index: number) => {
    const updated = config.serviceConfigs.filter((_, i) => i !== index);
    onConfigChange({ serviceConfigs: updated });
  };

  const handleCustomServiceNameChange = (index: number, name: string) => {
    const updated = config.serviceConfigs.map((sc, i) =>
      i === index ? { ...sc, customServiceName: name } : sc,
    );
    onConfigChange({ serviceConfigs: updated });
  };

  const { activeModules } = useCustomServices();
  // Modules whose Step 9 "Require YipyyGo" (Express Check-in) toggle is on —
  // not the StaffAssignment "YipyyGo App Required" integration flag. Scoped to
  // this facility, matching the per-service form-template tab.
  // ── THE FACILITY FILTER IS GONE, AND IT WAS NEVER DOING ITS JOB ─────────
  //
  // This used to also require `(m.facilityIds ?? [m.facilityId]).includes(
  // config.facilityId)`. That id came from the settings wrapper, which read
  // `const facilityId = 11; // TODO: Get from auth context` — so the list was
  // narrowed to the DEMO facility's custom services for every real facility
  // that opened this screen. Filtering by a constant is not scoping.
  //
  // Yipyy Go's own settings moved to `facility_settings.yipyy_go_config` on
  // 2026-09-06 and come from the session. Custom services did NOT: they are
  // still a fixture behind a localStorage context, with no facility of their
  // own to check against. So there is nothing honest left to filter on, and
  // pretending otherwise with a constant is the shape `check:derived-location`
  // was written to stop. Recorded in the debt map; it is fixed when custom
  // services become real rows.
  const activeCustomModules = useMemo(
    () => activeModules.filter((m) => isExpressCheckInEnabled(m)),
    [activeModules],
  );

  const standardServices: ServiceType[] = [
    "daycare",
    "boarding",
    "grooming",
    "training",
  ];
  const customServices = config.serviceConfigs.filter(
    (sc) => sc.serviceType === "custom",
  );

  // Auto-populate custom services that require YipyyGo but aren't in config yet (idempotent)
  useEffect(() => {
    const missingModules = activeCustomModules.filter(
      (m) =>
        !config.serviceConfigs.some(
          (cs) =>
            cs.serviceType === "custom" && cs.customServiceName === m.name,
        ),
    );
    if (missingModules.length === 0) return;
    const newConfigs: ServiceYipyyGoConfig[] = missingModules.map((m) => ({
      serviceType: "custom" as ServiceType,
      customServiceName: m.name,
      enabled: true,
      // Reflect the module's own completion setting (Step 9), with the same
      // legacy fallback isExpressCheckInEnabled uses.
      requirement: ((m.yipyyGo?.required ?? m.yipyyGoRequired)
        ? "mandatory"
        : "optional") as YipyyGoRequirement,
    }));
    onConfigChange({
      serviceConfigs: [...config.serviceConfigs, ...newConfigs],
    });
  }, [activeCustomModules, config.serviceConfigs, onConfigChange]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("scopeTitle")}</CardTitle>
          <CardDescription>{t("scopeHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Standard Services */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              {t("standardServices")}
            </Label>
            {standardServices.map((serviceType) => {
              const serviceConfig = config.serviceConfigs.find(
                (sc) => sc.serviceType === serviceType,
              );
              if (!serviceConfig) return null;

              return (
                <div
                  key={serviceType}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={serviceConfig.enabled}
                      onCheckedChange={(enabled) =>
                        handleServiceToggle(serviceType, enabled)
                      }
                    />
                    <div className="flex-1">
                      <Label className="cursor-pointer text-base font-medium">
                        {serviceLabel(serviceType)}
                      </Label>
                      {serviceConfig.enabled && (
                        <div className="mt-2 flex items-center gap-3">
                          <Select
                            value={serviceConfig.requirement}
                            onValueChange={(value: YipyyGoRequirement) =>
                              handleRequirementChange(serviceType, value)
                            }
                          >
                            <SelectTrigger className="min-w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mandatory">
                                {requirementLabel("mandatory")}
                              </SelectItem>
                              <SelectItem value="optional">
                                {requirementLabel("optional")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge
                            variant={
                              serviceConfig.requirement === "mandatory"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {requirementLabel(serviceConfig.requirement)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Services */}
          {customServices.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t("customServices")}
                </Label>
              </div>
              {customServices.map((serviceConfig, _index) => {
                const actualIndex = config.serviceConfigs.findIndex(
                  (sc) => sc === serviceConfig,
                );
                return (
                  <div
                    key={`custom-${actualIndex}`}
                    className="flex items-center gap-3 rounded-lg border p-4"
                  >
                    <Switch
                      checked={serviceConfig.enabled}
                      onCheckedChange={(enabled) => {
                        const updated = config.serviceConfigs.map((sc, i) =>
                          i === actualIndex ? { ...sc, enabled } : sc,
                        );
                        onConfigChange({ serviceConfigs: updated });
                      }}
                    />
                    <Input
                      placeholder={t("customServiceName")}
                      value={serviceConfig.customServiceName || ""}
                      onChange={(e) =>
                        handleCustomServiceNameChange(
                          actualIndex,
                          e.target.value,
                        )
                      }
                      className="flex-1"
                    />
                    {serviceConfig.enabled && (
                      <Select
                        value={serviceConfig.requirement}
                        onValueChange={(value: YipyyGoRequirement) => {
                          const updated = config.serviceConfigs.map((sc, i) =>
                            i === actualIndex
                              ? { ...sc, requirement: value }
                              : sc,
                          );
                          onConfigChange({ serviceConfigs: updated });
                        }}
                      >
                        <SelectTrigger className="min-w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mandatory">
                            {requirementLabel("mandatory")}
                          </SelectItem>
                          <SelectItem value="optional">
                            {requirementLabel("optional")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCustomService(actualIndex)}
                      aria-label={t("removeCustomService")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Custom Service Button */}
          <Button
            variant="outline"
            onClick={handleAddCustomService}
            className="w-full"
          >
            <Plus className="mr-2 size-4" />
            {t("addCustomService")}
          </Button>

          {/* Info Alert */}
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              <strong>{t("mandatoryLead")}</strong> {t("mandatoryBody")}
              <br />
              <strong>{t("optionalLead")}</strong> {t("optionalBody")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
