"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { useWriteEvaluationNote } from "@/lib/api/evaluations";
import {
  NOTE_TONES,
  QUICK_POINTS,
  type EvaluationResult,
  type NoteTone,
} from "@/lib/evaluations/questions";
import { useStaffText } from "@/lib/staff/use-staff-text";

// ============================================================================
// "AI assist" on the note to the owner — the client's mock (2026-10-02):
// "Jot a few words — AI turns them, plus the answers above, into a kind,
// polished note. Tricky moments are worded gently." A few words, the quick
// points, a tone, and Write (or Rewrite) with AI; the note lands in the
// field below it, to edit like any other.
//
// Drawn in the mock's violet (2026-10-03): a pale panel, dashed quick chips,
// tone pills in ink, and a violet "Write with AI".
// ============================================================================

export function AiNotePanel({
  evaluationId,
  answers,
  strengths,
  watchFor,
  result,
  hasNote,
  disabled,
  onNote,
}: {
  evaluationId: string;
  answers: Record<string, string>;
  strengths: string[];
  watchFor: string[];
  result: EvaluationResult | null;
  hasNote: boolean;
  disabled: boolean;
  onNote: (note: string) => void;
}) {
  const { t } = useStaffText("evaluations");
  const [points, setPoints] = useState("");
  const [tone, setTone] = useState<NoteTone>("warm");
  const write = useWriteEvaluationNote();

  const run = () =>
    write.mutate(
      { evaluationId, tone, points, answers, strengths, watchFor, result },
      {
        onSuccess: ({ note, fallback }) => {
          onNote(note);
          if (fallback) toast(t("aiFallback"));
          else toast.success(t("aiWritten"));
        },
        onError: (error) =>
          toast.error(t("aiFailed"), { description: error.message }),
      },
    );

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-(--ai-line) bg-(--ai-panel) p-3">
      <p className="text-ink-secondary text-[12.5px]">{t("aiHelp")}</p>
      <label htmlFor="ev-ai-points" className="sr-only">
        {t("aiPointsLabel")}
      </label>
      <Input
        id="ev-ai-points"
        value={points}
        maxLength={500}
        disabled={disabled}
        placeholder={t("aiPointsPlaceholder")}
        onChange={(event) => setPoints(event.target.value)}
        className="bg-card min-h-[42px] rounded-[12px] px-3 text-[14px] max-lg:min-h-[42px]"
      />
      <div className="flex flex-wrap gap-[5px]">
        {QUICK_POINTS.map((point) => (
          <Button
            key={point}
            type="button"
            variant="quiet"
            size="mock-30"
            className="gap-1 border-dashed border-(--ai-chip-line) px-2.5 text-[12px] font-semibold text-(--violet-ink)"
            disabled={disabled}
            onClick={() =>
              setPoints((current) =>
                [current.trim(), t(`point_${point}`).toLowerCase()]
                  .filter(Boolean)
                  .join(", "),
              )
            }
          >
            <span aria-hidden>+</span>
            {t(`point_${point}`)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          id="ev-ai-tone"
          className="text-body-ink text-[12.5px] font-semibold"
        >
          {t("aiTone")}
        </span>
        <div
          role="radiogroup"
          aria-labelledby="ev-ai-tone"
          className="flex min-w-0 flex-1 flex-wrap gap-1.5"
        >
          {NOTE_TONES.map((option) => (
            <ChoicePill
              key={option}
              type="radio"
              name="ev-ai-tone"
              value={option}
              checked={tone === option}
              disabled={disabled}
              tone="ink"
              size="xxs"
              onChange={() => setTone(option)}
            >
              {t(`tone_${option}`)}
            </ChoicePill>
          ))}
        </div>
        <Button
          type="button"
          variant="flat"
          size="mock-38"
          className="gap-1.5 bg-(--ai) px-4 font-bold text-white"
          disabled={disabled || write.isPending}
          onClick={run}
        >
          <Sparkles aria-hidden className="size-[18px]" />
          {write.isPending
            ? t("aiWriting")
            : hasNote
              ? t("aiRewrite")
              : t("aiWrite")}
        </Button>
      </div>
    </div>
  );
}
