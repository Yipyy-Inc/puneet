"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Evaluation } from "@/types/pet";
import type { EvalQuestion, EvalSection } from "@/types/facility";
import {
  X,
  Send,
  Info,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SendEvaluationResultModal } from "@/components/evaluations/SendEvaluationResultModal";
import type { EvaluationResultCardData } from "@/components/evaluations/EvaluationResultCard";
import { useSettings } from "@/hooks/use-settings";
import { useAiSummary } from "@/hooks/use-ai-summary";
import { businessProfile } from "@/data/settings";

// ── Dynamic form state ───────────────────────────────────────────────

type Answers = Record<string, unknown>;
type EvaluationResult = "pass" | "fail" | "";

interface FormState {
  answers: Answers;
  answerNotes: Record<string, string>;
  behaviorCodes: string[];
  internalComments: string;
  evaluationResult: EvaluationResult;
  approvedServices: {
    daycare: boolean;
    boarding: boolean;
    customApproved: string[];
    customDenied: string[];
  };
}

const defaultApprovedServices = {
  daycare: false,
  boarding: false,
  customApproved: [] as string[],
  customDenied: [] as string[],
};

function makeDefaultState(): FormState {
  return {
    answers: {},
    answerNotes: {},
    behaviorCodes: [],
    internalComments: "",
    evaluationResult: "",
    approvedServices: { ...defaultApprovedServices },
  };
}

function storageKey(evaluationId: string) {
  return `staff-evaluation-form:${evaluationId}`;
}

// ── Tag input helper ─────────────────────────────────────────────────

function TagInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={disabled}
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                className="ml-1"
                onClick={() => onChange(value.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dynamic question renderer ────────────────────────────────────────

function QuestionField({
  question,
  value,
  noteValue,
  onChange,
  onNoteChange,
}: {
  question: EvalQuestion;
  value: unknown;
  noteValue: string;
  onChange: (val: unknown) => void;
  onNoteChange: (val: string) => void;
}) {
  const strVal = typeof value === "string" ? value : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label>
          {question.label}
          {question.required && (
            <span className="text-destructive ml-0.5">*</span>
          )}
        </Label>
        {question.helpText && (
          <span
            className="text-muted-foreground cursor-help"
            title={question.helpText}
          >
            <Info className="size-3.5" />
          </span>
        )}
      </div>

      {question.type === "yes_no" && (
        <RadioGroup
          value={strVal}
          onValueChange={(v) => onChange(v)}
          className="grid grid-cols-2 gap-3"
        >
          <label className="flex items-center gap-2 rounded-md border p-3">
            <RadioGroupItem value="yes" />
            Yes
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3">
            <RadioGroupItem value="no" />
            No
          </label>
        </RadioGroup>
      )}

      {question.type === "scale" && (
        <RadioGroup
          value={strVal}
          onValueChange={(v) => onChange(v)}
          className="grid grid-cols-3 gap-3"
        >
          {(["low", "mid", "high"] as const).map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 rounded-md border p-3"
            >
              <RadioGroupItem value={level} />
              {question.scaleLabels?.[level] ??
                (level === "low" ? "Low" : level === "mid" ? "Medium" : "High")}
            </label>
          ))}
        </RadioGroup>
      )}

      {question.type === "single_select" && (
        <Select value={strVal} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={`Select ${question.label.toLowerCase()}`}
            />
          </SelectTrigger>
          <SelectContent>
            {(question.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "multi_select" && (
        <div className="flex flex-wrap gap-2">
          {(question.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => {
                    const prev = Array.isArray(value) ? value : [];
                    onChange(
                      checked
                        ? [...prev, opt]
                        : prev.filter((v: string) => v !== opt),
                    );
                  }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === "text" && (
        <Textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder ?? ""}
          className="min-h-20"
        />
      )}

      {question.type === "number" && (
        <Input
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value ? parseFloat(e.target.value) : "")
          }
          placeholder={question.placeholder ?? ""}
        />
      )}

      {question.allowNotes && (
        <Textarea
          placeholder="Optional notes..."
          value={noteValue}
          onChange={(e) => onNoteChange(e.target.value)}
          className="min-h-16 text-sm"
        />
      )}
    </div>
  );
}

// ── Section renderer ─────────────────────────────────────────────────

function SectionBlock({
  section,
  answers,
  answerNotes,
  onAnswer,
  onNote,
}: {
  section: EvalSection;
  answers: Answers;
  answerNotes: Record<string, string>;
  onAnswer: (questionId: string, val: unknown) => void;
  onNote: (questionId: string, val: string) => void;
}) {
  // Layout: pair yes/no and scale questions side-by-side
  const pairable = ["yes_no", "scale"];
  const rows: EvalQuestion[][] = [];
  let i = 0;
  while (i < section.questions.length) {
    const q = section.questions[i];
    const next = section.questions[i + 1];
    if (pairable.includes(q.type) && next && pairable.includes(next.type)) {
      rows.push([q, next]);
      i += 2;
    } else {
      rows.push([q]);
      i += 1;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{section.title}</p>
        {section.description && (
          <p className="text-muted-foreground text-xs">{section.description}</p>
        )}
      </div>
      {rows.map((row, ri) => (
        <div
          key={ri}
          className={`grid gap-6 ${row.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
        >
          {row.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              noteValue={answerNotes[q.id] ?? ""}
              onChange={(val) => onAnswer(q.id, val)}
              onNoteChange={(val) => onNote(q.id, val)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function StaffEvaluationFormModal({
  open,
  onOpenChange,
  evaluation,
  petName,
  ownerName = "Pet Owner",
  evaluatorName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: Evaluation;
  petName: string;
  ownerName?: string;
  evaluatorName?: string;
}) {
  const { evaluationReportCard, evaluationFormTemplate: template } =
    useSettings();
  const key = useMemo(() => storageKey(evaluation.id), [evaluation.id]);

  const loadForm = (k: string): FormState => {
    if (typeof window === "undefined") return makeDefaultState();
    try {
      const raw = localStorage.getItem(k);
      if (raw)
        return {
          ...makeDefaultState(),
          ...(JSON.parse(raw) as Partial<FormState>),
        };
    } catch {
      /* ignore */
    }
    return makeDefaultState();
  };

  const [form, setForm] = useState<FormState>(() =>
    open ? loadForm(key) : makeDefaultState(),
  );
  const [prevKey, setPrevKey] = useState(key);
  const [prevOpen, setPrevOpen] = useState(open);
  const [resultError, setResultError] = useState("");
  const [saved, setSaved] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const ai = useAiSummary();
  const [useAi, setUseAi] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("eval-use-ai-summary") !== "false";
  });

  if (open !== prevOpen || key !== prevKey) {
    setPrevOpen(open);
    setPrevKey(key);
    if (open) {
      setForm(loadForm(key));
      setSaved(false);
    }
  }

  // Check all required questions are answered
  const requiredQuestions = template.sections.flatMap((s) =>
    s.questions.filter((q) => q.required),
  );
  const allRequiredAnswered = requiredQuestions.every((q) => {
    const v = form.answers[q.id];
    if (v === undefined || v === "" || v === null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });

  const canSave =
    allRequiredAnswered &&
    form.evaluationResult !== "" &&
    (form.evaluationResult === "fail" ||
      form.approvedServices.daycare ||
      form.approvedServices.boarding ||
      form.approvedServices.customApproved.length > 0);

  const save = () => {
    if (!form.evaluationResult) {
      setResultError("Please select Pass or Fail before saving.");
      return;
    }
    if (
      form.evaluationResult === "pass" &&
      !form.approvedServices.daycare &&
      !form.approvedServices.boarding &&
      form.approvedServices.customApproved.length === 0
    ) {
      setResultError("Please select at least one service approval.");
      return;
    }
    setResultError("");
    localStorage.setItem(key, JSON.stringify(form));
    setSaved(true);
  };

  const setAnswer = (qId: string, val: unknown) => {
    setForm((p) => ({ ...p, answers: { ...p.answers, [qId]: val } }));
  };

  const setNote = (qId: string, val: string) => {
    setForm((p) => ({
      ...p,
      answerNotes: { ...p.answerNotes, [qId]: val },
    }));
  };

  // Build result card data from dynamic answers
  const buildCardData = (): EvaluationResultCardData => ({
    petName,
    ownerName,
    facilityName: "PawCare Facility",
    evaluatorName,
    evaluationDate: new Date().toISOString(),
    result: form.evaluationResult as "pass" | "fail",
    dogFriendly:
      form.answers.dog_friendly === "yes" || form.answers.dog_friendly === "no"
        ? (form.answers.dog_friendly as "yes" | "no")
        : undefined,
    humanFriendly:
      form.answers.human_friendly === "yes" ||
      form.answers.human_friendly === "no"
        ? (form.answers.human_friendly as "yes" | "no")
        : undefined,
    energyLevel:
      typeof form.answers.energy_level === "string" && form.answers.energy_level
        ? (form.answers.energy_level as "low" | "mid" | "high")
        : undefined,
    anxietyLevel:
      typeof form.answers.anxiety_level === "string" &&
      form.answers.anxiety_level
        ? (form.answers.anxiety_level as "low" | "mid" | "high")
        : undefined,
    reactivity:
      typeof form.answers.reactivity === "string" && form.answers.reactivity
        ? (form.answers.reactivity as "low" | "mid" | "high")
        : undefined,
    playStyle:
      typeof form.answers.play_style === "string"
        ? form.answers.play_style
        : undefined,
    playGroup:
      typeof form.answers.play_group === "string"
        ? form.answers.play_group
        : undefined,
    behaviorTags:
      form.behaviorCodes.length > 0 ? form.behaviorCodes : undefined,
    staffNotes:
      typeof form.answers.temperament_notes === "string" &&
      form.answers.temperament_notes
        ? form.answers.temperament_notes
        : undefined,
    approvedServices: {
      daycare: form.approvedServices.daycare,
      boarding: form.approvedServices.boarding,
      customApproved: form.approvedServices.customApproved,
    },
  });

  return (
    <Modal
      type="form"
      title={`Evaluation Form — ${petName}`}
      description={`Evaluation ID: ${evaluation.id}`}
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
    >
      <div className="space-y-6">
        {/* ── Dynamic sections from template ── */}
        {template.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            answers={form.answers}
            answerNotes={form.answerNotes}
            onAnswer={setAnswer}
            onNote={setNote}
          />
        ))}

        {/* ── Behavior codes ── */}
        {template.behaviorCodes.length > 0 && (
          <div className="space-y-2">
            <Label>Behavior Codes</Label>
            <div className="flex flex-wrap gap-2">
              {template.behaviorCodes.map((code) => {
                const selected = form.behaviorCodes.includes(code.label);
                return (
                  <button
                    key={code.id}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        behaviorCodes: selected
                          ? p.behaviorCodes.filter((c) => c !== code.label)
                          : [...p.behaviorCodes, code.label],
                      }))
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-transparent text-white shadow-sm"
                        : "hover:bg-muted"
                    }`}
                    style={
                      selected ? { backgroundColor: code.color } : undefined
                    }
                  >
                    <div
                      className="size-2 rounded-full"
                      style={
                        selected
                          ? { backgroundColor: "rgba(255,255,255,0.5)" }
                          : { backgroundColor: code.color }
                      }
                    />
                    {code.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Internal notes ── */}
        {template.internalNotesEnabled && (
          <div className="space-y-2">
            <Label>Internal staff comments (not shared with customer)</Label>
            <Textarea
              className="min-h-28"
              value={form.internalComments}
              onChange={(e) =>
                setForm((p) => ({ ...p, internalComments: e.target.value }))
              }
              placeholder="Private notes for staff only..."
            />
          </div>
        )}

        {/* ── Evaluation Result (always shown) ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Evaluation Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Result</Label>
              <RadioGroup
                value={form.evaluationResult}
                onValueChange={(v) => {
                  const next = v as EvaluationResult;
                  setResultError("");
                  setForm((p) => {
                    if (next === "fail") {
                      return {
                        ...p,
                        evaluationResult: next,
                        approvedServices: { ...defaultApprovedServices },
                      };
                    }
                    return { ...p, evaluationResult: next };
                  });
                }}
                className="grid grid-cols-2 gap-3"
              >
                <label className="flex items-center gap-2 rounded-md border p-3">
                  <RadioGroupItem value="pass" />
                  Pass
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3">
                  <RadioGroupItem value="fail" />
                  Fail
                </label>
              </RadioGroup>
              {resultError && (
                <p className="text-destructive text-sm" role="alert">
                  {resultError}
                </p>
              )}
            </div>

            <div
              data-disabled={form.evaluationResult === "fail"}
              className="space-y-3 data-[disabled=true]:opacity-50"
            >
              <Label>Service approvals</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 rounded-md border p-3">
                  <Checkbox
                    checked={form.approvedServices.daycare}
                    disabled={form.evaluationResult !== "pass"}
                    onCheckedChange={(checked) =>
                      setForm((p) => ({
                        ...p,
                        approvedServices: {
                          ...p.approvedServices,
                          daycare: checked === true,
                        },
                      }))
                    }
                  />
                  Daycare
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3">
                  <Checkbox
                    checked={form.approvedServices.boarding}
                    disabled={form.evaluationResult !== "pass"}
                    onCheckedChange={(checked) =>
                      setForm((p) => ({
                        ...p,
                        approvedServices: {
                          ...p.approvedServices,
                          boarding: checked === true,
                        },
                      }))
                    }
                  />
                  Boarding
                </label>
                <label className="flex items-center gap-2 rounded-md border p-3">
                  <Checkbox
                    checked={
                      form.approvedServices.daycare &&
                      form.approvedServices.boarding
                    }
                    disabled={form.evaluationResult !== "pass"}
                    onCheckedChange={(checked) =>
                      setForm((p) => ({
                        ...p,
                        approvedServices: {
                          ...p.approvedServices,
                          daycare: checked === true,
                          boarding: checked === true,
                        },
                      }))
                    }
                  />
                  Both
                </label>
              </div>

              <TagInput
                label="Custom services — Approved (optional)"
                value={form.approvedServices.customApproved}
                onChange={(next) =>
                  setForm((p) => ({
                    ...p,
                    approvedServices: {
                      ...p.approvedServices,
                      customApproved: next.filter(
                        (x) => !p.approvedServices.customDenied.includes(x),
                      ),
                    },
                  }))
                }
                placeholder="e.g. grooming, training"
                disabled={form.evaluationResult !== "pass"}
              />

              <TagInput
                label="Custom services — Denied (optional)"
                value={form.approvedServices.customDenied}
                onChange={(next) =>
                  setForm((p) => ({
                    ...p,
                    approvedServices: {
                      ...p.approvedServices,
                      customDenied: next.filter(
                        (x) => !p.approvedServices.customApproved.includes(x),
                      ),
                    },
                  }))
                }
                placeholder="e.g. grooming, training"
                disabled={form.evaluationResult !== "pass"}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Summary Panel — shown after saving, before sending */}
        {saved && evaluationReportCard.enabled && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
                  <Sparkles className="size-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    AI Report Summary
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {useAi
                      ? "Polished narrative for the pet parent"
                      : "AI is off — raw notes will be used"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="use-ai-toggle"
                  className="text-xs text-slate-500"
                >
                  Use AI
                </Label>
                <Switch
                  id="use-ai-toggle"
                  checked={useAi}
                  onCheckedChange={(v) => {
                    setUseAi(v);
                    localStorage.setItem("eval-use-ai-summary", String(v));
                    if (!v) ai.reset();
                  }}
                />
              </div>
            </div>

            {/* Body */}
            {useAi && (
              <div className="p-5">
                {/* Generate button — empty state */}
                {!ai.summary && !ai.isGenerating && (
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10">
                    <div className="flex size-12 items-center justify-center rounded-full bg-violet-50">
                      <Sparkles className="size-5 text-violet-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">
                        Ready to generate
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        AI will create a warm, professional summary from your
                        evaluation data
                      </p>
                    </div>
                    <Button
                      className="mt-1 gap-2 bg-violet-500 hover:bg-violet-600"
                      onClick={() => {
                        const cardData = buildCardData();
                        ai.generate("/api/ai/evaluation-summary", {
                          petName,
                          petBreed: "Mixed",
                          facilityName: businessProfile.businessName,
                          evaluatorName,
                          evaluationDate: new Date().toISOString(),
                          result: form.evaluationResult,
                          temperament: {
                            dogFriendly: form.answers.dog_friendly === "yes",
                            humanFriendly:
                              form.answers.human_friendly === "yes",
                            energy:
                              (form.answers.energy_level as string) || "medium",
                            anxiety:
                              (form.answers.anxiety_level as string) || "low",
                            reactivity:
                              (form.answers.reactivity as string) || "low",
                          },
                          playStyle: cardData.playStyle || "",
                          playGroup: cardData.playGroup || "",
                          behaviorTags: form.behaviorCodes,
                          staffNotes:
                            (form.answers.temperament_notes as string) || "",
                          approvedServices: [
                            ...(form.approvedServices.daycare
                              ? ["Daycare"]
                              : []),
                            ...(form.approvedServices.boarding
                              ? ["Boarding"]
                              : []),
                            ...form.approvedServices.customApproved,
                          ],
                          answers: form.answers,
                        });
                      }}
                    >
                      <Sparkles className="size-4" />
                      Generate Summary
                    </Button>
                  </div>
                )}

                {/* Loading skeleton */}
                {ai.isGenerating && (
                  <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-5">
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
                    <p className="text-muted-foreground pt-1 text-center text-xs">
                      Generating summary with AI...
                    </p>
                  </div>
                )}

                {/* Generated result */}
                {ai.summary && !ai.isGenerating && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500">
                        Generated Summary
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-violet-500 hover:text-violet-700"
                        onClick={() => ai.reset()}
                      >
                        <RefreshCw className="size-3" />
                        Regenerate
                      </Button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <textarea
                        value={ai.summary}
                        onChange={(e) => ai.setSummary(e.target.value)}
                        className="min-h-[280px] w-full resize-y border-0 bg-transparent text-sm leading-7 text-slate-700 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                      <p className="text-[11px] text-amber-700">
                        AI-generated — review and edit before sending to the pet
                        parent.
                      </p>
                    </div>
                  </div>
                )}

                {ai.error && (
                  <p className="mt-2 text-xs text-red-500">{ai.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {saved ? "Close" : "Cancel"}
          </Button>
          {saved ? (
            <>
              <Button variant="outline" onClick={() => setSaved(false)}>
                Edit Form
              </Button>
              {evaluationReportCard.enabled && (
                <Button
                  className="gap-2"
                  onClick={() => setSendModalOpen(true)}
                >
                  <Send className="size-4" />
                  Send Result Card
                </Button>
              )}
            </>
          ) : (
            <Button onClick={save} disabled={!canSave}>
              Save Evaluation Form
            </Button>
          )}
        </div>
      </div>

      {sendModalOpen && form.evaluationResult !== "" && (
        <SendEvaluationResultModal
          open={sendModalOpen}
          onOpenChange={setSendModalOpen}
          cardData={buildCardData()}
        />
      )}
    </Modal>
  );
}
