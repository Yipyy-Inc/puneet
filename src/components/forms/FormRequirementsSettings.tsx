"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  CalendarCheck,
  ClipboardCheck,
  DoorOpen,
  AlertTriangle,
  CheckCircle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import {
  formRequirements,
  type ServiceFormRequirementsConfig,
  type ServiceFormRequirement,
  type FormRequirementGate,
} from "@/data/settings";

const STAGE_CONFIG: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  before_booking: {
    label: "Before booking",
    description: "Customer must complete before requesting a booking",
    icon: <CalendarCheck className="h-3.5 w-3.5" />,
  },
  before_approval: {
    label: "Before approval",
    description: "Staff cannot approve booking until this form is submitted",
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
  },
  before_checkin: {
    label: "Before check-in",
    description: "Required before pet can be checked in",
    icon: <DoorOpen className="h-3.5 w-3.5" />,
  },
};

const ENFORCEMENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  block: {
    label: "Block step",
    icon: <Ban className="h-3 w-3" />,
    color: "bg-red-50 text-red-700 border-red-200",
  },
  warn: {
    label: "Allow with banner",
    icon: <AlertTriangle className="h-3 w-3" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

/** Demo form list — in production this would come from getFormsByFacility() */
const AVAILABLE_FORMS = [
  { id: "form-intake-demo", name: "New Client Intake Form" },
  { id: "form-vaccine-upload", name: "Vaccination Records" },
  { id: "form-boarding-agreement", name: "Boarding Agreement & Liability Waiver" },
  { id: "form-training-questionnaire", name: "Training Goals & Behavior Questionnaire" },
  { id: "form-grooming-consent", name: "Grooming Consent Form" },
  { id: "form-emergency-contact", name: "Emergency Contact & Authorization" },
];

export function FormRequirementsSettings() {
  const [configs, setConfigs] = useState<ServiceFormRequirementsConfig[]>(() =>
    JSON.parse(JSON.stringify(formRequirements))
  );

  const updateRequirement = (
    serviceIdx: number,
    reqIdx: number,
    patch: Partial<ServiceFormRequirement>,
  ) => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ServiceFormRequirementsConfig[];
      Object.assign(next[serviceIdx].requirements[reqIdx], patch);
      return next;
    });
  };

  const updateGate = (
    serviceIdx: number,
    reqIdx: number,
    gateIdx: number,
    patch: Partial<FormRequirementGate>,
  ) => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ServiceFormRequirementsConfig[];
      Object.assign(next[serviceIdx].requirements[reqIdx].gates[gateIdx], patch);
      return next;
    });
  };

  const addGate = (serviceIdx: number, reqIdx: number) => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ServiceFormRequirementsConfig[];
      const existing = next[serviceIdx].requirements[reqIdx].gates.map((g) => g.stage);
      const available = (["before_booking", "before_approval", "before_checkin"] as const).filter(
        (s) => !existing.includes(s),
      );
      if (available.length === 0) return prev;
      next[serviceIdx].requirements[reqIdx].gates.push({
        stage: available[0],
        enforcement: "warn",
      });
      return next;
    });
  };

  const removeGate = (serviceIdx: number, reqIdx: number, gateIdx: number) => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ServiceFormRequirementsConfig[];
      next[serviceIdx].requirements[reqIdx].gates.splice(gateIdx, 1);
      return next;
    });
  };

  const addRequirement = (serviceIdx: number) => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ServiceFormRequirementsConfig[];
      const existingIds = next[serviceIdx].requirements.map((r) => r.formId);
      const available = AVAILABLE_FORMS.find((f) => !existingIds.includes(f.id));
      if (!available) {
        toast.error("All available forms are already added");
        return prev;
      }
      next[serviceIdx].requirements.push({
        formId: available.id,
        formName: available.name,
        gates: [{ stage: "before_booking", enforcement: "warn" }],
        enabled: true,
      });
      return next;
    });
  };

  const removeRequirement = (serviceIdx: number, reqIdx: number) => {
    setConfigs((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ServiceFormRequirementsConfig[];
      next[serviceIdx].requirements.splice(reqIdx, 1);
      return next;
    });
  };

  const handleSave = () => {
    toast.success("Form requirements saved");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Form Requirements per Service</CardTitle>
            </div>
            <Button size="sm" onClick={handleSave}>
              Save changes
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which forms are required before customers can book, staff can approve, or pets can be checked in.
            Choose to <strong>block</strong> the step entirely or <strong>allow with a warning banner</strong>.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {configs.map((serviceConfig, sIdx) => {
            const activeCount = serviceConfig.requirements.filter((r) => r.enabled).length;
            const blockerCount = serviceConfig.requirements
              .filter((r) => r.enabled)
              .flatMap((r) => r.gates)
              .filter((g) => g.enforcement === "block").length;

            return (
              <div key={serviceConfig.serviceType} className="rounded-lg border">
                {/* Service header */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{serviceConfig.serviceLabel}</h3>
                      <p className="text-xs text-muted-foreground">
                        {activeCount} required form{activeCount !== 1 ? "s" : ""}
                        {blockerCount > 0 && (
                          <span className="text-red-600 ml-1">
                            ({blockerCount} blocking)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addRequirement(sIdx)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add form
                  </Button>
                </div>

                {/* Requirements list */}
                <div className="p-4 space-y-3">
                  {serviceConfig.requirements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No form requirements. Customers can book freely.
                    </p>
                  ) : (
                    serviceConfig.requirements.map((req, rIdx) => (
                      <div
                        key={req.formId}
                        className={`rounded-md border p-3 transition-colors ${
                          req.enabled ? "bg-white" : "bg-muted/20 opacity-60"
                        }`}
                      >
                        {/* Requirement header row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Switch
                              checked={req.enabled}
                              onCheckedChange={(v) => updateRequirement(sIdx, rIdx, { enabled: v })}
                            />
                            <Select
                              value={req.formId}
                              onValueChange={(v) => {
                                const form = AVAILABLE_FORMS.find((f) => f.id === v);
                                if (form) updateRequirement(sIdx, rIdx, { formId: v, formName: form.name });
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_FORMS.map((f) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-destructive"
                              onClick={() => removeRequirement(sIdx, rIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Gates */}
                        {req.enabled && (
                          <div className="ml-10 space-y-2">
                            {req.gates.map((gate, gIdx) => (
                              <div key={gIdx} className="flex items-center gap-2 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                                  {STAGE_CONFIG[gate.stage]?.icon}
                                  <Select
                                    value={gate.stage}
                                    onValueChange={(v) =>
                                      updateGate(sIdx, rIdx, gIdx, { stage: v as FormRequirementGate["stage"] })
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs w-[150px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="before_booking">Before booking</SelectItem>
                                      <SelectItem value="before_approval">Before approval</SelectItem>
                                      <SelectItem value="before_checkin">Before check-in</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Select
                                  value={gate.enforcement}
                                  onValueChange={(v) =>
                                    updateGate(sIdx, rIdx, gIdx, { enforcement: v as "block" | "warn" })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs w-[160px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="block">
                                      <span className="flex items-center gap-1.5">
                                        <Ban className="h-3 w-3 text-red-600" />
                                        Block step
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="warn">
                                      <span className="flex items-center gap-1.5">
                                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                                        Allow with banner
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {req.gates.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => removeGate(sIdx, rIdx, gIdx)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {req.gates.length < 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground"
                                onClick={() => addGate(sIdx, rIdx)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add stage gate
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary overview card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Requirements overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["before_booking", "before_approval", "before_checkin"] as const).map((stage) => {
              const stageInfo = STAGE_CONFIG[stage];
              const allAtStage = configs.flatMap((c) =>
                c.requirements
                  .filter((r) => r.enabled)
                  .flatMap((r) =>
                    r.gates
                      .filter((g) => g.stage === stage)
                      .map((g) => ({
                        service: c.serviceLabel,
                        form: r.formName,
                        enforcement: g.enforcement,
                      }))
                  )
              );

              return (
                <div key={stage} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {stageInfo.icon}
                    <span className="text-sm font-semibold">{stageInfo.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {allAtStage.length}
                    </Badge>
                  </div>
                  {allAtStage.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No requirements at this stage</p>
                  ) : (
                    <div className="space-y-1">
                      {allAtStage.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          {item.enforcement === "block" ? (
                            <ShieldAlert className="h-3 w-3 text-red-500 shrink-0" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">
                            <span className="font-medium">{item.service}</span>: {item.form}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
