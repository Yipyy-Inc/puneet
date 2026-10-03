"use client";

import { EvaluationResultChip } from "@/components/evaluations/result-chip";
import { useEvaluationServiceName } from "@/components/evaluations/use-evaluation-service-name";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { PetTile } from "@/components/evaluations/pet-tile";
import { Chip } from "@/components/ui/chip";
import type { AllRow, EvaluationsBoard } from "@/lib/evaluations/board-types";
import { isPass } from "@/lib/evaluations/questions";
import {
  formatCalendarDayLong,
  formatList,
  formatTimeInZone,
  formatWeekdayDate,
} from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { wallClockParts } from "@/lib/time/facility-time";

// ============================================================================
// All evaluations — the client's mock (2026-10-02): Pet, Owner, Result, Date,
// Evaluator, Approved for. A pet only booked so far reads "Scheduled" with
// its time; one being answered, "In progress". Six columns, inside §6 rule
// 6's seven; the phone card takes pet, result, date and what it unlocked.
// ============================================================================

export function AllTab({
  board,
  onOpen,
}: {
  board: EvaluationsBoard;
  onOpen: (evaluationId: string) => void;
}) {
  const { t, fill, locale } = useStaffText("evaluations");
  const serviceName = useEvaluationServiceName();
  // Days and times on the facility's clock, wherever the reader is.
  const dayOf = (timestamp: string) =>
    wallClockParts(timestamp, board.timeZone).date;

  const columns: ColumnDef<AllRow>[] = [
    {
      key: "pet",
      label: t("colPet"),
      sortable: true,
      sortValue: (row) => row.pet.name.toLowerCase(),
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <PetTile
            id={row.pet.id}
            name={row.pet.name}
            src={row.pet.imageUrl}
            size={34}
          />
          <div className="min-w-0">
            <p className="text-body-ink truncate font-semibold">
              {row.pet.name}
            </p>
            {row.pet.breed ? (
              <p className="text-ink-tertiary truncate text-[12px]">
                {row.pet.breed}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      label: t("colOwner"),
      sortable: true,
      sortValue: (row) => row.client.name.toLowerCase(),
      render: (row) => row.client.name,
    },
    {
      key: "result",
      label: t("colResult"),
      render: (row) =>
        row.result ? (
          <EvaluationResultChip result={row.result} />
        ) : row.state === "scheduled" ? (
          <Chip
            tone="neutral"
            size="sm"
            className="px-[9px] py-[3px] font-bold"
          >
            {t("stateScheduled")}
          </Chip>
        ) : (
          <Chip tone="info" size="sm" className="px-[9px] py-[3px] font-bold">
            {t("stateInProgress")}
          </Chip>
        ),
    },
    {
      key: "date",
      label: t("colDate"),
      sortable: true,
      sortValue: (row) => row.completedAt ?? row.scheduledAt ?? "",
      render: (row) =>
        row.completedAt
          ? formatCalendarDayLong(dayOf(row.completedAt), locale)
          : "—",
    },
    {
      key: "evaluator",
      label: t("colEvaluator"),
      render: (row) => row.evaluatorName ?? "—",
    },
    {
      key: "approved",
      label: t("colApprovedFor"),
      render: (row) => {
        if (row.state === "scheduled" && row.scheduledAt) {
          return (
            <span className="text-ink-secondary text-[12.5px]">
              {fill("scheduledAt", {
                day: formatWeekdayDate(
                  new Date(`${dayOf(row.scheduledAt)}T12:00:00`),
                  locale,
                ),
                time: formatTimeInZone(row.scheduledAt, locale, board.timeZone),
              })}
            </span>
          );
        }
        const approved =
          row.result && isPass(row.result) ? row.approvedServices : [];
        return (
          <span className="text-ink-secondary text-[12.5px]">
            {approved.length > 0
              ? formatList(approved.map(serviceName), locale)
              : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      tableId="evaluations-all"
      data={board.all}
      columns={columns}
      cardColumns={["pet", "result", "date", "approved"]}
      getItemId={(row) => row.key}
      getSearchValue={(row) =>
        [
          row.pet.name,
          row.pet.breed ?? "",
          row.client.name,
          row.evaluatorName ?? "",
        ]
          .join(" ")
          .toLowerCase()
      }
      searchPlaceholder={t("searchAll")}
      onRowClick={(row) => {
        if (row.evaluationId) onOpen(row.evaluationId);
      }}
      emptyState={{
        pose: "reviewing",
        title: t("emptyAllTitle"),
        description: t("emptyAllBody"),
      }}
    />
  );
}
