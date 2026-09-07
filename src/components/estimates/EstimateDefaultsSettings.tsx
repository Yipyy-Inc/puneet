"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";
import {
  useEstimateSettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import type { EstimateSettings } from "@/lib/settings/estimates";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";

// Wrapper gates on the load; editor seeds from props. A `useState`
// initialiser runs once, so mounting before the facility's own defaults arrive
// would show the shipped ones and write them back on the first Save.
export function EstimateDefaultsSettings() {
  const { settings, isPending } = useEstimateSettings();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return <EstimateDefaultsEditor initialSettings={settings} />;
}

function EstimateDefaultsEditor({
  initialSettings,
}: {
  initialSettings: EstimateSettings;
}) {
  const t = useSettingsText().section("estimate-settings");
  const saveSetting = useSaveFacilitySetting();
  const [settings, setSettings] = useState<EstimateSettings>(initialSettings);

  const set = (patch: Partial<EstimateSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const handleSave = () => {
    saveSetting.mutate(
      { domain: "estimate_settings", value: settings },
      {
        onSuccess: () => toast.success(t("defaultsSaved")),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("defaultsFailed"),
          ),
      },
    );
  };

  const numberPreview = `${settings.estimateNumberPrefix}${"1".padStart(
    Math.max(1, settings.minDigits),
    "0",
  )}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          {t("defaultsTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Expiry Period */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("defaultExpiry")}</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t("estimatesExpireAfter")}
            </span>
            <Input
              type="number"
              min={1}
              max={365}
              value={settings.defaultExpiryDays}
              onChange={(e) =>
                set({ defaultExpiryDays: Number(e.target.value) })
              }
              className="h-8 w-20 text-sm"
            />
            <span className="text-muted-foreground text-xs">{t("days")}</span>
          </div>
        </div>

        {/* Default Deposit Requirement */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">{t("requireDeposit")}</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("requireDepositHelp")}
            </p>
          </div>
          <Switch
            checked={settings.acceptanceRequiresDeposit}
            onCheckedChange={(v) => set({ acceptanceRequiresDeposit: v })}
          />
        </div>

        {/* Estimate Number Format */}
        <div className="space-y-2">
          <Label className="text-xs">{t("numberFormat")}</Label>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px]">
                {t("prefix")}
              </Label>
              <Input
                value={settings.estimateNumberPrefix}
                onChange={(e) => set({ estimateNumberPrefix: e.target.value })}
                placeholder="E"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-[11px]">
                {t("sequentialDigits")}
              </Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={settings.minDigits}
                onChange={(e) => set({ minDigits: Number(e.target.value) })}
                className="h-8 w-24 text-sm"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            <InterpolatedText
              template={t("nextEstimateNote")}
              placeholder="{example}"
            >
              <span className="text-foreground font-mono font-medium">
                {numberPreview}
              </span>
            </InterpolatedText>
          </p>
        </div>

        {/* Expiry Warning Email */}
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">{t("expiryWarning")}</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("expiryWarningHelp")}
              </p>
            </div>
            <Switch
              checked={settings.expiryWarningEnabled}
              onCheckedChange={(v) => set({ expiryWarningEnabled: v })}
            />
          </div>
          {settings.expiryWarningEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {t("sendWarning")}
              </span>
              <Input
                type="number"
                min={1}
                max={168}
                value={settings.expiryWarningHoursBefore}
                onChange={(e) =>
                  set({ expiryWarningHoursBefore: Number(e.target.value) })
                }
                className="h-8 w-20 text-sm"
              />
              <span className="text-muted-foreground text-xs">
                {t("hoursBeforeExpiry")}
              </span>
            </div>
          )}
        </div>

        {/* Auto-Convert on Acceptance */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">{t("autoConvert")}</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("autoConvertHelp")}
            </p>
          </div>
          <Switch
            checked={settings.autoConvertOnAccept}
            onCheckedChange={(v) => set({ autoConvertOnAccept: v })}
          />
        </div>

        {/* Magic Link Expiry */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("magicLinkExpiry")}</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {t("magicLinkHelp")}
            </span>
            <Input
              type="number"
              min={1}
              max={720}
              value={settings.magicLinkExpiryHours}
              onChange={(e) =>
                set({ magicLinkExpiryHours: Number(e.target.value) })
              }
              className="h-8 w-20 text-sm"
            />
            <span className="text-muted-foreground text-xs">{t("hours")}</span>
          </div>
        </div>

        {/* Welcome Email */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">{t("welcomeEmail")}</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("welcomeEmailHelp")}
            </p>
          </div>
          <Switch
            checked={settings.sendWelcomeEmail}
            onCheckedChange={(v) => set({ sendWelcomeEmail: v })}
          />
        </div>

        {/* Allow Customer Acceptance */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm">{t("allowAcceptance")}</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("allowAcceptanceHelp")}
            </p>
          </div>
          <Switch
            checked={settings.allowCustomerAcceptance}
            onCheckedChange={(v) => set({ allowCustomerAcceptance: v })}
          />
        </div>

        <Button onClick={handleSave} className="w-full gap-2">
          <Save className="size-4" />
          {t("saveDefaults")}
        </Button>
      </CardContent>
    </Card>
  );
}
