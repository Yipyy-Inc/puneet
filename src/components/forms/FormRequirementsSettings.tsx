"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Eye,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formRequirements,
  type ServiceFormRequirementsConfig,
  type ServiceFormRequirement,
  type FormRequirementGate,
} from "@/data/settings";
import { formMutations } from "@/lib/api/forms";

// Read-only field preview — lazy-loaded so its chunk only downloads when an
// admin actually opens a preview.
const FormPreviewSheet = dynamic(
  () =>
    import("@/components/forms/FormPreviewSheet").then((m) => ({
      default: m.FormPreviewSheet,
    })),
  { ssr: false },
);

const STAGE_CONFIG: Record<
  string,
  { label: string; description: string; icon: React.ReactNode }
> = {
  before_booking: {
    label: "Before booking",
    description: "Customer must complete before requesting a booking",
    icon: <CalendarCheck className="size-3.5" />,
  },
  before_approval: {
    label: "Before approval",
    description: "Staff cannot approve booking until this form is submitted",
    icon: <ClipboardCheck className="size-3.5" />,
  },
  before_checkin: {
    label: "Before check-in",
    description: "Required before pet can be checked in",
    icon: <DoorOpen className="size-3.5" />,
  },
};

const ENFORCEMENT_STYLES: Record<
  FormRequirementGate["enforcement"],
  { label: string; icon: React.ReactNode; trigger: string; itemText: string }
> = {
  block: {
    label: "Blocks this stage",
    icon: <Ban className="size-4" />,
    // Dominant, high-contrast red pill.
    trigger: "border-red-300 bg-red-100 text-red-800 hover:bg-red-100",
    itemText: "text-red-700",
  },
  warn: {
    label: "Warns only",
    icon: <AlertTriangle className="size-4" />,
    // Dominant amber pill.
    trigger: "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100",
    itemText: "text-amber-700",
  },
};

/** Demo form list — in production this would come from getFormsByFacility() */
const AVAILABLE_FORMS = [
  { id: "form-intake-demo", name: "New Client Intake Form" },
  { id: "form-vaccine-upload", name: "Vaccination Records" },
  {
    id: "form-boarding-agreement",
    name: "Boarding Agreement & Liability Waiver",
  },
  {
    id: "form-training-questionnaire",
    name: "Training Goals & Behavior Questionnaire",
  },
  { id: "form-grooming-consent", name: "Grooming Consent Form" },
  { id: "form-emergency-contact", name: "Emergency Contact & Authorization" },
];

export function FormRequirementsSettings() {
  const [configs, setConfigs] = useState<ServiceFormRequirementsConfig[]>(() =>
    JSON.parse(JSON.stringify(formRequirements)),
  );
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();

  // Any edit routes through here so the dirty state (and the sticky Save bar)
  // stays in sync.
  const applyChange = (
    updater: (
      prev: ServiceFormRequirementsConfig[],
    ) => ServiceFormRequirementsConfig[],
  ) => {
    setConfigs(updater);
    setDirty(true);
  };

  const updateRequirement = (
    serviceIdx: number,
    reqIdx: number,
    patch: Partial<ServiceFormRequirement>,
  ) => {
    applyChange((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev),
      ) as ServiceFormRequirementsConfig[];
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
    applyChange((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev),
      ) as ServiceFormRequirementsConfig[];
      Object.assign(
        next[serviceIdx].requirements[reqIdx].gates[gateIdx],
        patch,
      );
      return next;
    });
  };

  const addGate = (serviceIdx: number, reqIdx: number) => {
    applyChange((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev),
      ) as ServiceFormRequirementsConfig[];
      const existing = next[serviceIdx].requirements[reqIdx].gates.map(
        (g) => g.stage,
      );
      const available = (
        ["before_booking", "before_approval", "before_checkin"] as const
      ).filter((s) => !existing.includes(s));
      if (available.length === 0) return prev;
      next[serviceIdx].requirements[reqIdx].gates.push({
        stage: available[0],
        enforcement: "warn",
      });
      return next;
    });
  };

  const removeGate = (serviceIdx: number, reqIdx: number, gateIdx: number) => {
    applyChange((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev),
      ) as ServiceFormRequirementsConfig[];
      next[serviceIdx].requirements[reqIdx].gates.splice(gateIdx, 1);
      return next;
    });
  };

  const addRequirement = (serviceIdx: number) => {
    applyChange((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev),
      ) as ServiceFormRequirementsConfig[];
      const existingIds = next[serviceIdx].requirements.map((r) => r.formId);
      const available = AVAILABLE_FORMS.find(
        (f) => !existingIds.includes(f.id),
      );
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
    applyChange((prev) => {
      const next = JSON.parse(
        JSON.stringify(prev),
      ) as ServiceFormRequirementsConfig[];
      next[serviceIdx].requirements.splice(reqIdx, 1);
      return next;
    });
  };

  const saveRequirements = useMutation({
    ...formMutations.saveRequirements(configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms", "requirements"] });
      setDirty(false);
      toast.success("Form requirements saved");
    },
  });

  const handleSave = () => {
    saveRequirements.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="text-primary size-5" />
            <CardTitle>Form Requirements per Service</CardTitle>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure which forms are required before customers can book, staff
            can approve, or pets can be checked in. Choose to{" "}
            <strong>block</strong> the step entirely or{" "}
            <strong>allow with a warning banner</strong>.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {configs.map((serviceConfig, sIdx) => {
            const enabledReqs = serviceConfig.requirements.filter(
              (r) => r.enabled,
            );
            // Count how many forms gate each stage (a form counts once per stage).
            const stageSummary = (
              ["before_booking", "before_approval", "before_checkin"] as const
            )
              .map((stage) => ({
                stage,
                count: enabledReqs.filter((r) =>
                  r.gates.some((g) => g.stage === stage),
                ).length,
              }))
              .filter((s) => s.count > 0);
            const summaryLine =
              stageSummary.length === 0
                ? "No forms required — customers can book freely"
                : stageSummary
                    .map(
                      (s) =>
                        `${s.count} form${s.count === 1 ? "" : "s"} required ${STAGE_CONFIG[
                          s.stage
                        ].label.toLowerCase()}`,
                    )
                    .join(" · ");

            return (
              <div
                key={serviceConfig.serviceType}
                className="rounded-lg border"
              >
                {/* Service header */}
                <div className="bg-muted/30 flex items-center justify-between rounded-t-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex size-8 items-center justify-center rounded-md">
                      <FileText className="text-primary size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {serviceConfig.serviceLabel}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {summaryLine}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addRequirement(sIdx)}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add form
                  </Button>
                </div>

                {/* Requirements list */}
                <div className="space-y-3 p-4">
                  {serviceConfig.requirements.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No form requirements. Customers can book freely.
                    </p>
                  ) : (
                    serviceConfig.requirements.map((req, rIdx) => (
                      <div
                        key={req.formId}
                        className={`rounded-md border p-3 transition-colors ${req.enabled ? "bg-white" : "bg-muted/20 opacity-60"} `}
                      >
                        {/* Requirement header row */}
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Switch
                              checked={req.enabled}
                              onCheckedChange={(v) =>
                                updateRequirement(sIdx, rIdx, { enabled: v })
                              }
                            />
                            <Select
                              value={req.formId}
                              onValueChange={(v) => {
                                const form = AVAILABLE_FORMS.find(
                                  (f) => f.id === v,
                                );
                                if (form)
                                  updateRequirement(sIdx, rIdx, {
                                    formId: v,
                                    formName: form.name,
                                  });
                              }}
                            >
                              <SelectTrigger className="h-8 flex-1 text-sm">
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
                              className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                              onClick={() =>
                                setPreview({
                                  id: req.formId,
                                  name: req.formName,
                                })
                              }
                              aria-label={`Preview ${req.formName}`}
                              title="Preview form fields"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive size-7 shrink-0"
                              onClick={() => removeRequirement(sIdx, rIdx)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Gates */}
                        {req.enabled && (
                          <div className="ml-10 space-y-2">
                            {req.gates.map((gate, gIdx) => (
                              <div
                                key={gIdx}
                                className="flex flex-wrap items-center gap-2"
                              >
                                {/* Enforcement — the dominant, colour-coded pill */}
                                <Select
                                  value={gate.enforcement}
                                  onValueChange={(v) =>
                                    updateGate(sIdx, rIdx, gIdx, {
                                      enforcement:
                                        v as FormRequirementGate["enforcement"],
                                    })
                                  }
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "h-9 w-[184px] gap-2 rounded-full border-2 px-3.5 text-sm font-semibold shadow-sm focus:ring-2",
                                      ENFORCEMENT_STYLES[gate.enforcement]
                                        .trigger,
                                    )}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="block">
                                      <span
                                        className={cn(
                                          "flex items-center gap-2 font-semibold",
                                          ENFORCEMENT_STYLES.block.itemText,
                                        )}
                                      >
                                        {ENFORCEMENT_STYLES.block.icon}
                                        {ENFORCEMENT_STYLES.block.label}
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="warn">
                                      <span
                                        className={cn(
                                          "flex items-center gap-2 font-semibold",
                                          ENFORCEMENT_STYLES.warn.itemText,
                                        )}
                                      >
                                        {ENFORCEMENT_STYLES.warn.icon}
                                        {ENFORCEMENT_STYLES.warn.label}
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <span className="text-muted-foreground text-xs font-medium">
                                  at
                                </span>

                                {/* Timing — clear secondary chip */}
                                <Select
                                  value={gate.stage}
                                  onValueChange={(v) =>
                                    updateGate(sIdx, rIdx, gIdx, {
                                      stage: v as FormRequirementGate["stage"],
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-muted/40 h-9 w-[178px] gap-1.5 border-2 text-sm font-medium [&>svg]:opacity-70">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="before_booking">
                                      <span className="flex items-center gap-2">
                                        <CalendarCheck className="size-4" />
                                        Before booking
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="before_approval">
                                      <span className="flex items-center gap-2">
                                        <ClipboardCheck className="size-4" />
                                        Before approval
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="before_checkin">
                                      <span className="flex items-center gap-2">
                                        <DoorOpen className="size-4" />
                                        Before check-in
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {req.gates.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    onClick={() => removeGate(sIdx, rIdx, gIdx)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {req.gates.length < 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground h-6 text-xs"
                                onClick={() => addGate(sIdx, rIdx)}
                              >
                                <Plus className="mr-1 size-3" />
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
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" />
            Requirements overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              ["before_booking", "before_approval", "before_checkin"] as const
            ).map((stage) => {
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
                      })),
                  ),
              );

              return (
                <div key={stage} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    {stageInfo.icon}
                    <span className="text-sm font-semibold">
                      {stageInfo.label}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {allAtStage.length}
                    </Badge>
                  </div>
                  {allAtStage.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No requirements at this stage
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {allAtStage.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {item.enforcement === "block" ? (
                            <ShieldAlert className="size-3 shrink-0 text-red-500" />
                          ) : (
                            <CheckCircle className="size-3 shrink-0 text-amber-500" />
                          )}
                          <span className="truncate">
                            <span className="font-medium">{item.service}</span>
                            <span className="text-muted-foreground"> · </span>
                            {item.form}
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

      {preview && (
        <FormPreviewSheet
          formId={preview.id}
          formName={preview.name}
          open
          onOpenChange={(o) => {
            if (!o) setPreview(null);
          }}
        />
      )}

      {/* Sticky save bar — makes explicit that changes require an explicit save */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t py-3 backdrop-blur-sm">
        {dirty && (
          <span className="text-muted-foreground mr-auto text-sm">
            You have unsaved changes
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={!dirty || saveRequirements.isPending}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {saveRequirements.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
