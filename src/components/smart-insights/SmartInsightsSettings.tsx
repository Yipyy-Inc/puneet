"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insightMutations, insightQueries } from "@/lib/api/smart-insights";
import {
  DEFAULT_INSIGHT_SETTINGS,
  INSIGHT_CATEGORY_LABELS,
  type InsightCategory,
  type InsightSettings,
} from "@/types/smart-insights";

const FACILITY_ID = 11;

const THRESHOLD_FIELDS: {
  key: keyof InsightSettings["thresholdOverrides"];
  label: string;
  helper: string;
  defaultPlaceholder: string;
  unit?: string;
}[] = [
  {
    key: "churnDaysMultiplier",
    label: "Churn detection — visit-frequency multiplier",
    helper: "Fires when days-since-visit exceeds (avg cadence × this number)",
    defaultPlaceholder: "2",
  },
  {
    key: "overtimeOverBudget",
    label: "Overtime alert — over budget threshold",
    helper: "Overtime spend $ over labor budget that triggers an insight",
    defaultPlaceholder: "1000",
    unit: "$",
  },
  {
    key: "cancellationRatePct",
    label: "Cancellation rate spike — % above 90-day avg",
    helper: "Week-over-90-day spike % that triggers a High insight",
    defaultPlaceholder: "25",
    unit: "%",
  },
  {
    key: "depositExposure",
    label: "Uncollected deposit exposure",
    helper: "Outstanding deposit total that triggers an insight",
    defaultPlaceholder: "500",
    unit: "$",
  },
  {
    key: "monthlyNoShowLoss",
    label: "Monthly no-show revenue loss",
    helper: "No-show revenue loss / month that triggers a High insight",
    defaultPlaceholder: "800",
    unit: "$",
  },
  {
    key: "missedCallsPerDay",
    label: "Missed calls per day",
    helper: "Absolute daily missed-call count that triggers an insight",
    defaultPlaceholder: "10",
  },
  {
    key: "voicemailBacklogCount",
    label: "Voicemail backlog count",
    helper: "Unlistened voicemails that trigger the backlog insight",
    defaultPlaceholder: "5",
  },
  {
    key: "voicemailAgeHours",
    label: "Voicemail max age",
    helper: "Hours before any voicemail is too old",
    defaultPlaceholder: "48",
    unit: "h",
  },
  {
    key: "messageResponseHours",
    label: "Inbox response time ceiling",
    helper: "Hours before slow-response insight fires",
    defaultPlaceholder: "4",
    unit: "h",
  },
  {
    key: "stationCleaningMinutes",
    label: "Station cleaning bottleneck threshold",
    helper: "Average minutes in Needs Cleaning before insight fires",
    defaultPlaceholder: "45",
    unit: "min",
  },
  {
    key: "missedTaskRatePct",
    label: "Grooming task missed rate threshold",
    helper: "% of tasks auto-marked Missed before insight fires",
    defaultPlaceholder: "15",
    unit: "%",
  },
];

export function SmartInsightsSettings() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery(insightQueries.settings(FACILITY_ID));
  const settings = settingsQuery.data ?? DEFAULT_INSIGHT_SETTINGS;

  const saveMutation = useMutation({
    mutationFn: insightMutations.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights", FACILITY_ID] });
      toast.success("Smart Insights settings saved");
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
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="size-6 text-amber-500" />
          Smart Insights Settings
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Control which insights run, how you're notified, and override the
          thresholds that decide when an insight fires.
        </p>
      </div>

      {/* Master toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="si-enabled" className="text-base">
                Enable Smart Insights
              </Label>
              <p className="text-muted-foreground text-xs">
                When off, the Smart Insights page, dashboard widget, and nav
                badge are hidden for everyone in this facility.
              </p>
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
          <CardTitle>Daily digest email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="si-digest" className="text-base">
                Send the morning digest at 7 AM
              </Label>
              <p className="text-muted-foreground text-xs">
                A one-glance email summary of the top insights generated
                overnight, sent to owner / manager addresses.
              </p>
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
          <CardTitle>Categories</CardTitle>
          <p className="text-muted-foreground text-sm">
            Disable any category you don't want surfaced. Disabled insights
            still generate in the background — they just don't appear in lists.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(settings.categoriesEnabled) as InsightCategory[]).map(
            (cat) => (
              <div
                key={cat}
                className="flex items-center justify-between gap-4 rounded-md border p-3"
              >
                <Label htmlFor={`cat-${cat}`} className="font-semibold">
                  {INSIGHT_CATEGORY_LABELS[cat]}
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
              <CardTitle>Threshold overrides</CardTitle>
              <p className="text-muted-foreground text-sm">
                Tighten or loosen any of the values that decide when an
                insight fires. Leave a field blank to use the system default.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetThresholds}
              disabled={
                Object.keys(settings.thresholdOverrides).length === 0
              }
            >
              Reset to defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {THRESHOLD_FIELDS.map((f) => {
            const current = settings.thresholdOverrides[f.key];
            return (
              <div key={f.key} className="grid grid-cols-3 items-start gap-3">
                <div className="col-span-2">
                  <Label htmlFor={`th-${f.key}`} className="text-sm font-semibold">
                    {f.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">{f.helper}</p>
                </div>
                <div className="relative">
                  {f.unit && f.unit !== "$" && (
                    <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                      {f.unit}
                    </span>
                  )}
                  {f.unit === "$" && (
                    <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-xs">
                      $
                    </span>
                  )}
                  <Input
                    id={`th-${f.key}`}
                    type="number"
                    inputMode="decimal"
                    placeholder={`Default ${f.defaultPlaceholder}${
                      f.unit ? (f.unit === "$" ? "" : " " + f.unit) : ""
                    }`}
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
