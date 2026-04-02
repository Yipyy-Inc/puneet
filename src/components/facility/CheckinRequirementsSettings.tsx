"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { toast } from "sonner";
import { facilities } from "@/data/facilities";
import { useFacilityRole } from "@/hooks/use-facility-role";

type Requirement = "required" | "optional" | "disabled";

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

let _customId = 900;

export function CheckinRequirementsSettings() {
  const { role } = useFacilityRole();

  const [sections, setSections] = useState<Record<string, Requirement>>({
    feeding: defaultConfig?.sections.feeding ?? "required",
    medication: defaultConfig?.sections.medication ?? "required",
    belongings: defaultConfig?.sections.belongings ?? "optional",
    emergencyContact: defaultConfig?.sections.emergencyContact ?? "required",
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
      key: "emergencyContact",
      label: "Emergency Contact Verification",
      icon: Phone,
      value: sections.emergencyContact,
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

  const handleSave = () => {
    if (defaultFacility) {
      (defaultFacility as Record<string, unknown>).expressCheckinConfig = {
        sections,
        customSections,
        sendBefore,
        reminderHours,
      };
    }
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
                    setSections((prev) => ({
                      ...prev,
                      [section.key]: v as Requirement,
                    }))
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
                onChange={(e) => {
                  const next = [...customSections];
                  next[idx] = { ...cs, name: e.target.value };
                  setCustomSections(next);
                }}
                className="h-7 max-w-[200px] border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                <Select
                  value={cs.type}
                  onValueChange={(v) => {
                    const next = [...customSections];
                    next[idx] = { ...cs, type: v as Requirement };
                    setCustomSections(next);
                  }}
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
                  onClick={() =>
                    setCustomSections(
                      customSections.filter((_, i) => i !== idx),
                    )
                  }
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
                if (e.key === "Enter" && newCustomName.trim()) {
                  _customId += 1;
                  setCustomSections([
                    ...customSections,
                    {
                      id: `custom-${_customId}`,
                      name: newCustomName.trim(),
                      type: "optional" as Requirement,
                    },
                  ]);
                  setNewCustomName("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newCustomName.trim()}
              onClick={() => {
                _customId += 1;
                setCustomSections([
                  ...customSections,
                  {
                    id: `custom-${_customId}`,
                    name: newCustomName.trim(),
                    type: "optional" as Requirement,
                  },
                ]);
                setNewCustomName("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
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
              onValueChange={(v) => setSendBefore(parseInt(v, 10))}
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
              onValueChange={(v) => setReminderHours(parseInt(v, 10))}
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

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Check-in Settings
        </Button>
      </div>
    </div>
  );
}
