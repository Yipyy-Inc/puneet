"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { nextDays } from "@/lib/bookings/wizard/staff-slots";
import { hhmmOf } from "@/lib/bookings/wizard/time-windows";
import { isoDay } from "@/lib/bookings/wizard/calendar-month";
import { evaluationDay } from "@/lib/evaluations/availability";
import {
  facilityDay,
  type FacilityCalendar,
} from "@/lib/evaluations/facility-days";
import { evaluationSchedule, offerModeOf } from "@/lib/evaluations/schedule";
import { formatMoney, formatTimeOfDay, formatWeekday } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";
import type { EvaluationConfig } from "@/types/facility";

import { sessionLengthLabel } from "./when-step";

// ============================================================================
// "WHAT CLIENTS WILL SEE" (the client's mock): the mode, one line of what an
// evaluation is, the next seven days and the times on offer — computed by
// the same rule the booking wizard and the server use
// (lib/evaluations/availability.ts), on the draft, before it is saved.
// ============================================================================

const PREVIEW_DAYS = 7;
const PREVIEW_TIMES = 12;

export function ClientsPreview({
  config,
  calendar,
  t,
  locale,
  onOpenWizard,
  wizardDisabled,
  setupHref,
}: {
  config: EvaluationConfig;
  calendar: FacilityCalendar;
  t: (key: string) => string;
  locale: AppLocale;
  onOpenWizard: () => void;
  /** Unsaved changes: the wizard would show the saved rules, not these. */
  wizardDisabled: boolean;
  setupHref: string;
}) {
  const schedule = evaluationSchedule(config);
  const mode = offerModeOf(config);
  // From tomorrow, as the mock shows them.
  const today = isoDay(new Date());
  const dates = nextDays(today, PREVIEW_DAYS + 1).slice(1);
  const days = dates.map((date) =>
    evaluationDay(schedule, { ...facilityDay(date, calendar), booked: [] }, 1),
  );
  const firstOpen = days.find((day) => day.status === "open");
  const times = (firstOpen?.starts ?? []).slice(0, PREVIEW_TIMES);
  const price =
    config.price > 0
      ? fill(t("perPet"), {
          amount: formatMoney(config.price, locale, {
            whole: Number.isInteger(config.price),
          }),
        })
      : t("free");
  const summary = [
    sessionLengthLabel(schedule.minutes, t, locale),
    schedule.capacity === 1
      ? t("onePetAtOnce")
      : fill(t("upToPetsAtOnce"), { n: schedule.capacity }),
    price,
  ].join(" · ");

  return (
    <aside
      aria-labelledby="ev-preview-title"
      className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5 lg:sticky lg:top-20"
    >
      <h2
        id="ev-preview-title"
        className="text-micro text-ink-tertiary uppercase"
      >
        {t("previewTitle")}
      </h2>
      <Card className="gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-strong text-body-ink">
            {t(`mode_${mode}`)}
          </span>
          <span className="text-meta text-ink-tertiary">{summary}</span>
        </div>
        <ol className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const date = new Date(`${day.date}T12:00:00`);
            const open = day.status !== "closed";
            return (
              <li
                key={day.date}
                data-open={open}
                className="border-line text-ink-disabled data-[open=true]:text-body-ink data-[open=true]:bg-card bg-surface-inset flex min-w-0 flex-col items-center rounded-lg border py-1.5"
              >
                <span className="text-micro">
                  {formatWeekday(date.getDay(), locale, "short")}
                </span>
                <span className="text-body-strong tabular-nums">
                  {date.getDate()}
                </span>
              </li>
            );
          })}
        </ol>
        {times.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
            {times.map((slot) => (
              <li
                key={slot.start}
                className="border-line-strong text-meta text-body-ink flex min-h-9 items-center justify-center rounded-lg border font-semibold tabular-nums"
              >
                {formatTimeOfDay(hhmmOf(slot.start), locale)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-meta text-ink-secondary">{t("previewNoTimes")}</p>
        )}
        <Button
          type="button"
          onClick={onOpenWizard}
          disabled={wizardDisabled}
          className="w-full"
        >
          {t("openWizard")}
          <ArrowRight aria-hidden />
        </Button>
      </Card>
      <p className="text-meta text-ink-tertiary px-1">
        {t("formLivesUnder")}{" "}
        <Link href={setupHref} className="text-primary font-semibold">
          {t("formLivesUnderLink")}
        </Link>
      </p>
    </aside>
  );
}
