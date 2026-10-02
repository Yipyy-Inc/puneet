"use client";

import {
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

import { useOpenEvaluationWizard } from "@/components/evaluations/use-open-evaluation-wizard";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label={t("statScheduled")}
          value={stats.scheduled}
          icon={CalendarDays}
          tone="indigo"
        />
        <KpiTile
          label={t("statCompleted")}
          value={stats.completed}
          icon={CircleCheck}
          tone="emerald"
        />
        <KpiTile
          label={t("statToReview")}
          value={stats.toReview}
          icon={ClipboardCheck}
          tone="amber"
        />
        <KpiTile
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

      <p className="text-micro text-ink-tertiary uppercase">
        {fill("todayHeading", {
          day: formatWeekdayDate(new Date(`${board.today}T12:00:00`), locale),
        })}
      </p>

      {board.visits.length === 0 ? (
        <div className="bg-card border-line rounded-3xl border">
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
