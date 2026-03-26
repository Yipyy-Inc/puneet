"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { getFormBySlug, shouldShowQuestion, evaluateLogicRules, type Form, type FormQuestion } from "@/data/forms";
import { createSubmission, submissionHasFiles } from "@/data/form-submissions";
import { notifyStaffOnFormSubmission } from "@/data/facility-notifications";
import { triggerFormEvent } from "@/lib/form-automation-events";
import { clients } from "@/data/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, KeyRound, Shield, Edit2, Dog, Cat } from "lucide-react";

const DRAFT_PREFIX = "formDraft_";
const AUTH_PREFIX = "formAuth_";

function draftKey(formId: string, petId?: number, customerId?: number): string {
  if (petId != null) return `${DRAFT_PREFIX}${formId}_pet_${petId}`;
  if (customerId != null) return `${DRAFT_PREFIX}${formId}_cust_${customerId}`;
  return `${DRAFT_PREFIX}${formId}_anon`;
}

function authKey(formId: string): string {
  return `${AUTH_PREFIX}${formId}`;
}

type Pet = {
  id: number;
  name: string;
  type: string;
};

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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [draftSavedShow, setDraftSavedShow] = useState(false);
  const draftLoadedRef = useRef(false);
  const formStartedEmittedRef = useRef(false);

  // Feature 1: Authentication Gate state
  const [authVerified, setAuthVerified] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Feature 2: Post-Submission Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [previousSubmissionId, setPreviousSubmissionId] = useState<string | null>(null);
  const [lastSubmittedAnswers, setLastSubmittedAnswers] = useState<Record<string, unknown> | null>(null);

  // Feature 3: Multi-Pet Support state
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [currentPetIndex, setCurrentPetIndex] = useState(0);
  const [multiPetSubmitting, setMultiPetSubmitting] = useState(false);
  const [multiPetSubmittedCount, setMultiPetSubmittedCount] = useState(0);

  // Check auth from sessionStorage on mount
  useEffect(() => {
    if (!form || typeof window === "undefined") return;
    const requireAuth = (form as Form & { requireAuth?: boolean }).requireAuth ?? false;
    if (!requireAuth) {
      setAuthVerified(true);
      return;
    }
    try {
      const stored = sessionStorage.getItem(authKey(form.id));
      if (stored === "verified") setAuthVerified(true);
    } catch {
      // ignore
    }
  }, [form?.id]);

  const context = {
    petType: searchParams?.get("petType") ?? undefined,
    serviceType: searchParams?.get("service") ?? undefined,
    evaluationStatus: searchParams?.get("evaluationStatus") ?? undefined,
  };
  const linkPetId = searchParams?.get("petId");
  const linkCustomerId = searchParams?.get("customerId");
  const petIds = linkPetId ? [parseInt(linkPetId, 10)].filter((n) => !Number.isNaN(n)) : undefined;
  const customerId = linkCustomerId ? parseInt(linkCustomerId, 10) : undefined;

  // Feature 3: Look up customer pets for multi-pet support
  const repeatPerPet = form?.repeatPerPet ?? false;
  const customerRecord = customerId ? clients.find((c) => c.id === customerId) : undefined;
  const customerPets: Pet[] = customerRecord?.pets?.map((p) => ({ id: p.id, name: p.name, type: p.type })) ?? [];
  const isMultiPet = repeatPerPet && !!customerId && customerPets.length > 0;

  // Auto-select single pet
  useEffect(() => {
    if (isMultiPet && customerPets.length === 1 && selectedPetIds.length === 0) {
      setSelectedPetIds([customerPets[0].id]);
    }
  }, [isMultiPet, customerPets.length]);

  // Evaluate logic rules to determine hide/require/end effects
  const logicEffects = form?.logicRules?.length
    ? evaluateLogicRules(form.logicRules, answers)
    : null;

  const visibleQuestions = form
    ? form.questions.filter((q) => {
        if (!shouldShowQuestion(q, answers, context)) return false;
        if (logicEffects?.hiddenQuestionIds.has(q.id)) return false;
        return true;
      })
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

  // Autosave draft (debounced) with saved indicator
  useEffect(() => {
    if (!form || typeof window === "undefined" || submitted) return;
    const key = draftKey(form.id, petIds?.[0], customerId);
    const t = setTimeout(() => {
      try {
        if (Object.keys(answers).length > 0) {
          localStorage.setItem(key, JSON.stringify(answers));
          setDraftSavedShow(true);
          setTimeout(() => setDraftSavedShow(false), 2000);
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
      setAttemptedSubmit(true);
      const required = visibleQuestions.filter((q) => q.required || logicEffects?.requiredQuestionIds.has(q.id));
      const missing = required.filter((q) => answers[q.id] === undefined || answers[q.id] === "");
      if (missing.length > 0) {
        setError(
          missing.length === 1
            ? `Almost there! Please fill in "${missing[0].label}" to continue.`
            : `Just ${missing.length} more to go — please complete: ${missing.map((q) => `"${q.label}"`).join(", ")}.`
        );
        return;
      }
      setError(null);

      // Determine event name (append "(revised)" if editing a previous submission)
      const eventSuffix = isEditing ? " (revised)" : "";
      const formEventName = form.name + eventSuffix;

      // Feature 3: Multi-pet — create one submission per selected pet
      if (isMultiPet && selectedPetIds.length > 0) {
        setMultiPetSubmitting(true);
        let lastSubId = "";
        selectedPetIds.forEach((pid) => {
          const submission = createSubmission({
            formId: form.id,
            facilityId: form.facilityId,
            context: Object.keys(context).length ? context : undefined,
            answers,
            ...(customerId && { customerId }),
            petIds: [pid],
          });
          lastSubId = submission.id;
          triggerFormEvent("form_submitted", {
            facilityId: form.facilityId,
            formId: form.id,
            formName: formEventName,
            submissionId: submission.id,
            customerId,
            petIds: [pid],
          });
          notifyStaffOnFormSubmission({
            facilityId: form.facilityId,
            submissionId: submission.id,
            formId: form.id,
            formName: formEventName,
            hasFiles: submissionHasFiles(submission.id),
            hasRedFlag: logicEffects?.alertFlag ?? false,
          });
        });
        setMultiPetSubmittedCount(selectedPetIds.length);
        setPreviousSubmissionId(lastSubId);
        setLastSubmittedAnswers({ ...answers });
        setMultiPetSubmitting(false);
      } else {
        // Single submission flow
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
          formName: formEventName,
          submissionId: submission.id,
          customerId,
          petIds,
        });
        notifyStaffOnFormSubmission({
          facilityId: form.facilityId,
          submissionId: submission.id,
          formId: form.id,
          formName: formEventName,
          hasFiles: submissionHasFiles(submission.id),
          hasRedFlag: false,
        });
        setPreviousSubmissionId(submission.id);
        setLastSubmittedAnswers({ ...answers });
      }

      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem(draftKey(form.id, petIds?.[0], customerId));
        }
      } catch {}
      setIsEditing(false);
      setSubmitted(true);
    },
    [form, visibleQuestions, answers, context, customerId, petIds, isEditing, isMultiPet, selectedPetIds]
  );

  // Feature 2: Handle "Review & Edit" — go back to form with pre-filled answers
  const handleReviewEdit = useCallback(() => {
    if (lastSubmittedAnswers) {
      setAnswers({ ...lastSubmittedAnswers });
    }
    setIsEditing(true);
    setSubmitted(false);
    setError(null);
  }, [lastSubmittedAnswers]);

  // Feature 1: Auth handlers
  const handleSendCode = useCallback(() => {
    if (!authEmail || !authEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    setAuthError(null);
    // Mock: just mark code as sent
    setAuthCodeSent(true);
  }, [authEmail]);

  const handleVerifyCode = useCallback(() => {
    if (authCode.length !== 6 || !/^\d{6}$/.test(authCode)) {
      setAuthError("Please enter a valid 6-digit code.");
      return;
    }
    setAuthError(null);
    setAuthVerified(true);
    // Persist in sessionStorage
    if (form && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(authKey(form.id), "verified");
      } catch {
        // ignore
      }
    }
  }, [authCode, form?.id]);

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

  // Feature 1: Authentication Gate
  const requireAuth = (form as Form & { requireAuth?: boolean }).requireAuth ?? false;
  if (requireAuth && !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl">{form.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Please verify your identity to access this form
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {authError}
              </div>
            )}
            {!authCodeSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="auth-email"
                      type="email"
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="pl-10 min-h-12 text-base"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendCode}
                  className="w-full min-h-12 text-base"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send verification code
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  A 6-digit code has been sent to <span className="font-medium text-foreground">{authEmail}</span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="auth-code">Verification code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="auth-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="pl-10 min-h-12 text-base tracking-widest text-center font-mono"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleVerifyCode}
                  className="w-full min-h-12 text-base"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Verify code
                </Button>
                <button
                  type="button"
                  onClick={() => { setAuthCodeSent(false); setAuthCode(""); setAuthError(null); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use a different email
                </button>
              </>
            )}
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
              {form?.settings?.submitMessage || "Your response has been submitted successfully."}
            </p>
            {isMultiPet && multiPetSubmittedCount > 1 && (
              <p className="text-sm text-muted-foreground mt-2">
                {multiPetSubmittedCount} submissions created (one per selected pet).
              </p>
            )}
            {/* Feature 2: Review & Edit button */}
            <Button
              variant="outline"
              onClick={handleReviewEdit}
              className="mt-4 min-h-12 text-base"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Review &amp; Edit
            </Button>
            {previousSubmissionId && (
              <p className="text-xs text-muted-foreground mt-2">
                Submission ID: {previousSubmissionId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAnonymous = !customerId && !petIds?.length;
  const total = visibleQuestions.length;
  const answered = visibleQuestions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
  const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;

  // Feature 3: Determine the active pet for the header badge (multi-pet mode)
  const activePet = isMultiPet && selectedPetIds.length > 0
    ? customerPets.find((p) => p.id === selectedPetIds[currentPetIndex]) ?? null
    : null;

  // Feature 3: Pet toggle helper
  const togglePet = (petId: number) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId]
    );
  };

  // Feature 3: Whether to show pet selector (multi pet with >1 pet available and no link-specific pet)
  const showPetSelector = isMultiPet && customerPets.length > 1 && !linkPetId;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl">{form.name}</CardTitle>
          {form.settings?.welcomeMessage && (
            <p className="text-sm text-muted-foreground mt-1">{form.settings.welcomeMessage}</p>
          )}

          {/* Feature 2: Editing banner */}
          {isEditing && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-amber-700 shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                You are editing your previous submission
              </p>
            </div>
          )}

          {/* Feature 3: Active pet badge */}
          {activePet && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5">
              {activePet.type.toLowerCase() === "cat" ? (
                <Cat className="h-4 w-4 text-blue-600" />
              ) : (
                <Dog className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm font-medium text-blue-800">
                Answering for {activePet.name}
              </span>
            </div>
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
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <p>Your progress is saved automatically. You can leave and come back anytime.</p>
            <span
              className={`shrink-0 ml-2 text-[10px] font-medium text-emerald-600 transition-opacity duration-300 ${
                draftSavedShow ? "opacity-100" : "opacity-0"
              }`}
            >
              Saved
            </span>
          </div>
          {form.repeatPerPet && !isMultiPet && (
            <p className="text-xs text-muted-foreground mb-4">
              This form can be completed once per pet. Use the link from your pet&apos;s Forms tab to fill for a specific pet.
            </p>
          )}

          {/* Feature 3: Multi-pet selector */}
          {showPetSelector && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block">
                Select which pets this form applies to
              </Label>
              <div className="space-y-2">
                {customerPets.map((pet) => {
                  const isSelected = selectedPetIds.includes(pet.id);
                  return (
                    <label
                      key={pet.id}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer touch-manipulation transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-muted-foreground/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0"
                        checked={isSelected}
                        onChange={() => togglePet(pet.id)}
                      />
                      {pet.type.toLowerCase() === "cat" ? (
                        <Cat className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <Dog className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-base font-medium">{pet.name}</span>
                      <span className="text-xs text-muted-foreground">{pet.type}</span>
                    </label>
                  );
                })}
              </div>
              {isMultiPet && selectedPetIds.length === 0 && (
                <p className="text-xs text-destructive mt-2">
                  Please select at least one pet.
                </p>
              )}
            </div>
          )}

          {logicEffects?.endFormMessage ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-sm font-medium text-amber-800">{logicEffects.endFormMessage}</p>
            </div>
          ) : (
            <form onSubmit={(e) => {
              // Feature 3: Block submission if multi-pet and none selected
              if (isMultiPet && selectedPetIds.length === 0) {
                e.preventDefault();
                setError("Please select at least one pet before submitting.");
                return;
              }
              handleSubmit(e);
            }} className="space-y-6">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700" role="alert">
                  <p className="font-semibold">Oops, not quite ready yet</p>
                  <p className="mt-1 text-rose-600">{error}</p>
                </div>
              )}
              {visibleQuestions.map((q) => {
                const isRequired = q.required || (logicEffects?.requiredQuestionIds.has(q.id) ?? false);
                const isEmpty = answers[q.id] === undefined || answers[q.id] === "";
                const showFieldError = attemptedSubmit && isRequired && isEmpty;
                return (
                  <QuestionInput
                    key={q.id}
                    question={{ ...q, required: isRequired }}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                    hasError={showFieldError}
                  />
                );
              })}
              <Button
                type="submit"
                className="w-full min-h-12 text-base touch-manipulation"
                disabled={multiPetSubmitting}
              >
                {isEditing ? "Resubmit" : isMultiPet && selectedPetIds.length > 1 ? `Submit for ${selectedPetIds.length} pets` : "Submit"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionLabel({ label, required, helpText }: { label: string; required: boolean; helpText?: string }) {
  return (
    <>
      <Label>
        {label}
        {required && " *"}
      </Label>
      {helpText && <p className="text-xs text-muted-foreground -mt-1">{helpText}</p>}
    </>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  hasError,
}: {
  question: FormQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  hasError?: boolean;
}) {
  const id = `q-${question.id}`;
  const opts = question.options ?? [];
  const help = question.helpText;
  // Wrap in inline validation highlight
  const wrap = (node: React.ReactNode) =>
    hasError ? (
      <div className="rounded-xl ring-2 ring-rose-200 bg-rose-50/30 p-3 -mx-1 space-y-1">
        {node}
        <p className="text-xs text-rose-500">This field is required</p>
      </div>
    ) : (
      <>{node}</>
    );

  switch (question.type) {
    case "yes_no": {
      const yesNoOpts = opts.length ? opts : [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
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
    case "radio":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <div className="space-y-2">
            {opts.map((o) => (
              <label key={o.value} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer touch-manipulation hover:bg-muted/50 transition-colors">
                <input
                  type="radio"
                  name={id}
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
    case "textarea":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <textarea
            id={id}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>
      );
    case "select":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <select
            id={id}
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
    case "multiselect": {
      const set = new Set((value as string[]) ?? []);
      const toggle = (v: string) => {
        const next = new Set(set);
        if (next.has(v)) next.delete(v);
        else next.add(v);
        onChange(Array.from(next));
      };
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
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
      return wrap(
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
          {help && <span className="text-xs text-muted-foreground">{help}</span>}
        </div>
      );
    case "date":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <Input
            id={id}
            type="date"
            className="text-base min-h-12"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
          />
        </div>
      );
    case "number":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <Input
            id={id}
            type="number"
            className="text-base min-h-12"
            value={(value as number) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>
      );
    case "file":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <div className="rounded-lg border-2 border-dashed border-input p-6 text-center">
            <input
              id={id}
              type="file"
              className="hidden"
              accept={question.validation?.allowedFileTypes?.join(",") ?? undefined}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
              }}
            />
            <label htmlFor={id} className="cursor-pointer touch-manipulation">
              <div className="text-sm text-muted-foreground">
                {value ? (
                  <span className="text-foreground font-medium">{String(value)}</span>
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
    case "signature":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <div className="rounded-lg border border-input p-4 space-y-3">
            <div className="h-24 bg-muted/30 rounded flex items-center justify-center text-sm text-muted-foreground">
              {value ? (
                <p className="font-medium text-foreground italic text-lg">{String(value)}</p>
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
              By typing your name above, you agree this serves as your electronic signature.
            </p>
          </div>
        </div>
      );
    case "phone":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <Input
            id={id}
            type="tel"
            className="text-base min-h-12 touch-manipulation"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "(555) 123-4567"}
            required={question.required}
          />
        </div>
      );
    case "email":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <Input
            id={id}
            type="email"
            className="text-base min-h-12 touch-manipulation"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "name@example.com"}
            required={question.required}
          />
        </div>
      );
    case "address": {
      const addr = (value as { street?: string; city?: string; state?: string; zip?: string }) ?? {};
      const update = (field: string, v: string) => onChange({ ...addr, [field]: v });
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
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
    case "text":
    default:
      return wrap(
        <div className="space-y-2">
          <QuestionLabel label={question.label} required={question.required} helpText={help} />
          <Input
            id={id}
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
