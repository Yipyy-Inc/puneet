"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  getFormBySlug,
  shouldShowQuestion,
  evaluateLogicRules,
  type Form,
  type FormQuestion,
} from "@/data/forms";
import { createSubmission, submissionHasFiles } from "@/data/form-submissions";
import { notifyStaffOnFormSubmission } from "@/data/facility-notifications";
import { triggerFormEvent } from "@/lib/form-automation-events";
import { clients } from "@/data/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Mail,
  KeyRound,
  Shield,
  Edit2,
  Dog,
  Cat,
  ArrowLeft,
  Languages,
} from "lucide-react";
import Link from "next/link";
import type { SupportedFormLocale } from "@/data/forms-phase2-types";

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

  const [form, _setForm] = useState<Form | null>(() =>
    slug ? (getFormBySlug(slug) ?? null) : null,
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
    if (!form || typeof window === "undefined") return {};
    const lpid = searchParams?.get("petId");
    const lcid = searchParams?.get("customerId");
    const fpid = lpid
      ? [parseInt(lpid, 10)].filter((n) => !Number.isNaN(n))[0]
      : undefined;
    const cid = lcid ? parseInt(lcid, 10) : undefined;
    try {
      const raw = localStorage.getItem(draftKey(form.id, fpid, cid));
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      // ignore invalid draft
    }
    return {};
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [draftSavedShow, setDraftSavedShow] = useState(false);
  const formStartedEmittedRef = useRef(false);

  // Feature 1: Authentication Gate state
  const [authVerified, setAuthVerified] = useState(() => {
    if (!form || typeof window === "undefined") return false;
    const requireAuth =
      (form as Form & { requireAuth?: boolean }).requireAuth ?? false;
    if (!requireAuth) return true;
    try {
      return sessionStorage.getItem(authKey(form.id)) === "verified";
    } catch {
      return false;
    }
  });
  const [authEmail, setAuthEmail] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Feature 2: Post-Submission Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [previousSubmissionId, setPreviousSubmissionId] = useState<
    string | null
  >(null);
  const [lastSubmittedAnswers, setLastSubmittedAnswers] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Phase 2: Multi-language locale state
  const [locale, setLocale] = useState<SupportedFormLocale>("en");

  // Feature 3: Multi-Pet Support state
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [currentPetIndex, _setCurrentPetIndex] = useState(0);
  const [multiPetSubmitting, setMultiPetSubmitting] = useState(false);
  const [multiPetSubmittedCount, setMultiPetSubmittedCount] = useState(0);

  const context = useMemo(
    () => ({
      petType: searchParams?.get("petType") ?? undefined,
      serviceType: searchParams?.get("service") ?? undefined,
      evaluationStatus: searchParams?.get("evaluationStatus") ?? undefined,
    }),
    [searchParams],
  );
  const linkPetId = searchParams?.get("petId");
  const linkCustomerId = searchParams?.get("customerId");
  const petIds = useMemo(
    () =>
      linkPetId
        ? [parseInt(linkPetId, 10)].filter((n) => !Number.isNaN(n))
        : undefined,
    [linkPetId],
  );
  const firstPetId = petIds?.[0];
  const customerId = linkCustomerId ? parseInt(linkCustomerId, 10) : undefined;

  // Feature 3: Look up customer pets for multi-pet support
  const repeatPerPet = form?.repeatPerPet ?? false;
  const customerRecord = customerId
    ? clients.find((c) => c.id === customerId)
    : undefined;
  const customerPets: Pet[] = useMemo(
    () =>
      customerRecord?.pets?.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
      })) ?? [],
    [customerRecord?.pets],
  );
  const isMultiPet = repeatPerPet && !!customerId && customerPets.length > 0;

  // Evaluate logic rules to determine hide/require/end effects
  const logicEffects = form?.logicRules?.length
    ? evaluateLogicRules(form.logicRules, answers)
    : null;

  const visibleQuestions = useMemo(
    () =>
      form
        ? form.questions.filter((q) => {
            if (!shouldShowQuestion(q, answers, context)) return false;
            if (logicEffects?.hiddenQuestionIds.has(q.id)) return false;
            return true;
          })
        : [],
    [form, answers, context, logicEffects],
  );

  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // 7.2 Emit form_started for automation (once per load)
  useEffect(() => {
    if (!form || typeof window === "undefined" || formStartedEmittedRef.current)
      return;
    formStartedEmittedRef.current = true;
    triggerFormEvent("form_started", {
      facilityId: form.facilityId,
      formId: form.id,
      formName: form.name,
      customerId,
      petIds,
    });
  }, [form, customerId, petIds]);

  // Autosave draft (debounced) with saved indicator
  useEffect(() => {
    if (!form || typeof window === "undefined" || submitted) return;
    const key = draftKey(form.id, firstPetId, customerId);
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
  }, [form, answers, submitted, firstPetId, customerId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form) return;
      setAttemptedSubmit(true);
      const required = visibleQuestions.filter(
        (q) => q.required || logicEffects?.requiredQuestionIds.has(q.id),
      );
      const missing = required.filter(
        (q) => answers[q.id] === undefined || answers[q.id] === "",
      );
      if (missing.length > 0) {
        setError(
          missing.length === 1
            ? `Almost there! Please fill in "${missing[0].label}" to continue.`
            : `Just ${missing.length} more to go — please complete: ${missing.map((q) => `"${q.label}"`).join(", ")}.`,
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
          localStorage.removeItem(draftKey(form.id, firstPetId, customerId));
        }
      } catch {}
      setIsEditing(false);
      setSubmitted(true);
    },
    [
      form,
      visibleQuestions,
      answers,
      context,
      customerId,
      petIds,
      firstPetId,
      isEditing,
      isMultiPet,
      selectedPetIds,
      logicEffects?.alertFlag,
      logicEffects?.requiredQuestionIds,
    ],
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
  }, [authCode, form]);

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">Invalid form link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
  const requireAuth =
    (form as Form & { requireAuth?: boolean }).requireAuth ?? false;
  if (requireAuth && !authVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50">
              <Shield className="size-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl">{form.name}</CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">
              Please verify your identity to access this form
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError && (
              <div
                className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
                role="alert"
              >
                {authError}
              </div>
            )}
            {!authCodeSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email address</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="auth-email"
                      type="email"
                      placeholder="you@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="min-h-12 pl-10 text-base"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendCode}
                  className="min-h-12 w-full text-base"
                >
                  <Mail className="mr-2 size-4" />
                  Send verification code
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-center text-sm">
                  A 6-digit code has been sent to{" "}
                  <span className="text-foreground font-medium">
                    {authEmail}
                  </span>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="auth-code">Verification code</Label>
                  <div className="relative">
                    <KeyRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="auth-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={authCode}
                      onChange={(e) =>
                        setAuthCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className="min-h-12 pl-10 text-center font-mono text-base tracking-widest"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleVerifyCode}
                  className="min-h-12 w-full text-base"
                >
                  <KeyRound className="mr-2 size-4" />
                  Verify code
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthCodeSent(false);
                    setAuthCode("");
                    setAuthError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground w-full text-sm transition-colors"
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <CheckCircle className="mb-4 size-12 text-green-600" />
            <h2 className="mb-2 text-xl font-semibold">Thank you</h2>
            <p className="text-muted-foreground">
              {form?.settings?.submitMessage ||
                "Your response has been submitted successfully."}
            </p>
            {isMultiPet && multiPetSubmittedCount > 1 && (
              <p className="text-muted-foreground mt-2 text-sm">
                {multiPetSubmittedCount} submissions created (one per selected
                pet).
              </p>
            )}
            {/* Feature 2: Review & Edit button */}
            <div className="mt-4 flex w-full flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleReviewEdit}
                className="min-h-12 flex-1 text-base"
              >
                <Edit2 className="mr-2 size-4" />
                Review &amp; Edit
              </Button>
              <Button asChild className="min-h-12 flex-1 text-base">
                <Link href="/customer/documents">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Documents
                </Link>
              </Button>
            </div>
            {previousSubmissionId && (
              <p className="text-muted-foreground mt-2 text-xs">
                Submission ID: {previousSubmissionId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase 2: Detect if form has any French translations
  const hasI18n = form?.questions.some((q) => q.labelI18n?.fr) ?? false;

  const isAnonymous = !customerId && !petIds?.length;
  const total = visibleQuestions.length;
  const answered = visibleQuestions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== "",
  ).length;
  const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;

  // Feature 3: Determine the active pet for the header badge (multi-pet mode)
  const activePet =
    isMultiPet && selectedPetIds.length > 0
      ? (customerPets.find((p) => p.id === selectedPetIds[currentPetIndex]) ??
        null)
      : null;

  // Feature 3: Pet toggle helper
  const togglePet = (petId: number) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : [...prev, petId],
    );
  };

  // Feature 3: Whether to show pet selector (multi pet with >1 pet available and no link-specific pet)
  const showPetSelector = isMultiPet && customerPets.length > 1 && !linkPetId;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl">{form.name}</CardTitle>
          {form.settings?.welcomeMessage && (
            <p className="text-muted-foreground mt-1 text-sm">
              {form.settings.welcomeMessage}
            </p>
          )}

          {/* Phase 2: Language switcher (EN/FR) */}
          {hasI18n && (
            <div className="mt-2 flex items-center gap-2">
              <Languages className="text-muted-foreground size-4" />
              <div className="inline-flex overflow-hidden rounded-lg border text-xs">
                <button
                  type="button"
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    locale === "en"
                      ? "bg-primary text-primary-foreground"
                      : `bg-background text-muted-foreground hover:bg-muted/50`
                  } `}
                  onClick={() => setLocale("en")}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    locale === "fr"
                      ? "bg-primary text-primary-foreground"
                      : `bg-background text-muted-foreground hover:bg-muted/50`
                  } `}
                  onClick={() => setLocale("fr")}
                >
                  FR
                </button>
              </div>
            </div>
          )}

          {/* Feature 2: Editing banner */}
          {isEditing && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Edit2 className="size-4 shrink-0 text-amber-700" />
              <p className="text-sm font-medium text-amber-800">
                You are editing your previous submission
              </p>
            </div>
          )}

          {/* Feature 3: Active pet badge */}
          {activePet && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
              {activePet.type.toLowerCase() === "cat" ? (
                <Cat className="size-4 text-blue-600" />
              ) : (
                <Dog className="size-4 text-blue-600" />
              )}
              <span className="text-sm font-medium text-blue-800">
                Answering for {activePet.name}
              </span>
            </div>
          )}

          {/* Progress indicator: mobile-first */}
          {total > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>Progress</span>
                <span>
                  {answered} of {total} {total === 1 ? "question" : "questions"}
                </span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isAnonymous && (
            <p className="bg-muted/50 text-muted-foreground mb-4 rounded-lg p-3 text-xs">
              <a
                href="/customer/auth/login"
                className="hover:text-foreground underline"
              >
                Sign in
              </a>{" "}
              to link this response to your account and save progress.
            </p>
          )}
          <div className="text-muted-foreground mb-4 flex items-center justify-between text-xs">
            <p>
              Your progress is saved automatically. You can leave and come back
              anytime.
            </p>
            <span
              className={`ml-2 shrink-0 text-[10px] font-medium text-emerald-600 transition-opacity duration-300 ${draftSavedShow ? "opacity-100" : "opacity-0"} `}
            >
              Saved
            </span>
          </div>
          {form.repeatPerPet && !isMultiPet && (
            <p className="text-muted-foreground mb-4 text-xs">
              This form can be completed once per pet. Use the link from your
              pet&apos;s Forms tab to fill for a specific pet.
            </p>
          )}

          {/* Feature 3: Multi-pet selector */}
          {showPetSelector && (
            <div className="mb-6">
              <Label className="mb-2 block text-sm font-medium">
                Select which pets this form applies to
              </Label>
              <div className="space-y-2">
                {customerPets.map((pet) => {
                  const isSelected = selectedPetIds.includes(pet.id);
                  return (
                    <label
                      key={pet.id}
                      className={`flex cursor-pointer touch-manipulation items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : `border-input hover:border-muted-foreground/30`
                      } `}
                    >
                      <input
                        type="checkbox"
                        className="size-5 shrink-0"
                        checked={isSelected}
                        onChange={() => togglePet(pet.id)}
                      />
                      {pet.type.toLowerCase() === "cat" ? (
                        <Cat className="text-muted-foreground size-5 shrink-0" />
                      ) : (
                        <Dog className="text-muted-foreground size-5 shrink-0" />
                      )}
                      <span className="text-base font-medium">{pet.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {pet.type}
                      </span>
                    </label>
                  );
                })}
              </div>
              {isMultiPet && selectedPetIds.length === 0 && (
                <p className="text-destructive mt-2 text-xs">
                  Please select at least one pet.
                </p>
              )}
            </div>
          )}

          {logicEffects?.endFormMessage ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm font-medium text-amber-800">
                {logicEffects.endFormMessage}
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                // Feature 3: Block submission if multi-pet and none selected
                if (isMultiPet && selectedPetIds.length === 0) {
                  e.preventDefault();
                  setError("Please select at least one pet before submitting.");
                  return;
                }
                handleSubmit(e);
              }}
              className="space-y-6"
            >
              {error && (
                <div
                  className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                  role="alert"
                >
                  <p className="font-semibold">Oops, not quite ready yet</p>
                  <p className="mt-1 text-rose-600">{error}</p>
                </div>
              )}
              {visibleQuestions.map((q) => {
                const isRequired =
                  q.required ||
                  (logicEffects?.requiredQuestionIds.has(q.id) ?? false);
                const isEmpty =
                  answers[q.id] === undefined || answers[q.id] === "";
                const showFieldError = attemptedSubmit && isRequired && isEmpty;
                return (
                  <QuestionInput
                    key={q.id}
                    question={{ ...q, required: isRequired }}
                    value={answers[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                    hasError={showFieldError}
                    locale={locale}
                  />
                );
              })}
              <Button
                type="submit"
                className="min-h-12 w-full touch-manipulation text-base"
                disabled={multiPetSubmitting}
              >
                {isEditing
                  ? "Resubmit"
                  : isMultiPet && selectedPetIds.length > 1
                    ? `Submit for ${selectedPetIds.length} pets`
                    : "Submit"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionLabel({
  label,
  required,
  helpText,
  frLabel,
  locale,
}: {
  label: string;
  required: boolean;
  helpText?: string;
  frLabel?: string;
  locale?: SupportedFormLocale;
}) {
  const displayLabel = locale === "fr" && frLabel ? frLabel : label;
  return (
    <>
      <Label>
        {displayLabel}
        {required && " *"}
      </Label>
      {helpText && (
        <p className="text-muted-foreground -mt-1 text-xs">{helpText}</p>
      )}
    </>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  hasError,
  locale,
}: {
  question: FormQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  hasError?: boolean;
  locale?: SupportedFormLocale;
}) {
  const id = `q-${question.id}`;
  const opts = question.options ?? [];
  const help = question.helpText;
  const frLabel = question.labelI18n?.fr;
  // Wrap in inline validation highlight
  const wrap = (node: React.ReactNode) =>
    hasError ? (
      <div className="-mx-1 space-y-1 rounded-xl bg-rose-50/30 p-3 ring-2 ring-rose-200">
        {node}
        <p className="text-xs text-rose-500">This field is required</p>
      </div>
    ) : (
      <>{node}</>
    );

  switch (question.type) {
    case "yes_no": {
      const yesNoOpts = opts.length
        ? opts
        : [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ];
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <div className="flex gap-3">
            {yesNoOpts.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`min-h-12 flex-1 touch-manipulation rounded-lg border-2 text-base font-medium transition-colors ${
                  value === o.value
                    ? "border-primary bg-primary/10 text-primary"
                    : `border-input hover:border-muted-foreground/30`
                } `}
                onClick={() => onChange(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>,
      );
    }
    case "radio":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <div className="space-y-2">
            {opts.map((o) => (
              <label
                key={o.value}
                className="hover:bg-muted/50 flex cursor-pointer touch-manipulation items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <input
                  type="radio"
                  name={id}
                  className="size-5 shrink-0"
                  value={o.value}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                />
                <span className="text-base">{o.label}</span>
              </label>
            ))}
          </div>
        </div>,
      );
    case "textarea":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <textarea
            id={id}
            className="border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>,
      );
    case "select":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <select
            id={id}
            className="border-input flex min-h-12 w-full rounded-md border bg-transparent px-3 py-2 text-base"
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
        </div>,
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
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => (
              <label
                key={o.value}
                className="flex min-h-12 cursor-pointer touch-manipulation items-center gap-2 text-base"
              >
                <input
                  type="checkbox"
                  className="size-5"
                  checked={set.has(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>,
      );
    }
    case "checkbox":
      return wrap(
        <div className="flex min-h-12 touch-manipulation items-center gap-2">
          <input
            id={id}
            type="checkbox"
            className="size-5 shrink-0"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <Label htmlFor={id}>
            {locale === "fr" && frLabel ? frLabel : question.label}
            {question.required && " *"}
          </Label>
          {help && (
            <span className="text-muted-foreground text-xs">{help}</span>
          )}
        </div>,
      );
    case "date":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <Input
            id={id}
            type="date"
            className="min-h-12 text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            required={question.required}
          />
        </div>,
      );
    case "number":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <Input
            id={id}
            type="number"
            className="min-h-12 text-base"
            value={(value as number) ?? question.defaultValue ?? ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder={question.placeholder}
            required={question.required}
          />
        </div>,
      );
    case "file":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <div className="border-input rounded-lg border-2 border-dashed p-6 text-center">
            <input
              id={id}
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
            <label htmlFor={id} className="cursor-pointer touch-manipulation">
              <div className="text-muted-foreground text-sm">
                {value ? (
                  <span className="text-foreground font-medium">
                    {String(value)}
                  </span>
                ) : (
                  <>Click to upload a file</>
                )}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {question.validation?.allowedFileTypes
                  ? `Allowed: ${question.validation.allowedFileTypes.join(", ")}`
                  : "PDF, JPG, PNG, DOC accepted"}
              </p>
            </label>
          </div>
        </div>,
      );
    case "signature": {
      const sigVal = value as string | { name: string } | undefined;
      const sigName =
        typeof sigVal === "object" && sigVal !== null
          ? sigVal.name
          : typeof sigVal === "string"
            ? sigVal
            : "";
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <div className="border-input space-y-3 rounded-lg border p-4">
            <div className="bg-muted/30 text-muted-foreground flex h-24 items-center justify-center rounded-sm text-sm">
              {sigName ? (
                <p className="text-foreground text-lg font-medium italic">
                  {sigName}
                </p>
              ) : (
                "Signature area"
              )}
            </div>
            <Input
              placeholder="Type your full name as signature"
              value={sigName}
              onChange={(e) => {
                const name = e.target.value;
                // Capture e-sign metadata alongside the signature value
                onChange({
                  name,
                  signedAt: new Date().toISOString(),
                  ipAddress: "captured-on-submit",
                  userAgent:
                    typeof navigator !== "undefined" ? navigator.userAgent : "",
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  agreementText:
                    "By typing your name above, you agree this serves as your electronic signature.",
                });
              }}
              required={question.required}
              className="min-h-12 text-base"
            />
            <p className="text-muted-foreground text-xs">
              By typing your name above, you agree this serves as your
              electronic signature.
            </p>
            {sigName && (
              <div className="bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-sm px-2 py-1 text-[10px]">
                <Shield className="size-3" />
                <span>
                  E-signed · {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>
            )}
          </div>
        </div>,
      );
    }
    case "phone":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <Input
            id={id}
            type="tel"
            className="min-h-12 touch-manipulation text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "(555) 123-4567"}
            required={question.required}
          />
        </div>,
      );
    case "email":
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <Input
            id={id}
            type="email"
            className="min-h-12 touch-manipulation text-base"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder ?? "name@example.com"}
            required={question.required}
          />
        </div>,
      );
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
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <div className="space-y-2">
            <Input
              placeholder="Street address"
              value={addr.street ?? ""}
              onChange={(e) => update("street", e.target.value)}
              className="min-h-12 text-base"
              required={question.required}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="City"
                value={addr.city ?? ""}
                onChange={(e) => update("city", e.target.value)}
                className="col-span-1 min-h-12 text-base"
              />
              <Input
                placeholder="State"
                value={addr.state ?? ""}
                onChange={(e) => update("state", e.target.value)}
                className="min-h-12 text-base"
              />
              <Input
                placeholder="ZIP"
                value={addr.zip ?? ""}
                onChange={(e) => update("zip", e.target.value)}
                className="min-h-12 text-base"
              />
            </div>
          </div>
        </div>,
      );
    }
    case "text":
    default:
      return wrap(
        <div className="space-y-2">
          <QuestionLabel
            label={question.label}
            required={question.required}
            helpText={help}
            frLabel={frLabel}
            locale={locale}
          />
          <Input
            id={id}
            type="text"
            value={(value as string) ?? question.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            className="min-h-12 touch-manipulation text-base"
          />
        </div>,
      );
  }
}
