"use client";

import { useMemo, useState } from "react";
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
  Eye,
  Sparkles,
  FileSignature,
  Users,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  EmployeeDocumentTemplate,
  EmployeeDocumentSubmission,
  EmployeeDocTemplateType,
  DocumentTemplateField,
} from "@/types/scheduling";

interface Props {
  templates: EmployeeDocumentTemplate[];
  submissions: EmployeeDocumentSubmission[];
  onTemplatesChange: (templates: EmployeeDocumentTemplate[]) => void;
}

const TYPE_OPTIONS: {
  value: EmployeeDocTemplateType;
  label: string;
  icon: React.ElementType;
  tone: string;
}[] = [
  {
    value: "employment_agreement",
    label: "Employment Agreement",
    icon: FileSignature,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    value: "nda",
    label: "Confidentiality / NDA",
    icon: Shield,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    value: "policy_acknowledgement",
    label: "Policy Acknowledgement",
    icon: ClipboardList,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    value: "health_declaration",
    label: "Health Declaration",
    icon: PenTool,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "emergency_contact",
    label: "Emergency Contact",
    icon: Phone,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    value: "direct_deposit",
    label: "Direct Deposit",
    icon: Banknote,
    tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    value: "tax_form",
    label: "Tax Form",
    icon: FileText,
    tone: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  {
    value: "custom",
    label: "Custom Document",
    icon: FileText,
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
];

const FIELD_TYPES: {
  value: DocumentTemplateField["type"];
  label: string;
}[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "address", label: "Address" },
  { value: "sin_ssn", label: "SIN / SSN" },
  { value: "select", label: "Dropdown" },
];

const SECTION_SEP = "\n\n---\n\n";

type Section = { id: string; title: string; body: string };

function contentToSections(content: string): Section[] {
  if (!content.trim()) return [{ id: sid(), title: "", body: "" }];
  const parts = content.split(SECTION_SEP);
  return parts.map((part) => {
    const trimmed = part.trim();
    const match = trimmed.match(/^(?:##\s+|)(.+?)\n\n([\s\S]+)$/);
    if (match) {
      return { id: sid(), title: match[1].trim(), body: match[2].trim() };
    }
    return { id: sid(), title: "", body: trimmed };
  });
}

function sectionsToContent(sections: Section[]): string {
  return sections
    .map((s) =>
      s.title.trim()
        ? `## ${s.title.trim()}\n\n${s.body.trim()}`
        : s.body.trim(),
    )
    .filter(Boolean)
    .join(SECTION_SEP);
}

function sid() {
  return `s-${Math.random().toString(36).slice(2, 10)}`;
}

function getTypeMeta(type: EmployeeDocTemplateType) {
  return TYPE_OPTIONS.find((o) => o.value === type) ?? TYPE_OPTIONS[7];
}

interface EditorState {
  title: string;
  type: EmployeeDocTemplateType;
  description: string;
  sections: Section[];
  fields: DocumentTemplateField[];
  requiresSignature: boolean;
  isActive: boolean;
}

function templateToEditor(
  tmpl: EmployeeDocumentTemplate | null,
): EditorState {
  if (!tmpl) {
    return {
      title: "",
      type: "employment_agreement",
      description: "",
      sections: [{ id: sid(), title: "Introduction", body: "" }],
      fields: [],
      requiresSignature: true,
      isActive: true,
    };
  }
  return {
    title: tmpl.title,
    type: tmpl.type,
    description: tmpl.description,
    sections: contentToSections(tmpl.content),
    fields: [...tmpl.fields],
    requiresSignature: tmpl.requiresSignature,
    isActive: tmpl.isActive,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────────

function TemplateCard({
  tmpl,
  signedCount,
  onOpen,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  tmpl: EmployeeDocumentTemplate;
  signedCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = getTypeMeta(tmpl.type);
  const Icon = meta.icon;

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group bg-card relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
        !tmpl.isActive && "opacity-70",
      )}
    >
      <div className="relative p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              meta.tone,
            )}
          >
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold tracking-tight">
                  {tmpl.title}
                </p>
                <p className="text-muted-foreground truncate text-xs font-medium">
                  {meta.label}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={onOpen}>
                    <Eye className="mr-2 size-3.5" /> View & preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 size-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="mr-2 size-3.5" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggle}>
                    {tmpl.isActive ? (
                      <>
                        <XCircle className="mr-2 size-3.5" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 size-3.5" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 size-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                <Hash className="mr-0.5 size-2.5" />v{tmpl.version}
              </Badge>
              {tmpl.requiresSignature && (
                <Badge className="bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <PenTool className="mr-0.5 size-2.5" />
                  Signature required
                </Badge>
              )}
              {tmpl.isActive ? (
                <Badge className="bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 className="mr-0.5 size-2.5" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>

        {tmpl.description && (
          <p className="text-muted-foreground mt-3 line-clamp-2 text-xs">
            {tmpl.description}
          </p>
        )}

        {/* Metrics footer */}
        <div className="border-border/60 mt-4 grid grid-cols-3 gap-2 border-t pt-3">
          <Metric
            icon={ClipboardList}
            value={tmpl.fields.length}
            label="Fields"
            tone="bg-primary/10 text-primary"
          />
          <Metric
            icon={Users}
            value={signedCount}
            label="Signed"
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <Metric
            icon={FileText}
            value={tmpl.updatedAt.slice(5)}
            label="Updated"
            tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            small
          />
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  tone,
  small = false,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  tone: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("rounded-md p-1.5", tone)}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 leading-tight">
        <div
          className={cn(
            "truncate font-semibold",
            small ? "text-[11px]" : "text-sm",
          )}
        >
          {value}
        </div>
        <div className="text-muted-foreground text-[10px]">{label}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Editor
// ──────────────────────────────────────────────────────────────────────

function TemplateEditor({
  initialTemplate,
  open,
  onOpenChange,
  onSave,
}: {
  initialTemplate: EmployeeDocumentTemplate | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (e: EditorState, bumpVersion: boolean) => void;
}) {
  const [state, setState] = useState<EditorState>(() =>
    templateToEditor(initialTemplate),
  );
  const [tab, setTab] = useState("content");

  // Re-init when opened or when initialTemplate changes
  const key = initialTemplate?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (open && lastKey !== key) {
    setState(templateToEditor(initialTemplate));
    setTab("content");
    setLastKey(key);
  }

  const meta = getTypeMeta(state.type);
  const HeaderIcon = meta.icon;

  const update = <K extends keyof EditorState>(k: K, v: EditorState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  // Section ops
  const addSection = () =>
    update("sections", [...state.sections, { id: sid(), title: "", body: "" }]);
  const removeSection = (id: string) =>
    update(
      "sections",
      state.sections.filter((s) => s.id !== id),
    );
  const moveSection = (id: string, dir: -1 | 1) => {
    const idx = state.sections.findIndex((s) => s.id === id);
    const next = idx + dir;
    if (next < 0 || next >= state.sections.length) return;
    const copy = [...state.sections];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    update("sections", copy);
  };
  const editSection = (id: string, patch: Partial<Section>) =>
    update(
      "sections",
      state.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  // Field ops
  const addField = () =>
    update("fields", [
      ...state.fields,
      {
        id: `f-${Date.now()}`,
        label: "New field",
        type: "text",
        required: false,
      },
    ]);
  const editField = (id: string, patch: Partial<DocumentTemplateField>) =>
    update(
      "fields",
      state.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  const removeField = (id: string) =>
    update(
      "fields",
      state.fields.filter((f) => f.id !== id),
    );

  const canSave =
    state.title.trim() &&
    state.sections.some((s) => s.body.trim() || s.title.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl md:p-0">
        <DialogTitle className="sr-only">
          {initialTemplate ? "Edit template" : "Create template"}
        </DialogTitle>

        {/* Header */}
        <div className="relative border-b">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-40",
              meta.tone.replace(/text-[\w-]+/g, ""),
            )}
          />
          <div className="relative flex items-start gap-4 p-6">
            <div
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-2xl",
                meta.tone,
              )}
            >
              <HeaderIcon className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <Input
                value={state.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Untitled template"
                className="h-auto border-0 bg-transparent !p-0 text-xl font-bold tracking-tight shadow-none focus-visible:ring-0"
              />
              <Input
                value={state.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short description visible to employees..."
                className="text-muted-foreground mt-1 h-auto border-0 bg-transparent !p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {meta.label}
                </Badge>
                {initialTemplate && (
                  <Badge variant="outline" className="text-[10px]">
                    <Hash className="mr-0.5 size-2.5" />v{initialTemplate.version}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b px-6">
            <TabsList className="h-10 bg-transparent p-0">
              <TabsTrigger
                value="content"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Content
              </TabsTrigger>
              <TabsTrigger
                value="fields"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Fields
                {state.fields.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-4 px-1 text-[10px]"
                  >
                    {state.fields.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Preview
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Content tab */}
            <TabsContent value="content" className="mt-0 p-6">
              <div className="space-y-3">
                {state.sections.map((sec, i) => (
                  <div
                    key={sec.id}
                    className="bg-card group/sec relative rounded-xl border p-4"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="text-muted-foreground size-4 shrink-0" />
                      <span className="bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {i + 1}
                      </span>
                      <Input
                        value={sec.title}
                        onChange={(e) =>
                          editSection(sec.id, { title: e.target.value })
                        }
                        placeholder={`Section title (e.g. "Parties")`}
                        className="h-9 border-0 bg-transparent font-semibold shadow-none focus-visible:ring-0"
                      />
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={i === 0}
                          onClick={() => moveSection(sec.id, -1)}
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={i === state.sections.length - 1}
                          onClick={() => moveSection(sec.id, 1)}
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive size-7"
                          disabled={state.sections.length === 1}
                          onClick={() => removeSection(sec.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={sec.body}
                      onChange={(e) =>
                        editSection(sec.id, { body: e.target.value })
                      }
                      placeholder="Write the body of this section…"
                      rows={6}
                      className="mt-2 border-0 bg-transparent text-sm leading-relaxed shadow-none focus-visible:ring-0"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addSection}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add section
                </Button>
              </div>
            </TabsContent>

            {/* Fields tab */}
            <TabsContent value="fields" className="mt-0 p-6">
              <div className="space-y-3">
                {state.fields.length === 0 && (
                  <div className="text-muted-foreground flex flex-col items-center rounded-xl border border-dashed py-10 text-center">
                    <ClipboardList className="mb-2 size-8 opacity-40" />
                    <p className="text-sm font-medium">No fields yet</p>
                    <p className="text-xs">
                      Add fields employees must fill before signing.
                    </p>
                  </div>
                )}
                {state.fields.map((field, i) => (
                  <div
                    key={field.id}
                    className="bg-card rounded-xl border p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-muted text-muted-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {i + 1}
                      </span>
                      <Input
                        value={field.label}
                        onChange={(e) =>
                          editField(field.id, { label: e.target.value })
                        }
                        placeholder="Field label"
                        className="h-9 font-medium"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v) =>
                          editField(field.id, {
                            type: v as DocumentTemplateField["type"],
                          })
                        }
                      >
                        <SelectTrigger className="h-9 w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive size-9"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        value={field.placeholder ?? ""}
                        onChange={(e) =>
                          editField(field.id, { placeholder: e.target.value })
                        }
                        placeholder="Placeholder (optional)"
                        className="h-9"
                      />
                      <label className="bg-muted/30 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(v) =>
                            editField(field.id, { required: v })
                          }
                        />
                        Required field
                      </label>
                    </div>
                    {field.type === "select" && (
                      <div className="mt-2">
                        <Label className="text-muted-foreground text-[10px] uppercase tracking-wide">
                          Options (one per line)
                        </Label>
                        <Textarea
                          value={(field.options ?? []).join("\n")}
                          onChange={(e) =>
                            editField(field.id, {
                              options: e.target.value
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          rows={3}
                          className="mt-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addField}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add field
                </Button>
              </div>
            </TabsContent>

            {/* Settings tab */}
            <TabsContent value="settings" className="mt-0 space-y-5 p-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  Document type
                </Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = state.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => update("type", opt.value)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                          active
                            ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                            : "border-border/60 bg-card hover:bg-muted/40",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg",
                            opt.tone,
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="bg-card flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                  <Switch
                    checked={state.requiresSignature}
                    onCheckedChange={(v) => update("requiresSignature", v)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Requires signature</p>
                    <p className="text-muted-foreground text-xs">
                      Employee must draw or type their signature to complete.
                    </p>
                  </div>
                </label>
                <label className="bg-card flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                  <Switch
                    checked={state.isActive}
                    onCheckedChange={(v) => update("isActive", v)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Active</p>
                    <p className="text-muted-foreground text-xs">
                      Inactive templates can&apos;t be assigned to employees.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-xl border p-4 text-xs">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Every signature captures timestamp (ISO 8601), IP address,
                  timezone, device fingerprint, user-agent, and the signature
                  image. Stored immutably on the submission record.
                </p>
              </div>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="mt-0 p-6">
              <DocumentPreview state={state} />
            </TabsContent>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted/30 px-6 py-3">
            <p className="text-muted-foreground text-xs">
              {initialTemplate
                ? "Saving bumps the version automatically."
                : "New templates start at v1.0."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!canSave} onClick={() => onSave(state, true)}>
                {initialTemplate ? "Save changes" : "Create template"}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Preview
// ──────────────────────────────────────────────────────────────────────

function DocumentPreview({ state }: { state: EditorState }) {
  const meta = getTypeMeta(state.type);
  const Icon = meta.icon;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-card rounded-2xl border shadow-sm">
        {/* Paper-like header */}
        <div className="flex items-center gap-3 border-b p-6">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              meta.tone,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">
              {state.title || "Untitled agreement"}
            </p>
            <p className="text-muted-foreground text-xs">{meta.label}</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6 text-sm leading-relaxed">
          {state.description && (
            <p className="text-muted-foreground italic">{state.description}</p>
          )}
          {state.sections.map((sec, i) =>
            !sec.title && !sec.body ? null : (
              <div key={sec.id} className="space-y-1.5">
                {sec.title && (
                  <h3 className="text-base font-semibold">
                    {i + 1}. {sec.title}
                  </h3>
                )}
                {sec.body && (
                  <p className="text-foreground whitespace-pre-wrap">
                    {sec.body}
                  </p>
                )}
              </div>
            ),
          )}

          {state.fields.length > 0 && (
            <div className="border-t pt-5">
              <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wider">
                Fields to fill
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {state.fields.map((f) => (
                  <div key={f.id}>
                    <Label className="text-xs">
                      {f.label}
                      {f.required && (
                        <span className="text-rose-500"> *</span>
                      )}
                    </Label>
                    <div className="bg-muted/40 mt-1 h-9 rounded-md border border-dashed" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.requiresSignature && (
            <div className="border-t pt-5">
              <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wider">
                Signature block
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="flex h-24 items-end rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  <span>Drawn or typed signature</span>
                </div>
                <div className="text-muted-foreground space-y-1 text-[11px]">
                  <p className="font-semibold">Captured at signing:</p>
                  <p>• Timestamp (ISO)</p>
                  <p>• IP address</p>
                  <p>• Timezone</p>
                  <p>• Device fingerprint</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// View (read-only) dialog
// ──────────────────────────────────────────────────────────────────────

function TemplateViewer({
  tmpl,
  open,
  onOpenChange,
  onEdit,
  signedCount,
}: {
  tmpl: EmployeeDocumentTemplate | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
  signedCount: number;
}) {
  if (!tmpl) return null;
  const state = templateToEditor(tmpl);
  const meta = getTypeMeta(tmpl.type);
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl md:p-0">
        <DialogTitle className="sr-only">{tmpl.title}</DialogTitle>
        <div className="flex items-start gap-4 border-b p-6">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl",
              meta.tone,
            )}
          >
            <Icon className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold tracking-tight">
              {tmpl.title}
            </p>
            <p className="text-muted-foreground text-sm">{meta.label}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                <Hash className="mr-0.5 size-2.5" />v{tmpl.version}
              </Badge>
              {tmpl.requiresSignature && (
                <Badge className="bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  Signature required
                </Badge>
              )}
              {tmpl.isActive ? (
                <Badge className="bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Inactive
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                <Users className="mr-0.5 size-2.5" />
                {signedCount} signed
              </Badge>
            </div>
          </div>
          <Button size="sm" onClick={onEdit}>
            <Edit2 className="mr-1.5 size-3.5" />
            Edit
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-6">
          <DocumentPreview state={state} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main manager
// ──────────────────────────────────────────────────────────────────────

export function DocumentTemplatesManager({
  templates,
  submissions,
  onTemplatesChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeeDocTemplateType | "all">(
    "all",
  );
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<EmployeeDocumentTemplate | null>(
    null,
  );
  const [viewerTmpl, setViewerTmpl] = useState<EmployeeDocumentTemplate | null>(
    null,
  );

  const signedByTemplate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) {
      if (s.status === "signed") {
        map.set(s.templateId, (map.get(s.templateId) ?? 0) + 1);
      }
    }
    return map;
  }, [submissions]);

  const stats = useMemo(() => {
    const active = templates.filter((t) => t.isActive).length;
    const totalSigned = submissions.filter((s) => s.status === "signed").length;
    const requiringSig = templates.filter((t) => t.requiresSignature).length;
    return { active, totalSigned, requiringSig };
  }, [templates, submissions]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (activeFilter === "active" && !t.isActive) return false;
      if (activeFilter === "inactive" && t.isActive) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay =
          `${t.title} ${t.description} ${getTypeMeta(t.type).label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, query, typeFilter, activeFilter]);

  const openCreate = () => {
    setEditingTmpl(null);
    setEditorOpen(true);
  };

  const openEdit = (t: EmployeeDocumentTemplate) => {
    setViewerTmpl(null);
    setEditingTmpl(t);
    setEditorOpen(true);
  };

  const handleDuplicate = (t: EmployeeDocumentTemplate) => {
    const now = new Date().toISOString().split("T")[0];
    const copy: EmployeeDocumentTemplate = {
      ...t,
      id: `tmpl-${Date.now()}`,
      title: `${t.title} (copy)`,
      version: "1.0",
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    onTemplatesChange([copy, ...templates]);
    toast.success("Template duplicated");
  };

  const handleToggle = (t: EmployeeDocumentTemplate) => {
    onTemplatesChange(
      templates.map((x) =>
        x.id === t.id ? { ...x, isActive: !x.isActive } : x,
      ),
    );
    toast.success(t.isActive ? "Template deactivated" : "Template activated");
  };

  const handleDelete = (id: string) => {
    onTemplatesChange(templates.filter((x) => x.id !== id));
    toast.success("Template deleted");
  };

  const handleSave = (state: EditorState, bumpVersion: boolean) => {
    const now = new Date().toISOString().split("T")[0];
    const content = sectionsToContent(state.sections);

    if (editingTmpl) {
      const [maj, min] = editingTmpl.version.split(".").map((n) => parseInt(n));
      const nextVersion = bumpVersion
        ? `${maj}.${(min ?? 0) + 1}`
        : editingTmpl.version;
      onTemplatesChange(
        templates.map((t) =>
          t.id === editingTmpl.id
            ? {
                ...t,
                title: state.title.trim(),
                type: state.type,
                description: state.description.trim(),
                content,
                fields: state.fields,
                requiresSignature: state.requiresSignature,
                isActive: state.isActive,
                version: nextVersion,
                updatedAt: now,
              }
            : t,
        ),
      );
      toast.success("Template updated");
    } else {
      const created: EmployeeDocumentTemplate = {
        id: `tmpl-${Date.now()}`,
        facilityId: 1,
        title: state.title.trim(),
        type: state.type,
        description: state.description.trim(),
        content,
        fields: state.fields,
        requiresSignature: state.requiresSignature,
        isActive: state.isActive,
        version: "1.0",
        createdAt: now,
        updatedAt: now,
      };
      onTemplatesChange([created, ...templates]);
      toast.success("Template created");
    }
    setEditorOpen(false);
    setEditingTmpl(null);
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Sparkles className="size-3" /> Document studio
            </div>
            <h3 className="mt-1 text-2xl font-bold tracking-tight">
              Author agreements employees can read &amp; sign
            </h3>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Draft structured documents, capture legally-binding e-signatures,
              and keep a full audit trail — timestamp, IP, timezone, and device
              fingerprint on every submission.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" />
            New template
          </Button>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <StatPill
            icon={FileSignature}
            label="Active templates"
            value={stats.active}
            tone="bg-primary/10 text-primary"
          />
          <StatPill
            icon={Users}
            label="Total signatures"
            value={stats.totalSigned}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            icon={PenTool}
            label="Requiring signature"
            value={stats.requiringSig}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="h-9 pl-9 text-sm"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as EmployeeDocTemplateType | "all")
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-3 text-xs transition-all",
                activeFilter === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card hover:bg-muted",
              )}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center rounded-2xl border border-dashed py-16 text-center">
          <FileText className="mb-3 size-10 opacity-30" />
          <p className="font-medium">
            {templates.length === 0 ? "No templates yet" : "No matches"}
          </p>
          <p className="text-sm">
            {templates.length === 0
              ? "Draft your first agreement — it'll only take a minute."
              : "Try clearing filters or adjusting your search."}
          </p>
          {templates.length === 0 && (
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-1.5 size-3.5" />
              Create first template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              tmpl={t}
              signedCount={signedByTemplate.get(t.id) ?? 0}
              onOpen={() => setViewerTmpl(t)}
              onEdit={() => openEdit(t)}
              onDuplicate={() => handleDuplicate(t)}
              onToggle={() => handleToggle(t)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      <TemplateViewer
        tmpl={viewerTmpl}
        open={!!viewerTmpl}
        onOpenChange={(v) => !v && setViewerTmpl(null)}
        onEdit={() => viewerTmpl && openEdit(viewerTmpl)}
        signedCount={
          viewerTmpl ? (signedByTemplate.get(viewerTmpl.id) ?? 0) : 0
        }
      />

      <TemplateEditor
        initialTemplate={editingTmpl}
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setEditingTmpl(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="border-border/60 bg-card/80 flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm">
      <div className={cn("rounded-lg p-2", tone)}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xl leading-none font-bold">{value}</div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
      </div>
    </div>
  );
}
