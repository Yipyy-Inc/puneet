"use client";

import { useSettingsText } from "@/lib/settings/use-settings-text";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insightMutations, insightQueries } from "@/lib/api/smart-insights";
import {
  DEFAULT_INSIGHT_SETTINGS,
  type InsightCategory,
  type InsightSettings,
} from "@/types/smart-insights";

const FACILITY_ID = 11;

const THRESHOLD_FIELDS: {
  key: keyof InsightSettings["thresholdOverrides"];
  labelKey: string;
  helperKey: string;
  defaultPlaceholder: string;
  unit?: string;
}[] = [
  {
    key: "churnDaysMultiplier",
    labelKey: "thresholdChurn",
    helperKey: "thresholdChurnHelp",
    defaultPlaceholder: "2",
  },
  {
    key: "overtimeOverBudget",
    labelKey: "thresholdOvertime",
    helperKey: "thresholdOvertimeHelp",
    defaultPlaceholder: "1000",
    unit: "$",
  },
  {
    key: "cancellationRatePct",
    labelKey: "thresholdCancellation",
    helperKey: "thresholdCancellationHelp",
    defaultPlaceholder: "25",
    unit: "%",
  },
  {
    key: "depositExposure",
    labelKey: "thresholdDeposits",
    helperKey: "thresholdDepositsHelp",
    defaultPlaceholder: "500",
    unit: "$",
  },
  {
    key: "monthlyNoShowLoss",
    labelKey: "thresholdNoShow",
    helperKey: "thresholdNoShowHelp",
    defaultPlaceholder: "800",
    unit: "$",
  },
  {
    key: "missedCallsPerDay",
    labelKey: "thresholdMissedCalls",
    helperKey: "thresholdMissedCallsHelp",
    defaultPlaceholder: "10",
  },
  {
    key: "voicemailBacklogCount",
    labelKey: "thresholdVoicemailCount",
    helperKey: "thresholdVoicemailCountHelp",
    defaultPlaceholder: "5",
  },
  {
    key: "voicemailAgeHours",
    labelKey: "thresholdVoicemailAge",
    helperKey: "thresholdVoicemailAgeHelp",
    defaultPlaceholder: "48",
    unit: "h",
  },
  {
    key: "messageResponseHours",
    labelKey: "thresholdInbox",
    helperKey: "thresholdInboxHelp",
    defaultPlaceholder: "4",
    unit: "h",
  },
  {
    key: "stationCleaningMinutes",
    labelKey: "thresholdStation",
    helperKey: "thresholdStationHelp",
    defaultPlaceholder: "45",
    unit: "min",
  },
  {
    key: "missedTaskRatePct",
    labelKey: "thresholdGrooming",
    helperKey: "thresholdGroomingHelp",
    defaultPlaceholder: "15",
    unit: "%",
  },
];

export function SmartInsightsSettings() {
  const t = useSettingsText().section("smart-insights");
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(insightQueries.settings(FACILITY_ID));
  const settings = settingsQuery.data ?? DEFAULT_INSIGHT_SETTINGS;

  const saveMutation = useMutation({
    mutationFn: insightMutations.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", FACILITY_ID] });
      toast.success(t("saved"));
    },
  });

  const update = (patch: Partial<InsightSettings>) => {
    const next: InsightSettings = { ...settings, ...patch };
    saveMutation.mutate({ facilityId: FACILITY_ID, settings: next });
  };

  const updateCategory = (cat: InsightCategory, enabled: boolean) => {
    update({
      categoriesEnabled: { ...settings.categoriesEnabled, [cat]: enabled },
    });
  };

  const updateThreshold = (
    key: keyof InsightSettings["thresholdOverrides"],
    raw: string,
  ) => {
    const next = { ...settings.thresholdOverrides };
    if (raw.trim() === "") {
      delete next[key];
    } else {
      const num = parseFloat(raw);
      if (Number.isFinite(num)) next[key] = num;
    }
    update({ thresholdOverrides: next });
  };

  const resetThresholds = () => update({ thresholdOverrides: {} });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
      </div>

      {/* Master toggle */}
      <Card>
        <CardHeader>
          <CardTitle>{t("sectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="si-enabled" className="text-base">
                {t("enable")}
              </Label>
              <p className="text-muted-foreground text-xs">{t("enableHelp")}</p>
            </div>
            <Switch
              id="si-enabled"
              checked={settings.enabled}
              onCheckedChange={(v) => update({ enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily digest */}
      <Card>
        <CardHeader>
          <CardTitle>{t("digest")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="si-digest" className="text-base">
                {t("digestToggle")}
              </Label>
              <p className="text-muted-foreground text-xs">{t("digestHelp")}</p>
            </div>
            <Switch
              id="si-digest"
              checked={settings.dailyDigestEmail}
              onCheckedChange={(v) => update({ dailyDigestEmail: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-category toggles */}
      <Card>
        <CardHeader>
          <CardTitle>{t("categories")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("categoriesHelp")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(settings.categoriesEnabled) as InsightCategory[]).map(
            (cat) => (
              <div
                key={cat}
                className="flex items-center justify-between gap-4 rounded-md border p-3"
              >
                <Label htmlFor={`cat-${cat}`} className="font-semibold">
                  {/* INSIGHT_CATEGORY_LABELS lives in src/types and is a plain
                      constant, so it cannot reach a hook. Three other call
                      sites still render its English on the Smart insights PAGE
                      — a surface check:ui-french does not cover. Recorded. */}
                  {t(`category${cat[0].toUpperCase()}${cat.slice(1)}`)}
                </Label>
                <Switch
                  id={`cat-${cat}`}
                  checked={settings.categoriesEnabled[cat]}
                  onCheckedChange={(v) => updateCategory(cat, v)}
                />
              </div>
            ),
          )}
        </CardContent>
      </Card>

      {/* Threshold overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{t("thresholds")}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {t("thresholdsHelp")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetThresholds}
              disabled={Object.keys(settings.thresholdOverrides).length === 0}
            >
              {t("resetDefaults")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {THRESHOLD_FIELDS.map((f) => {
            const current = settings.thresholdOverrides[f.key];
            return (
              <div key={f.key} className="grid grid-cols-3 items-start gap-3">
                <div className="col-span-2">
                  <Label
                    htmlFor={`th-${f.key}`}
                    className="text-sm font-semibold"
                  >
                    {t(f.labelKey)}
                  </Label>
                  <p className="text-ink-tertiary text-[13.5px]">
                    {t(f.helperKey)}
                  </p>
                </div>
                <div className="relative">
                  {f.unit && f.unit !== "$" && (
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                      {f.unit}
                    </span>
                  )}
                  {f.unit === "$" && (
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-xs">
                      $
                    </span>
                  )}
                  <Input
                    id={`th-${f.key}`}
                    type="number"
                    inputMode="decimal"
                    placeholder={t("defaultLabel").replace(
                      "{value}",
                      `${f.defaultPlaceholder}${
                        f.unit ? (f.unit === "$" ? "" : " " + f.unit) : ""
                      }`,
                    )}
                    value={current ?? ""}
                    onChange={(e) => updateThreshold(f.key, e.target.value)}
                    className={f.unit === "$" ? "pl-6" : ""}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
