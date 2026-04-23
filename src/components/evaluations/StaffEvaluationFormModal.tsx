"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Heart,
  PawPrint,
  ShieldCheck,
  Zap,
  XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SendEvaluationResultModal } from "@/components/evaluations/SendEvaluationResultModal";
import type { EvaluationResultCardData } from "@/components/evaluations/EvaluationResultCard";
import { useSettings } from "@/hooks/use-settings";
import { useAiSummary } from "@/hooks/use-ai-summary";
import { useCurrentUser } from "@/hooks/use-current-user";
import { businessProfile } from "@/data/settings";
import { cn } from "@/lib/utils";

// ── Dynamic form state ───────────────────────────────────────────────

type Answers = Record<string, unknown>;
type EvaluationResult =
  | "approved"
  | "approved_with_restrictions"
  | "needs_re_evaluation"
  | "not_approved"
  | "";

const EVALUATION_RESULTS: Array<{
  value: Exclude<EvaluationResult, "">;
  label: string;
  description: string;
  status: "passed" | "failed";
}> = [
  {
    value: "approved",
    label: "Approved",
    description: "Pet is cleared for selected services.",
    status: "passed",
  },
  {
    value: "approved_with_restrictions",
    label: "Approved with restrictions",
    description: "Pet may attend with service limits or staff notes.",
    status: "passed",
  },
  {
    value: "needs_re_evaluation",
    label: "Needs re-evaluation",
    description: "Pet needs another evaluation before approval.",
    status: "failed",
  },
  {
    value: "not_approved",
    label: "Not approved",
    description: "Pet is not approved for the requested program.",
    status: "failed",
  },
];

const DENIAL_REASONS = [
  { value: "dog_reactivity", label: "Reactive toward dogs" },
  { value: "human_reactivity", label: "Reactive toward people" },
  { value: "resource_guarding", label: "Resource guarding" },
  { value: "high_anxiety", label: "High anxiety or stress" },
  { value: "rough_play", label: "Unsafe or overly rough play" },
  { value: "health_or_vaccine", label: "Health or vaccine concern" },
  { value: "needs_training", label: "Needs training before approval" },
  { value: "other", label: "Other" },
];

interface FormState {
  answers: Answers;
  answerNotes: Record<string, string>;
  behaviorCodes: string[];
  internalComments: string;
  evaluationResult: EvaluationResult;
  denialReason: string;
  denialNotes: string;
  evaluatedAt?: string;
  evaluatedBy?: string;
  evaluatedById?: string;
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
    denialReason: "",
    denialNotes: "",
    approvedServices: { ...defaultApprovedServices },
  };
}

function getResultConfig(result: EvaluationResult) {
  return EVALUATION_RESULTS.find((option) => option.value === result);
}

function isPassingResult(result: EvaluationResult) {
  return getResultConfig(result)?.status === "passed";
}

function getDenialReasonLabel(reason: string) {
  return DENIAL_REASONS.find((option) => option.value === reason)?.label;
}

function renderSectionIcon(sectionId: string) {
  if (sectionId.includes("temperament")) return <Heart className="size-5" />;
  if (sectionId.includes("play")) return <Zap className="size-5" />;
  return <FileText className="size-5" />;
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
            <Badge
              key={t}
              variant="secondary"
              className="gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm"
            >
              {t}
              <button
                type="button"
                className="hover:bg-muted ml-1 rounded-full p-0.5 transition-colors"
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
  const choiceClass = (selected: boolean) =>
    cn(
      "group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-all",
      selected
        ? "border-sky-300 bg-sky-50 text-sky-800 shadow-sm ring-2 ring-sky-100"
        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/50 hover:shadow-sm",
    );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-semibold text-slate-800">
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
          className="mt-3 grid grid-cols-2 gap-3"
        >
          <label className={choiceClass(strVal === "yes")}>
            <RadioGroupItem value="yes" />
            <span className="font-medium">Yes</span>
          </label>
          <label className={choiceClass(strVal === "no")}>
            <RadioGroupItem value="no" />
            <span className="font-medium">No</span>
          </label>
        </RadioGroup>
      )}

      {question.type === "scale" && (
        <RadioGroup
          value={strVal}
          onValueChange={(v) => onChange(v)}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {(["low", "mid", "high"] as const).map((level) => (
            <label key={level} className={choiceClass(strVal === level)}>
              <RadioGroupItem value={level} />
              <span className="font-medium">
                {question.scaleLabels?.[level] ??
                  (level === "low"
                    ? "Low"
                    : level === "mid"
                      ? "Medium"
                      : "High")}
              </span>
            </label>
          ))}
        </RadioGroup>
      )}

      {question.type === "single_select" && (
        <Select value={strVal} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="mt-3 w-full rounded-xl border-slate-200 bg-slate-50/70">
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
        <div className="mt-3 flex flex-wrap gap-2">
          {(question.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <label
                key={opt}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                  selected
                    ? "border-sky-300 bg-sky-50 text-sky-800 shadow-sm"
                    : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50",
                )}
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
          className="mt-3 min-h-24 rounded-xl border-slate-200 bg-slate-50/70"
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
          className="mt-3 rounded-xl border-slate-200 bg-slate-50/70"
        />
      )}

      {question.allowNotes && (
        <Textarea
          placeholder="Optional notes..."
          value={noteValue}
          onChange={(e) => onNoteChange(e.target.value)}
          className="mt-3 min-h-16 rounded-xl border-slate-200 bg-slate-50/70 text-sm"
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
  const pairable = ["yes_no", "scale", "single_select"];
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
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-linear-to-br from-white via-slate-50/70 to-sky-50/50 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/20">
          {renderSectionIcon(section.id)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {section.title}
          </p>
          {section.description && (
            <p className="text-muted-foreground text-xs">
              {section.description}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4 p-4 md:p-5">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={`grid gap-4 ${row.length === 2 ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}
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
    </section>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function StaffEvaluationFormModal({
  open,
  onOpenChange,
  evaluation,
  petName,
  petImage,
  ownerName = "Pet Owner",
  evaluatorName,
  onEvaluationSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: Evaluation;
  petName: string;
  petImage?: string;
  ownerName?: string;
  evaluatorName?: string;
  onEvaluationSaved?: (evaluation: Evaluation) => void;
}) {
  const { evaluationReportCard, evaluationFormTemplate: template } =
    useSettings();
  const { user } = useCurrentUser();
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
  const requiredAnsweredCount = requiredQuestions.filter((q) => {
    const v = form.answers[q.id];
    if (v === undefined || v === "" || v === null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;
  const allRequiredAnswered =
    requiredQuestions.length > 0 &&
    requiredAnsweredCount === requiredQuestions.length;
  const requiredProgress =
    requiredQuestions.length > 0
      ? Math.round((requiredAnsweredCount / requiredQuestions.length) * 100)
      : 100;

  const resultConfig = getResultConfig(form.evaluationResult);
  const passingResult = isPassingResult(form.evaluationResult);
  const denialReasonSelected = form.denialReason.trim().length > 0;
  const servicesSelected =
    form.approvedServices.daycare ||
    form.approvedServices.boarding ||
    form.approvedServices.customApproved.length > 0;

  const canSave =
    allRequiredAnswered &&
    form.evaluationResult !== "" &&
    (passingResult ? servicesSelected : denialReasonSelected);

  const save = () => {
    if (!form.evaluationResult) {
      setResultError("Please select an evaluation result before saving.");
      return;
    }

    if (passingResult && !servicesSelected) {
      setResultError("Please select at least one service approval.");
      return;
    }

    if (!passingResult && !denialReasonSelected) {
      setResultError("Please select a reason before saving this result.");
      return;
    }

    setResultError("");
    const evaluatedAt = new Date().toISOString();
    const evaluatedBy = evaluatorName ?? user.name;
    const denialReasonLabel = getDenialReasonLabel(form.denialReason);
    const savedForm: FormState = {
      ...form,
      evaluatedAt,
      evaluatedBy,
      evaluatedById: user.id,
    };
    const savedEvaluation: Evaluation = {
      ...evaluation,
      status: resultConfig?.status ?? "pending",
      evaluatedAt,
      evaluatedBy,
      evaluatedById: user.id,
      resultType: form.evaluationResult || undefined,
      resultLabel: resultConfig?.label,
      denialReason: passingResult ? undefined : form.denialReason,
      denialReasonLabel: passingResult ? undefined : denialReasonLabel,
      denialNotes: passingResult ? undefined : form.denialNotes.trim(),
      notes: passingResult
        ? ((form.answers.temperament_notes as string | undefined) ??
          form.internalComments)
        : form.denialNotes.trim(),
      approvedServices: passingResult
        ? form.approvedServices
        : { ...defaultApprovedServices },
    };

    localStorage.setItem(key, JSON.stringify(savedForm));
    localStorage.setItem(
      `staff-evaluation-record:${evaluation.id}`,
      JSON.stringify(savedEvaluation),
    );
    setForm(savedForm);
    onEvaluationSaved?.(savedEvaluation);
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
    evaluatorName: form.evaluatedBy ?? evaluatorName ?? user.name,
    evaluationDate: form.evaluatedAt ?? new Date().toISOString(),
    result: passingResult ? "pass" : "fail",
    resultLabel: resultConfig?.label,
    denialReason: getDenialReasonLabel(form.denialReason),
    denialNotes: form.denialNotes,
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
      !passingResult && form.denialNotes
        ? form.denialNotes
        : typeof form.answers.temperament_notes === "string" &&
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
      size="xl"
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-linear-to-br from-white via-sky-50/70 to-emerald-50/60 p-5 shadow-sm">
          <div className="pointer-events-none absolute -top-20 -right-16 size-52 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {petImage ? (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-md ring-1 ring-slate-200/70">
                  <Image
                    src={petImage}
                    alt={petName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-slate-200/70">
                  <PawPrint className="size-8 text-sky-500" />
                </div>
              )}
              <div>
                <Badge className="mb-2 rounded-full border-sky-200 bg-sky-50 text-[10px] tracking-wide text-sky-700 uppercase hover:bg-sky-50">
                  Live temperament assessment
                </Badge>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {petName}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Owner: {ownerName} · Evaluator:{" "}
                  {form.evaluatedBy ?? evaluatorName ?? user.name}
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2 md:w-80">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground">Required answers</p>
                  <Badge
                    className={cn(
                      "rounded-full text-[10px]",
                      allRequiredAnswered
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-100",
                    )}
                  >
                    {allRequiredAnswered ? "Complete" : "In progress"}
                  </Badge>
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {requiredAnsweredCount}/{requiredQuestions.length || 0}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      allRequiredAnswered ? "bg-emerald-500" : "bg-amber-400",
                    )}
                    style={{ width: `${requiredProgress}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                <p className="text-muted-foreground">Result</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {resultConfig?.label ?? "Pending"}
                </p>
              </div>
            </div>
          </div>
        </div>

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
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200/70 bg-linear-to-r from-white to-amber-50/70 px-5 py-4">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-100">
                <ClipboardCheck className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Behavior Codes
                </p>
                <p className="text-muted-foreground text-xs">
                  Quick tags that help the care team recognize patterns later.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
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
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                      selected
                        ? "border-transparent text-white shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
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
          <div className="rounded-3xl border border-slate-200/80 bg-linear-to-br from-white to-slate-50/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <FileText className="size-5" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-900">
                  Internal staff comments
                </Label>
                <p className="text-muted-foreground text-xs">
                  Private context for staff only, not shared with the customer.
                </p>
              </div>
            </div>
            <Textarea
              className="min-h-28 rounded-2xl border-slate-200 bg-white/90"
              value={form.internalComments}
              onChange={(e) =>
                setForm((p) => ({ ...p, internalComments: e.target.value }))
              }
              placeholder="Private notes for staff only..."
            />
          </div>
        )}

        {/* ── Evaluation Result (always shown) ── */}
        <Card className="overflow-hidden rounded-3xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200/70 bg-linear-to-r from-white via-emerald-50/40 to-sky-50/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-sky-500 text-white shadow-sm">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Evaluation Result</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Choose the final outcome, approvals, and any required
                  follow-up.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900">
                Result
              </Label>
              <RadioGroup
                value={form.evaluationResult}
                onValueChange={(v) => {
                  const next = v as EvaluationResult;
                  setResultError("");
                  const isPassing = isPassingResult(next);
                  setForm((p) => {
                    if (!isPassing) {
                      return {
                        ...p,
                        evaluationResult: next,
                        approvedServices: { ...defaultApprovedServices },
                      };
                    }
                    return {
                      ...p,
                      evaluationResult: next,
                      denialReason: "",
                      denialNotes: "",
                    };
                  });
                }}
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                {EVALUATION_RESULTS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                      form.evaluationResult === option.value
                        ? option.status === "passed"
                          ? "border-emerald-300 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                          : "border-red-300 bg-red-50 shadow-sm ring-2 ring-red-100"
                        : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40",
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {option.description}
                      </span>
                    </span>
                    <span className="absolute top-3 right-3">
                      {option.status === "passed" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <XCircle className="size-4 text-red-500" />
                      )}
                    </span>
                  </label>
                ))}
              </RadioGroup>
              {resultError && (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {resultError}
                </p>
              )}
            </div>

            <div
              data-disabled={!passingResult}
              className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 data-[disabled=true]:border-slate-200 data-[disabled=true]:bg-slate-50/80 data-[disabled=true]:opacity-60"
            >
              <div>
                <Label className="text-sm font-semibold text-slate-900">
                  Service approvals
                </Label>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Select the services this pet can book after evaluation.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <Checkbox
                    checked={form.approvedServices.daycare}
                    disabled={!passingResult}
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
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <Checkbox
                    checked={form.approvedServices.boarding}
                    disabled={!passingResult}
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
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <Checkbox
                    checked={
                      form.approvedServices.daycare &&
                      form.approvedServices.boarding
                    }
                    disabled={!passingResult}
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
                disabled={!passingResult}
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
                disabled={!passingResult}
              />
            </div>

            {!passingResult && form.evaluationResult && (
              <div className="space-y-4 rounded-2xl border border-red-200 bg-linear-to-br from-red-50 via-white to-amber-50/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-red-100">
                    <AlertTriangle className="size-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Follow-up details required
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Document why the pet was denied or needs another
                      evaluation.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason for denial or re-evaluation</Label>
                  <Select
                    value={form.denialReason}
                    onValueChange={(value) =>
                      setForm((p) => ({ ...p, denialReason: value }))
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {DENIAL_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Evaluator notes</Label>
                  <Textarea
                    value={form.denialNotes}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        denialNotes: e.target.value,
                      }))
                    }
                    placeholder="Add clear notes about what was observed, risk level, and recommended next steps..."
                    className="min-h-28 rounded-xl bg-white"
                  />
                </div>
              </div>
            )}

            {saved && form.evaluatedAt && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                <CheckCircle2 className="size-4 shrink-0" />
                <div>
                  <p className="font-semibold">Evaluation recorded</p>
                  <p>
                    Recorded by{" "}
                    <span className="font-medium">{form.evaluatedBy}</span> on{" "}
                    {new Date(form.evaluatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Summary Panel — shown after saving, before sending */}
        {saved && evaluationReportCard.enabled && (
          <div className="overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-violet-100 bg-linear-to-r from-violet-50 via-white to-sky-50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-sky-500 text-white shadow-sm">
                  <Sparkles className="size-5" />
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
                  <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-violet-200 bg-linear-to-br from-violet-50/80 to-white py-10">
                    <div className="flex size-14 items-center justify-center rounded-3xl bg-white shadow-sm">
                      <Sparkles className="size-6 text-violet-500" />
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
                          evaluatorName: cardData.evaluatorName,
                          evaluationDate: cardData.evaluationDate,
                          result: cardData.result,
                          resultType: form.evaluationResult,
                          resultLabel: cardData.resultLabel,
                          denialReason: cardData.denialReason,
                          denialNotes: form.denialNotes,
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
                            cardData.staffNotes ||
                            (form.answers.temperament_notes as string) ||
                            "",
                          evaluatorNotes: form.internalComments,
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
                  <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-5">
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
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
                      <textarea
                        value={ai.summary}
                        onChange={(e) => ai.setSummary(e.target.value)}
                        className="min-h-[280px] w-full resize-y border-0 bg-transparent text-sm/7 text-slate-700 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
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

        <div className="sticky bottom-0 z-10 -mx-2 flex justify-end gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-lg shadow-slate-900/5 backdrop-blur-sm">
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
              <ShieldCheck className="mr-2 size-4" />
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
