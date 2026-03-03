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
        setError(`Please answer required questions: ${missing.map((q) => q.label).join(", ")}`);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.settings?.welcomeMessage && (
            <p className="text-sm text-muted-foreground mt-1">{form.settings.welcomeMessage}</p>
          )}
        </CardHeader>
        <CardContent>
          {isAnonymous && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-4">
              <a href="/customer/auth/login" className="underline hover:text-foreground">
                Sign in
              </a>{" "}
              to link this response to your account and save progress.
            </p>
          )}
          {form.repeatPerPet && (
            <p className="text-xs text-muted-foreground mb-4">
              This form can be completed once per pet. Use the link from your pet&apos;s Forms tab to fill for a specific pet.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
            )}
            {visibleQuestions.map((q) => (
              <QuestionInput
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            ))}
            <Button type="submit" className="w-full">
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
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
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
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="checkbox"
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
          />
        </div>
      );
  }
}
