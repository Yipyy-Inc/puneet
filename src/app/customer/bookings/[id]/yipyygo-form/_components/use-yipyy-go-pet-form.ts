"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  useSaveYipyyGoDraft,
  useSubmitYipyyGoForm,
  type CustomerYipyyGoBooking,
  type CustomerYipyyGoPet,
  type YipyyGoRequestError,
  type YipyyGoSubmitResult,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  DEFAULT_BEHAVIOR_NOTES,
  answersFromSectionForm,
  emptyYipyyGoAnswers,
  lastStayAnswers,
  sectionFormFromAnswers,
  withCustomAnswer,
  type YipyyGoCustomAnswer,
  type YipyyGoCustomAnswers,
  type YipyyGoFormStep,
} from "@/lib/yipyy-go/owner-form";
import {
  validateYipyyGoAnswers,
  type YipyyGoMissing,
} from "@/lib/yipyy-go/validate";
import type { YipyyGoSectionFormData } from "@/types/yipyygo";

// ============================================================================
// One pet's pre-arrival form: its answers, the step it is on, and saving and
// sending them.
//
// ── A DRAFT AT EVERY STEP ─────────────────────────────────────────────────
//
// Moving forward saves what changed (save_yipyy_go_draft), and "Save and
// finish later" saves and leaves — §5c asks a wizard over three steps to offer
// save-and-resume, and the old form kept everything in the tab. A form already
// sent is the exception: the database will not turn it back into a draft, so
// its changes are kept by sending it again, which the page says.
//
// ── WHAT IS STILL MISSING ─────────────────────────────────────────────────
//
// Checked here with validateYipyyGoAnswers before sending, and again by the
// submit route with the same function, so the screen and the server never
// disagree about what a form still needs.
// ============================================================================

type Pending = "next" | "later" | "pet" | null;

export function useYipyyGoPetForm({
  data,
  pet,
  steps,
}: {
  data: CustomerYipyyGoBooking;
  pet: CustomerYipyyGoPet;
  steps: YipyyGoFormStep[];
}) {
  const { t, fill } = useCustomerText("yipyygo");
  const router = useRouter();
  const bookingRef = data.booking.ref;
  const saveDraft = useSaveYipyyGoDraft(bookingRef);
  const submit = useSubmitYipyyGoForm(bookingRef);

  const [form, setForm] = useState<YipyyGoSectionFormData>(() =>
    sectionFormFromAnswers(
      pet.submission?.answers ?? emptyYipyyGoAnswers(),
      pet.name,
    ),
  );
  const [customAnswers, setCustomAnswers] = useState<YipyyGoCustomAnswers>(
    () => pet.submission?.answers.customAnswers ?? {},
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [missing, setMissing] = useState<YipyyGoMissing[]>([]);
  const [sent, setSent] = useState<YipyyGoSubmitResult | null>(null);
  const [lastStayUsed, setLastStayUsed] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const status = pet.submission?.status ?? null;
  const draftable = status !== "submitted";
  const addOnRequests = pet.submission?.addOnRequests ?? [];
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const updateForm = (updates: Partial<YipyyGoSectionFormData>) => {
    setForm((current) => ({ ...current, ...updates }));
    setDirty(true);
  };

  const setCustomAnswer = (
    questionId: string,
    value: YipyyGoCustomAnswer | undefined,
  ) => {
    setCustomAnswers((current) => withCustomAnswer(current, questionId, value));
    setDirty(true);
  };

  // The behavior step shows an energy level and "Not sure" before anything is
  // picked. Moving on from it keeps what it showed, so the review and the
  // facility read the answers the owner looked at.
  const settle = (): YipyyGoSectionFormData => {
    if (step !== "behavior" || form.behaviorNotes) return form;
    const next = { ...form, behaviorNotes: DEFAULT_BEHAVIOR_NOTES };
    setForm(next);
    setDirty(true);
    return next;
  };

  const save = async (next: YipyyGoSectionFormData): Promise<boolean> => {
    if (!draftable || (!dirty && next === form)) return true;
    try {
      await saveDraft.mutateAsync({
        petRef: pet.ref,
        answers: answersFromSectionForm(next, customAnswers),
        addOnRequests,
      });
      setDirty(false);
      return true;
    } catch {
      toast.error(fill("draftNotSaved", { pet: pet.name }));
      return false;
    }
  };

  const goToStep = async (index: number, keepMissing = false) => {
    if (index < 0 || index >= steps.length || pending) return;
    const next = settle();
    if (index > stepIndex) {
      setPending("next");
      const saved = await save(next);
      setPending(null);
      if (!saved) return;
    }
    if (!keepMissing) setMissing([]);
    setStepIndex(index);
    window.scrollTo({ top: 0 });
  };

  const saveAndLeave = async () => {
    const next = settle();
    if (draftable && (dirty || next !== form)) {
      setPending("later");
      const saved = await save(next);
      setPending(null);
      if (!saved) return;
      toast.success(fill("draftSaved", { pet: pet.name }));
    }
    router.push(`/customer/bookings/${bookingRef}`);
  };

  const switchPet = async (open: () => void) => {
    const next = settle();
    setPending("pet");
    const saved = await save(next);
    setPending(null);
    if (saved) open();
  };

  const send = async () => {
    const answers = answersFromSectionForm(settle(), customAnswers);
    const needed = validateYipyyGoAnswers(data.template, answers);
    if (needed.length > 0) {
      setMissing(needed);
      return;
    }
    try {
      const result = await submit.mutateAsync({
        petRef: pet.ref,
        answers,
        addOnRequests,
      });
      setDirty(false);
      setMissing([]);
      setSent(result);
      window.scrollTo({ top: 0 });
    } catch (error) {
      const serverMissing = (error as YipyyGoRequestError).missing;
      if (serverMissing?.length) {
        setMissing(serverMissing as YipyyGoMissing[]);
      } else {
        toast.error(fill("formNotSent", { pet: pet.name }));
      }
    }
  };

  const applyLastStay = () => {
    if (!pet.lastAnswers) return;
    setForm(sectionFormFromAnswers(lastStayAnswers(pet.lastAnswers), pet.name));
    setDirty(true);
    setLastStayUsed(true);
    toast.success(t("lastStayPreferencesAppliedReview"));
  };

  return {
    form,
    updateForm,
    customAnswers,
    setCustomAnswer,
    step,
    stepIndex,
    goToStep,
    saveAndLeave,
    switchPet,
    send,
    applyLastStay,
    status,
    draftable,
    missing,
    sent,
    canUseLastStay:
      Boolean(pet.lastAnswers) &&
      !lastStayUsed &&
      (status === null || status === "draft"),
    pending,
    sending: submit.isPending,
    busy: pending !== null || submit.isPending,
  };
}
