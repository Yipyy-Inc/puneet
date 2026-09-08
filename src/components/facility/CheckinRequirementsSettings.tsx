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
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";
import type { ExpressCheckinConfig } from "@/data/checkin-requirements";
import { SETTINGS_CARD_GRID } from "@/components/ui/settings-card-grid";

type Requirement = "required" | "optional" | "disabled";

const SERVICE_OPTIONS: { value: string; key: string }[] = [
  { value: "boarding", key: "svcBoarding" },
  { value: "daycare", key: "svcDaycare" },
  { value: "grooming", key: "svcGrooming" },
  { value: "training", key: "svcTraining" },
  { value: "evaluation", key: "svcEvaluation" },
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
  key: string;
  color: string;
}[] = [
  { value: "required", key: "reqRequired", color: "text-red-600" },
  { value: "optional", key: "reqOptional", color: "text-amber-600" },
  { value: "disabled", key: "reqDisabled", color: "text-muted-foreground" },
];

let _customSeq = 900;
function nextCustomId(): string {
  _customSeq += 1;
  return `custom-${_customSeq}`;
}

export function CheckinRequirementsSettings() {
  const t = useSettingsText().section("checkin-requirements");
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

  const sendTest = (messageKey: "testFormSent" | "testReminderSent") => {
    const email = testEmail.trim();
    if (!email) return;
    toast.success(t(messageKey).replace("{email}", email));
  };

  const queryClient = useQueryClient();

  const builtInSections: SectionConfig[] = [
    {
      key: "feeding",
      label: t("secFeeding"),
      icon: UtensilsCrossed,
      value: sections.feeding,
    },
    {
      key: "medication",
      label: t("secMedication"),
      icon: Pill,
      value: sections.medication,
    },
    {
      key: "belongings",
      label: t("secBelongings"),
      icon: Backpack,
      value: sections.belongings,
    },
    {
      key: "additionalContacts",
      label: t("secContacts"),
      icon: Phone,
      value: sections.additionalContacts,
    },
    {
      key: "vaccination",
      label: t("secVaccination"),
      icon: Syringe,
      value: sections.vaccination,
    },
    {
      key: "waiver",
      label: t("secWaiver"),
      icon: FileText,
      value: sections.waiver,
    },
  ];

  const requirementLabel = (v: Requirement) => {
    const option = REQUIREMENT_OPTIONS.find((o) => o.value === v);
    return option ? t(option.key) : v;
  };
  const serviceLabel = (v: string) => {
    const option = SERVICE_OPTIONS.find((s) => s.value === v);
    return option ? t(option.key) : v;
  };

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
    toast.success(
      t("defaultSetTo")
        .replace("{section}", label)
        .replace("{value}", requirementLabel(value)),
    );
  };

  const updateCustomRequirement = (idx: number, value: Requirement) => {
    const next = customSections.map((c, i) =>
      i === idx ? { ...c, type: value } : c,
    );
    setCustomSections(next);
    commit({ customSections: next });
    const name = customSections[idx]?.name?.trim() || t("customSection");
    toast.success(
      t("defaultSetTo")
        .replace("{section}", name)
        .replace("{value}", requirementLabel(value)),
    );
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
        ? t("overrideCleared")
            .replace("{section}", sectionLabel)
            .replace("{service}", serviceLabel(service))
        : t("overrideSet")
            .replace("{section}", sectionLabel)
            .replace("{service}", serviceLabel(service))
            .replace("{value}", requirementLabel(value)),
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
    toast.success(t("saved"));
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">{t("restricted")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    // Measured 620 vs 208 on row 2 — 412px of white if stretched.
    <div className={`${SETTINGS_CARD_GRID} items-start`}>
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
      </div>

      {/* Built-in sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ClipboardCheck className="size-4" />
            {t("sectionsTitle")}
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
                  <SelectTrigger className="min-w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        <span className={opt.color}>{t(opt.key)}</span>
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
              {t("customTitle")}
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
                  <SelectTrigger className="min-w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        <span className={opt.color}>{t(opt.key)}</span>
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
              placeholder={t("addCustomPlaceholder")}
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
            {t("serviceTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            <InterpolatedText
              template={t("serviceHelp")}
              placeholder="{default}"
            >
              <span className="font-medium">{t("optDefault")}</span>
            </InterpolatedText>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {t("configuring")}
            </span>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {t(s.key)}
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
                label: cs.name.trim() || t("untitledSection"),
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
                      {t("defaultIs").replace(
                        "{value}",
                        requirementLabel(section.defaultValue),
                      )}
                      {override && (
                        <span className="ml-1 text-sky-600">
                          {" "}
                          {t("overriddenTo").replace(
                            "{value}",
                            requirementLabel(effective),
                          )}
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
                    <SelectTrigger className="min-w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={INHERIT} className="text-xs">
                        <span className="text-muted-foreground">
                          {t("optDefault")}
                        </span>
                      </SelectItem>
                      {REQUIREMENT_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          <span className={opt.color}>{t(opt.key)}</span>
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
            {t("timingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("sendForm")}</p>
              <p className="text-muted-foreground text-xs">
                {t("sendFormHelp")}
              </p>
            </div>
            <Select
              value={String(sendBefore)}
              onValueChange={(v) => updateSendBefore(parseInt(v, 10))}
            >
              <SelectTrigger className="min-w-[170px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[24, 48, 72].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {t("hoursBefore").replace("{n}", String(h))}
                  </SelectItem>
                ))}
                <SelectItem value="168">{t("weekBefore")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("sendReminder")}</p>
              <p className="text-muted-foreground text-xs">
                {t("sendReminderHelp")}
              </p>
            </div>
            <Select
              value={String(reminderHours)}
              onValueChange={(v) => updateReminderHours(parseInt(v, 10))}
            >
              <SelectTrigger className="min-w-[170px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[6, 12, 24].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {t("hoursBefore").replace("{n}", String(h))}
                  </SelectItem>
                ))}
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
            {t("testingTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="test-recipient" className="text-xs">
              {t("sendTo")}
            </Label>
            <Input
              id="test-recipient"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="h-9 max-w-sm text-sm"
            />
            <p className="text-muted-foreground text-xs">{t("testHelp")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!testEmail.trim()}
              onClick={() => sendTest("testFormSent")}
            >
              <Send className="size-3.5" />
              {t("sendForm")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              disabled={!testEmail.trim()}
              onClick={() => sendTest("testReminderSent")}
            >
              <Send className="size-3.5" />
              {t("sendReminder")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
