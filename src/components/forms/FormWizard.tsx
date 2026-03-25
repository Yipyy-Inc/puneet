"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  getFormsByFacility,
  shouldShowQuestion,
  evaluateLogicRules,
  type Form,
  type FormQuestion,
} from "@/data/forms";
import {
  getSubmissionsForPet,
  createSubmission,
} from "@/data/form-submissions";
import { triggerFormEvent } from "@/lib/form-automation-events";
import { notifyStaffOnFormSubmission } from "@/data/facility-notifications";
import { submissionHasFiles } from "@/data/form-submissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormWizardProps {
  petId: number;
  customerId: number;
  facilityId: number;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Local draft helpers (same localStorage pattern as public form)
// ---------------------------------------------------------------------------

function draftKey(formId: string, petId: number): string {
  return `formDraft_${formId}_pet_${petId}`;
}

function loadDraft(formId: string, petId: number): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(draftKey(formId, petId));
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // ignore invalid draft
  }
  return {};
}

function saveDraft(
  formId: string,
  petId: number,
  answers: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(draftKey(formId, petId), JSON.stringify(answers));
    } else {
      localStorage.removeItem(draftKey(formId, petId));
    }
  } catch {
    // ignore quota etc
  }
}

function clearDraft(formId: string, petId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(formId, petId));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// WizardQuestionLabel (local helper)
// ---------------------------------------------------------------------------

function WizardQuestionLabel({
  label,
  required,
  helpText,
}: {
  label: string;
  required: boolean;
  helpText?: string;
}) {
  return (
    <>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {helpText && (
        <p className="text-xs text-muted-foreground -mt-1">{helpText}</p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// WizardQuestionInput — handles all 13 field types inline
// ---------------------------------------------------------------------------

function WizardQuestionInput({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const htmlId = `wq-${question.id}`;
  const opts = question.options ?? [];
  const help = question.helpText;

  switch (question.type) {
    // ---- yes_no ----
    case "yes_no": {
      const yesNoOpts = opts.length
        ? opts
        : [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ];
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <div className="flex gap-3">
            {yesNoOpts.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`flex-1 min-h-12 rounded-lg border-2 text-base font-medium transition-colors touch-manipulation ${
                  value === o.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:border-muted-foreground/30"
                }`}
                onClick={() => onChange(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // ---- radio ----
    case "radio":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <div className="space-y-2">
            {opts.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer touch-manipulation hover:bg-muted/50 transition-colors"
              >
                <input
                  type="radio"
                  name={htmlId}
                  className="h-5 w-5 shrink-0"
                  value={o.value}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                />
                <span className="text-base">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      );

    // ---- textarea ----
    case "textarea":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <textarea
            id={htmlId}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>
      );

    // ---- select (dropdown) ----
    case "select":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <select
            id={htmlId}
            className="flex min-h-12 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
          >
            <option value="">Select...</option>
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    // ---- multiselect ----
    case "multiselect": {
      const selected = new Set((value as string[]) ?? []);
      const toggle = (v: string) => {
        const next = new Set(selected);
        if (next.has(v)) next.delete(v);
        else next.add(v);
        onChange(Array.from(next));
      };
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2 text-base min-h-12 cursor-pointer touch-manipulation"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={selected.has(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      );
    }

    // ---- checkbox (single boolean) ----
    case "checkbox":
      return (
        <div className="flex items-center gap-2 min-h-12 touch-manipulation">
          <input
            id={htmlId}
            type="checkbox"
            className="h-5 w-5 shrink-0"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <Label htmlFor={htmlId}>
            {question.label}
            {question.required && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </Label>
          {help && (
            <span className="text-xs text-muted-foreground">{help}</span>
          )}
        </div>
      );

    // ---- date ----
    case "date":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <Input
            id={htmlId}
            type="date"
            className="text-base min-h-12"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
          />
        </div>
      );

    // ---- number ----
    case "number":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <Input
            id={htmlId}
            type="number"
            className="text-base min-h-12"
            value={(value as number) ?? question.defaultValue ?? ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>
      );

    // ---- file ----
    case "file":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <div className="rounded-lg border-2 border-dashed border-input p-6 text-center">
            <input
              id={htmlId}
              type="file"
              className="hidden"
              accept={
                question.validation?.allowedFileTypes?.join(",") ?? undefined
              }
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
              }}
            />
            <label htmlFor={htmlId} className="cursor-pointer touch-manipulation">
              <div className="text-sm text-muted-foreground">
                {value ? (
                  <span className="text-foreground font-medium">
                    {String(value)}
                  </span>
                ) : (
                  <>Click to upload a file</>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {question.validation?.allowedFileTypes
                  ? `Allowed: ${question.validation.allowedFileTypes.join(", ")}`
                  : "PDF, JPG, PNG, DOC accepted"}
              </p>
            </label>
          </div>
        </div>
      );

    // ---- signature ----
    case "signature":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <div className="rounded-lg border border-input p-4 space-y-3">
            <div className="h-24 bg-muted/30 rounded flex items-center justify-center text-sm text-muted-foreground">
              {value ? (
                <p className="font-medium text-foreground italic text-lg">
                  {String(value)}
                </p>
              ) : (
                "Signature area"
              )}
            </div>
            <Input
              placeholder="Type your full name as signature"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              required={question.required}
              className="text-base min-h-12"
            />
            <p className="text-xs text-muted-foreground">
              By typing your name above, you agree this serves as your
              electronic signature.
            </p>
          </div>
        </div>
      );

    // ---- phone ----
    case "phone":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <Input
            id={htmlId}
            type="tel"
            className="text-base min-h-12 touch-manipulation"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "(555) 123-4567"}
            required={question.required}
          />
        </div>
      );

    // ---- email ----
    case "email":
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <Input
            id={htmlId}
            type="email"
            className="text-base min-h-12 touch-manipulation"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "name@example.com"}
            required={question.required}
          />
        </div>
      );

    // ---- address ----
    case "address": {
      const addr =
        (value as {
          street?: string;
          city?: string;
          state?: string;
          zip?: string;
        }) ?? {};
      const update = (field: string, v: string) =>
        onChange({ ...addr, [field]: v });
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <div className="space-y-2">
            <Input
              placeholder="Street address"
              value={addr.street ?? ""}
              onChange={(e) => update("street", e.target.value)}
              className="text-base min-h-12"
              required={question.required}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={addr.city ?? ""}
                onChange={(e) => update("city", e.target.value)}
                className="text-base min-h-12 col-span-1"
              />
              <Input
                placeholder="State"
                value={addr.state ?? ""}
                onChange={(e) => update("state", e.target.value)}
                className="text-base min-h-12"
              />
              <Input
                placeholder="ZIP"
                value={addr.zip ?? ""}
                onChange={(e) => update("zip", e.target.value)}
                className="text-base min-h-12"
              />
            </div>
          </div>
        </div>
      );
    }

    // ---- text (default) ----
    case "text":
    default:
      return (
        <div className="space-y-2">
          <WizardQuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
          />
          <Input
            id={htmlId}
            type="text"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            className="text-base min-h-12 touch-manipulation"
          />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// FormWizard
// ---------------------------------------------------------------------------

export function FormWizard({
  petId,
  customerId,
  facilityId,
  onComplete,
}: FormWizardProps) {
  // ---- State ----
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const draftLoadedRef = useRef(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Derive incomplete forms ----
  const incompleteForms = useMemo(() => {
    const allForms = getFormsByFacility(facilityId);

    // Filter to non-internal, non-archived, type "intake" or "pet"
    const candidateForms = allForms.filter(
      (f) =>
        !f.internal &&
        f.status !== "archived" &&
        (f.type === "intake" || f.type === "pet")
    );

    // Check which forms have already been completed for this pet
    const existingSubmissions = getSubmissionsForPet(facilityId, petId);
    const completedFormIds = new Set(existingSubmissions.map((s) => s.formId));

    return candidateForms.filter((f) => !completedFormIds.has(f.id));
  }, [facilityId, petId]);

  const totalSteps = incompleteForms.length;
  const currentForm: Form | undefined = incompleteForms[currentStep];

  // ---- If no forms needed, signal completion immediately ----
  useEffect(() => {
    if (totalSteps === 0) {
      setLoading(false);
      setAllDone(true);
      const timer = setTimeout(() => onComplete(), 1500);
      return () => clearTimeout(timer);
    }
    setLoading(false);
  }, [totalSteps, onComplete]);

  // ---- Load draft when step changes ----
  useEffect(() => {
    if (!currentForm) return;
    const draft = loadDraft(currentForm.id, petId);
    setAnswers(draft);
    setError(null);
    draftLoadedRef.current = true;
  }, [currentForm?.id, petId]);

  // ---- Autosave draft (debounced) ----
  useEffect(() => {
    if (!currentForm || allDone) return;
    const timer = setTimeout(() => {
      saveDraft(currentForm.id, petId, answers);
    }, 800);
    return () => clearTimeout(timer);
  }, [currentForm?.id, petId, answers, allDone]);

  // ---- Cleanup completion timer on unmount ----
  useEffect(() => {
    return () => {
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, []);

  // ---- Evaluate logic rules for current form ----
  const logicEffects = useMemo(() => {
    if (!currentForm?.logicRules?.length) return null;
    return evaluateLogicRules(currentForm.logicRules, answers);
  }, [currentForm?.logicRules, answers]);

  // ---- Visible questions for current step ----
  const visibleQuestions = useMemo(() => {
    if (!currentForm) return [];
    return currentForm.questions.filter((q) => {
      // Only show customer-facing questions
      if (q.visibility === "staff") return false;
      if (!shouldShowQuestion(q, answers)) return false;
      if (logicEffects?.hiddenQuestionIds.has(q.id)) return false;
      return true;
    });
  }, [currentForm, answers, logicEffects]);

  // ---- Handlers ----
  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmitStep = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentForm) return;

      // Validate required fields
      const requiredQuestions = visibleQuestions.filter(
        (q) =>
          q.required || logicEffects?.requiredQuestionIds.has(q.id)
      );
      const missing = requiredQuestions.filter(
        (q) =>
          answers[q.id] === undefined ||
          answers[q.id] === "" ||
          answers[q.id] === null
      );

      if (missing.length > 0) {
        setError(
          missing.length === 1
            ? `Please answer: "${missing[0].label}".`
            : `Please complete these required fields: ${missing
                .map((q) => `"${q.label}"`)
                .join(", ")}.`
        );
        return;
      }

      setError(null);

      // Create submission
      const submission = createSubmission({
        formId: currentForm.id,
        facilityId,
        answers,
        customerId,
        petIds: [petId],
      });

      // Trigger automation event
      triggerFormEvent("form_submitted", {
        facilityId,
        formId: currentForm.id,
        formName: currentForm.name,
        submissionId: submission.id,
        customerId,
        petIds: [petId],
      });

      // Notify staff
      notifyStaffOnFormSubmission({
        facilityId,
        submissionId: submission.id,
        formId: currentForm.id,
        formName: currentForm.name,
        hasFiles: submissionHasFiles(submission.id),
        hasRedFlag: logicEffects?.alertFlag ?? false,
      });

      // Clear draft for this form
      clearDraft(currentForm.id, petId);

      // Advance to next step or finish
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
        setAnswers({});
        setError(null);
      } else {
        // All forms complete
        setAllDone(true);
        completionTimerRef.current = setTimeout(() => {
          onComplete();
        }, 2000);
      }
    },
    [
      currentForm,
      visibleQuestions,
      logicEffects,
      answers,
      facilityId,
      customerId,
      petId,
      currentStep,
      totalSteps,
      onComplete,
    ]
  );

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setAnswers({});
      setError(null);
    }
  }, [currentStep]);

  // ---- Render: loading ----
  if (loading) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">
              Loading required forms...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Render: all done (no forms required, or wizard complete) ----
  if (allDone) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="pt-6 flex flex-col items-center text-center py-12">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {totalSteps === 0
              ? "No Forms Required"
              : "All Forms Completed"}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            {totalSteps === 0
              ? "There are no required forms for this pet at this time."
              : "Thank you! All required forms have been submitted successfully."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- Render: wizard step ----
  if (!currentForm) return null;

  const answered = visibleQuestions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== ""
  ).length;
  const progressPct =
    visibleQuestions.length > 0
      ? Math.round((answered / visibleQuestions.length) * 100)
      : 0;

  return (
    <Card className="w-full max-w-lg mx-auto">
      {/* Step indicator header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="secondary"
            className="text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-100"
          >
            Step {currentStep + 1} of {totalSteps}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {answered} of {visibleQuestions.length}{" "}
            {visibleQuestions.length === 1 ? "question" : "questions"} answered
          </span>
        </div>
        <CardTitle className="text-lg sm:text-xl">{currentForm.name}</CardTitle>
        {currentForm.settings?.welcomeMessage && (
          <p className="text-sm text-muted-foreground mt-1">
            {currentForm.settings.welcomeMessage}
          </p>
        )}

        {/* Step dots */}
        {totalSteps > 1 && (
          <div className="flex items-center gap-1.5 mt-3">
            {incompleteForms.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx < currentStep
                    ? "bg-emerald-400"
                    : idx === currentStep
                    ? "bg-primary"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}

        {/* Question-level progress bar */}
        {visibleQuestions.length > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-primary/70 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Autosave notice */}
        <p className="text-xs text-muted-foreground mb-4">
          Your progress is saved automatically.
        </p>

        {/* End form message from logic rules */}
        {logicEffects?.endFormMessage ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-sm font-medium text-amber-800">
              {logicEffects.endFormMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitStep} className="space-y-6">
            {/* Validation error */}
            {error && (
              <div
                className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
                role="alert"
              >
                <p className="font-medium">Please complete the required fields</p>
                <p className="mt-1 opacity-90">{error}</p>
              </div>
            )}

            {/* Render questions */}
            {visibleQuestions.map((q) => (
              <WizardQuestionInput
                key={q.id}
                question={{
                  ...q,
                  required:
                    q.required ||
                    (logicEffects?.requiredQuestionIds.has(q.id) ?? false),
                }}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}

            {/* Navigation buttons */}
            <div className="flex items-center gap-3 pt-2">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 touch-manipulation"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}

              <Button
                type="submit"
                className="flex-1 min-h-12 text-base touch-manipulation"
              >
                {currentStep < totalSteps - 1 ? (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  "Submit & Finish"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
