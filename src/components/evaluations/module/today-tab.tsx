"use client";

import {
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

import { useOpenEvaluationWizard } from "@/components/evaluations/use-open-evaluation-wizard";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import type { EvaluationsBoard } from "@/lib/evaluations/board-types";
import { formatPercent, formatWeekdayDate } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { VisitCard } from "./visit-card";

// ============================================================================
// Today — the client's mock (2026-10-02): four tiles (scheduled, completed,
// cards to review, pass rate over 90 days), then a card for each pet booked
// for an evaluation today, in the facility's day.
// ============================================================================

export function TodayTab({
  board,
  highlightRef,
  startingKey,
  onStart,
  onOpen,
}: {
  board: EvaluationsBoard;
  /** The booking the calendar linked to, by number. */
  highlightRef: number | null;
  /** `booking:pet` of the evaluation being started. */
  startingKey: string | null;
  onStart: (bookingId: string, petId: string) => void;
  onOpen: (evaluationId: string) => void;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const openWizard = useOpenEvaluationWizard();
  const { stats } = board;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <StatTile
          label={t("statScheduled")}
          value={stats.scheduled}
          icon={CalendarDays}
          tone="info"
        />
        <StatTile
          label={t("statCompleted")}
          value={stats.completed}
          icon={CircleCheck}
          tone="success"
        />
        <StatTile
          label={t("statToReview")}
          value={stats.toReview}
          icon={ClipboardCheck}
          tone="warning"
        />
        <StatTile
          label={t("statPassRate")}
          value={
            stats.passRate === null
              ? "—"
              : formatPercent(stats.passRate, locale)
          }
          icon={TrendingUp}
          tone="violet"
        />
      </div>

      <p className="text-ink-tertiary -mb-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
        {fill("todayHeading", {
          day: formatWeekdayDate(new Date(`${board.today}T12:00:00`), locale),
        })}
      </p>

      {board.visits.length === 0 ? (
        <div className="bg-card border-line rounded-[20px] border">
          <TableEmptyState
            pose="reviewing"
            title={t("emptyTodayTitle")}
            description={t("emptyTodayBody")}
            action={
              board.viewer.mayRun
                ? { label: t("bookEvaluation"), onClick: () => openWizard() }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
          {board.visits.map((visit) => {
            const key = `${visit.bookingId}:${visit.pet.id}`;
            return (
              <VisitCard
                key={key}
                visit={visit}
                timeZone={board.timeZone}
                mayRun={board.viewer.mayRun}
                highlighted={highlightRef === visit.bookingRef}
                busy={startingKey === key}
                onStart={() => onStart(visit.bookingId, visit.pet.id)}
                onOpen={onOpen}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const STAT_TONE = {
  info: "bg-(--info-wash) text-primary",
  success: "bg-wash-success text-success",
  warning: "bg-wash-warning text-warning",
  violet: "bg-(--violet-wash) text-(--violet-ink)",
} as const;

/** The evaluations mock's figure: a white card, its glyph on a tinted square. */
function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof CalendarDays;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div className="bg-card border-line flex min-w-0 items-center gap-3 rounded-[18px] border p-4">
      <span
        aria-hidden
        className={`grid size-[42px] shrink-0 place-items-center rounded-[13px] ${STAT_TONE[tone]}`}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-body-ink text-[24px] font-extrabold tabular-nums">
          {value}
        </span>
        <span className="text-ink-secondary text-[12.5px]">{label}</span>
      </span>
    </div>
  );
}
