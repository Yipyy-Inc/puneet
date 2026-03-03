"use client";

import { useState, useCallback, useRef } from "react";
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
  SelectGroup,
  SelectLabel,
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
  type FormSectionDTO,
} from "@/data/forms";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  FolderOpen,
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
  { value: "yes_no", label: "Yes/No" },
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio buttons" },
  { value: "multiselect", label: "Checkboxes (multi-select)" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
  { value: "file", label: "File upload" },
  { value: "signature", label: "Signature" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "address", label: "Address block" },
];

/** Mapping targets by category (6.2: configurable per field in builder). Values are stored as target keys. */
const MAPPING_TARGET_GROUPS: { group: string; targets: { value: string; label: string }[] }[] = [
  {
    group: "Customer profile",
    targets: [
      { value: "customer.name", label: "Name" },
      { value: "customer.email", label: "Email" },
      { value: "customer.phone", label: "Phone" },
      { value: "customer.address.street", label: "Address (street)" },
      { value: "customer.address.city", label: "Address (city)" },
      { value: "customer.address.state", label: "Address (state)" },
      { value: "customer.address.zip", label: "Address (zip)" },
      { value: "customer.emergencyContact.name", label: "Emergency contact name" },
      { value: "customer.emergencyContact.phone", label: "Emergency contact phone" },
      { value: "customer.emergencyContact.email", label: "Emergency contact email" },
    ],
  },
  {
    group: "Pet profile",
    targets: [
      { value: "pet.name", label: "Name" },
      { value: "pet.type", label: "Type" },
      { value: "pet.breed", label: "Breed" },
      { value: "pet.age", label: "Age" },
      { value: "pet.weight", label: "Weight" },
      { value: "pet.birthday", label: "Birthday" },
      { value: "pet.color", label: "Color" },
      { value: "pet.microchip", label: "Microchip" },
      { value: "pet.allergies", label: "Allergies" },
      { value: "pet.specialNeeds", label: "Special needs" },
      { value: "pet.behaviorFlags", label: "Behavior flags" },
      { value: "pet.vetName", label: "Vet name" },
      { value: "pet.vetPhone", label: "Vet phone" },
    ],
  },
  {
    group: "Medical / vaccine",
    targets: [
      { value: "medical.vaccineRecord", label: "Vaccine record (file)" },
      { value: "medical.healthNotes", label: "Health notes" },
      { value: "medical.medications", label: "Medications" },
    ],
  },
  {
    group: "Notes",
    targets: [
      { value: "notes.customer", label: "Customer notes" },
      { value: "notes.pet", label: "Pet notes" },
      { value: "notes.booking", label: "Booking notes (if submission linked to booking)" },
      { value: "notes", label: "General notes" },
    ],
  },
  {
    group: "Tags",
    targets: [
      { value: "tags.customer", label: "Apply tag to customer" },
      { value: "tags.pet", label: "Apply tag to pet" },
      { value: "tags.behaviorAlert", label: "Behavior alert tag" },
      { value: "tags.medicalAlert", label: "Medical alert tag" },
    ],
  },
];

const MAPPING_TARGETS_FLAT = MAPPING_TARGET_GROUPS.flatMap((g) => g.targets.map((t) => t.value));

function generateQuestionId(): string {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function generateSectionId(): string {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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
  const defaultSectionIdRef = useRef<string>(generateSectionId());
  const defaultSectionId = defaultSectionIdRef.current;
  const [sections, setSections] = useState<FormSectionDTO[]>(() =>
    (existing?.sections?.length ?? 0) > 0
      ? existing!.sections!
      : [{ id: defaultSectionId, title: "Section 1", order: 0 }]
  );
  const [questions, setQuestions] = useState<FormQuestion[]>(() => {
    const base = existing?.questions ?? template?.questions ?? [];
    const firstId = (existing?.sections?.length ?? 0) > 0 ? existing!.sections![0].id : defaultSectionId;
    return base.map((q) => ({ ...q, sectionId: q.sectionId ?? firstId }));
  });
  const [fieldMapping, setFieldMapping] = useState<FieldMappingItem[]>(
    existing?.fieldMapping ?? []
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(() => {
    const base = existing?.questions ?? template?.questions ?? [];
    return base[0]?.id ?? null;
  });
  const [welcomeMessage, setWelcomeMessage] = useState(existing?.settings?.welcomeMessage ?? "");
  const [themeColor, setThemeColor] = useState(existing?.settings?.themeColor ?? "");

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const questionsBySection = sortedSections.map((sec) => ({
    section: sec,
    questions: questions.filter((q) => q.sectionId === sec.id),
  }));

  const addSection = useCallback(() => {
    const newSec: FormSectionDTO = {
      id: generateSectionId(),
      title: `Section ${sections.length + 1}`,
      order: sections.length,
    };
    setSections((prev) => [...prev, newSec]);
  }, [sections.length]);

  const updateSection = useCallback((sectionId: string, patch: Partial<FormSectionDTO>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    );
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    const remaining = sections.filter((s) => s.id !== sectionId).sort((a, b) => a.order - b.order);
    const targetId = remaining[0]?.id;
    setSections(remaining.map((s, i) => ({ ...s, order: i })));
    if (targetId) {
      setQuestions((prev) =>
        prev.map((q) => (q.sectionId === sectionId ? { ...q, sectionId: targetId } : q))
      );
    } else {
      setQuestions([]);
      setSelectedQuestionId(null);
    }
  }, [sections]);

  const insertIndexForSection = useCallback(
    (sectionId: string) => {
      const order = sections.find((s) => s.id === sectionId)?.order ?? 0;
      const lastInSection = questions.reduce((max, q, i) => (q.sectionId === sectionId ? i : max), -1);
      if (lastInSection >= 0) return lastInSection + 1;
      const firstOfLater = questions.findIndex(
        (q) => (sections.find((s) => s.id === q.sectionId)?.order ?? 0) >= order
      );
      return firstOfLater === -1 ? questions.length : firstOfLater;
    },
    [questions, sections]
  );

  const addQuestion = useCallback(
    (sectionId?: string) => {
      const secId = sectionId ?? sortedSections[0]?.id;
      if (!secId) return;
      const q: FormQuestion = {
        id: generateQuestionId(),
        type: "text",
        label: "New question",
        required: false,
        sectionId: secId,
      };
      const at = insertIndexForSection(secId);
      setQuestions((prev) => [...prev.slice(0, at), q, ...prev.slice(at)]);
      setSelectedQuestionId(q.id);
    },
    [sortedSections, insertIndexForSection]
  );

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
      const sectionId = prev[i].sectionId;
      const inSection = prev
        .map((q, idx) => ({ q, idx }))
        .filter(({ q }) => q.sectionId === sectionId);
      const pos = inSection.findIndex(({ q }) => q.id === id);
      if (pos === -1) return prev;
      const targetPos = dir === "up" ? pos - 1 : pos + 1;
      if (targetPos < 0 || targetPos >= inSection.length) return prev;
      const j = inSection[targetPos].idx;
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
    const settings = (welcomeMessage || themeColor) ? { welcomeMessage: welcomeMessage || undefined, themeColor: themeColor || undefined } : undefined;
    const questionsWithSection = questions.map((q) => ({ ...q, sectionId: q.sectionId ?? sortedSections[0]?.id }));
    if (existing) {
      const updated = updateForm(existing.id, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        serviceType: serviceType || undefined,
        internal,
        repeatPerPet,
        sections,
        questions: questionsWithSection,
        fieldMapping,
        settings,
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
        sections,
        questions: questionsWithSection,
        fieldMapping,
        repeatPerPet,
        settings,
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
    sections,
    questions,
    sortedSections,
    fieldMapping,
    welcomeMessage,
    themeColor,
    template?.id,
    onSave,
  ]);

  const handlePublish = useCallback(() => {
    if (!name.trim() || !existing) return;
    const settings = (welcomeMessage || themeColor) ? { welcomeMessage: welcomeMessage || undefined, themeColor: themeColor || undefined } : undefined;
    const questionsWithSection = questions.map((q) => ({ ...q, sectionId: q.sectionId ?? sortedSections[0]?.id }));
    const updated = updateForm(existing.id, {
      name: name.trim(),
      slug: slug.trim() || undefined,
      type,
      serviceType: serviceType || undefined,
      internal,
      repeatPerPet,
      sections,
      questions: questionsWithSection,
      fieldMapping,
      settings,
      status: "published",
    });
    if (updated) onSave(updated);
  }, [existing, name, slug, type, serviceType, internal, repeatPerPet, sections, questions, sortedSections, fieldMapping, welcomeMessage, themeColor, onSave]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Form settings</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              {existing && (
                <Button onClick={handlePublish} disabled={existing?.status === "published"}>
                  Publish
                </Button>
              )}
            </div>
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
            <div className="space-y-2">
              <Label>Welcome message (optional)</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Brief intro shown at the top of the form"
              />
            </div>
            <div className="space-y-2">
              <Label>Theme color (optional)</Label>
              <Select value={themeColor || "default"} onValueChange={(v) => setThemeColor(v === "default" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="#0ea5e9">Sky</SelectItem>
                  <SelectItem value="#22c55e">Green</SelectItem>
                  <SelectItem value="#8b5cf6">Violet</SelectItem>
                  <SelectItem value="#f59e0b">Amber</SelectItem>
                </SelectContent>
              </Select>
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
            <CardTitle>Sections & questions</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addSection}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Add section
              </Button>
              <Button variant="outline" size="sm" onClick={() => addQuestion()}>
                <Plus className="mr-2 h-4 w-4" />
                Add question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {questionsBySection.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Add a section, then add questions.
              </p>
            ) : (
              <div className="space-y-4">
                {questionsBySection.map(({ section, questions: secQuestions }) => (
                  <div key={section.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="h-8 font-medium border-0 shadow-none focus-visible:ring-0 px-0"
                        placeholder="Section title"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => removeSection(section.id)}
                        disabled={questionsBySection.length <= 1}
                        title="Remove section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => addQuestion(section.id)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add question
                      </Button>
                    </div>
                    {secQuestions.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-6">No questions yet.</p>
                    ) : (
                      <div className="space-y-2 pl-2">
                        {secQuestions.map((q, idx) => (
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
                              disabled={idx === secQuestions.length - 1}
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
                mappingTarget={fieldMapping.find((m) => m.questionId === selectedQuestion.id)?.target}
                onMappingChange={(t) => (t ? updateMapping(selectedQuestion.id, t) : removeMapping(selectedQuestion.id))}
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
              Map answers to customer/pet profile fields, notes, medical/vaccine, or tags. Configurable per question in the question editor (Save answer to profile) or here.
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
                        <SelectValue placeholder="Map to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MAPPING_TARGET_GROUPS.map((grp) => (
                          <SelectGroup key={grp.group}>
                            <SelectLabel>{grp.group}</SelectLabel>
                            {grp.targets.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                        {m.target && !MAPPING_TARGETS_FLAT.includes(m.target) && (
                          <SelectGroup key="_other">
                            <SelectLabel>Other</SelectLabel>
                            <SelectItem value={m.target}>{m.target}</SelectItem>
                          </SelectGroup>
                        )}
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
  mappingTarget,
  onMappingChange,
  onChange,
}: {
  question: FormQuestion;
  allQuestions: FormQuestion[];
  currentQuestionId: string;
  mappingTarget?: string;
  onMappingChange?: (target: string | null) => void;
  onChange: (patch: Partial<FormQuestion>) => void;
}) {
  const needsOptions =
    question.type === "select" || question.type === "multiselect" || question.type === "yes_no" || question.type === "radio";
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

  const handleTypeChange = (v: QuestionType) => {
    onChange({ type: v });
    if (v === "yes_no" && (!question.options || question.options.length === 0)) {
      onChange({ type: v, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] });
      setOptionsText("yes:Yes\nno:No");
    }
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
          onValueChange={(v) => handleTypeChange(v as QuestionType)}
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
      <div className="space-y-2">
        <Label>Visible to</Label>
        <Select
          value={question.visibility ?? "customer"}
          onValueChange={(v) => onChange({ visibility: v as "customer" | "staff" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="staff">Staff only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {onMappingChange && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="save-to-profile"
              checked={!!mappingTarget}
              onCheckedChange={(v) => onMappingChange(v ? "customer.name" : null)}
            />
            <Label htmlFor="save-to-profile">Save answer to profile</Label>
          </div>
          {mappingTarget && (
            <Select
              value={MAPPING_TARGETS_FLAT.includes(mappingTarget) ? mappingTarget : MAPPING_TARGETS_FLAT[0]}
              onValueChange={(v) => onMappingChange(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose field..." />
              </SelectTrigger>
              <SelectContent>
                {MAPPING_TARGET_GROUPS.map((grp) => (
                  <SelectGroup key={grp.group}>
                    <SelectLabel>{grp.group}</SelectLabel>
                    {grp.targets.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
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
