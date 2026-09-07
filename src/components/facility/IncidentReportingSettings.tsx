"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Users, Camera, Bell } from "lucide-react";
import { toast } from "sonner";
import { type IncidentMedFeeMode } from "@/data/facility-config";
import type { IncidentReportingConfig } from "@/lib/settings/incidents";
import {
  useIncidentReporting,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import type { AssigneeRole, IncidentSeverity } from "@/types/incidents";

// KEYS, not words — the value is what is stored. Same shape and same reason
// as CONDITION_KEYS in WeatherWarningSettings.
const ASSIGNEE_ROLE_OPTIONS: { value: AssigneeRole; key: string }[] = [
  { value: "reporter", key: "assigneeReporter" },
  { value: "manager", key: "assigneeManager" },
  { value: "any_staff", key: "assigneeAnyStaff" },
  { value: "specific", key: "assigneeSpecific" },
];

// Severity rows for the auto-notify grid (highest first).
const SEVERITY_ROWS: { value: IncidentSeverity; key: string }[] = [
  { value: "critical", key: "severityCritical" },
  { value: "high", key: "severityHigh" },
  { value: "medium", key: "severityMedium" },
  { value: "low", key: "severityLow" },
];

// The same wrapper/editor split as the deposit and vaccination screens: the
// editor seeds `useState` once, so it must not mount before the facility's own
// policy has arrived — the first Save would write the shipped defaults back
// over it.
export function IncidentReportingSettings() {
  const { config, isPending } = useIncidentReporting();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return <IncidentReportingEditor initialConfig={config} />;
}

function IncidentReportingEditor({
  initialConfig,
}: {
  initialConfig: IncidentReportingConfig;
}) {
  const saveSetting = useSaveFacilitySetting();
  const t = useSettingsText().section("incident-reporting");
  const [config, setConfig] = useState<IncidentReportingConfig>(initialConfig);
  const [saved, setSaved] = useState<IncidentReportingConfig>(initialConfig);

  const isDirty = JSON.stringify(config) !== JSON.stringify(saved);

  const handleSave = () => {
    saveSetting.mutate(
      { domain: "incident_reporting", value: config },
      {
        onSuccess: () => {
          setSaved(config);
          toast.success(t("saved"));
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : t("saveFailed")),
      },
    );
  };

  const setAutoNotify = (
    severity: IncidentSeverity,
    key: "notifyManager" | "notifyOwner" | "notifyEmergencyContact",
    value: boolean,
  ) => {
    setConfig((prev) => ({
      ...prev,
      autoNotify: {
        ...prev.autoNotify,
        [severity]: { ...prev.autoNotify[severity], [key]: value },
      },
    }));
  };

  const charge = config.chargeIncidentMedications;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-ink-tertiary mt-1 text-[14.5px]">{t("intro")}</p>
          </div>
          {isDirty && (
            <Button size="sm" onClick={handleSave}>
              {t("save")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* (1) Charge for facility-provided incident medications */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="size-4" />
                {t("chargeMeds")}
              </Label>
              <p className="text-ink-tertiary text-[13.5px]">
                {t("chargeMedsHelp")}
              </p>
            </div>
            <Switch
              checked={charge.enabled}
              onCheckedChange={(v) =>
                setConfig((prev) => ({
                  ...prev,
                  chargeIncidentMedications: {
                    ...prev.chargeIncidentMedications,
                    enabled: v,
                  },
                }))
              }
            />
          </div>

          {charge.enabled && (
            <div className="grid gap-3 border-t pt-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              <div className="space-y-1.5">
                <Label className="text-[13.5px] font-medium">
                  {t("feeType")}
                </Label>
                <Select
                  value={charge.feeMode}
                  onValueChange={(v) =>
                    setConfig((prev) => ({
                      ...prev,
                      chargeIncidentMedications: {
                        ...prev.chargeIncidentMedications,
                        feeMode: v as IncidentMedFeeMode,
                      },
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_admin">
                      {t("feePerAdmin")}
                    </SelectItem>
                    <SelectItem value="one_time">{t("feeOneTime")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13.5px] font-medium">
                  {t("amount")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={charge.feeAmount}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      chargeIncidentMedications: {
                        ...prev.chargeIncidentMedications,
                        feeAmount: Number(e.target.value),
                      },
                    }))
                  }
                  className="min-w-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* (2) Default assigned role for follow-up tasks */}
        <div className="space-y-2 rounded-lg border p-4">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" />
            {t("defaultAssignee")}
          </Label>
          <p className="text-ink-tertiary text-[13.5px]">
            {t("defaultAssigneeHelp")}
          </p>
          <Select
            value={config.defaultFollowUpAssigneeRole}
            onValueChange={(v) =>
              setConfig((prev) => ({
                ...prev,
                defaultFollowUpAssigneeRole: v as AssigneeRole,
              }))
            }
          >
            <SelectTrigger className="max-w-full min-w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNEE_ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* (3) Require photo on Critical incidents */}
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Camera className="size-4" />
              {t("requirePhoto")}
            </Label>
            <p className="text-ink-tertiary text-[13.5px]">
              {t("requirePhotoHelp")}
            </p>
          </div>
          <Switch
            checked={config.requirePhotoOnCritical}
            onCheckedChange={(v) =>
              setConfig((prev) => ({ ...prev, requirePhotoOnCritical: v }))
            }
          />
        </div>

        {/* (4) Auto-notify rules by severity (2G.2) */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="size-4" />
              {t("autoNotify")}
            </Label>
            <p className="text-ink-tertiary text-[13.5px]">
              {t("autoNotifyHelp")}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-tertiary border-b text-left text-[13.5px]">
                  <th className="py-2 pr-3 font-medium">{t("severity")}</th>
                  <th className="py-2 pr-3 font-medium">
                    {t("notifyManager")}
                  </th>
                  <th className="py-2 pr-3 font-medium">{t("notifyOwner")}</th>
                  <th className="py-2 font-medium">{t("notifyEmergency")}</th>
                </tr>
              </thead>
              <tbody>
                {SEVERITY_ROWS.map((row) => {
                  const rule = config.autoNotify[row.value];
                  return (
                    <tr key={row.value} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{t(row.key)}</td>
                      <td className="py-2.5 pr-3">
                        <Switch
                          checked={rule.notifyManager}
                          onCheckedChange={(v) =>
                            setAutoNotify(row.value, "notifyManager", v)
                          }
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <Switch
                          checked={rule.notifyOwner}
                          onCheckedChange={(v) =>
                            setAutoNotify(row.value, "notifyOwner", v)
                          }
                        />
                      </td>
                      <td className="py-2.5">
                        <Switch
                          checked={rule.notifyEmergencyContact}
                          onCheckedChange={(v) =>
                            setAutoNotify(
                              row.value,
                              "notifyEmergencyContact",
                              v,
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
