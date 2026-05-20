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
import type {
  YipyyGoConfig,
  ServiceType,
  FormTemplateConfig,
} from "@/data/yipyygo-config";
import {
  SERVICE_TYPE_LABELS,
  getServiceTemplateKey,
} from "@/data/yipyygo-config";

const DEFAULT_KEY = "__default__";

interface ServiceTab {
  key: string;
  label: string;
}

interface PerServiceFormTemplateSectionProps {
  config: YipyyGoConfig;
  onConfigChange: (updates: Partial<YipyyGoConfig>) => void;
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
  const tabs = useMemo<ServiceTab[]>(() => {
    const result: ServiceTab[] = [
      { key: DEFAULT_KEY, label: "All services (default)" },
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
      result.push({ key: st, label: SERVICE_TYPE_LABELS[st] });
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
    return result;
  }, [config.serviceConfigs]);

  const [activeKey, setActiveKey] = useState<string>(DEFAULT_KEY);

  const isDefault = activeKey === DEFAULT_KEY;
  const hasOverride =
    !isDefault && !!config.formTemplates && activeKey in config.formTemplates;

  const effectiveTemplate: FormTemplateConfig = isDefault
    ? config.formTemplate
    : (config.formTemplates?.[activeKey] ?? config.formTemplate);

  // Virtual config so FormTemplateSection — which reads `config.formTemplate` —
  // sees the currently selected service's template without any changes to it.
  const virtualConfig = useMemo<YipyyGoConfig>(
    () => ({ ...config, formTemplate: effectiveTemplate }),
    [config, effectiveTemplate],
  );

  const handleVirtualChange = (updates: Partial<YipyyGoConfig>) => {
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
          <CardTitle className="text-base">Edit form for</CardTitle>
          <CardDescription>
            Pick a service to customize its Express Check-in form. Services
            without a custom form inherit from “All services (default)”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => {
              const isActive = activeKey === t.key;
              const isCustomized =
                t.key !== DEFAULT_KEY &&
                !!config.formTemplates &&
                t.key in config.formTemplates;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveKey(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {t.label}
                  {isCustomized && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-4 px-1 text-[10px]",
                        isActive &&
                          "bg-primary-foreground/20 text-primary-foreground",
                      )}
                    >
                      Custom
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {!isDefault && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
              {hasOverride ? (
                <>
                  <Info className="size-4 text-muted-foreground" />
                  <span className="text-sm">
                    Editing the custom form for{" "}
                    <strong>{activeLabel}</strong>.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetOverride}
                    className="ml-auto"
                  >
                    <RotateCcw className="mr-1.5 size-3.5" />
                    Reset to default
                  </Button>
                </>
              ) : (
                <>
                  <Info className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Currently inheriting the default form. Any edit here will
                    create a custom form for <strong>{activeLabel}</strong>.
                  </span>
                </>
              )}
            </div>
          )}

          {isDefault && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Changes here apply to every service that doesn’t have its own
                custom form. Switch to a service tab above to override a single
                service.
              </AlertDescription>
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
