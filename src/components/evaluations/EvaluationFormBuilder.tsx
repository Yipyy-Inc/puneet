"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import type {
  EvaluationFormTemplate,
  EvalSection,
  EvalQuestion,
  EvalFieldType,
} from "@/types/facility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Settings2,
  Palette,
  X,
  Pencil,
  Save,
} from "lucide-react";

// ── Field type config (color + label) ────────────────────────────────

const FIELD_TYPE_OPTIONS: {
  value: EvalFieldType;
  label: string;
  desc: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
}[] = [
  {
    value: "yes_no",
    label: "Yes / No",
    desc: "Toggle question",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    accent: "border-l-emerald-400",
  },
  {
    value: "scale",
    label: "Low / Med / High",
    desc: "Three-point scale",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    accent: "border-l-amber-400",
  },
  {
    value: "single_select",
    label: "Single choice",
    desc: "Pick one option",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
    accent: "border-l-sky-400",
  },
  {
    value: "multi_select",
    label: "Multi choice",
    desc: "Pick multiple",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
    accent: "border-l-violet-400",
  },
  {
    value: "text",
    label: "Free text",
    desc: "Open-ended answer",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    accent: "border-l-slate-400",
  },
  {
    value: "number",
    label: "Number",
    desc: "Numeric input",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    accent: "border-l-rose-400",
  },
];

// ── Question editor ──────────────────────────────────────────────────

function QuestionEditor({
  question,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  question: EvalQuestion;
  onChange: (q: EvalQuestion) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsOptions =
    question.type === "single_select" || question.type === "multi_select";
  const isScale = question.type === "scale";

  const typeConfig = FIELD_TYPE_OPTIONS.find((o) => o.value === question.type);

  return (
    <div className="group rounded-lg border bg-white transition-all hover:shadow-md">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="text-muted-foreground/30 size-4 shrink-0 transition-colors group-hover:text-slate-400" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Input
              value={question.label}
              onChange={(e) => onChange({ ...question, label: e.target.value })}
              className="h-8 border-0 px-1 text-sm font-medium shadow-none focus-visible:ring-1"
              placeholder="Question label..."
            />
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${typeConfig?.badgeBg ?? "bg-slate-100"} ${typeConfig?.badgeText ?? "text-slate-600"}`}
            >
              {typeConfig?.label}
            </span>
            {question.required && (
              <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                REQ
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setExpanded(!expanded)}
          >
            <Settings2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive/60 hover:text-destructive size-7"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="space-y-3 border-t bg-slate-50/60 px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Field type</Label>
              <Select
                value={question.type}
                onValueChange={(v) =>
                  onChange({ ...question, type: v as EvalFieldType })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="text-xs">{opt.label}</span>
                      <span className="text-muted-foreground ml-2 text-[10px]">
                        {opt.desc}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={question.required}
                  onCheckedChange={(c) =>
                    onChange({ ...question, required: c === true })
                  }
                />
                <span className="text-xs">Required</span>
              </label>
              {(question.type === "yes_no" || question.type === "scale") && (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={question.allowNotes ?? false}
                    onCheckedChange={(c) =>
                      onChange({ ...question, allowNotes: c === true })
                    }
                  />
                  <span className="text-xs">Allow notes</span>
                </label>
              )}
            </div>
          </div>

          {question.type === "text" && (
            <div className="space-y-1">
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={question.placeholder ?? ""}
                onChange={(e) =>
                  onChange({
                    ...question,
                    placeholder: e.target.value || undefined,
                  })
                }
                placeholder="Placeholder text..."
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Help text (optional)</Label>
            <Input
              value={question.helpText ?? ""}
              onChange={(e) =>
                onChange({ ...question, helpText: e.target.value || undefined })
              }
              placeholder="Guidance for staff filling out this field..."
              className="h-8 text-xs"
            />
          </div>

          {isScale && (
            <div className="space-y-1">
              <Label className="text-xs">Scale labels</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={question.scaleLabels?.low ?? "Low"}
                  onChange={(e) =>
                    onChange({
                      ...question,
                      scaleLabels: {
                        ...question.scaleLabels,
                        low: e.target.value,
                      },
                    })
                  }
                  className="h-8 text-center text-xs"
                  placeholder="Low"
                />
                <Input
                  value={question.scaleLabels?.mid ?? "Medium"}
                  onChange={(e) =>
                    onChange({
                      ...question,
                      scaleLabels: {
                        ...question.scaleLabels,
                        mid: e.target.value,
                      },
                    })
                  }
                  className="h-8 text-center text-xs"
                  placeholder="Medium"
                />
                <Input
                  value={question.scaleLabels?.high ?? "High"}
                  onChange={(e) =>
                    onChange({
                      ...question,
                      scaleLabels: {
                        ...question.scaleLabels,
                        high: e.target.value,
                      },
                    })
                  }
                  className="h-8 text-center text-xs"
                  placeholder="High"
                />
              </div>
            </div>
          )}

          {needsOptions && (
            <OptionsEditor
              options={question.options ?? []}
              onChange={(opts) => onChange({ ...question, options: opts })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Options editor (for single/multi select) ─────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addOption = () => {
    const val = draft.trim();
    if (!val || options.includes(val)) return;
    onChange([...options, val]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Options</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => (
          <Badge key={i} variant="outline" className="gap-1 py-1">
            {opt}
            <button
              type="button"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="hover:text-destructive ml-0.5"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Add option..."
          className="h-8 text-xs"
        />
        <Button variant="outline" size="sm" onClick={addOption}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ── Section editor ───────────────────────────────────────────────────

function SectionEditor({
  section,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  section: EvalSection;
  onChange: (s: EvalSection) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const updateQuestion = (idx: number, q: EvalQuestion) => {
    const next = [...section.questions];
    next[idx] = q;
    onChange({ ...section, questions: next });
  };

  const removeQuestion = (idx: number) => {
    onChange({
      ...section,
      questions: section.questions.filter((_, i) => i !== idx),
    });
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const next = [...section.questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ ...section, questions: next });
  };

  const addQuestion = () => {
    const newQ: EvalQuestion = {
      id: `q-${Date.now()}`,
      label: "New question",
      type: "yes_no",
      required: false,
    };
    onChange({ ...section, questions: [...section.questions, newQ] });
  };

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1"
        >
          {collapsed ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <Input
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            className="h-7 border-0 bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:ring-1"
            placeholder="Section title..."
          />
          <Input
            value={section.description ?? ""}
            onChange={(e) =>
              onChange({
                ...section,
                description: e.target.value || undefined,
              })
            }
            className="text-muted-foreground h-6 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-1"
            placeholder="Section description (optional)..."
          />
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {section.questions.length}{" "}
          {section.questions.length === 1 ? "field" : "fields"}
        </Badge>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive/60 hover:text-destructive size-7"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Questions */}
      {!collapsed && (
        <div className="space-y-2 p-3">
          {section.questions.map((q, i) => (
            <QuestionEditor
              key={q.id}
              question={q}
              onChange={(updated) => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)}
              onMoveUp={() => moveQuestion(i, -1)}
              onMoveDown={() => moveQuestion(i, 1)}
              isFirst={i === 0}
              isLast={i === section.questions.length - 1}
            />
          ))}
          <button
            type="button"
            onClick={addQuestion}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
          >
            <Plus className="size-3.5" />
            Add question
          </button>
        </div>
      )}
    </div>
  );
}

// ── Behavior codes editor ────────────────────────────────────────────

function BehaviorCodesEditor({
  codes,
  onChange,
}: {
  codes: EvaluationFormTemplate["behaviorCodes"];
  onChange: (codes: EvaluationFormTemplate["behaviorCodes"]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [draftColor, setDraftColor] = useState("#22c55e");

  const addCode = () => {
    const label = draft.trim();
    if (!label) return;
    onChange([...codes, { id: `bc-${Date.now()}`, label, color: draftColor }]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {codes.map((code, i) => (
          <div
            key={code.id}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5"
          >
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: code.color }}
            />
            <span className="text-xs font-medium">{code.label}</span>
            <button
              type="button"
              onClick={() => onChange(codes.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive ml-1"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={draftColor}
          onChange={(e) => setDraftColor(e.target.value)}
          className="size-8 cursor-pointer rounded-sm border p-0.5"
        />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCode();
            }
          }}
          placeholder="New behavior code..."
          className="h-8 text-xs"
        />
        <Button variant="outline" size="sm" onClick={addCode}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ── Main builder ─────────────────────────────────────────────────────

export function EvaluationFormBuilder() {
  const { evaluationFormTemplate, updateEvaluationFormTemplate } =
    useSettings();
  const [local, setLocal] = useState<EvaluationFormTemplate>(
    evaluationFormTemplate,
  );
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "codes">("sections");

  const isDirty =
    JSON.stringify(local) !== JSON.stringify(evaluationFormTemplate);

  const handleSave = () => {
    updateEvaluationFormTemplate(local);
    setEditing(false);
  };

  const handleCancel = () => {
    setLocal(evaluationFormTemplate);
    setEditing(false);
  };

  const updateSection = (idx: number, s: EvalSection) => {
    const next = [...local.sections];
    next[idx] = s;
    setLocal({ ...local, sections: next });
  };

  const removeSection = (idx: number) => {
    setLocal({
      ...local,
      sections: local.sections.filter((_, i) => i !== idx),
    });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = [...local.sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setLocal({ ...local, sections: next });
  };

  const addSection = () => {
    const newSection: EvalSection = {
      id: `section-${Date.now()}`,
      title: "New Section",
      questions: [],
    };
    setLocal({ ...local, sections: [...local.sections, newSection] });
  };

  const totalQuestions = local.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-200">
            <ClipboardList className="size-4 text-slate-700" />
          </div>
          <div>
            <CardTitle className="text-base">Evaluation Form Builder</CardTitle>
            <p className="text-muted-foreground text-xs">
              Design the questions staff fill out during evaluations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {local.sections.length}{" "}
            {local.sections.length === 1 ? "section" : "sections"} ·{" "}
            {totalQuestions} {totalQuestions === 1 ? "field" : "fields"}
          </Badge>
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleSave}
                disabled={!isDirty}
              >
                <Save className="size-3.5" />
                Save
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!editing ? (
          /* ── Read-only preview ── */
          <div className="space-y-4">
            {local.sections.map((section) => (
              <div
                key={section.id}
                className="overflow-hidden rounded-xl border"
              >
                <div className="border-b bg-slate-50 px-4 py-2.5">
                  <p className="text-sm font-semibold">{section.title}</p>
                  {section.description && (
                    <p className="text-muted-foreground text-xs">
                      {section.description}
                    </p>
                  )}
                </div>
                <div className="divide-y">
                  {section.questions.map((q) => {
                    const tc = FIELD_TYPE_OPTIONS.find(
                      (o) => o.value === q.type,
                    );
                    return (
                      <div
                        key={q.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <span
                          className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${tc?.badgeBg ?? "bg-slate-100"} ${tc?.badgeText ?? "text-slate-600"}`}
                        >
                          {tc?.label}
                        </span>
                        <span className="flex-1 text-sm font-medium">
                          {q.label}
                        </span>
                        {q.required && (
                          <span className="rounded-sm bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            REQ
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {local.behaviorCodes.length > 0 && (
              <div className="overflow-hidden rounded-xl border">
                <div className="border-b bg-slate-50 px-4 py-2.5">
                  <p className="text-sm font-semibold">Behavior Codes</p>
                  <p className="text-muted-foreground text-xs">
                    {local.behaviorCodes.length} tags available for staff
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 p-4">
                  {local.behaviorCodes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm"
                    >
                      <div
                        className="size-2.5 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: code.color }}
                      />
                      <span className="text-xs font-medium">{code.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Edit mode ── */
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("sections")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "sections"
                    ? "bg-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardList className="mr-1.5 inline size-3.5" />
                Sections & Questions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("codes")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "codes"
                    ? "bg-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Palette className="mr-1.5 inline size-3.5" />
                Behavior Codes ({local.behaviorCodes.length})
              </button>
            </div>

            {activeTab === "sections" && (
              <div className="space-y-3">
                {local.sections.map((section, i) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    onChange={(s) => updateSection(i, s)}
                    onRemove={() => removeSection(i)}
                    onMoveUp={() => moveSection(i, -1)}
                    onMoveDown={() => moveSection(i, 1)}
                    isFirst={i === 0}
                    isLast={i === local.sections.length - 1}
                  />
                ))}
                <button
                  type="button"
                  onClick={addSection}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
                >
                  <Plus className="size-4" />
                  Add section
                </button>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Internal staff notes</p>
                    <p className="text-muted-foreground text-xs">
                      Free-text area for private staff comments (not shared with
                      customer)
                    </p>
                  </div>
                  <Switch
                    checked={local.internalNotesEnabled}
                    onCheckedChange={(c) =>
                      setLocal({ ...local, internalNotesEnabled: c })
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === "codes" && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">
                  Behavior codes are quick tags staff can assign during
                  evaluation. They appear as selectable badges in the evaluation
                  form.
                </p>
                <BehaviorCodesEditor
                  codes={local.behaviorCodes}
                  onChange={(codes) =>
                    setLocal({ ...local, behaviorCodes: codes })
                  }
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
