"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { careLogKeys, clearCare, logCare } from "@/lib/api/care-log";
import {
  dayProgress,
  type JournalRow,
} from "@/lib/bookings/details/journal-plan";
import { mealPrep, mealWhat } from "@/lib/feeding/describe";
import { planFromItem } from "@/lib/feeding/plan";
import { formatCalendarDayLong, formatDateShort } from "@/lib/i18n/format";
import { bookingStay } from "@/lib/medications/schedule";
import { useShellText } from "@/lib/shell/use-shell-text";

import { DetailsCard } from "../details-card";
import type { BookingDetails } from "../use-booking-details";
import type { DetailDialog } from "../use-booking-handlers";
import { DayChips } from "./day-chips";
import { JournalRowView } from "./journal-row";
import { useDayPhoto } from "./use-day-photo";
import { useJournalPlan } from "./use-journal-plan";

// ============================================================================
// The Guest journal (a stay) or the Daily log (a day of daycare), as the
// mocks draw it: the day and how much of it is logged, a chip for each day of
// a stay, every planned meal, dose, potty break and add-on with its answers,
// anything else logged that day, and the two dashed adds at the foot.
//
// Logged through the care log the Daily Care board writes too, under the keys
// the care gate reads (journal-plan.ts). A day ahead is the plan only; so is
// any day while the pet is not here.
// ============================================================================

export function JournalTab({
  d,
  openDialog,
}: {
  d: BookingDetails;
  openDialog: (name: DetailDialog, day?: string) => void;
}) {
  const { t, fill, locale } = d.text;
  const words = useShellText("booking");
  const queryClient = useQueryClient();
  const booking = d.booking;
  const isStay = d.kind === "boarding";
  const plan = useJournalPlan(d);
  const days = plan.days;
  const today = d.logDay;
  const [picked, setPicked] = useState<string | null>(null);
  const day =
    picked ?? (days.includes(today) ? today : (days[days.length - 1] ?? today));
  const photo = useDayPhoto(d, day);

  const record = useMutation({
    mutationFn: async (input: { row: JournalRow; outcome: string | null }) => {
      if (!booking) return;
      if (input.outcome === null) {
        if (input.row.entry) await clearCare(input.row.entry.id);
        return;
      }
      await logCare({
        bookingRef: booking.id,
        petRef: d.pet?.id ?? null,
        taskKey: input.row.key,
        taskType: input.row.taskType,
        outcome: input.outcome,
        occurredOn: day,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: careLogKeys.forBooking(booking?.id ?? 0),
      }),
    onError: (error) =>
      toast.error(t("careNotRecorded"), {
        description: error instanceof Error ? error.message : t("tryAgain"),
      }),
  });

  if (!booking) return null;
  const stay = bookingStay(booking);
  const rowsFor = (date: string): JournalRow[] =>
    plan
      .rowsFor(date)
      .map((row) => ({ ...row, detail: detailOf(row) || row.detail }));

  // A meal in the owner's own words, as the Feeding plan card says it.
  function detailOf(row: JournalRow): string {
    const item = row.meal?.item;
    if (!item || !Array.isArray(item.foods) || !row.meal?.occasionId) return "";
    const plan = planFromItem(item, { settings: d.feedingInstructions, stay });
    return [
      mealWhat(words, plan, row.meal.occasionId, locale, d.feedingInstructions),
      ...mealPrep(words, plan, row.meal.occasionId),
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const rows = rowsFor(day);
  const progress = dayProgress(rows);
  const allLogged = progress.total > 0 && progress.logged === progress.total;
  // Logged while the pet is here, and never ahead of today.
  const canLog = d.departing && day <= today;
  const nameOf = (petRef: number | null | undefined) =>
    d.pets.length > 1
      ? (d.pets.find((p) => p.id === petRef)?.name ?? null)
      : null;

  const dayLabel = [
    formatCalendarDayLong(day, locale),
    day === today ? t("todayWord") : null,
    isStay && days.length > 1 && day === days[days.length - 1]
      ? t("checkoutDay")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const answer = (row: JournalRow, outcome: string) =>
    record.mutate({
      row,
      outcome: row.entry?.outcome === outcome ? null : outcome,
    });

  return (
    <DetailsCard>
      <div className="border-line-soft flex flex-col gap-3 border-b px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-col gap-0.5">
            <h2 className="text-ink-secondary text-[13px] font-semibold tracking-[0.08em] uppercase">
              {t(isStay ? "tabGuestJournal" : "tabDailyLog")}
            </h2>
            <span className="text-ink-tertiary text-[13px]">{dayLabel}</span>
          </span>
          <div className="flex items-center gap-2">
            {progress.total > 0 ? (
              <Chip tone={allLogged ? "success" : "warning"} size="bd-progress">
                {fill("loggedOf", {
                  done: progress.logged,
                  total: progress.total,
                })}
              </Chip>
            ) : null}
            <Button variant="quiet" size="bd-36" asChild>
              <Link href={photo.reportCardHref}>{t("sendReportCard")}</Link>
            </Button>
          </div>
        </div>
        {isStay && days.length > 1 ? (
          <DayChips
            days={days}
            selected={day}
            today={today}
            onPick={setPicked}
            status={(date) => {
              if (date > today) return "ahead";
              const p = dayProgress(rowsFor(date));
              return p.total > 0 && p.logged === p.total ? "full" : "partial";
            }}
            label={(date, i) => ({
              top: fill("dayN", { n: i + 1 }),
              date: formatDateShort(`${date}T12:00:00`, locale),
            })}
          />
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-ink-disabled px-5 py-4 text-[14px]">
          {t("journalNothingPlanned")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <JournalRowView
              key={row.key}
              row={row}
              t={t}
              locale={locale}
              petName={nameOf(row.entry?.petRef ?? null)}
              canLog={canLog}
              busy={record.isPending}
              onAnswer={answer}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 px-5 py-3.5">
        <Button
          variant="bd-dashed"
          size="bd-38"
          disabled={!canLog}
          onClick={() => openDialog("logActivity", day)}
        >
          {t("logActivityPlus")}
        </Button>
        <Button
          variant="bd-dashed"
          size="bd-38"
          disabled={!canLog || photo.busy}
          loading={photo.busy}
          onClick={photo.pick}
        >
          {t("addPhotoPlus")}
        </Button>
        {photo.input}
      </div>
    </DetailsCard>
  );
}
