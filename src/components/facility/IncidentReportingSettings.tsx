"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Siren, DollarSign, Users, Camera, Bell } from "lucide-react";
import { toast } from "sonner";
import {
  getIncidentReportingConfig,
  saveIncidentReportingConfig,
  type IncidentReportingConfig,
  type IncidentMedFeeMode,
} from "@/data/facility-config";
import type { AssigneeRole, IncidentSeverity } from "@/types/incidents";

const ASSIGNEE_ROLE_OPTIONS: { value: AssigneeRole; label: string }[] = [
  { value: "reporter", label: "Staff who reported" },
  { value: "manager", label: "Facility manager" },
  { value: "any_staff", label: "Front desk / any available staff" },
  { value: "specific", label: "Specific named staff" },
];

// Severity rows for the auto-notify grid (highest first).
const SEVERITY_ROWS: { value: IncidentSeverity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function IncidentReportingSettings() {
  const [config, setConfig] = useState<IncidentReportingConfig>(() =>
    getIncidentReportingConfig(),
  );
  const [saved, setSaved] = useState<IncidentReportingConfig>(() =>
    getIncidentReportingConfig(),
  );

  const isDirty = JSON.stringify(config) !== JSON.stringify(saved);

  const handleSave = () => {
    saveIncidentReportingConfig(config);
    setSaved(config);
    toast.success("Incident reporting settings saved");
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
            <CardTitle className="flex items-center gap-2">
              <Siren className="size-5" />
              Incident Reporting
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Defaults and safeguards for how staff report and follow up on
              incidents.
            </p>
          </div>
          {isDirty && (
            <Button size="sm" onClick={handleSave}>
              Save changes
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
                Charge for facility-provided incident medications
              </Label>
              <p className="text-muted-foreground text-xs">
                Bill owners for medications the facility gives during an
                incident&apos;s in-stay care.
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
            <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fee type</Label>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_admin">
                      Flat fee per administration (per Give log)
                    </SelectItem>
                    <SelectItem value="one_time">
                      One-time flat fee (when the med is created)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Amount ($)</Label>
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
                  className="w-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* (2) Default assigned role for follow-up tasks */}
        <div className="space-y-2 rounded-lg border p-4">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" />
            Default assigned role for follow-up tasks
          </Label>
          <p className="text-muted-foreground text-xs">
            Pre-filled as the assignee on new protocol steps. Staff can override
            per step.
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
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNEE_ROLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
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
              Require photo on Critical incidents
            </Label>
            <p className="text-muted-foreground text-xs">
              When on, filing a Critical incident is blocked until at least one
              photo is attached.
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
              Auto-notify rules by severity
            </Label>
            <p className="text-muted-foreground text-xs">
              Who is automatically notified when an incident of each severity is
              reported.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th className="py-2 pr-3 font-medium">Severity</th>
                  <th className="py-2 pr-3 font-medium">Notify manager</th>
                  <th className="py-2 pr-3 font-medium">Notify owner</th>
                  <th className="py-2 font-medium">Emergency contact</th>
                </tr>
              </thead>
              <tbody>
                {SEVERITY_ROWS.map((row) => {
                  const rule = config.autoNotify[row.value];
                  return (
                    <tr key={row.value} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium capitalize">
                        {row.label}
                      </td>
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
