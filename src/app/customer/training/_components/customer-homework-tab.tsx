"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock,
  Flame,
  ImageIcon,
  Inbox,
  PawPrint,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  fanOutHomeworkUpsert,
  getLastPracticedDate,
  getPracticeStreakDays,
  hasPracticedToday,
  markPracticedToday,
} from "@/lib/training-homework";
import type {
  TrainingEnrollment,
  TrainingHomework,
  TrainingHomeworkMedia,
} from "@/lib/training-enrollment";

interface Props {
  /** Customer (owner) ID — used to scope the view to that owner's pets. */
  customerId: number;
}

interface PetHomeworkGroup {
  petId: number;
  petName: string;
  petImageUrl?: string;
  active: TrainingHomework[];
  completed: TrainingHomework[];
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days}d`;
  return `${-days}d ago`;
}

export function CustomerHomeworkTab({ customerId }: Props) {
  const queryClient = useQueryClient();
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0]!,
    [],
  );

  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: homework = [] } = useQuery(trainingQueries.allHomework());

  const [showCompleted, setShowCompleted] = useState(false);

  const groups = useMemo<PetHomeworkGroup[]>(() => {
    // Scope to this customer's enrollments only.
    const ownerEnrollments = enrollments.filter(
      (e) => e.ownerId === customerId,
    );
    const enrollmentIds = new Set(ownerEnrollments.map((e) => e.id));
    const enrollmentById = new Map(ownerEnrollments.map((e) => [e.id, e]));

    // Bucket homework per pet via its enrollment.
    const byPet = new Map<
      number,
      { enrollment: TrainingEnrollment; active: TrainingHomework[]; completed: TrainingHomework[] }
    >();
    for (const e of ownerEnrollments) {
      if (!byPet.has(e.petId)) {
        byPet.set(e.petId, { enrollment: e, active: [], completed: [] });
      }
    }
    for (const hw of homework) {
      if (!enrollmentIds.has(hw.enrollmentId)) continue;
      const enrollment = enrollmentById.get(hw.enrollmentId);
      if (!enrollment) continue;
      const bucket = byPet.get(enrollment.petId);
      if (!bucket) continue;
      if (hw.completed) bucket.completed.push(hw);
      else bucket.active.push(hw);
    }

    // Order each pet's active list by next-due ascending (oldest first), then
    // completed by completedDate descending (most recent first).
    const ordered: PetHomeworkGroup[] = [];
    for (const [petId, bucket] of byPet.entries()) {
      bucket.active.sort((a, b) => {
        const ad = a.nextDueDate ?? a.sessionDate;
        const bd = b.nextDueDate ?? b.sessionDate;
        return ad.localeCompare(bd);
      });
      bucket.completed.sort((a, b) => {
        const ad = a.completedDate ?? a.sessionDate;
        const bd = b.completedDate ?? b.sessionDate;
        return bd.localeCompare(ad);
      });
      ordered.push({
        petId,
        petName: bucket.enrollment.petName,
        active: bucket.active,
        completed: bucket.completed,
      });
    }
    ordered.sort((a, b) => a.petName.localeCompare(b.petName));
    return ordered;
  }, [enrollments, homework, customerId]);

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

  function handleMarkDone(hw: TrainingHomework) {
    if (hasPracticedToday(hw, todayISO)) return;
    const updated = markPracticedToday(hw, todayISO);
    fanOutHomeworkUpsert(queryClient, updated);
    toast.success(`Nice work — "${hw.title}" marked done for today.`);
  }

  if (totalActive === 0 && totalCompleted === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        No homework yet. Once you finish your first training session, the
        instructor will assign exercises to practice here between classes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Sparkles className="text-indigo-500 size-4" />
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {totalPracticedToday}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              {totalActive}
            </span>{" "}
            practiced today
          </span>
        </div>
        <p className="text-muted-foreground text-[12px]">
          Tap &quot;Mark as Done&quot; once your dog has practiced. Your
          instructor sees it on their end.
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.petId} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm">
                <PawPrint className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {group.petName}
                </h3>
                <p className="text-muted-foreground text-[11px]">
                  {group.active.length} active homework
                  {group.active.length === 1 ? "" : "s"}
                  {group.completed.length > 0 &&
                    ` · ${group.completed.length} done`}
                </p>
              </div>
            </div>

            {group.active.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed bg-emerald-50/30 px-4 py-6 text-center text-sm">
                <CheckCircle2 className="mx-auto mb-1.5 size-5 text-emerald-500" />
                No active homework right now — you&apos;ll see new exercises
                here after the next session.
              </div>
            ) : (
              <ul className="space-y-3">
                {group.active.map((hw) => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    todayISO={todayISO}
                    onMarkDone={() => handleMarkDone(hw)}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}

        {totalCompleted > 0 && (
          <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/60 px-4 py-2.5 text-left hover:bg-slate-100/60"
              >
                <div className="flex items-center gap-2">
                  {showCompleted ? (
                    <ChevronDown className="text-muted-foreground size-4" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-4" />
                  )}
                  <h3 className="text-sm font-semibold text-slate-700">
                    Completed homework
                  </h3>
                  <span className="text-muted-foreground text-[11px] tabular-nums">
                    {totalCompleted}
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px]">
                  {showCompleted ? "Hide" : "Show archive"}
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
                                ? `Done ${formatDate(hw.completedDate)}`
                                : "Done"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            <CheckCircle2 className="size-3" />
                            Completed
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function HomeworkCard({
  homework,
  todayISO,
  onMarkDone,
}: {
  homework: TrainingHomework;
  todayISO: string;
  onMarkDone: () => void;
}) {
  const practiced = hasPracticedToday(homework, todayISO);
  const streak = getPracticeStreakDays(homework, todayISO);
  const lastPracticed = getLastPracticedDate(homework);

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
                title={`Next practice ${formatDate(homework.nextDueDate)}`}
              >
                <CalendarClock className="size-3" />
                Due {relativeDays(homework.nextDueDate, todayISO)}
              </Badge>
            )}
            {streak >= 2 && (
              <Badge
                variant="outline"
                className="gap-1 border-orange-200 bg-orange-50 text-orange-700"
                title="Consecutive days of practice"
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
          <div className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            {lastPracticed ? (
              <>
                <Clock className="size-3" />
                Last practiced {relativeDays(lastPracticed, todayISO)}
              </>
            ) : (
              <>
                <Sparkles className="size-3" />
                Mark today&apos;s practice to start a streak!
              </>
            )}
          </div>
          <Button
            size="sm"
            onClick={onMarkDone}
            disabled={practiced}
            className={cn(
              "h-9 gap-1.5 px-4",
              practiced
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
          >
            <CheckCircle2 className="size-4" />
            {practiced ? "Done for today" : "Mark as Done for today"}
          </Button>
        </div>
      </div>
    </li>
  );
}

function HomeworkMediaGallery({
  media,
  title,
}: {
  media: TrainingHomeworkMedia[];
  title: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {media.map((item, idx) => (
        <figure
          key={`${title}-media-${idx}`}
          className="space-y-1.5"
        >
          {item.type === "video" ? (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
              <iframe
                src={item.url}
                title={item.caption ?? `${title} — demo video`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-100">
              <Image
                src={item.url}
                alt={item.caption ?? `${title} — reference image`}
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
            {item.caption ?? (item.type === "video" ? "Demo video" : "Reference photo")}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
