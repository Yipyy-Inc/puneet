"use client";

import { useState } from "react";
import {
  Plus,
  FileText,
  Edit2,
  Trash2,
  MoreHorizontal,
  PenTool,
  ClipboardList,
  Shield,
  Banknote,
  Phone,
  Users,
  ToggleLeft,
  ToggleRight,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type {
  EmployeeDocumentTemplate,
  EmployeeDocumentSubmission,
  EmployeeDocTemplateType,
} from "@/types/scheduling";

interface Props {
  templates: EmployeeDocumentTemplate[];
  submissions: EmployeeDocumentSubmission[];
  onTemplatesChange: (templates: EmployeeDocumentTemplate[]) => void;
}

const templateTypeOptions: { value: EmployeeDocTemplateType; label: string }[] =
  [
    { value: "employment_agreement", label: "Employment Agreement" },
    { value: "nda", label: "Confidentiality / NDA" },
    { value: "policy_acknowledgement", label: "Policy Acknowledgement" },
    { value: "health_declaration", label: "Health Declaration" },
    { value: "emergency_contact", label: "Emergency Contact Form" },
    { value: "direct_deposit", label: "Direct Deposit Authorization" },
    { value: "tax_form", label: "Tax Form" },
    { value: "custom", label: "Custom Document" },
  ];

const templateTypeIcon: Record<string, React.ElementType> = {
  employment_agreement: FileText,
  nda: Shield,
  policy_acknowledgement: ClipboardList,
  health_declaration: PenTool,
  emergency_contact: Phone,
  direct_deposit: Banknote,
  tax_form: FileText,
  custom: FileText,
};

const templateTypeColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  employment_agreement: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  nda: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  policy_acknowledgement: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  health_declaration: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  emergency_contact: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  direct_deposit: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  tax_form: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
  custom: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
};

interface TemplateForm {
  title: string;
  type: EmployeeDocTemplateType;
  description: string;
  content: string;
  requiresSignature: boolean;
}

const emptyForm: TemplateForm = {
  title: "",
  type: "employment_agreement",
  description: "",
  content: "",
  requiresSignature: true,
};

export function DocumentTemplatesManager({
  templates,
  submissions,
  onTemplatesChange,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] =
    useState<EmployeeDocumentTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCreateOpen(true);
  };

  const openEdit = (tmpl: EmployeeDocumentTemplate) => {
    setForm({
      title: tmpl.title,
      type: tmpl.type,
      description: tmpl.description,
      content: tmpl.content,
      requiresSignature: tmpl.requiresSignature,
    });
    setEditingId(tmpl.id);
    setCreateOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const now = new Date().toISOString().split("T")[0];

    if (editingId) {
      onTemplatesChange(
        templates.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...form,
                updatedAt: now,
              }
            : t,
        ),
      );
      toast.success("Document template updated");
    } else {
      const newTemplate: EmployeeDocumentTemplate = {
        id: `tmpl-${Date.now()}`,
        facilityId: 1,
        ...form,
        fields: [],
        isActive: true,
        version: "1.0",
        createdAt: now,
        updatedAt: now,
      };
      onTemplatesChange([...templates, newTemplate]);
      toast.success("Document template created");
    }

    setCreateOpen(false);
  };

  const handleDelete = (id: string) => {
    onTemplatesChange(templates.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const handleToggleActive = (id: string) => {
    onTemplatesChange(
      templates.map((t) =>
        t.id === id ? { ...t, isActive: !t.isActive } : t,
      ),
    );
  };

  const getSignatureCount = (tmplId: string) =>
    submissions.filter((s) => s.templateId === tmplId && s.status === "signed")
      .length;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Document Templates</p>
          <p className="text-xs text-muted-foreground">
            Create reusable documents employees can fill in and sign online
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 size-3.5" />
          New Template
        </Button>
      </div>

      {/* Template cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((tmpl) => {
          const TypeIcon = templateTypeIcon[tmpl.type] ?? FileText;
          const colors =
            templateTypeColors[tmpl.type] ?? templateTypeColors.custom;
          const sigCount = getSignatureCount(tmpl.id);
          const typeLabel =
            templateTypeOptions.find((o) => o.value === tmpl.type)?.label ??
            tmpl.type;

          return (
            <Card
              key={tmpl.id}
              className={`group relative transition-shadow hover:shadow-md ${!tmpl.isActive ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}
                  >
                    <TypeIcon className={`size-5 ${colors.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {tmpl.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${colors.bg} ${colors.text} border ${colors.border}`}
                          >
                            {typeLabel}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            v{tmpl.version}
                          </Badge>
                          {tmpl.requiresSignature && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400"
                            >
                              <PenTool className="mr-0.5 size-2.5" />
                              Signature required
                            </Badge>
                          )}
                          {!tmpl.isActive && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] text-muted-foreground"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setPreviewTemplate(tmpl)}
                          >
                            <Eye className="mr-2 size-3.5" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(tmpl)}>
                            <Edit2 className="mr-2 size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(tmpl.id)}
                          >
                            {tmpl.isActive ? (
                              <>
                                <ToggleLeft className="mr-2 size-3.5" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleRight className="mr-2 size-3.5" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(tmpl.id)}
                          >
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {tmpl.description}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="size-3" />
                        {tmpl.fields.length} field
                        {tmpl.fields.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {sigCount} signed
                      </span>
                      <span>Updated {tmpl.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
          <FileText className="mb-3 size-10 opacity-30" />
          <p className="font-medium">No document templates yet</p>
          <p className="text-sm">
            Create templates for agreements, policies, and forms employees must
            complete during onboarding
          </p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 size-3.5" />
            Create First Template
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "Create Document Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Document Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g., Employment Agreement"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      type: v as EmployeeDocTemplateType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-3 pb-0.5">
                <Switch
                  id="requires-sig"
                  checked={form.requiresSignature}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, requiresSignature: v }))
                  }
                />
                <Label htmlFor="requires-sig" className="cursor-pointer">
                  Requires signature
                </Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Brief description of this document"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Document Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="Paste or type the full document text here. Employees will read this before filling in fields and signing."
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              After creating, you can assign this template to employees during
              onboarding. Field definitions can be configured separately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.content.trim()}
            >
              {editingId ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">
                {previewTemplate?.title}
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] mr-6">
                v{previewTemplate?.version}
              </Badge>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border bg-muted/20 p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm/relaxed">
              {previewTemplate?.content}
            </pre>
          </div>
          <div className="mt-3 shrink-0 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewTemplate(null)}
            >
              <X className="mr-1.5 size-3.5" /> Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
