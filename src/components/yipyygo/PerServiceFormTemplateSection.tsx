"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { FormTemplateSection } from "./FormTemplateSection";
import type { ServiceType, FormTemplateConfig } from "@/data/yipyygo-config";
import type { YipyyGoSettings } from "@/lib/settings/yipyy-go";
import { getServiceTemplateKey } from "@/data/yipyygo-config";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";
import { useServiceTypeLabel } from "./use-yipyygo-labels";
import {
  defaultCustomServiceModules,
  isExpressCheckInEnabled,
} from "@/data/custom-services";

const DEFAULT_KEY = "__default__";

interface ServiceTab {
  key: string;
  label: string;
}

interface PerServiceFormTemplateSectionProps {
  config: YipyyGoSettings;
  onConfigChange: (updates: Partial<YipyyGoSettings>) => void;
}

/**
 * Wraps FormTemplateSection with a per-service tab strip so managers can build
 * a different Express Check-in form for each service (daycare / boarding /
 * grooming / training / custom services) from one place.
 *
 * Editing a service tab transparently creates an override in
 * `config.formTemplates[serviceKey]`. The "All services (default)" tab edits
 * `config.formTemplate`, which any service without an override inherits.
 */
export function PerServiceFormTemplateSection({
  config,
  onConfigChange,
}: PerServiceFormTemplateSectionProps) {
  const t = useSettingsText().section("yipyygo");
  const serviceLabel = useServiceTypeLabel();

  // Plain, not useMemo: the body now calls the translator and the service
  // label resolver, which are new function identities on every render, so the
  // React Compiler could not preserve the memo and refused to compile the
  // file at all. The list is a handful of strings — deriving it is cheaper
  // than a dependency array that has to lie to stay stable.
  const tabs = ((): ServiceTab[] => {
    const result: ServiceTab[] = [
      { key: DEFAULT_KEY, label: t("allServicesDefault") },
    ];
    const standardOrder: ServiceType[] = [
      "daycare",
      "boarding",
      "grooming",
      "training",
    ];
    // Standard services in a stable, predictable order.
    for (const st of standardOrder) {
      const sc = config.serviceConfigs.find((c) => c.serviceType === st);
      if (!sc) continue;
      result.push({ key: st, label: serviceLabel(st) });
    }
    // Custom services keyed by name to avoid the bare "custom" collision.
    for (const sc of config.serviceConfigs) {
      if (sc.serviceType !== "custom") continue;
      const name = sc.customServiceName?.trim();
      if (!name) continue;
      result.push({
        key: getServiceTemplateKey("custom", name),
        label: name,
      });
    }

    // Custom service MODULES (built in the module wizard, e.g. "Yoda's Splash")
    // that have Express Check-in enabled also surface here so managers can
    // configure what their pre-check-in form sends. Deduped against any custom
    // service already added above.
    const seen = new Set(result.map((t) => t.key));
    for (const m of defaultCustomServiceModules) {
      if (m.status !== "active") continue;
      // No facility filter here any more, for the reason spelled out in
      // EnablementScopeSection: the id it used to check came from a hardcoded
      // `11` in the settings wrapper, so it narrowed this list to the demo
      // facility's custom services for everybody. Custom services are still a
      // fixture with no facility of their own; filtering by a constant is not
      // scoping, and this is fixed when they become real rows.
      if (!isExpressCheckInEnabled(m)) continue;
      const key = getServiceTemplateKey("custom", m.name);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ key, label: m.name });
    }

    return result;
  })();

  const [activeKey, setActiveKey] = useState<string>(DEFAULT_KEY);

  const isDefault = activeKey === DEFAULT_KEY;
  const hasOverride =
    !isDefault && !!config.formTemplates && activeKey in config.formTemplates;

  const effectiveTemplate: FormTemplateConfig = isDefault
    ? config.formTemplate
    : (config.formTemplates?.[activeKey] ?? config.formTemplate);

  // Virtual config so FormTemplateSection — which reads `config.formTemplate` —
  // sees the currently selected service's template without any changes to it.
  const virtualConfig = useMemo<YipyyGoSettings>(
    () => ({ ...config, formTemplate: effectiveTemplate }),
    [config, effectiveTemplate],
  );

  const handleVirtualChange = (updates: Partial<YipyyGoSettings>) => {
    // Re-route any change to .formTemplate into either the global default or
    // the per-service override map, depending on which tab is active. Other
    // top-level changes pass through unchanged.
    if (updates.formTemplate) {
      if (isDefault) {
        onConfigChange({ formTemplate: updates.formTemplate });
      } else {
        onConfigChange({
          formTemplates: {
            ...(config.formTemplates ?? {}),
            [activeKey]: updates.formTemplate,
          },
        });
      }
      return;
    }
    onConfigChange(updates);
  };

  const handleResetOverride = () => {
    if (isDefault || !config.formTemplates) return;
    const next = { ...config.formTemplates };
    delete next[activeKey];
    onConfigChange({ formTemplates: next });
  };

  const activeLabel = tabs.find((t) => t.key === activeKey)?.label ?? "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("editFormFor")}</CardTitle>
          <CardDescription>{t("editFormHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {/* `tab`, not `t` — the translator is called inside this map. */}
            {tabs.map((tab) => {
              const isActive = activeKey === tab.key;
              const isCustomized =
                tab.key !== DEFAULT_KEY &&
                !!config.formTemplates &&
                tab.key in config.formTemplates;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveKey(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {tab.label}
                  {isCustomized && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-4 px-1 text-[10px]",
                        isActive &&
                          "bg-primary-foreground/20 text-primary-foreground",
                      )}
                    >
                      {t("customBadge")}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {!isDefault && (
            <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-3">
              {hasOverride ? (
                <>
                  <Info className="text-muted-foreground size-4" />
                  <span className="text-sm">
                    <InterpolatedText
                      template={t("editingCustomFor")}
                      placeholder="{service}"
                    >
                      <strong>{activeLabel}</strong>
                    </InterpolatedText>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetOverride}
                    className="ml-auto"
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    {t("resetToDefault")}
                  </Button>
                </>
              ) : (
                <>
                  <Info className="text-muted-foreground size-4" />
                  <span className="text-muted-foreground text-sm">
                    <InterpolatedText
                      template={t("inheritingDefault")}
                      placeholder="{service}"
                    >
                      <strong>{activeLabel}</strong>
                    </InterpolatedText>
                  </span>
                </>
              )}
            </div>
          )}

          {isDefault && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>{t("defaultAppliesTo")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <FormTemplateSection
        config={virtualConfig}
        onConfigChange={handleVirtualChange}
      />
    </div>
  );
}
