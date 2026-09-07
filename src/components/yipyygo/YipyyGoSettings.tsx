"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnablementScopeSection } from "./EnablementScopeSection";
import { TimingRemindersSection } from "./TimingRemindersSection";
import { PerServiceFormTemplateSection } from "./PerServiceFormTemplateSection";
import { FeesAndMessagingSection } from "./FeesAndMessagingSection";
import type { YipyyGoAddOnsApproval } from "@/data/yipyygo-config";
import type { YipyyGoSettings as YipyyGoSettingsValue } from "@/lib/settings/yipyy-go";
import { useSaveFacilitySetting } from "@/lib/api/facility-settings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useSettingsText } from "@/lib/settings/use-settings-text";

interface YipyyGoSettingsProps {
  /**
   * The facility's stored setup, or the inert default if they have none.
   *
   * Seeded into state ONCE, which is why the caller must not mount this until
   * the query has landed — see the wrapper. `configured` is not needed here:
   * the fallback is already switched off, so an unconfigured facility and one
   * that chose to switch Yipyy Go off render the same screen, correctly.
   */
  initialConfig: YipyyGoSettingsValue;
}

export function YipyyGoSettings({ initialConfig }: YipyyGoSettingsProps) {
  const t = useSettingsText().section("yipyygo");
  const saveSetting = useSaveFacilitySetting();
  const [localConfig, setLocalConfig] =
    useState<YipyyGoSettingsValue>(initialConfig);
  const [savedConfig, setSavedConfig] =
    useState<YipyyGoSettingsValue>(initialConfig);

  const hasChanges =
    JSON.stringify(localConfig) !== JSON.stringify(savedConfig);
  const isSaving = saveSetting.isPending;

  const handleEnableToggle = (enabled: boolean) => {
    setLocalConfig((prev) => ({ ...prev, enabled }));
  };

  const handleConfigUpdate = (updates: Partial<YipyyGoSettingsValue>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    saveSetting.mutate(
      { domain: "yipyy_go_config", value: localConfig },
      {
        onSuccess: () => {
          // The BASELINE moves, not the draft — so a field edited while the
          // request was in flight stays edited instead of being reverted.
          setSavedConfig(localConfig);
          toast.success(t("savedToast"));
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("saveFailed")),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Enable Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("title")}
              </CardTitle>
              <CardDescription>{t("intro")}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="yipyygo-enabled"
                  checked={localConfig.enabled}
                  onCheckedChange={handleEnableToggle}
                />
                <Label htmlFor="yipyygo-enabled" className="cursor-pointer">
                  {t(localConfig.enabled ? "enabled" : "disabled")}
                </Label>
              </div>
              {hasChanges && (
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 size-4" />
                  {t(isSaving ? "saving" : "save")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {!localConfig.enabled && (
          <CardContent>
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>{t("offNotice")}</AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {localConfig.enabled && (
        <>
          {/* Info Alert */}
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              <strong>{t("mandatoryVsOptionalLead")}</strong>{" "}
              {t("mandatoryVsOptional")}
            </AlertDescription>
          </Alert>

          {/* Add-ons approval & staff notifications */}
          <Card>
            <CardHeader>
              <CardTitle>{t("addOnsTitle")}</CardTitle>
              <CardDescription>{t("addOnsHelp")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>{t("addOnsApproval")}</Label>
                <RadioGroup
                  value={localConfig.addOnsApproval ?? "staff_approval"}
                  onValueChange={(v) =>
                    handleConfigUpdate({
                      addOnsApproval: v as YipyyGoAddOnsApproval,
                    })
                  }
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="addons-auto" />
                    <Label
                      htmlFor="addons-auto"
                      className="cursor-pointer font-normal"
                    >
                      {t("addOnsAuto")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff_approval" id="addons-staff" />
                    <Label
                      htmlFor="addons-staff"
                      className="cursor-pointer font-normal"
                    >
                      {t("addOnsStaff")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label
                    htmlFor="notify-staff-email"
                    className="cursor-pointer"
                  >
                    {t("notifyStaffEmail")}
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t("notifyStaffHelp")}
                  </p>
                </div>
                <Switch
                  id="notify-staff-email"
                  checked={localConfig.notifyStaffEmailOnSubmit ?? false}
                  onCheckedChange={(checked) =>
                    handleConfigUpdate({ notifyStaffEmailOnSubmit: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <Tabs defaultValue="enablement" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="enablement">{t("tabEnablement")}</TabsTrigger>
              <TabsTrigger value="timing">{t("tabTiming")}</TabsTrigger>
              <TabsTrigger value="template">{t("tabTemplate")}</TabsTrigger>
              <TabsTrigger value="fees">{t("tabFees")}</TabsTrigger>
            </TabsList>

            <TabsContent value="enablement" className="space-y-4">
              <EnablementScopeSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>

            <TabsContent value="timing" className="space-y-4">
              <TimingRemindersSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              <PerServiceFormTemplateSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>

            <TabsContent value="fees" className="space-y-4">
              <FeesAndMessagingSection
                config={localConfig}
                onConfigChange={handleConfigUpdate}
              />
            </TabsContent>
          </Tabs>

          {/* Save Button Footer */}
          {hasChanges && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    {t("unsavedChanges")}
                  </p>
                  <Button onClick={handleSave} disabled={isSaving} size="lg">
                    <Save className="mr-2 size-4" />
                    {t(isSaving ? "saving" : "save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
