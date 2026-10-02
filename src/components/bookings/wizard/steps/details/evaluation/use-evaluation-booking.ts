"use client";

import { useState } from "react";

import type { IntakeAnswers } from "@/lib/evaluations/questions";

// ============================================================================
// What an evaluation booking holds beyond any other (the client's mock,
// 2026-10-02): the start picked on "Pick a date & time" and the evaluator
// with it, each pet's answers to "About your pet", and — a customer — that
// they read and agreed to the evaluation terms. Kept here rather than in
// BookingModal, which is large enough already.
// ============================================================================

export interface EvaluationSlot {
  date: string | null;
  /** Minutes from midnight. */
  start: number | null;
  end: number | null;
  /** null: "First available". */
  evaluatorId: string | null;
  /** As the viewer was shown them ("Sarah J." to a customer). */
  evaluatorName: string | null;
}

export const NO_EVALUATION_SLOT: EvaluationSlot = {
  date: null,
  start: null,
  end: null,
  evaluatorId: null,
  evaluatorName: null,
};

export function useEvaluationBooking() {
  const [slot, setSlot] = useState<EvaluationSlot>(NO_EVALUATION_SLOT);
  const [intake, setIntake] = useState<Record<number, IntakeAnswers>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  // The service a locked card asked the evaluation for ("Request an
  // evaluation" on Daycare); null: every service that needs one.
  const [evaluationFor, setEvaluationFor] = useState<string[] | null>(null);

  return {
    slot,
    setSlot,
    intake,
    setIntakeFor: (petId: number, answers: IntakeAnswers) =>
      setIntake((current) => ({ ...current, [petId]: answers })),
    termsAccepted,
    setTermsAccepted,
    evaluationFor,
    setEvaluationFor,
    reset: () => {
      setSlot(NO_EVALUATION_SLOT);
      setIntake({});
      setTermsAccepted(false);
      setEvaluationFor(null);
    },
  };
}

export type EvaluationBookingState = ReturnType<typeof useEvaluationBooking>;
