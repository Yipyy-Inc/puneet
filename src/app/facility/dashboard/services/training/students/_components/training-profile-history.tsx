"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleSlash,
  Clock,
  Cloud,
  CloudRain,
  Filter,
  Flame,
  GraduationCap,
  Hourglass,
  History,
  MapPin,
  Snowflake,
  Sparkles,
  StickyNote,
  Sun,
  Target,
  Timer,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { formatDateLong, formatDateShort, formatTime } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type {
  DistractionLevel,
  WeatherCondition,
} from "@/lib/training-enrollment";
import type {
  SessionAttendance,
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";

const ATTENDANCE_META: Record<
  SessionAttendance["status"],
  { labelKey: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  present: {
    labelKey: "historyStatusPresent",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  late: {
    labelKey: "historyStatusLate",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: Timer,
  },
  absent: {
    labelKey: "historyStatusAbsent",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    Icon: CircleSlash,
  },
  excused: {
    labelKey: "historyStatusExcused",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    Icon: Hourglass,
  },
};

const RATING_META: Record<
  1 | 2 | 3 | 4 | 5,
  { labelKey: string; cls: string; dotCls: string }
> = {
  1: {
    labelKey: "ratingNeedsWork",
    cls: "text-rose-700",
    dotCls: "bg-rose-500",
  },
  2: {
    labelKey: "ratingDeveloping",
    cls: "text-amber-700",
    dotCls: "bg-amber-500",
  },
  3: {
    labelKey: "ratingGood",
    cls: "text-sky-700",
    dotCls: "bg-sky-500",
  },
  4: {
    labelKey: "ratingGreat",
    cls: "text-emerald-700",
    dotCls: "bg-emerald-500",
  },
  5: {
    labelKey: "ratingMastered",
    cls: "text-violet-700",
    dotCls: "bg-violet-500",
  },
};

const ANY_COURSE = "__all__";

const WEATHER_META: Record<
  WeatherCondition,
  { labelKey: string; Icon: typeof Cloud }
> = {
  sunny: { labelKey: "weatherSunny", Icon: Sun },
  cloudy: { labelKey: "weatherCloudy", Icon: Cloud },
  rain: { labelKey: "weatherRain", Icon: CloudRain },
  hot: { labelKey: "weatherHot", Icon: Flame },
  cold: { labelKey: "weatherCold", Icon: Snowflake },
  windy: { labelKey: "weatherWindy", Icon: Wind },
};

const DISTRACTION_META: Record<
  DistractionLevel,
  { labelKey: string; cls: string }
> = {
  low: {
    labelKey: "distractionLow",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  medium: {
    labelKey: "distractionMedium",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  high: {
    labelKey: "distractionHigh",
    cls: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

function WeatherChip({ value }: { value: WeatherCondition }) {
  const { t } = useStaffText("trainingProfile");
  const meta = WEATHER_META[value];
  const Icon = meta.Icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
      <Icon className="size-3" />
      {t(meta.labelKey)}
    </span>
  );
}

function DistractionChip({ value }: { value: DistractionLevel }) {
  const { t } = useStaffText("trainingProfile");
  const meta = DISTRACTION_META[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        meta.cls,
      )}
      title={t("distractionLevelTitle")}
    >
      <Zap className="size-3" />
      {t(meta.labelKey)}
    </span>
  );
}

// A session date is the facility's calendar day, read at local midnight.
function formatDate(iso: string, locale: AppLocale): string {
  return formatDateLong(new Date(iso + "T00:00:00"), locale);
}

function formatShortDate(iso: string, locale: AppLocale): string {
  return formatDateShort(new Date(iso + "T00:00:00"), locale);
}

function RatingDots({ rating }: { rating: 1 | 2 | 3 | 4 | 5 }) {
  const { t } = useStaffText("trainingProfile");
  const meta = RATING_META[rating];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn(
              "size-1.5 rounded-full",
              n <= rating ? meta.dotCls : "bg-slate-200",
            )}
          />
        ))}
      </div>
      <span className={cn("text-[10px] font-semibold", meta.cls)}>
        {t(meta.labelKey)}
      </span>
    </div>
  );
}

interface Props {
  petId: number;
  enrollments: TrainingEnrollment[];
  seriesById: Map<string, TrainingSeries>;
}

interface HistoryRow {
  attendance: SessionAttendance;
  enrollment: TrainingEnrollment | undefined;
  series: TrainingSeries | undefined;
  homework: TrainingHomework[];
}

export function TrainingProfileHistory({
  petId,
  enrollments,
  seriesById,
}: Props) {
  const { t, fill, locale } = useStaffText("trainingProfile");
  const enrollmentIds = useMemo(
    () => enrollments.map((e) => e.id),
    [enrollments],
  );
  const enrollmentById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );

  const { data: attendances = [] } = useQuery(
    trainingQueries.attendancesForPet(petId),
  );
  const { data: homework = [] } = useQuery(
    trainingQueries.homeworkForEnrollments(enrollmentIds),
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(ANY_COURSE);

  // Course options derived from the pet's actual enrollments — we never show
  // a course in the filter that they've never been part of.
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of enrollments) map.set(e.courseTypeId, e.courseTypeName);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [enrollments]);

  // Bundle each attendance with its enrollment + series + matching homework.
  const allRows = useMemo<HistoryRow[]>(() => {
    const homeworkByKey = new Map<string, TrainingHomework[]>();
    for (const h of homework) {
      const key = `${h.enrollmentId}::${h.sessionNumber}`;
      const arr = homeworkByKey.get(key);
      if (arr) arr.push(h);
      else homeworkByKey.set(key, [h]);
    }

    return attendances
      .map<HistoryRow>((a) => {
        const enrollment = enrollmentById.get(a.enrollmentId);
        const series = enrollment
          ? seriesById.get(enrollment.seriesId)
          : undefined;
        const hwKey = `${a.enrollmentId}::${a.sessionNumber}`;
        return {
          attendance: a,
          enrollment,
          series,
          homework: homeworkByKey.get(hwKey) ?? [],
        };
      })
      .sort((a, b) => {
        // Reverse chronological — newest first.
        if (a.attendance.sessionDate !== b.attendance.sessionDate) {
          return a.attendance.sessionDate < b.attendance.sessionDate ? 1 : -1;
        }
        return b.attendance.sessionNumber - a.attendance.sessionNumber;
      });
  }, [attendances, homework, enrollmentById, seriesById]);

  // Apply user filters. Date filter is inclusive on both ends.
  const visibleRows = useMemo(() => {
    return allRows.filter((row) => {
      if (fromDate && row.attendance.sessionDate < fromDate) return false;
      if (toDate && row.attendance.sessionDate > toDate) return false;
      if (
        courseFilter !== ANY_COURSE &&
        row.enrollment?.courseTypeId !== courseFilter
      )
        return false;
      return true;
    });
  }, [allRows, fromDate, toDate, courseFilter]);

  const totalSessions = allRows.length;
  const presentCount = allRows.filter(
    (r) => r.attendance.status === "present" || r.attendance.status === "late",
  ).length;
  const filtersActive = !!fromDate || !!toDate || courseFilter !== ANY_COURSE;

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setCourseFilter(ANY_COURSE);
  }

  return (
    <div className="space-y-4">
      {/* Header + summary ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <History className="size-4" />
          <span className="tabular-nums">
            {fill(
              totalSessions === 1
                ? "sessionsOnRecordOne"
                : "sessionsOnRecordMany",
              { count: totalSessions },
            )}
            {totalSessions > 0 &&
              ` · ${fill("sessionsAttended", { count: presentCount })}`}
          </span>
        </div>
        {visibleRows.length !== allRows.length && (
          <Badge
            variant="outline"
            className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700"
          >
            <Filter className="size-3" />
            {fill("showingOf", {
              shown: visibleRows.length,
              total: totalSessions,
            })}
          </Badge>
        )}
      </div>

      {/* Filter bar ───────────────────────────────────────────────────── */}
      <div className="bg-card flex flex-wrap items-end gap-3 rounded-xl border px-4 py-3">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <CalendarRange className="mr-1 inline size-3 align-text-bottom" />
              {t("filterFrom")}
            </Label>
            <DatePicker
              value={fromDate}
              onValueChange={(v) => setFromDate(v ?? "")}
              placeholder={t("anyDate")}
              displayMode="dialog"
              popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
              calendarClassName="p-1"
              showQuickPresets={false}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <CalendarRange className="mr-1 inline size-3 align-text-bottom" />
              {t("filterTo")}
            </Label>
            <DatePicker
              value={toDate}
              onValueChange={(v) => setToDate(v ?? "")}
              placeholder={t("anyDate")}
              displayMode="dialog"
              popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
              calendarClassName="p-1"
              showQuickPresets={false}
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              <BookOpen className="mr-1 inline size-3 align-text-bottom" />
              {t("filterCourse")}
            </Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_COURSE}>{t("allCourses")}</SelectItem>
                {courseOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtersActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="mr-1 size-3" />
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {/* List ─────────────────────────────────────────────────────────── */}
      {totalSessions === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          {t("noSessionsYet")}
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          {t("noSessionsMatch")}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleRows.map((row) => {
            const { attendance, enrollment, series, homework } = row;
            const statusMeta = ATTENDANCE_META[attendance.status];
            const StatusIcon = statusMeta.Icon;

            return (
              <li
                key={attendance.id}
                className={cn(
                  "bg-card rounded-xl border shadow-sm",
                  attendance.status === "absent" && "opacity-80",
                )}
              >
                {/* Header strip — date + series + status */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatDate(attendance.sessionDate, locale)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {fill("sessionNumber", {
                        number: attendance.sessionNumber,
                      })}
                      {enrollment ? ` · ${enrollment.seriesName}` : ""}
                      {enrollment?.courseTypeName && (
                        <>
                          {" · "}
                          <span className="text-slate-500">
                            {enrollment.courseTypeName}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("gap-1 border", statusMeta.cls)}
                  >
                    <StatusIcon className="size-3" />
                    {t(statusMeta.labelKey)}
                  </Badge>
                </div>

                {/* Meta line — instructor, location, check-in */}
                {(series || attendance.checkInTime) && (
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-slate-50/40 px-4 py-2 text-xs">
                    {series && (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="size-3" />
                          {series.instructorName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {series.location}
                        </span>
                      </>
                    )}
                    {attendance.checkInTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {fill("checkedInAt", {
                          time: formatTime(attendance.checkInTime, locale),
                        })}
                        {attendance.checkOutTime
                          ? ` · ${fill("checkedOutAt", {
                              time: formatTime(attendance.checkOutTime, locale),
                            })}`
                          : ""}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-3 px-4 py-3">
                  {/* Conditions — context for the ratings below */}
                  {attendance.conditions &&
                    (attendance.conditions.weather.length > 0 ||
                      !!attendance.conditions.distractionLevel) && (
                      <div>
                        <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                          <Cloud className="size-3" />
                          {t("conditionsLabel")}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {attendance.conditions.weather.map((w) => (
                            <WeatherChip key={w} value={w} />
                          ))}
                          {attendance.conditions.distractionLevel && (
                            <DistractionChip
                              value={attendance.conditions.distractionLevel}
                            />
                          )}
                        </div>
                      </div>
                    )}

                  {/* Exercises with ratings */}
                  {attendance.exercises && attendance.exercises.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                        <Target className="size-3" />
                        {t("exercisesCovered")}
                      </p>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                        {attendance.exercises.map((ex, idx) => (
                          <li
                            key={`${attendance.id}-ex-${idx}`}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {ex.exerciseName}
                              </p>
                              {ex.notes && (
                                <p className="text-muted-foreground mt-0.5 text-[11px]">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                            <RatingDots rating={ex.rating} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Session summary */}
                  {attendance.trainerNotes && (
                    <div>
                      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                        <StickyNote className="size-3" />
                        {t("sessionSummary")}
                      </p>
                      <p className="bg-muted/40 text-micro/relaxed rounded-md px-3 py-2 text-slate-700">
                        {attendance.trainerNotes}
                      </p>
                    </div>
                  )}

                  {/* Homework assigned */}
                  {homework.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                        <Sparkles className="size-3" />
                        {t("homeworkAssigned")}
                      </p>
                      <ul className="space-y-2">
                        {homework.map((h) => (
                          <li
                            key={h.id}
                            className="rounded-md border border-indigo-100 bg-indigo-50/40 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">
                                {h.title}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border text-[10px]",
                                  h.completed
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-white text-slate-600",
                                )}
                              >
                                {h.completed
                                  ? fill("homeworkCompletedOn", {
                                      date: formatShortDate(
                                        h.completedDate ?? h.sessionDate,
                                        locale,
                                      ),
                                    })
                                  : t("homeworkOpen")}
                              </Badge>
                            </div>
                            {h.description && (
                              <p className="text-muted-foreground mt-1 text-[11px]">
                                {h.description}
                              </p>
                            )}
                            {h.instructions.length > 0 && (
                              <ul className="mt-2 space-y-0.5 pl-4 text-[11px] text-slate-600">
                                {h.instructions.map((i, idx) => (
                                  <li
                                    key={`${h.id}-inst-${idx}`}
                                    className="list-disc"
                                  >
                                    {i}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!attendance.exercises?.length &&
                    !attendance.trainerNotes &&
                    homework.length === 0 && (
                      <p className="text-muted-foreground text-xs italic">
                        {t("nothingLogged")}
                      </p>
                    )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer hint — clarifies what's logged */}
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <CalendarDays className="size-3" />
        {t("recordsFooter")}
      </p>
    </div>
  );
}
