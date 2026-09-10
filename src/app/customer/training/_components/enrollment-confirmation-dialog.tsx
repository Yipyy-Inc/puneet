"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Luggage,
  MapPin,
  PawPrint,
  Sparkles,
  User2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import {
  type TrainingSeries,
  calculateSessionDates,
} from "@/lib/training-series";
import type { TrainingCourseType } from "@/lib/training-config";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatTimeOfDay,
  formatWeekday,
} from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: TrainingSeries | null;
  petName: string | null;
  courseType: TrainingCourseType | null;
  paymentLabel: string;
  onAddToCalendar: () => void;
}

// A calendar date, read at local midnight so no zone can move it.
function formatLongDate(iso: string, locale: AppLocale): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return formatDateLong(new Date(y, m - 1, d), locale);
}

export function EnrollmentConfirmationDialog({
  open,
  onOpenChange,
  series,
  petName,
  courseType,
  paymentLabel,
  onAddToCalendar,
}: Props) {
  const { t, fill, locale } = useCustomerText("training");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const sessionDates = useMemo(() => {
    if (!series) return [];
    return calculateSessionDates(
      series.startDate,
      series.dayOfWeek,
      series.numberOfWeeks,
    );
  }, [series]);

  if (!series) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
            <CheckCircle2 className="size-7" />
          </div>
          <DialogTitle className="text-xl">{t("youreEnrolled")}</DialogTitle>
          <DialogDescription>
            {petName
              ? rich(t("petIsBookedInto"), {
                  pet: (
                    <span className="font-semibold text-slate-900">
                      {petName}
                    </span>
                  ),
                  series: (
                    <span className="font-semibold text-slate-900">
                      {series.seriesName}
                    </span>
                  ),
                })
              : fill("youreBookedInto", { series: series.seriesName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Summary stats ─────────────────────────────────────────────── */}
          <div className="rounded-lg border bg-slate-50/60 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5">
                <PawPrint className="text-muted-foreground size-3.5" />
                <span className="font-medium text-slate-800">
                  {petName ?? t("yourPet")}
                </span>
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <User2 className="text-muted-foreground size-3.5" />
                <span className="text-slate-700">{series.instructorName}</span>
              </span>
              <span className="text-muted-foreground/50">·</span>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                {paymentLabel}
              </Badge>
            </div>
          </div>

          {/* Schedule ──────────────────────────────────────────────────── */}
          <section className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
              <CalendarDays className="size-3" />
              {fill("scheduleSessions", { n: sessionDates.length })}
            </p>
            <div className="bg-card rounded-lg border px-3 py-2">
              <p className="text-sm font-medium text-slate-800">
                {fill("everyWeekdayAt", {
                  day: formatWeekday(series.dayOfWeek, locale, "long"),
                  time: `${formatTimeOfDay(series.startTime, locale)} – ${formatTimeOfDay(series.endTime, locale)}`,
                })}
              </p>
              <p className="text-muted-foreground text-[11.5px]">
                {fill("weeksTotal", { n: series.numberOfWeeks })}
              </p>
              <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground mt-1.5 inline-flex items-center gap-0.5 text-[11px] underline-offset-2 hover:underline"
                  >
                    <ChevronDown
                      className={cnRotated(scheduleOpen)}
                      aria-hidden
                    />
                    {scheduleOpen ? t("hideAllDates") : t("seeAllSessionDates")}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ol className="mt-2 space-y-1 border-t pt-2">
                    {sessionDates.map((d, idx) => (
                      <li
                        key={d}
                        className="flex items-baseline justify-between text-[12px] text-slate-700"
                      >
                        <span>
                          <span className="text-muted-foreground inline-block min-w-16 pr-1 text-[11px] font-medium">
                            {fill("sessionN", { n: idx + 1 })}
                          </span>
                          {formatLongDate(d, locale)}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatTimeOfDay(series.startTime, locale)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </section>

          {/* Location ──────────────────────────────────────────────────── */}
          <section className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
              <MapPin className="size-3" />
              {t("location")}
            </p>
            <p className="bg-card rounded-lg border px-3 py-2 text-sm text-slate-800">
              {series.location}
            </p>
          </section>

          {/* What you will learn */}
          {courseType?.whatYouWillLearn &&
            courseType.whatYouWillLearn.length > 0 && (
              <section className="space-y-1.5">
                <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                  <Sparkles className="size-3" />
                  {t("whatYouWillLearn2")}
                </p>
                <ul className="bg-card space-y-1 rounded-lg border px-3 py-2">
                  {courseType.whatYouWillLearn.map((item, idx) => (
                    <li
                      key={`learn-${idx}`}
                      className="flex items-start gap-2 text-[12.5px]/relaxed text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {/* What to bring ─────────────────────────────────────────────── */}
          {courseType?.whatToBring && courseType.whatToBring.length > 0 && (
            <section className="space-y-1.5">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <Luggage className="size-3" />
                {t("whatToBring2")}
              </p>
              <ul className="bg-card space-y-1 rounded-lg border px-3 py-2">
                {courseType.whatToBring.map((item, idx) => (
                  <li
                    key={`bring-${idx}`}
                    className="flex items-start gap-2 text-[12.5px]/relaxed text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Separator />

          <p className="text-muted-foreground inline-flex items-center gap-1 text-[11.5px]">
            <Sparkles className="size-3" />
            {t("confirmationEmailOnItsWay")}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onAddToCalendar}
            className="gap-1.5"
          >
            <CalendarCheck className="size-4" />
            {t("addToCalendar")}
            <Download className="size-3.5 opacity-60" />
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small helper to drive the disclosure caret rotation off the open state
 *  without inline conditional class logic that the React Compiler dislikes. */
function cnRotated(open: boolean): string {
  return `size-3 transition-transform ${open ? "rotate-180" : ""}`;
}
