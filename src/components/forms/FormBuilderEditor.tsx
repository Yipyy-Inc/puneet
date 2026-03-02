"use client";

import { useState, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormQuestion,
  FormType,
  ServiceType,
  QuestionType,
  FormCondition,
  createForm,
  updateForm,
  getFormById,
  getTemplateById,
  type FieldMappingItem,
} from "@/data/forms";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";

const FORM_TYPES: { value: FormType; label: string }[] = [
  { value: "intake", label: "Intake (new clients)" },
  { value: "pet", label: "Pet profile" },
  { value: "owner", label: "Customer profile" },
  { value: "service", label: "Service" },
  { value: "internal", label: "Internal (staff only)" },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "boarding", label: "Boarding" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
  { value: "evaluation", label: "Evaluation" },
];

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "file", label: "File upload" },
  { value: "signature", label: "Signature" },
];

const MAPPING_TARGETS: string[] = [
  "customer.name",
  "customer.email",
  "customer.phone",
  "customer.address.street",
  "customer.address.city",
  "pet.name",
  "pet.type",
  "pet.breed",
  "pet.age",
  "pet.weight",
  "pet.allergies",
  "pet.specialNeeds",
  "pet.microchip",
  "notes",
];

function generateQuestionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface FormBuilderEditorProps {
  facilityId: number;
  initialFormId?: string | null;
  templateId?: string | null;
  onSave: (form: Form) => void;
}

export function FormBuilderEditor({
  facilityId,
  initialFormId,
  templateId,
  onSave,
}: FormBuilderEditorProps) {
  const existing = initialFormId ? getFormById(initialFormId) : null;
  const template = templateId ? getTemplateById(templateId) : null;

  const [name, setName] = useState(existing?.name ?? template?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [type, setType] = useState<FormType>(
    existing?.type ?? template?.formType ?? "intake"
  );
  const [serviceType, setServiceType] = useState<ServiceType | "">(
    existing?.serviceType ?? ""
  );
  const [internal, setInternal] = useState(existing?.internal ?? false);
  const [repeatPerPet, setRepeatPerPet] = useState(existing?.repeatPerPet ?? false);
  const [questions, setQuestions] = useState<FormQuestion[]>(
    existing?.questions ?? template?.questions ?? []
  );
  const [fieldMapping, setFieldMapping] = useState<FieldMappingItem[]>(
    existing?.fieldMapping ?? []
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    questions[0]?.id ?? null
  );

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  const addQuestion = useCallback(() => {
    const q: FormQuestion = {
      id: generateQuestionId(),
      type: "text",
      label: "New question",
      required: false,
    };
    setQuestions((prev) => [...prev, q]);
    setSelectedQuestionId(q.id);
  }, []);

  const updateQuestion = useCallback((id: string, patch: Partial<FormQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id);
      if (selectedQuestionId === id) setSelectedQuestionId(next[0]?.id ?? null);
      return next;
    });
    setFieldMapping((prev) => prev.filter((m) => m.questionId !== id));
  }, [selectedQuestionId]);

  const moveQuestion = useCallback((id: string, dir: "up" | "down") => {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.id === id);
      if (i === -1) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const addMapping = useCallback(() => {
    const firstId = questions[0]?.id;
    if (!firstId) return;
    setFieldMapping((prev) => [
      ...prev,
      { questionId: firstId, target: "customer.name" },
    ]);
  }, [questions]);

  const updateMapping = useCallback((questionId: string, target: string) => {
    setFieldMapping((prev) => {
      const without = prev.filter((m) => m.questionId !== questionId);
      return [...without, { questionId, target }];
    });
  }, []);

  const removeMapping = useCallback((questionId: string) => {
    setFieldMapping((prev) => prev.filter((m) => m.questionId !== questionId));
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    if (existing) {
      const updated = updateForm(existing.id, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        serviceType: serviceType || undefined,
        internal,
        repeatPerPet,
        questions,
        fieldMapping,
      });
      if (updated) onSave(updated);
    } else {
      const created = createForm({
        facilityId,
        name: name.trim(),
        slug: slug.trim(),
        type,
        serviceType: serviceType || undefined,
        templateId: template?.id,
        internal,
        questions,
        fieldMapping,
        repeatPerPet,
      });
      onSave(created);
    }
  }, [
    existing,
    facilityId,
    name,
    slug,
    type,
    serviceType,
    internal,
    repeatPerPet,
    questions,
    fieldMapping,
    template?.id,
    onSave,
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Form settings</CardTitle>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Form name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Client Intake"
                />
              </div>
              <div className="space-y-2">
                <Label>URL slug (for shareable link)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto from name if empty"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={type} onValueChange={(v) => setType(v as FormType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === "service" && (
                <div className="space-y-2">
                  <Label>Service type</Label>
                  <Select
                    value={serviceType}
                    onValueChange={(v) => setServiceType(v as ServiceType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch id="internal" checked={internal} onCheckedChange={setInternal} />
                <Label htmlFor="internal">Staff only (internal)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="repeatPerPet"
                  checked={repeatPerPet}
                  onCheckedChange={setRepeatPerPet}
                />
                <Label htmlFor="repeatPerPet">Repeat per pet</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Questions</CardTitle>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add question
            </Button>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Add questions to build your form.
              </p>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`flex items-center gap-2 rounded-md border p-2 ${
                      selectedQuestionId === q.id ? "border-primary bg-muted/50" : ""
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <button
                      type="button"
                      className="flex-1 text-left text-sm truncate"
                      onClick={() => setSelectedQuestionId(q.id)}
                    >
                      {q.label || "Untitled"}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveQuestion(q.id, "up")}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveQuestion(q.id, "down")}
                      disabled={idx === questions.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedQuestion && (
          <Card>
            <CardHeader>
              <CardTitle>Edit question</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionEditor
                question={selectedQuestion}
                allQuestions={questions}
                currentQuestionId={selectedQuestion.id}
                onChange={(patch) => updateQuestion(selectedQuestion.id, patch)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Field mapping</CardTitle>
            <Button variant="outline" size="sm" onClick={addMapping}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Map answers to customer/pet fields when processing submissions.
            </p>
            {fieldMapping.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mappings yet.</p>
            ) : (
              <div className="space-y-2">
                {fieldMapping.map((m) => (
                  <div
                    key={m.questionId}
                    className="flex items-center gap-2 rounded border p-2 text-sm"
                  >
                    <Select
                      value={m.questionId}
                      onValueChange={(v) => {
                        const cur = fieldMapping.find((x) => x.questionId === m.questionId);
                        removeMapping(m.questionId);
                        updateMapping(v, cur?.target ?? "customer.name");
                      }}
                    >
                      <SelectTrigger className="flex-1 min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {questions.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={m.target}
                      onValueChange={(v) => updateMapping(m.questionId, v)}
                    >
                      <SelectTrigger className="flex-1 min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAPPING_TARGETS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeMapping(m.questionId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  allQuestions,
  currentQuestionId,
  onChange,
}: {
  question: FormQuestion;
  allQuestions: FormQuestion[];
  currentQuestionId: string;
  onChange: (patch: Partial<FormQuestion>) => void;
}) {
  const needsOptions =
    question.type === "select" || question.type === "multiselect";
  const options = question.options ?? [];
  const [optionsText, setOptionsText] = useState(
    options.map((o) => `${o.value}:${o.label}`).join("\n")
  );

  const syncOptions = (text: string) => {
    setOptionsText(text);
    const lines = text.split("\n").filter(Boolean);
    const next = lines.map((line) => {
      const [value, ...labelParts] = line.split(":");
      const label = labelParts.length ? labelParts.join(":").trim() : (value ?? "").trim();
      return { value: (value ?? "").trim(), label: label || (value ?? "").trim() };
    });
    onChange({ options: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Label</Label>
        <Input
          value={question.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Question text"
        />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select
          value={question.type}
          onValueChange={(v) => onChange({ type: v as QuestionType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="required"
          checked={question.required}
          onCheckedChange={(v) => onChange({ required: v })}
        />
        <Label htmlFor="required">Required</Label>
      </div>
      {needsOptions && (
        <div className="space-y-2">
          <Label>Options (one per line, optional label after colon)</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={optionsText}
            onChange={(e) => syncOptions(e.target.value)}
            placeholder="Yes\nNo\nvalue:Display Label"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Show when (conditional)</Label>
        <ConditionEditor
          condition={question.condition}
          allQuestions={allQuestions}
          currentQuestionId={currentQuestionId}
          onChange={(c) => onChange({ condition: c })}
        />
      </div>
    </div>
  );
}

type ContextField = "petType" | "serviceType" | "evaluationStatus";

function ConditionEditor({
  condition,
  allQuestions,
  currentQuestionId,
  onChange,
}: {
  condition: FormQuestion["condition"];
  allQuestions: FormQuestion[];
  currentQuestionId: string;
  onChange: (c: FormCondition | undefined) => void;
}) {
  const useContext = condition?.contextField != null;
  const sourceQuestionId = condition?.questionId ?? "";
  const contextField = (condition?.contextField ?? "petType") as ContextField;
  const operator = condition?.operator ?? "eq";
  const value = Array.isArray(condition?.value)
    ? condition.value.join(", ")
    : (condition?.value ?? "");

  const setContext = (field: ContextField, op: FormCondition["operator"], val: string) => {
    const v = val.includes(",")
      ? val.split(",").map((s) => s.trim()).filter(Boolean)
      : val.trim();
    onChange({
      contextField: field,
      operator: op,
      value: Array.isArray(v) ? v : v,
    });
  };

  const setAnswer = (
    questionId: string,
    op: FormCondition["operator"],
    val: string
  ) => {
    const v = val.includes(",")
      ? val.split(",").map((s) => s.trim()).filter(Boolean)
      : val.trim();
    onChange({
      questionId,
      operator: op,
      value: Array.isArray(v) ? v : v,
    });
  };

  if (!condition) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({
        contextField: "petType",
        operator: "eq",
        value: "",
      })}>
        Add condition (show when...)
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Show when</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          Remove
        </Button>
      </div>
      {useContext ? (
        <>
          <Select
            value={contextField}
            onValueChange={(f) => setContext(f as ContextField, operator, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="petType">Pet type</SelectItem>
              <SelectItem value="serviceType">Service type</SelectItem>
              <SelectItem value="evaluationStatus">Evaluation status</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={operator}
            onValueChange={(o) => setContext(contextField, o as FormCondition["operator"], value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">equals</SelectItem>
              <SelectItem value="neq">not equals</SelectItem>
              <SelectItem value="in">in list</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={value}
            onChange={(e) => setContext(contextField, operator, e.target.value)}
            placeholder="e.g. Dog or boarding,grooming"
          />
        </>
      ) : (
        <>
          <Select
            value={sourceQuestionId}
            onValueChange={(id) => setAnswer(id, operator, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select question" />
            </SelectTrigger>
            <SelectContent>
              {allQuestions
                .filter((q) => q.id !== currentQuestionId)
                .map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={operator}
            onValueChange={(o) =>
              sourceQuestionId
                ? setAnswer(sourceQuestionId, o as FormCondition["operator"], value)
                : undefined
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">equals</SelectItem>
              <SelectItem value="neq">not equals</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
              <SelectItem value="in">in list</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={value}
            onChange={(e) =>
              sourceQuestionId
                ? setAnswer(sourceQuestionId, operator, e.target.value)
                : undefined
            }
            placeholder="Value or comma-separated for 'in'"
          />
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          if (useContext) {
            const other = allQuestions.find((q) => q.id !== currentQuestionId);
            onChange({ questionId: other?.id ?? "", operator: "eq", value: "" });
          } else {
            onChange({ contextField: "petType", operator: "eq", value: "" });
          }
        }}
      >
        {useContext ? "Switch to: based on answer" : "Switch to: based on context"}
      </Button>
    </div>
  );
}
