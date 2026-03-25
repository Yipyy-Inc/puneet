"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  getFormVersionHistory,
  type FieldMappingItem,
  type FormSectionDTO,
  type FormAudience,
  type FormAppliesTo,
  type FormLogicRule,
  type LogicActionType,
} from "@/data/forms";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  FolderOpen,
  Zap,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  History,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

const LOGIC_ACTIONS: { value: LogicActionType; label: string; description: string }[] = [
  { value: "show", label: "Show question(s)", description: "Make target questions visible" },
  { value: "hide", label: "Hide question(s)", description: "Hide target questions" },
  { value: "require", label: "Make required", description: "Make target questions required" },
  { value: "skip_to_section", label: "Jump to section", description: "Skip ahead to a section" },
  { value: "end_form", label: "End form early", description: "End form with a message" },
  { value: "set_tag", label: "Add tag", description: "Add a tag to pet/customer" },
  { value: "alert_flag", label: "Alert flag", description: "Trigger internal alert on submission" },
];

const CONDITION_OPERATORS: { value: string; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "in", label: "in list" },
  { value: "answered", label: "is answered" },
  { value: "not_answered", label: "is not answered" },
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

function SortableQuestionRow({
  q,
  idx,
  total,
  selectedQuestionId,
  mappingTarget,
  onSelect,
  onUpdateLabel,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  q: FormQuestion;
  idx: number;
  total: number;
  selectedQuestionId: string | null;
  mappingTarget?: string;
  onSelect: () => void;
  onUpdateLabel: (v: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const mappingLabel = mappingTarget
    ? MAPPING_TARGET_GROUPS.flatMap((g) => g.targets).find((t) => t.value === mappingTarget)?.label ?? mappingTarget
    : null;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border p-2 ${isDragging ? "opacity-50 shadow-md" : ""} ${
        selectedQuestionId === q.id ? "border-primary bg-muted/50" : ""
      }`}
    >
      <div {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <Input
          value={q.label || ""}
          onChange={(e) => onUpdateLabel(e.target.value)}
          onFocus={onSelect}
          onClick={onSelect}
          className="flex-1 min-w-0 h-8 border-0 shadow-none focus-visible:ring-0 text-sm"
          placeholder="Question text"
        />
        {mappingLabel && (
          <Badge variant="secondary" className="shrink-0 text-[10px] h-5 px-1.5 font-normal bg-blue-50 text-blue-700 border-blue-200">
            {mappingLabel}
          </Badge>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveUp} disabled={idx === 0}>
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveDown} disabled={idx === total - 1}>
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

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
  const [requireAuth, setRequireAuth] = useState(existing?.requireAuth ?? false);
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
  const [submitMessage, setSubmitMessage] = useState(existing?.settings?.submitMessage ?? "");
  const [themeColor, setThemeColor] = useState(existing?.settings?.themeColor ?? "");
  const [audience, setAudience] = useState<FormAudience>(existing?.audience ?? "customer");
  const [appliesTo, setAppliesTo] = useState<FormAppliesTo>(existing?.appliesTo ?? {});
  const [formLogicRules, setFormLogicRules] = useState<FormLogicRule[]>(existing?.logicRules ?? []);
  const [previewMode, setPreviewMode] = useState<"none" | "desktop" | "mobile">("none");
  const [previewAudience, setPreviewAudience] = useState<"customer" | "staff">("customer");
  const versionHistory = existing ? getFormVersionHistory(existing.id) : [];

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

  const handleQuestionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      setQuestions((prev) => {
        const dragged = prev.find((q) => q.id === activeId);
        if (!dragged?.sectionId) return prev;
        const inSection = prev.filter((q) => q.sectionId === dragged.sectionId);
        const oldIdx = inSection.findIndex((q) => q.id === activeId);
        const newIdx = inSection.findIndex((q) => q.id === overId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const reordered = arrayMove(inSection, oldIdx, newIdx);
        const sectionOrder = sortedSections.map((s) => s.id);
        const merged: FormQuestion[] = [];
        for (const secId of sectionOrder) {
          if (secId === dragged.sectionId) merged.push(...reordered);
          else merged.push(...prev.filter((q) => q.sectionId === secId));
        }
        return merged;
      });
    },
    [sortedSections]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    const settings = (welcomeMessage || submitMessage || themeColor) ? {
      welcomeMessage: welcomeMessage || undefined,
      submitMessage: submitMessage || undefined,
      themeColor: themeColor || undefined,
    } : undefined;
    const questionsWithSection = questions.map((q) => ({ ...q, sectionId: q.sectionId ?? sortedSections[0]?.id }));
    const appliesData = (appliesTo.petTypes?.length || appliesTo.serviceTypes?.length || appliesTo.locationIds?.length) ? appliesTo : undefined;
    if (existing) {
      const updated = updateForm(existing.id, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        serviceType: serviceType || undefined,
        internal,
        repeatPerPet,
        requireAuth,
        audience,
        appliesTo: appliesData,
        sections,
        questions: questionsWithSection,
        fieldMapping,
        logicRules: formLogicRules.length ? formLogicRules : undefined,
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
        audience,
        appliesTo: appliesData,
        sections,
        questions: questionsWithSection,
        fieldMapping,
        logicRules: formLogicRules.length ? formLogicRules : undefined,
        repeatPerPet,
        requireAuth,
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
    requireAuth,
    audience,
    appliesTo,
    sections,
    questions,
    sortedSections,
    fieldMapping,
    formLogicRules,
    welcomeMessage,
    submitMessage,
    themeColor,
    template?.id,
    onSave,
  ]);

  const handlePublish = useCallback(() => {
    if (!name.trim() || !existing) return;
    const settings = (welcomeMessage || submitMessage || themeColor) ? {
      welcomeMessage: welcomeMessage || undefined,
      submitMessage: submitMessage || undefined,
      themeColor: themeColor || undefined,
    } : undefined;
    const questionsWithSection = questions.map((q) => ({ ...q, sectionId: q.sectionId ?? sortedSections[0]?.id }));
    const appliesData = (appliesTo.petTypes?.length || appliesTo.serviceTypes?.length || appliesTo.locationIds?.length) ? appliesTo : undefined;
    const updated = updateForm(existing.id, {
      name: name.trim(),
      slug: slug.trim() || undefined,
      type,
      serviceType: serviceType || undefined,
      internal,
      repeatPerPet,
      requireAuth,
      audience,
      appliesTo: appliesData,
      sections,
      questions: questionsWithSection,
      fieldMapping,
      logicRules: formLogicRules.length ? formLogicRules : undefined,
      settings,
      status: "published",
    });
    if (updated) onSave(updated);
  }, [existing, name, slug, type, serviceType, internal, repeatPerPet, requireAuth, audience, appliesTo, sections, questions, sortedSections, fieldMapping, formLogicRules, welcomeMessage, submitMessage, themeColor, onSave]);

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
              <Label>Submit confirmation message (optional)</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={submitMessage}
                onChange={(e) => setSubmitMessage(e.target.value)}
                placeholder="Message shown after successful submission"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Theme color (optional)</Label>
                <Select value={themeColor || "default"} onValueChange={(v) => setThemeColor(v === "default" ? "" : v)}>
                  <SelectTrigger className="w-full">
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
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as FormAudience)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="staff">Staff only</SelectItem>
                    <SelectItem value="both">Both (customer &amp; staff)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="text-sm font-medium">Applies to (targeting)</Label>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pet types</Label>
                <div className="flex flex-wrap gap-3">
                  {["dog", "cat", "other"].map((pt) => (
                    <label key={pt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={appliesTo.petTypes?.includes(pt) ?? false}
                        onChange={(e) => {
                          const current = appliesTo.petTypes ?? [];
                          setAppliesTo({
                            ...appliesTo,
                            petTypes: e.target.checked
                              ? [...current, pt]
                              : current.filter((x) => x !== pt),
                          });
                        }}
                      />
                      {pt.charAt(0).toUpperCase() + pt.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Service types</Label>
                <div className="flex flex-wrap gap-3">
                  {["boarding", "daycare", "grooming", "training"].map((st) => (
                    <label key={st} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={appliesTo.serviceTypes?.includes(st) ?? false}
                        onChange={(e) => {
                          const current = appliesTo.serviceTypes ?? [];
                          setAppliesTo({
                            ...appliesTo,
                            serviceTypes: e.target.checked
                              ? [...current, st]
                              : current.filter((x) => x !== st),
                          });
                        }}
                      />
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </label>
                  ))}
                </div>
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="requireAuth"
                  checked={requireAuth}
                  onCheckedChange={setRequireAuth}
                />
                <Label htmlFor="requireAuth">Require verification</Label>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
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
                        <SortableContext items={secQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                          {secQuestions.map((q, idx) => (
                            <SortableQuestionRow
                              key={q.id}
                              q={q}
                              idx={idx}
                              total={secQuestions.length}
                              selectedQuestionId={selectedQuestionId}
                              mappingTarget={fieldMapping.find((m) => m.questionId === q.id)?.target}
                              onSelect={() => setSelectedQuestionId(q.id)}
                              onUpdateLabel={(v) => updateQuestion(q.id, { label: v })}
                              onMoveUp={() => moveQuestion(q.id, "up")}
                              onMoveDown={() => moveQuestion(q.id, "down")}
                              onRemove={() => removeQuestion(q.id)}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </DndContext>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Right: settings panel */}
      <div className="space-y-6">
        {selectedQuestion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Question settings</CardTitle>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Field mapping</CardTitle>
              {fieldMapping.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                  {fieldMapping.length} mapped
                </Badge>
              )}
            </div>
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
                {/* Mapping preview summary — shows grouped target counts */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t mt-3">
                  {(() => {
                    const counts: Record<string, number> = {};
                    for (const m of fieldMapping) {
                      const group = MAPPING_TARGET_GROUPS.find((g) => g.targets.some((t) => t.value === m.target));
                      const key = group?.group ?? "Other";
                      counts[key] = (counts[key] ?? 0) + 1;
                    }
                    return Object.entries(counts).map(([group, count]) => (
                      <Badge key={group} variant="outline" className="text-[10px] h-5 font-normal">
                        {group}: {count}
                      </Badge>
                    ));
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logic Rules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Logic Rules
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormLogicRules((prev) => [
                  ...prev,
                  {
                    id: `lr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
                    triggerQuestionId: questions[0]?.id ?? "",
                    operator: "eq" as const,
                    value: "",
                    action: "show" as const,
                    targetQuestionIds: [],
                  },
                ]);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add rule
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              IF a question&apos;s answer matches a condition, THEN perform an action on other questions or sections.
              {questions.length === 0 && " Add questions first, then create logic rules."}
            </p>
            {formLogicRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logic rules yet.</p>
            ) : (
              <div className="space-y-3">
                {formLogicRules.map((rule) => (
                  <LogicRuleEditor
                    key={rule.id}
                    rule={rule}
                    allQuestions={questions}
                    allSections={sortedSections}
                    onChange={(updated) =>
                      setFormLogicRules((prev) =>
                        prev.map((r) => (r.id === rule.id ? updated : r))
                      )
                    }
                    onRemove={() =>
                      setFormLogicRules((prev) => prev.filter((r) => r.id !== rule.id))
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={previewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(previewMode === "desktop" ? "none" : "desktop")}
              >
                <Monitor className="h-3.5 w-3.5 mr-1" />
                Desktop
              </Button>
              <Button
                variant={previewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewMode(previewMode === "mobile" ? "none" : "mobile")}
              >
                <Smartphone className="h-3.5 w-3.5 mr-1" />
                Mobile
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={previewAudience === "customer" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewAudience("customer")}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Customer view
              </Button>
              <Button
                variant={previewAudience === "staff" ? "default" : "outline"}
                size="sm"
                onClick={() => setPreviewAudience("staff")}
              >
                <EyeOff className="h-3.5 w-3.5 mr-1" />
                Staff view
              </Button>
            </div>
            {previewMode !== "none" && (
              <div
                className={`border rounded-lg overflow-hidden bg-background ${
                  previewMode === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
                }`}
              >
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{name || "Untitled form"}</h3>
                    {welcomeMessage && (
                      <p className="text-sm text-muted-foreground mt-1">{welcomeMessage}</p>
                    )}
                  </div>
                  {questions
                    .filter((q) =>
                      previewAudience === "customer"
                        ? q.visibility !== "staff"
                        : true
                    )
                    .map((q) => (
                      <div key={q.id} className="space-y-1.5">
                        <p className="text-sm font-medium">
                          {q.label}
                          {q.required && <span className="text-destructive"> *</span>}
                        </p>
                        {q.helpText && (
                          <p className="text-xs text-muted-foreground">{q.helpText}</p>
                        )}
                        <div className="h-9 rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm text-muted-foreground">
                          {q.type === "yes_no" ? "Yes / No" :
                           q.type === "textarea" ? "Long text..." :
                           q.type === "select" ? "Select..." :
                           q.type === "radio" ? "Radio buttons" :
                           q.type === "multiselect" ? "Checkboxes" :
                           q.type === "file" ? "File upload" :
                           q.type === "signature" ? "Signature" :
                           q.type === "address" ? "Address block" :
                           q.placeholder || q.type}
                        </div>
                        {q.visibility === "staff" && (
                          <Badge variant="secondary" className="text-[10px]">Staff only</Badge>
                        )}
                      </div>
                    ))}
                  <div className="h-10 rounded-md bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground">
                    Submit
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Version History */}
        {versionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {versionHistory.map((v) => (
                  <div
                    key={v.versionId}
                    className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">v{v.versionNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.questionCount} question{v.questionCount !== 1 ? "s" : ""}
                        {v.createdBy ? ` · by ${v.createdBy}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      {v.publishedAt ? (
                        <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100 border-0">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {v.createdAt.slice(0, 10)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Logic Rule Editor — one rule row */
function LogicRuleEditor({
  rule,
  allQuestions,
  allSections,
  onChange,
  onRemove,
}: {
  rule: FormLogicRule;
  allQuestions: FormQuestion[];
  allSections: FormSectionDTO[];
  onChange: (updated: FormLogicRule) => void;
  onRemove: () => void;
}) {
  const needsValue = rule.operator !== "answered" && rule.operator !== "not_answered";
  const needsTargetQuestions = rule.action === "show" || rule.action === "hide" || rule.action === "require";
  const needsTargetSection = rule.action === "skip_to_section";
  const needsMessage = rule.action === "end_form";
  const needsTag = rule.action === "set_tag";

  const triggerLabel = allQuestions.find((q) => q.id === rule.triggerQuestionId)?.label || "Question";
  const actionLabel = LOGIC_ACTIONS.find((a) => a.value === rule.action)?.label || rule.action;

  return (
    <div className="rounded-lg border p-3 space-y-2.5 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          IF &ldquo;{triggerLabel}&rdquo; → {actionLabel}
        </p>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {/* Trigger question */}
      <Select
        value={rule.triggerQuestionId}
        onValueChange={(v) => onChange({ ...rule, triggerQuestionId: v })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Trigger question" />
        </SelectTrigger>
        <SelectContent>
          {allQuestions.map((q) => (
            <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Operator */}
      <Select
        value={rule.operator}
        onValueChange={(v) => onChange({ ...rule, operator: v as FormLogicRule["operator"] })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONDITION_OPERATORS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Value */}
      {needsValue && (
        <Input
          value={Array.isArray(rule.value) ? rule.value.join(", ") : (rule.value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ ...rule, value: val.includes(",") ? val.split(",").map((s) => s.trim()).filter(Boolean) : val });
          }}
          placeholder="Value (or comma-separated for 'in list')"
          className="h-8 text-xs"
        />
      )}
      {/* Action */}
      <Select
        value={rule.action}
        onValueChange={(v) => onChange({ ...rule, action: v as LogicActionType })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOGIC_ACTIONS.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              <span className="flex flex-col">
                <span>{a.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Target questions (for show/hide/require) */}
      {needsTargetQuestions && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Target questions</Label>
          <div className="max-h-32 overflow-y-auto space-y-1 rounded border p-2">
            {allQuestions
              .filter((q) => q.id !== rule.triggerQuestionId)
              .map((q) => (
                <label key={q.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={rule.targetQuestionIds?.includes(q.id) ?? false}
                    onChange={(e) => {
                      const current = rule.targetQuestionIds ?? [];
                      onChange({
                        ...rule,
                        targetQuestionIds: e.target.checked
                          ? [...current, q.id]
                          : current.filter((id) => id !== q.id),
                      });
                    }}
                  />
                  {q.label}
                </label>
              ))}
          </div>
        </div>
      )}
      {/* Target section (for skip_to_section) */}
      {needsTargetSection && (
        <Select
          value={rule.targetSectionId ?? ""}
          onValueChange={(v) => onChange({ ...rule, targetSectionId: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Jump to section..." />
          </SelectTrigger>
          <SelectContent>
            {allSections.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {/* End form message */}
      {needsMessage && (
        <Input
          value={rule.endMessage ?? ""}
          onChange={(e) => onChange({ ...rule, endMessage: e.target.value })}
          placeholder="Message shown when form ends"
          className="h-8 text-xs"
        />
      )}
      {/* Tag value */}
      {needsTag && (
        <Input
          value={rule.tagValue ?? ""}
          onChange={(e) => onChange({ ...rule, tagValue: e.target.value })}
          placeholder="Tag to apply (e.g. behavior-alert)"
          className="h-8 text-xs"
        />
      )}
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
        <Label>Help text (optional)</Label>
        <Input
          value={question.helpText ?? ""}
          onChange={(e) => onChange({ helpText: e.target.value || undefined })}
          placeholder="Help text shown below the question"
        />
      </div>
      <div className="space-y-2">
        <Label>Default value (optional)</Label>
        <Input
          value={question.defaultValue ?? ""}
          onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
          placeholder="Pre-filled answer"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="space-y-2">
          <Label>Applies to pet type</Label>
          <Select
            value={question.appliesToPetType ?? "all"}
            onValueChange={(v) => onChange({ appliesToPetType: v === "all" ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pets</SelectItem>
              <SelectItem value="dog">Dog only</SelectItem>
              <SelectItem value="cat">Cat only</SelectItem>
              <SelectItem value="other">Other only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <Label className="text-xs font-medium text-muted-foreground">Validation rules</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input
              type="number"
              value={question.validation?.min ?? ""}
              onChange={(e) => onChange({ validation: { ...question.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="Min value/length"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input
              type="number"
              value={question.validation?.max ?? ""}
              onChange={(e) => onChange({ validation: { ...question.validation, max: e.target.value ? Number(e.target.value) : undefined } })}
              placeholder="Max value/length"
              className="h-8 text-xs"
            />
          </div>
        </div>
        {question.type === "file" && (
          <div className="space-y-1">
            <Label className="text-xs">Allowed file types (comma-separated)</Label>
            <Input
              value={question.validation?.allowedFileTypes?.join(", ") ?? ""}
              onChange={(e) => onChange({ validation: { ...question.validation, allowedFileTypes: e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined } })}
              placeholder=".pdf, .jpg, .png"
              className="h-8 text-xs"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Regex pattern (advanced)</Label>
          <Input
            value={question.validation?.regex ?? ""}
            onChange={(e) => onChange({ validation: { ...question.validation, regex: e.target.value || undefined } })}
            placeholder="e.g. ^[a-zA-Z]+$"
            className="h-8 text-xs"
          />
        </div>
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
        {question.condition && (
          <p className="text-xs text-muted-foreground rounded bg-muted/50 px-2 py-1.5 mt-1">
            {formatConditionPlainLanguage(question.condition, allQuestions)}
          </p>
        )}
      </div>
    </div>
  );
}

function formatConditionPlainLanguage(
  condition: FormCondition,
  allQuestions: FormQuestion[]
): string {
  const opLabel: Record<string, string> = { eq: "=", neq: "≠", contains: "contains", in: "is one of", gt: ">", lt: "<", answered: "is answered", not_answered: "is not answered" };
  const op = opLabel[condition.operator] ?? condition.operator;
  const val = Array.isArray(condition.value) ? condition.value.join(", ") : condition.value;
  if (condition.questionId) {
    const src = allQuestions.find((q) => q.id === condition.questionId);
    const label = src?.label || "Question";
    return `If "${label}" ${op} ${val || "…"} → Show this question`;
  }
  const ctx = condition.contextField === "petType" ? "Pet type" : condition.contextField === "serviceType" ? "Service type" : "Evaluation status";
  return `If ${ctx} ${op} ${val || "…"} → Show this question`;
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
              <SelectItem value="contains">contains</SelectItem>
              <SelectItem value="in">in list</SelectItem>
              <SelectItem value="answered">is answered</SelectItem>
              <SelectItem value="not_answered">is not answered</SelectItem>
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
              <SelectItem value="gt">greater than</SelectItem>
              <SelectItem value="lt">less than</SelectItem>
              <SelectItem value="in">in list</SelectItem>
              <SelectItem value="answered">is answered</SelectItem>
              <SelectItem value="not_answered">is not answered</SelectItem>
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
