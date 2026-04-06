"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  CheckCircle,
  FileText,
  List,
  ToggleLeft,
  Type,
  Upload,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  YipyyGoCustomSection,
  YipyyGoCustomSectionItem,
  CustomServiceModule,
} from "@/types/facility";

// ========================================
// Section type config
// ========================================

const SECTION_TYPES = [
  {
    value: "checklist" as const,
    label: "Checklist",
    icon: List,
    desc: "Multiple checkboxes",
  },
  {
    value: "yes_no" as const,
    label: "Yes / No",
    icon: ToggleLeft,
    desc: "Single confirmation",
  },
  {
    value: "text_fields" as const,
    label: "Text Fields",
    icon: Type,
    desc: "One or more text inputs",
  },
  {
    value: "multiple_choice" as const,
    label: "Multiple Choice",
    icon: CheckCircle,
    desc: "Radio or select options",
  },
  {
    value: "file_upload" as const,
    label: "File Upload",
    icon: Upload,
    desc: "Document or photo",
  },
  {
    value: "info_display" as const,
    label: "Info Display",
    icon: Info,
    desc: "Read-only instructions",
  },
];

// ========================================
// Props
// ========================================

interface YipyyGoConfigStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

// ========================================
// Component
// ========================================

export function YipyyGoConfigStep({ data, onChange }: YipyyGoConfigStepProps) {
  const yipyyGo = data.yipyyGo ?? {
    enabled: data.yipyyGoRequired,
    sendBeforeHours: 24,
    required: true,
    standardSections: {
      belongings: true,
      feeding: false,
      medications: true,
      behaviorNotes: true,
      addOns: true,
      tip: false,
    },
    customSections: [],
  };

  const update = (
    patch: Partial<NonNullable<CustomServiceModule["yipyyGo"]>>,
  ) => {
    onChange({ yipyyGo: { ...yipyyGo, ...patch } });
  };

  const updateStandard = (
    key: keyof typeof yipyyGo.standardSections,
    val: boolean,
  ) => {
    update({
      standardSections: { ...yipyyGo.standardSections, [key]: val },
    });
  };

  // Section editor dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] =
    useState<YipyyGoCustomSection | null>(null);
  const [sName, setSName] = useState("");
  const [sIcon, setSIcon] = useState("");
  const [sType, setSType] = useState<YipyyGoCustomSection["type"]>("checklist");
  const [sRequired, setSRequired] = useState(false);
  const [sItems, setSItems] = useState<YipyyGoCustomSectionItem[]>([]);

  const openAddSection = () => {
    setEditingSection(null);
    setSName("");
    setSIcon("");
    setSType("checklist");
    setSRequired(false);
    setSItems([]);
    setDialogOpen(true);
  };

  const openEditSection = (section: YipyyGoCustomSection) => {
    setEditingSection(section);
    setSName(section.name);
    setSIcon(section.icon ?? "");
    setSType(section.type);
    setSRequired(section.required);
    setSItems([...section.items]);
    setDialogOpen(true);
  };

  const handleSaveSection = () => {
    if (!sName.trim()) return;
    const section: YipyyGoCustomSection = {
      id: editingSection?.id ?? `cs-${Date.now()}`,
      name: sName.trim(),
      icon: sIcon || undefined,
      type: sType,
      required: sRequired,
      items: sItems,
    };

    const sections = editingSection
      ? yipyyGo.customSections.map((s) =>
          s.id === editingSection.id ? section : s,
        )
      : [...yipyyGo.customSections, section];

    update({ customSections: sections });
    setDialogOpen(false);
    toast.success(editingSection ? "Section updated" : "Section added");
  };

  const removeSection = (id: string) => {
    if (!window.confirm("Remove this section?")) return;
    update({
      customSections: yipyyGo.customSections.filter((s) => s.id !== id),
    });
    toast.success("Section removed");
  };

  const addItem = () => {
    setSItems([
      ...sItems,
      { id: `item-${Date.now()}`, label: "", required: false },
    ]);
  };

  const updateItem = (
    idx: number,
    patch: Partial<YipyyGoCustomSectionItem>,
  ) => {
    setSItems(
      sItems.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (idx: number) => {
    setSItems(sItems.filter((_, i) => i !== idx));
  };

  const STANDARD_SECTIONS = [
    {
      key: "belongings" as const,
      label: "Belongings Checklist",
      desc: "Items pet is bringing",
    },
    {
      key: "feeding" as const,
      label: "Feeding Instructions",
      desc: "Meal schedule & food",
    },
    {
      key: "medications" as const,
      label: "Medications",
      desc: "Current meds & schedule",
    },
    {
      key: "behaviorNotes" as const,
      label: "Behavior Notes",
      desc: "Temperament & triggers",
    },
    {
      key: "addOns" as const,
      label: "Add-ons & Extras",
      desc: "Upsell services",
    },
    { key: "tip" as const, label: "Tip", desc: "Pre-arrival gratuity" },
  ];

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-semibold">
            Require YipyyGo for this module?
          </p>
          <p className="text-muted-foreground text-xs">
            Customers receive a pre-check-in form before their booking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={yipyyGo.enabled ? "default" : "outline"}
            size="sm"
            onClick={() => update({ enabled: true })}
          >
            Yes
          </Button>
          <Button
            variant={!yipyyGo.enabled ? "default" : "outline"}
            size="sm"
            onClick={() => update({ enabled: false })}
          >
            No
          </Button>
        </div>
      </div>

      {yipyyGo.enabled && (
        <>
          {/* Timing & requirement */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-sm">Send form before booking</Label>
              <Select
                value={String(yipyyGo.sendBeforeHours)}
                onValueChange={(v) => update({ sendBeforeHours: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-sm">Completion requirement</Label>
              <Select
                value={yipyyGo.required ? "required" : "optional"}
                onValueChange={(v) => update({ required: v === "required" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required">
                    Must complete before check-in
                  </SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Standard sections */}
          <div>
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
              Standard Sections
            </p>
            <div className="space-y-2">
              {STANDARD_SECTIONS.map((section) => (
                <label
                  key={section.key}
                  className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors"
                >
                  <Checkbox
                    checked={yipyyGo.standardSections[section.key]}
                    onCheckedChange={(v) => updateStandard(section.key, !!v)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {section.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom sections */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Custom Sections
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={openAddSection}
              >
                <Plus className="size-3" />
                Add Section
              </Button>
            </div>

            {yipyyGo.customSections.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                No custom sections yet
              </p>
            ) : (
              <div className="space-y-2">
                {yipyyGo.customSections.map((section) => {
                  const typeConfig = SECTION_TYPES.find(
                    (t) => t.value === section.type,
                  );
                  const TypeIcon = typeConfig?.icon ?? FileText;
                  return (
                    <div
                      key={section.id}
                      className="group flex items-center gap-3 rounded-md border px-3 py-2.5"
                    >
                      <GripVertical className="text-muted-foreground/30 size-4 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {section.icon && (
                            <span className="text-sm">{section.icon}</span>
                          )}
                          <span className="text-sm font-medium">
                            {section.name}
                          </span>
                          {section.required && (
                            <Badge variant="outline" className="text-[9px]">
                              Required
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                          <TypeIcon className="size-3" />
                          {typeConfig?.label} · {section.items.length} item
                          {section.items.length !== 1 && "s"}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEditSection(section)}
                          className="hover:text-foreground text-muted-foreground rounded-sm p-1"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => removeSection(section.id)}
                          className="hover:text-destructive text-muted-foreground rounded-sm p-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Section editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Section" : "Add Custom Section"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 grid gap-1.5">
                <Label className="text-sm">Section Name</Label>
                <Input
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="Swimming Waiver"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm">Icon</Label>
                <Input
                  value={sIcon}
                  onChange={(e) => setSIcon(e.target.value)}
                  placeholder="📋"
                  className="text-center"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm">Section Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {SECTION_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setSType(t.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border p-2 text-center transition-all",
                        sType === t.value
                          ? "bg-primary/10 border-primary text-primary"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="text-[10px] font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={sRequired}
                onCheckedChange={(v) => setSRequired(!!v)}
              />
              <span className="text-sm">
                Required (must complete before check-in)
              </span>
            </label>

            <Separator />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm">Items / Questions</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 text-[10px]"
                  onClick={addItem}
                >
                  <Plus className="size-2.5" />
                  Add
                </Button>
              </div>
              {sItems.length === 0 ? (
                <p className="text-muted-foreground py-2 text-center text-xs">
                  No items yet
                </p>
              ) : (
                <div className="space-y-2">
                  {sItems.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            updateItem(idx, { label: e.target.value })
                          }
                          placeholder="Question or label..."
                          className="h-8 text-xs"
                        />
                        {(sType === "text_fields" ||
                          sType === "multiple_choice") && (
                          <Input
                            value={item.placeholder ?? ""}
                            onChange={(e) =>
                              updateItem(idx, {
                                placeholder: e.target.value,
                              })
                            }
                            placeholder="Placeholder text..."
                            className="h-7 text-[11px]"
                          />
                        )}
                      </div>
                      <label className="flex shrink-0 items-center gap-1 pt-2 text-[10px]">
                        <Checkbox
                          checked={item.required}
                          onCheckedChange={(v) =>
                            updateItem(idx, { required: !!v })
                          }
                          className="size-3"
                        />
                        Req
                      </label>
                      <button
                        onClick={() => removeItem(idx)}
                        className="hover:text-destructive text-muted-foreground shrink-0 pt-2"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection} disabled={!sName.trim()}>
              {editingSection ? "Save" : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
