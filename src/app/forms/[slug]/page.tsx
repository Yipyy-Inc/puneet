"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { getFormBySlug, shouldShowQuestion, type Form, type FormQuestion } from "@/data/forms";
import { createSubmission, submissionHasFiles } from "@/data/form-submissions";
import { notifyStaffOnFormSubmission } from "@/data/facility-notifications";
import { triggerFormEvent } from "@/lib/form-automation-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const DRAFT_PREFIX = "formDraft_";

function draftKey(formId: string, petId?: number, customerId?: number): string {
  if (petId != null) return `${DRAFT_PREFIX}${formId}_pet_${petId}`;
  if (customerId != null) return `${DRAFT_PREFIX}${formId}_cust_${customerId}`;
  return `${DRAFT_PREFIX}${formId}_anon`;
}

export default function PublicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string | undefined;

  const [form, setForm] = useState<Form | null>(() =>
    slug ? getFormBySlug(slug) ?? null : null
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftLoadedRef = useRef(false);
  const formStartedEmittedRef = useRef(false);

  const context = {
    petType: searchParams?.get("petType") ?? undefined,
    serviceType: searchParams?.get("service") ?? undefined,
    evaluationStatus: searchParams?.get("evaluationStatus") ?? undefined,
  };
  const linkPetId = searchParams?.get("petId");
  const linkCustomerId = searchParams?.get("customerId");
  const petIds = linkPetId ? [parseInt(linkPetId, 10)].filter((n) => !Number.isNaN(n)) : undefined;
  const customerId = linkCustomerId ? parseInt(linkCustomerId, 10) : undefined;

  const visibleQuestions = form
    ? form.questions.filter((q) => shouldShowQuestion(q, answers, context))
    : [];

  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // 7.2 Emit form_started for automation (once per load)
  useEffect(() => {
    if (!form || typeof window === "undefined" || formStartedEmittedRef.current) return;
    formStartedEmittedRef.current = true;
    triggerFormEvent("form_started", {
      facilityId: form.facilityId,
      formId: form.id,
      formName: form.name,
      customerId,
      petIds,
    });
  }, [form?.id, form?.facilityId, form?.name, customerId, petIds]);

  // Load draft on mount (client-only)
  useEffect(() => {
    if (!form || typeof window === "undefined" || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    const key = draftKey(form.id, petIds?.[0], customerId);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed && typeof parsed === "object") setAnswers(parsed);
      }
    } catch {
      // ignore invalid draft
    }
  }, [form?.id, petIds?.[0], customerId]);

  // Autosave draft (debounced)
  useEffect(() => {
    if (!form || typeof window === "undefined" || submitted) return;
    const key = draftKey(form.id, petIds?.[0], customerId);
    const t = setTimeout(() => {
      try {
        if (Object.keys(answers).length > 0) {
          localStorage.setItem(key, JSON.stringify(answers));
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        // ignore quota etc
      }
    }, 800);
    return () => clearTimeout(t);
  }, [form?.id, answers, submitted, petIds?.[0], customerId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form) return;
      const required = visibleQuestions.filter((q) => q.required);
      const missing = required.filter((q) => answers[q.id] === undefined || answers[q.id] === "");
      if (missing.length > 0) {
        setError(
          missing.length === 1
            ? `Please answer: "${missing[0].label}".`
            : `A few required fields still need your input: ${missing.map((q) => `"${q.label}"`).join(", ")}.`
        );
        return;
      }
      setError(null);
      const submission = createSubmission({
        formId: form.id,
        facilityId: form.facilityId,
        context: Object.keys(context).length ? context : undefined,
        answers,
        ...(customerId && { customerId }),
        ...(petIds?.length && { petIds }),
      });
      triggerFormEvent("form_submitted", {
        facilityId: form.facilityId,
        formId: form.id,
        formName: form.name,
        submissionId: submission.id,
        customerId,
        petIds,
      });
      notifyStaffOnFormSubmission({
        facilityId: form.facilityId,
        submissionId: submission.id,
        formId: form.id,
        formName: form.name,
        hasFiles: submissionHasFiles(submission.id),
        hasRedFlag: false,
      });
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(draftKey(form.id, petIds?.[0], customerId));
        }
      } catch {}
      setSubmitted(true);
    },
    [form, visibleQuestions, answers, context, customerId, petIds]
  );

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-destructive">Invalid form link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This form does not exist or is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank you</h2>
            <p className="text-muted-foreground">
              Your response has been submitted successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAnonymous = !customerId && !petIds?.length;
  const total = visibleQuestions.length;
  const answered = visibleQuestions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
  const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl">{form.name}</CardTitle>
          {form.settings?.welcomeMessage && (
            <p className="text-sm text-muted-foreground mt-1">{form.settings.welcomeMessage}</p>
          )}
          {/* Progress indicator: mobile-first */}
          {total > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{answered} of {total} {total === 1 ? "question" : "questions"}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isAnonymous && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4">
              <a href="/customer/auth/login" className="underline hover:text-foreground">
                Sign in
              </a>{" "}
              to link this response to your account and save progress.
            </p>
          )}
          <p className="text-xs text-muted-foreground mb-4">
            Your progress is saved automatically. You can leave and come back anytime.
          </p>
          {form.repeatPerPet && (
            <p className="text-xs text-muted-foreground mb-4">
              This form can be completed once per pet. Use the link from your pet&apos;s Forms tab to fill for a specific pet.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <p className="font-medium">Please complete the required fields</p>
                <p className="mt-1 opacity-90">{error}</p>
              </div>
            )}
            {visibleQuestions.map((q) => (
              <QuestionInput
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
            <Button type="submit" className="w-full min-h-12 text-base touch-manipulation">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `q-${question.id}`;
  const opts = question.options ?? [];

  switch (question.type) {
    case "textarea":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>
            {question.label}
            {question.required && " *"}
          </Label>
          <textarea
            id={id}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>
            {question.label}
            {question.required && " *"}
          </Label>
          <select
            id={id}
            className="flex min-h-12 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base"
            value={(value as string) ?? ""}
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
    case "multiselect": {
      const set = new Set((value as string[]) ?? []);
      const toggle = (v: string) => {
        const next = new Set(set);
        if (next.has(v)) next.delete(v);
        else next.add(v);
        onChange(Array.from(next));
      };
      return (
        <div className="space-y-2">
          <Label>
            {question.label}
            {question.required && " *"}
          </Label>
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-base min-h-12 cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={set.has(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case "checkbox":
      return (
        <div className="flex items-center gap-2 min-h-12 touch-manipulation">
          <input
            id={id}
            type="checkbox"
            className="h-5 w-5 shrink-0"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <Label htmlFor={id}>
            {question.label}
            {question.required && " *"}
          </Label>
        </div>
      );
    case "date":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>
            {question.label}
            {question.required && " *"}
          </Label>
          <Input
            id={id}
            type="date"
            className="text-base min-h-12"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>
            {question.label}
            {question.required && " *"}
          </Label>
          <Input
            id={id}
            type="number"
            className="text-base min-h-12"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>
      );
    case "text":
    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>
            {question.label}
            {question.required && " *"}
          </Label>
          <Input
            id={id}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            className="text-base min-h-12 touch-manipulation"
          />
        </div>
      );
  }
}
