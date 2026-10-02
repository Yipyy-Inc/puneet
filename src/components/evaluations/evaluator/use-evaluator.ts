"use client";

import { useEffect, useState } from "react";

import { saveEvaluation, type EvaluationPatch } from "@/lib/api/evaluations";
import type { EvaluationDetail } from "@/lib/evaluations/detail-types";
import {
  isPass,
  progressOf,
  type EvaluationResult,
} from "@/lib/evaluations/questions";

// ============================================================================
// The evaluator's answers while the dialog is open (the client's mock,
// 2026-10-02). Every change is kept locally at once — the live card follows
// it — and saved after a short pause, so closing the dialog loses nothing
// and a slow connection never holds up a tap. `flush()` saves what is
// waiting now; Finish calls it first, so the database checks what the
// evaluator sees.
// ============================================================================

export type SaveState = "idle" | "saving" | "saved" | "error";

const PAUSE_MS = 800;

export function useEvaluator(detail: EvaluationDetail) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    detail.answers,
  );
  const [strengths, setStrengths] = useState<string[]>(detail.strengths);
  const [watchFor, setWatchFor] = useState<string[]>(detail.watchFor);
  const [ownerNote, setOwnerNote] = useState(detail.ownerNote);
  const [internalNote, setInternalNote] = useState(detail.internalNote);
  const [approved, setApproved] = useState<string[]>(detail.approvedServices);
  const [pending, setPending] = useState<EvaluationPatch>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const editable = detail.status === "in_progress" && detail.viewer.mayRun;
  const result = (answers.result ?? null) as EvaluationResult | null;
  const progress = progressOf(answers, detail.customQuestions);

  const queue = (patch: EvaluationPatch) =>
    setPending((waiting) => ({ ...waiting, ...patch }));

  const flush = async (): Promise<boolean> => {
    if (Object.keys(pending).length === 0) return true;
    const patch = pending;
    setPending({});
    setSaveState("saving");
    try {
      await saveEvaluation(detail.id, patch);
      setSaveState("saved");
      return true;
    } catch {
      // Put it back under anything typed since, to go with the next save.
      setPending((waiting) => ({ ...patch, ...waiting }));
      setSaveState("error");
      return false;
    }
  };

  useEffect(() => {
    if (Object.keys(pending).length === 0) return;
    const timer = window.setTimeout(() => void flush(), PAUSE_MS);
    return () => window.clearTimeout(timer);
    // flush reads the pending it was rendered with, which is this one.
  }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (key: string, value: string) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    const patch: EvaluationPatch = { answers: next };
    // A pass starts with every service it could unlock switched on; the
    // evaluator turns off what it does not cover. A fail approves nothing.
    if (key === "result") {
      const passed = isPass(value as EvaluationResult);
      if (passed && approved.length === 0) {
        setApproved(detail.serviceChoices);
        patch.approvedServices = detail.serviceChoices;
      }
      if (!passed && approved.length > 0) {
        setApproved([]);
        patch.approvedServices = [];
      }
    }
    queue(patch);
  };

  const toggleIn = (
    list: string[],
    set: (next: string[]) => void,
    field: "strengths" | "watchFor" | "approvedServices",
    value: string,
  ) => {
    const next = list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
    set(next);
    queue({ [field]: next });
  };

  return {
    editable,
    answers,
    result,
    progress,
    strengths,
    watchFor,
    ownerNote,
    internalNote,
    approved,
    saveState,
    pendingCount: Object.keys(pending).length,
    answer,
    toggleStrength: (tag: string) =>
      toggleIn(strengths, setStrengths, "strengths", tag),
    toggleWatch: (tag: string) =>
      toggleIn(watchFor, setWatchFor, "watchFor", tag),
    toggleApproved: (service: string) =>
      toggleIn(approved, setApproved, "approvedServices", service),
    setOwnerNote: (note: string) => {
      setOwnerNote(note);
      queue({ ownerNote: note });
    },
    setInternalNote: (note: string) => {
      setInternalNote(note);
      queue({ internalNote: note });
    },
    flush,
  };
}

export type Evaluator = ReturnType<typeof useEvaluator>;
