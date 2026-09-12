"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/ui/route-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock,
  Flame,
  ImageIcon,
  Inbox,
  PawPrint,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import { useLogHomeworkPractice } from "@/lib/api/training-homework";
import {
  getLastPracticedDate,
  getPracticeStreakDays,
  hasPracticedToday,
} from "@/lib/training-homework";
import type {
  TrainingHomework,
  TrainingHomeworkMedia,
} from "@/lib/training-enrollment";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatDateShort,
  formatDayRelative,
} from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { localToday } from "@/lib/vaccinations";

interface PetHomeworkGroup {
  petId: number;
  petName: string;
  active: TrainingHomework[];
  completed: TrainingHomework[];
}

// A calendar date — the value is a day, so it is read at local midnight
// and never shifts with the zone.
function formatDate(iso: string, locale: AppLocale): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return formatDateLong(new Date(y, m - 1, d), locale);
}

/** The Homework tab on the customer's training page — each dog's homework,
 *  with "Mark as done for today".
 *
 *  ── WHAT CHANGED (2026-09-12) ────────────────────────────────────────────
 *
 *  It read `trainingHomeworkRecords`, a fixture, and "Mark as done" wrote the
 *  query cache, so the trainer never saw it. Homework is `training_homework`
 *  now, and a day's practice is logged through `log_homework_practice()` —
 *  one row a day, which the trainer's board and the dog's profile read. It
 *  is grouped by the dog each piece of homework names, so it does not depend
 *  on what a customer session may read of the training book.
 *
 *  The video upload is gone. It kept a `blob:` URL that lived in this tab and
 *  nowhere else, so a "submitted" clip never reached a trainer — and when the
 *  facility required a video, the owner could not mark anything done. There
 *  is no upload for practice videos yet; until there is, a practice is the
 *  tap. */
export function CustomerHomeworkTab() {
  const { t, fill } = useCustomerText("training");
  const [todayISO] = useState(localToday);
  const {
    data: homework = [],
    error: homeworkError,
    isPending: homeworkPending,
  } = useQuery(trainingQueries.allHomework());
  const logPractice = useLogHomeworkPractice();

  const [showCompleted, setShowCompleted] = useState(false);

  const groups = useMemo<PetHomeworkGroup[]>(() => {
    // RLS gives an owner their own dogs' homework, and each row names its dog.
    const byPet = new Map<number, PetHomeworkGroup>();
    for (const hw of homework) {
      if (hw.petId === undefined) continue;
      let group = byPet.get(hw.petId);
      if (!group) {
        group = {
          petId: hw.petId,
          petName: hw.petName ?? "",
          active: [],
          completed: [],
        };
        byPet.set(hw.petId, group);
      }
      if (hw.completed) group.completed.push(hw);
      else group.active.push(hw);
    }

    // Each dog's active list by next-due ascending (oldest first), then its
    // completed list by completion descending (most recent first).
    const ordered = [...byPet.values()];
    for (const group of ordered) {
      group.active.sort((a, b) =>
        (a.nextDueDate ?? a.sessionDate).localeCompare(
          b.nextDueDate ?? b.sessionDate,
        ),
      );
      group.completed.sort((a, b) =>
        (b.completedDate ?? b.sessionDate).localeCompare(
          a.completedDate ?? a.sessionDate,
        ),
      );
    }
    ordered.sort((a, b) => a.petName.localeCompare(b.petName));
    return ordered;
  }, [homework]);

  const totalActive = useMemo(
    () => groups.reduce((sum, g) => sum + g.active.length, 0),
    [groups],
  );
  const totalCompleted = useMemo(
    () => groups.reduce((sum, g) => sum + g.completed.length, 0),
    [groups],
  );
  const totalPracticedToday = useMemo(() => {
    let n = 0;
    for (const g of groups) {
      for (const hw of g.active) {
        if (hasPracticedToday(hw, todayISO)) n++;
      }
    }
    return n;
  }, [groups, todayISO]);

  async function handleMarkDone(hw: TrainingHomework) {
    if (hasPracticedToday(hw, todayISO)) return;
    // Said once the day is logged — the trainer reads the same row.
    try {
      await logPractice.mutateAsync({ id: hw.id, date: todayISO });
      toast.success(fill("markedDoneToday", { title: hw.title }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  // A read still on its way, or one that failed, used to fall through to
  // "No homework yet".
  if (homeworkError) {
    // §5d2's ladder: a panel that would not load takes `error`.
    return (
      <RouteState
        surface="card"
        className="min-h-0 p-0"
        pose="error"
        icon={CircleAlert}
        inkClassName="text-destructive"
        title={t("hwLoadFailedTitle")}
        description={t("hwLoadFailed")}
      />
    );
  }

  if (homeworkPending) {
    return (
      <div className="space-y-3" aria-busy>
        <span className="sr-only">{t("hwLoading")}</span>
        <Skeleton className="h-32 rounded-2xl motion-reduce:animate-none" />
      </div>
    );
  }

  if (totalActive === 0 && totalCompleted === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        {t("noHomeworkYet")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Sparkles className="size-4 text-indigo-500" />
          <span>
            {rich(t("practicedTodayOf"), {
              done: (
                <span className="font-semibold text-slate-900 tabular-nums">
                  {totalPracticedToday}
                </span>
              ),
              total: (
                <span className="font-semibold text-slate-900 tabular-nums">
                  {totalActive}
                </span>
              ),
            })}
          </span>
        </div>
        <p className="text-muted-foreground text-[12px]">
          {t("tapMarkAsDone")}
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.petId} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
                <PawPrint className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {group.petName}
                </h3>
                <p className="text-muted-foreground text-[11px]">
                  {fill(
                    group.active.length === 1
                      ? "activeHomeworkOne"
                      : "activeHomeworkOther",
                    { n: group.active.length },
                  )}
                  {group.completed.length > 0 &&
                    ` · ${fill("doneCount", { n: group.completed.length })}`}
                </p>
              </div>
            </div>

            {group.active.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed bg-emerald-50/30 px-4 py-6 text-center text-sm">
                <CheckCircle2 className="mx-auto mb-1.5 size-5 text-emerald-500" />
                {t("noActiveHomeworkRightNow")}
              </div>
            ) : (
              <ul className="space-y-3">
                {group.active.map((hw) => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    todayISO={todayISO}
                    marking={
                      logPractice.isPending &&
                      logPractice.variables?.id === hw.id
                    }
                    onMarkDone={() => void handleMarkDone(hw)}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}

        {totalCompleted > 0 && (
          <CompletedArchive
            groups={groups}
            total={totalCompleted}
            open={showCompleted}
            onOpenChange={setShowCompleted}
          />
        )}
      </div>
    </div>
  );
}

function CompletedArchive({
  groups,
  total,
  open,
  onOpenChange,
}: {
  groups: PetHomeworkGroup[];
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, fill, locale } = useCustomerText("training");
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/60 px-4 py-2.5 text-left hover:bg-slate-100/60"
        >
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="text-muted-foreground size-4" />
            ) : (
              <ChevronRight className="text-muted-foreground size-4" />
            )}
            <h3 className="text-sm font-semibold text-slate-700">
              {t("completedHomework")}
            </h3>
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {total}
            </span>
          </div>
          <span className="text-muted-foreground text-[11px]">
            {open ? t("hide") : t("showArchive")}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        {groups
          .filter((g) => g.completed.length > 0)
          .map((g) => (
            <ul key={g.petId} className="space-y-2">
              {g.completed.map((hw) => (
                <li
                  key={hw.id}
                  className="bg-card rounded-xl border px-4 py-3 opacity-80 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 line-through decoration-slate-300">
                        {hw.title}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {g.petName} ·{" "}
                        {hw.completedDate
                          ? fill("doneOn", {
                              date: formatDate(hw.completedDate, locale),
                            })
                          : t("done")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                    >
                      <CheckCircle2 className="size-3" />
                      {t("completed")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function HomeworkCard({
  homework,
  todayISO,
  marking,
  onMarkDone,
}: {
  homework: TrainingHomework;
  todayISO: string;
  marking: boolean;
  onMarkDone: () => void;
}) {
  const { t, fill, locale } = useCustomerText("training");
  const practiced = hasPracticedToday(homework, todayISO);
  const streak = getPracticeStreakDays(homework, todayISO);
  const lastPracticed = getLastPracticedDate(homework);

  // The trainer's latest response to any day the dog practised, so the owner
  // sees it the next time they open the homework.
  const latestResponse = [...(homework.practiceLog ?? [])]
    .filter((entry) => !!entry.trainerResponse)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <li className="bg-card rounded-xl border shadow-sm">
      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-800">
              {homework.title}
            </p>
            {homework.description && (
              <p className="text-muted-foreground mt-0.5 text-[13px]/relaxed">
                {homework.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {homework.frequency && (
              <Badge
                variant="outline"
                className="gap-1 border-violet-200 bg-violet-50 text-violet-700"
              >
                <Clock className="size-3" />
                {homework.frequency}
              </Badge>
            )}
            {homework.nextDueDate && !practiced && (
              <Badge
                variant="outline"
                className="gap-1 border-sky-200 bg-sky-50 text-sky-700"
                title={fill("nextPracticeOn", {
                  date: formatDate(homework.nextDueDate, locale),
                })}
              >
                <CalendarClock className="size-3" />
                {fill("dueWhen", {
                  when: formatDayRelative(
                    homework.nextDueDate,
                    locale,
                    todayISO,
                  ),
                })}
              </Badge>
            )}
            {streak >= 2 && (
              <Badge
                variant="outline"
                className="gap-1 border-orange-200 bg-orange-50 text-orange-700"
                title={t("consecutiveDaysOfPractice")}
              >
                <Flame className="size-3" />
                {streak}-day streak
              </Badge>
            )}
          </div>
        </div>

        {homework.media && homework.media.length > 0 && (
          <HomeworkMediaGallery media={homework.media} title={homework.title} />
        )}

        {homework.instructions.length > 0 && (
          <ul className="space-y-1.5">
            {homework.instructions.map((line, idx) => (
              <li
                key={`${homework.id}-inst-${idx}`}
                className="flex items-start gap-2 text-[13px]/relaxed text-slate-700"
              >
                <Circle className="text-muted-foreground/40 mt-1 size-2 shrink-0 fill-current" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2.5 border-t pt-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              {lastPracticed ? (
                <>
                  <Clock className="size-3" />
                  {fill("lastPracticedWhen", {
                    when: formatDayRelative(lastPracticed, locale, todayISO),
                  })}
                </>
              ) : (
                <>
                  <Sparkles className="size-3" />
                  {t("markTodaysPracticeToStart")}
                </>
              )}
            </div>
            <Button
              size="sm"
              onClick={onMarkDone}
              loading={marking}
              disabled={practiced}
              className={cn(
                "gap-1.5",
                practiced
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              <CheckCircle2 className="size-4" />
              {practiced ? t("doneForToday") : t("markAsDoneForToday")}
            </Button>
          </div>

          {latestResponse?.trainerResponse && (
            <TrainerResponseBlock
              message={latestResponse.trainerResponse}
              trainerName={latestResponse.trainerRespondedBy}
              respondedAtISO={latestResponse.trainerRespondedAt}
              practiceDate={
                latestResponse.date === todayISO
                  ? undefined
                  : latestResponse.date
              }
            />
          )}
        </div>
      </div>
    </li>
  );
}

function TrainerResponseBlock({
  message,
  trainerName,
  respondedAtISO,
  practiceDate,
}: {
  message: string;
  trainerName?: string;
  respondedAtISO?: string;
  /** When set, says which day's practice the response is about — for a
   *  response to an earlier day than today. */
  practiceDate?: string;
}) {
  const { t, fill, locale } = useCustomerText("training");
  const when = respondedAtISO ? formatDateShort(respondedAtISO, locale) : null;
  return (
    <div className="space-y-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2">
      <p className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
        <Sparkles className="size-3" />
        {t("trainerSays")}
        {practiceDate && (
          <span className="text-muted-foreground ml-1 font-normal tracking-normal normal-case">
            ·{" "}
            {fill("aboutPracticeOn", {
              date: formatDate(practiceDate, locale),
            })}
          </span>
        )}
      </p>
      <p className="text-[13px]/relaxed text-slate-700">{message}</p>
      {(trainerName || when) && (
        <p className="text-muted-foreground text-[10px]">
          {trainerName ?? t("yourTrainer")}
          {when ? ` · ${when}` : ""}
        </p>
      )}
    </div>
  );
}

function HomeworkMediaGallery({
  media,
  title,
}: {
  media: TrainingHomeworkMedia[];
  title: string;
}) {
  const { t, fill } = useCustomerText("training");
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {media.map((item, idx) => (
        <figure key={`${title}-media-${idx}`} className="space-y-1.5">
          {item.type === "video" ? (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
              <iframe
                src={item.url}
                title={item.caption ?? fill("demoVideoOf", { title })}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
              <Image
                src={item.url}
                alt={item.caption ?? fill("referenceImageOf", { title })}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <figcaption className="text-muted-foreground flex items-center gap-1 text-[11px]">
            {item.type === "video" ? (
              <PlayCircle className="size-3" />
            ) : (
              <ImageIcon className="size-3" />
            )}
            {item.caption ??
              (item.type === "video" ? t("demoVideo") : t("referencePhoto"))}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
