"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  UtensilsCrossed,
  Pill,
  Backpack,
  Phone,
  Syringe,
  FileText,
  Plus,
  Trash2,
  Shield,
  Clock,
  Layers,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import { facilityStaff } from "@/data/facility-staff";
import { getCurrentUserId } from "@/lib/role-utils";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { checkinMutations } from "@/lib/api/checkin-requirements";
import type { ExpressCheckinConfig } from "@/data/checkin-requirements";

type Requirement = "required" | "optional" | "disabled";

const SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
  { value: "evaluation", label: "Evaluation" },
];

// Sentinel for the per-service dropdown's "inherit the default" choice.
const INHERIT = "__default__";

interface SectionConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  value: Requirement;
}

const defaultFacility = facilities.find((f) => f.id === 11);
const defaultConfig = defaultFacility?.expressCheckinConfig;

const REQUIREMENT_OPTIONS: {
  value: Requirement;
  label: string;
  color: string;
}[] = [
  { value: "required", label: "Required", color: "text-red-600" },
  { value: "optional", label: "Optional", color: "text-amber-600" },
  { value: "disabled", label: "Disabled", color: "text-muted-foreground" },
];

let _customSeq = 900;
function nextCustomId(): string {
  _customSeq += 1;
  return `custom-${_customSeq}`;
}

export function CheckinRequirementsSettings() {
  const { role } = useFacilityRole();

  const [sections, setSections] = useState<Record<string, Requirement>>({
    feeding: defaultConfig?.sections.feeding ?? "required",
    medication: defaultConfig?.sections.medication ?? "required",
    belongings: defaultConfig?.sections.belongings ?? "optional",
    additionalContacts:
      defaultConfig?.sections.additionalContacts ?? "required",
    vaccination: defaultConfig?.sections.vaccination ?? "required",
    waiver: defaultConfig?.sections.waiver ?? "required",
  });

  const [customSections, setCustomSections] = useState(
    defaultConfig?.customSections ?? [],
  );
  const [sendBefore, setSendBefore] = useState(defaultConfig?.sendBefore ?? 48);
  const [reminderHours, setReminderHours] = useState(
    defaultConfig?.reminderHours ?? 24,
  );
  const [newCustomName, setNewCustomName] = useState("");
  const [serviceOverrides, setServiceOverrides] = useState<
    Record<string, Record<string, Requirement>>
  >(
    (
      defaultConfig as
        | { serviceOverrides?: Record<string, Record<string, Requirement>> }
        | undefined
    )?.serviceOverrides ?? {},
  );
  const [selectedService, setSelectedService] = useState(
    SERVICE_OPTIONS[0].value,
  );

  // Test-send recipient — defaults to the logged-in user's email.
  const [testEmail, setTestEmail] = useState(() => {
    const uid = getCurrentUserId();
    return (
      facilityStaff.find((s) => s.id === uid)?.email ??
      facilityStaff[0]?.email ??
      ""
    );
  });

  const sendTest = (what: string) => {
    const email = testEmail.trim();
    if (!email) return;
    toast.success(`Test ${what} sent to ${email}`);
  };

  const queryClient = useQueryClient();

  const builtInSections: SectionConfig[] = [
    {
      key: "feeding",
      label: "Feeding Instructions",
      icon: UtensilsCrossed,
      value: sections.feeding,
    },
    {
      key: "medication",
      label: "Medication Instructions",
      icon: Pill,
      value: sections.medication,
    },
    {
      key: "belongings",
      label: "Belongings Checklist",
      icon: Backpack,
      value: sections.belongings,
    },
    {
      key: "additionalContacts",
      label: "Additional Contacts Verification",
      icon: Phone,
      value: sections.additionalContacts,
    },
    {
      key: "vaccination",
      label: "Vaccination Verification",
      icon: Syringe,
      value: sections.vaccination,
    },
    {
      key: "waiver",
      label: "Waiver / Agreement Confirmation",
      icon: FileText,
      value: sections.waiver,
    },
  ];

  const requirementLabel = (v: Requirement) =>
    REQUIREMENT_OPTIONS.find((o) => o.value === v)?.label ?? v;
  const serviceLabel = (v: string) =>
    SERVICE_OPTIONS.find((s) => s.value === v)?.label ?? v;

  // Persist every change immediately through the query layer. Building the full
  // config from the changed slice keeps writes correct despite async setState.
  const saveConfig = useMutation({
    ...checkinMutations.save(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkin-requirements"] });
    },
  });

  const commit = (overrides: Partial<ExpressCheckinConfig>) => {
    const next: ExpressCheckinConfig = {
      sections,
      customSections,
      sendBefore,
      reminderHours,
      serviceOverrides,
      ...overrides,
    };
    saveConfig.mutate(next);
  };

  const updateBuiltInRequirement = (
    key: string,
    label: string,
    value: Requirement,
  ) => {
    const next = { ...sections, [key]: value };
    setSections(next);
    commit({ sections: next });
    toast.success(`${label} default set to ${requirementLabel(value)}`);
  };

  const updateCustomRequirement = (idx: number, value: Requirement) => {
    const next = customSections.map((c, i) =>
      i === idx ? { ...c, type: value } : c,
    );
    setCustomSections(next);
    commit({ customSections: next });
    const name = customSections[idx]?.name?.trim() || "Custom section";
    toast.success(`${name} default set to ${requirementLabel(value)}`);
  };

  // Effective requirement for a section under the selected service.
  const effectiveForService = (
    service: string,
    sectionKey: string,
  ): Requirement =>
    serviceOverrides[service]?.[sectionKey] ??
    sections[sectionKey] ??
    customSections.find((c) => c.id === sectionKey)?.type ??
    "optional";

  const setServiceOverride = (
    service: string,
    sectionKey: string,
    sectionLabel: string,
    defaultValue: Requirement,
    value: Requirement | typeof INHERIT,
  ) => {
    const forService = { ...(serviceOverrides[service] ?? {}) };
    if (value === INHERIT || value === defaultValue) {
      delete forService[sectionKey];
    } else {
      forService[sectionKey] = value;
    }
    const next = { ...serviceOverrides };
    if (Object.keys(forService).length === 0) delete next[service];
    else next[service] = forService;
    setServiceOverrides(next);
    commit({ serviceOverrides: next });
    toast.success(
      value === INHERIT
        ? `${sectionLabel} for ${serviceLabel(service)} now follows the default`
        : `${sectionLabel} for ${serviceLabel(service)} set to ${requirementLabel(value)}`,
    );
  };

  const updateCustomName = (idx: number, name: string) => {
    const next = customSections.map((c, i) => (i === idx ? { ...c, name } : c));
    setCustomSections(next);
    commit({ customSections: next });
  };

  const removeCustomSection = (idx: number) => {
    const next = customSections.filter((_, i) => i !== idx);
    setCustomSections(next);
    commit({ customSections: next });
  };

  const addCustomSection = () => {
    const name = newCustomName.trim();
    if (!name) return;
    const next = [
      ...customSections,
      { id: nextCustomId(), name, type: "optional" as Requirement },
    ];
    setCustomSections(next);
    commit({ customSections: next });
    setNewCustomName("");
  };

  const updateSendBefore = (value: number) => {
    setSendBefore(value);
    commit({ sendBefore: value });
  };

  const updateReminderHours = (value: number) => {
    setReminderHours(value);
    commit({ reminderHours: value });
  };

  const handleSave = () => {
    commit({});
    toast.success("Express Check-in requirements saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Check-in settings are only accessible to facility owners and
            managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Yipyy Express Check-in Requirements
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure what information customers must provide via Express Check-in
          before their appointment. Like airline check-in — customers verify and
          fill in all details before arrival.
        </p>
      </div>

      {/* Built-in sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardCheck className="size-4" />
            Check-in Sections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {builtInSections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.key}
                className="bg-background flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="text-muted-foreground size-4" />
                  <span className="text-sm font-medium">{section.label}</span>
                </div>
                <Select
                  value={section.value}
                  onValueChange={(v) =>
                    updateBuiltInRequirement(
                      section.key,
                      section.label,
                      v as Requirement,
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Custom sections */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="size-4" />
              Custom Sections
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {customSections.map((cs, idx) => (
            <div
              key={cs.id}
              className="bg-background flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <Input
                value={cs.name}
                onChange={(e) => updateCustomName(idx, e.target.value)}
                className="h-7 max-w-[200px] border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                <Select
                  value={cs.type}
                  onValueChange={(v) =>
                    updateCustomRequirement(idx, v as Requirement)
                  }
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                  onClick={() => removeCustomSection(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newCustomName}
              onChange={(e) => setNewCustomName(e.target.value)}
              placeholder="Add custom section..."
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomSection();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newCustomName.trim()}
              onClick={addCustomSection}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service-specific overrides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="size-4" />
            Service-specific check-in requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Override the defaults above for a specific service — e.g. require
            Feeding Instructions for Boarding but disable it for Daycare. Leave
            a row on <span className="font-medium">Default</span> to inherit.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Configuring
            </span>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {[
              ...builtInSections.map((s) => ({
                key: s.key,
                label: s.label,
                defaultValue: s.value,
              })),
              ...customSections.map((cs) => ({
                key: cs.id,
                label: cs.name.trim() || "Untitled section",
                defaultValue: cs.type,
              })),
            ].map((section) => {
              const override = serviceOverrides[selectedService]?.[section.key];
              const effective = effectiveForService(
                selectedService,
                section.key,
              );
              return (
                <div
                  key={section.key}
                  className="bg-background flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {section.label}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Default: {requirementLabel(section.defaultValue)}
                      {override && (
                        <span className="ml-1 text-sky-600">
                          · overridden to {requirementLabel(effective)}
                        </span>
                      )}
                    </p>
                  </div>
                  <Select
                    value={override ?? INHERIT}
                    onValueChange={(v) =>
                      setServiceOverride(
                        selectedService,
                        section.key,
                        section.label,
                        section.defaultValue,
                        v as Requirement | typeof INHERIT,
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={INHERIT} className="text-xs">
                        <span className="text-muted-foreground">Default</span>
                      </SelectItem>
                      {REQUIREMENT_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4" />
            Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Send check-in form</p>
              <p className="text-muted-foreground text-xs">
                Hours before appointment to send the form link
              </p>
            </div>
            <Select
              value={String(sendBefore)}
              onValueChange={(v) => updateSendBefore(parseInt(v, 10))}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours before</SelectItem>
                <SelectItem value="48">48 hours before</SelectItem>
                <SelectItem value="72">72 hours before</SelectItem>
                <SelectItem value="168">1 week before</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Send reminder</p>
              <p className="text-muted-foreground text-xs">
                Remind customer if form not completed
              </p>
            </div>
            <Select
              value={String(reminderHours)}
              onValueChange={(v) => updateReminderHours(parseInt(v, 10))}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 hours before</SelectItem>
                <SelectItem value="12">12 hours before</SelectItem>
                <SelectItem value="24">24 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Testing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="size-4" />
            Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="test-recipient" className="text-xs">
              Send to
            </Label>
            <Input
              id="test-recipient"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-9 max-w-sm text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Test messages are sent to this address (defaults to your account
              email).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!testEmail.trim()}
              onClick={() => sendTest("check-in form")}
            >
              <Send className="size-3.5" />
              Send check-in form
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!testEmail.trim()}
              onClick={() => sendTest("reminder")}
            >
              <Send className="size-3.5" />
              Send reminder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Check-in Settings
        </Button>
      </div>
    </div>
  );
}
