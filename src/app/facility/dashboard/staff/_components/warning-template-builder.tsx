"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { WARNING_TYPE_META } from "@/types/facility-warnings";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useWarningTypeLabel } from "@/lib/staff/use-warning-type-label";
import type {
  WarningTemplate,
  WarningTemplateField,
  WarningType,
} from "@/types/facility-warnings";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (t: WarningTemplate) => void;
  existing?: WarningTemplate;
}

const FIELD_TYPE_KEYS = {
  text: "typeText",
  textarea: "typeTextarea",
  date: "typeDate",
  checkbox: "typeCheckbox",
} as const;

export function WarningTemplateBuilder({
  open,
  onOpenChange,
  onSave,
  existing,
}: Props) {
  const { t, fill } = useStaffText("warningTemplate");
  const warningTypeLabel = useWarningTypeLabel();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [defaultType, setDefaultType] = useState<WarningType>(
    existing?.defaultType ?? "written",
  );
  const [requiresSignature, setRequiresSignature] = useState(
    existing?.requiresSignature ?? true,
  );
  const [fields, setFields] = useState<WarningTemplateField[]>(
    existing?.fields ?? [],
  );

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        id: `field-${Date.now()}`,
        label: "",
        type: "text",
        required: false,
        placeholder: "",
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<WarningTemplateField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    if (!title.trim() || !body.trim()) return;
    const template: WarningTemplate = {
      id: existing?.id ?? `wt-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      body: body.trim(),
      defaultType,
      fields,
      requiresSignature,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      createdBy: existing?.createdBy ?? "fs-owner-01",
      active: true,
    };
    onSave(template);
    onOpenChange(false);
  };

  const typeMeta = WARNING_TYPE_META[defaultType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {existing ? t("editTitle") : t("buildTitle")}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="template" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-0 shrink-0 justify-start">
            <TabsTrigger value="template">{t("tabTemplate")}</TabsTrigger>
            <TabsTrigger value="fields">{t("tabFields")}</TabsTrigger>
            <TabsTrigger value="preview">{t("tabPreview")}</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: template info ── */}
          <TabsContent
            value="template"
            className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
          >
            <div className="space-y-1.5">
              <Label>{t("templateTitle")} *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("templateTitlePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("internalDescription")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("internalDescriptionPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t("defaultType")}</Label>
                <Select
                  value={defaultType}
                  onValueChange={(v) => setDefaultType(v as WarningType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(WARNING_TYPE_META).map((k) => (
                      <SelectItem key={k} value={k}>
                        {warningTypeLabel(k as WarningType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3 pb-0.5">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>{t("requiresSignature")}</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={requiresSignature}
                      onCheckedChange={setRequiresSignature}
                    />
                    <span className="text-muted-foreground text-sm">
                      {requiresSignature ? t("signatureYes") : t("signatureNo")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("documentBody")} *</Label>
              <p className="text-muted-foreground text-xs">
                {t("documentBodyHelp")}
              </p>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("documentBodyPlaceholder")}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          {/* ── Tab 2: custom fields ── */}
          <TabsContent
            value="fields"
            className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
          >
            <p className="text-muted-foreground text-sm">{t("fieldsHelp")}</p>

            {fields.length === 0 && (
              <div className="border-border/60 rounded-xl border border-dashed p-6 text-center">
                <p className="text-muted-foreground text-sm">{t("noFields")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("noFieldsHelp")}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="border-border/60 bg-card flex items-start gap-3 rounded-xl border p-3"
                >
                  <GripVertical className="text-muted-foreground mt-2.5 size-4 shrink-0" />
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("fieldLabel")}</Label>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, { label: e.target.value })
                        }
                        placeholder={fill("fieldLabelPlaceholder", {
                          n: idx + 1,
                        })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("fieldType")}</Label>
                      <Select
                        value={field.type}
                        onValueChange={(v) =>
                          updateField(field.id, {
                            type: v as WarningTemplateField["type"],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FIELD_TYPE_KEYS).map(([k, key]) => (
                            <SelectItem key={k} value={k} className="text-sm">
                              {t(key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">{t("fieldPlaceholder")}</Label>
                      <Input
                        value={field.placeholder ?? ""}
                        onChange={(e) =>
                          updateField(field.id, { placeholder: e.target.value })
                        }
                        placeholder={t("fieldPlaceholderHelp")}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(v) =>
                          updateField(field.id, { required: v })
                        }
                        id={`req-${field.id}`}
                      />
                      <Label
                        htmlFor={`req-${field.id}`}
                        className="text-xs font-normal"
                      >
                        {t("fieldRequired")}
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive mt-1 size-7 shrink-0"
                    onClick={() => removeField(field.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addField}
            >
              <Plus className="mr-1.5 size-3.5" /> {t("addField")}
            </Button>
          </TabsContent>

          {/* ── Tab 3: preview ── */}
          <TabsContent
            value="preview"
            className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1"
          >
            {!title && !body ? (
              <div className="border-border/60 rounded-xl border border-dashed p-8 text-center">
                <FileText className="text-muted-foreground mx-auto mb-2 size-8 opacity-30" />
                <p className="text-muted-foreground text-sm">
                  {t("previewEmpty")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold">
                    {title || t("untitled")}
                  </span>
                  <Badge
                    className={cn(
                      "border-0 text-[10px]",
                      typeMeta.bg,
                      typeMeta.text,
                    )}
                  >
                    {warningTypeLabel(defaultType)}
                  </Badge>
                  {requiresSignature && (
                    <Badge variant="outline" className="text-[10px]">
                      {t("requiresSignatureBadge")}
                    </Badge>
                  )}
                </div>

                {description && (
                  <p className="text-muted-foreground text-sm">{description}</p>
                )}

                {fields.length > 0 && (
                  <div className="border-border/60 space-y-2 rounded-xl border p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      {t("managerFillsIn")}
                    </p>
                    {fields.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="font-medium">
                          {f.label || t("unnamedField")}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {t(FIELD_TYPE_KEYS[f.type])}
                        </Badge>
                        {f.required && (
                          <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600">
                            {t("required")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-muted/20 rounded-xl border p-5">
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                    {t("documentText")}
                  </p>
                  <pre className="font-sans text-sm/relaxed whitespace-pre-wrap">
                    {body || t("noBody")}
                  </pre>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !body.trim()}>
            {existing ? t("saveTemplate") : t("createTemplate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
