"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Inbox,
  PawPrint,
  Quote,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User2,
  Users,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  EXERCISE_RATING_LABELS,
  REPORT_CARD_THEME_ACCENT,
  TRAINING_LEVEL_BADGE_CLS,
  TRAINING_LEVEL_LABELS,
  fanOutReportCardUpsert,
} from "@/lib/training-report-cards";
import { clients } from "@/data/clients";
import type {
  TrainingReportCard,
  TrainingReportCardExerciseSummary,
} from "@/lib/training-enrollment";

interface Props {
  customerId: number;
}

/** Map an averaged rating (float, 1-5) onto the canonical owner-facing
 *  label. Rounds to the nearest integer so the report card reads with the
 *  same vocabulary the trainer used in-session. */
function ratingLabelForAvg(avg: number): string {
  const rounded = Math.max(1, Math.min(5, Math.round(avg))) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  return EXERCISE_RATING_LABELS[rounded];
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((today - target) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function CustomerReportCardsTab({ customerId }: Props) {
  const queryClient = useQueryClient();
  // Capture "now" once at mount so the schedule cutoff stays stable while the
  // tab is open (and so React Compiler doesn't flag Date reads inside
  // downstream useMemos as impure).
  const [nowMs] = useState(() => Date.now());
  const todayISO = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  // Pets owned by this customer — used to scope the global report-card list
  // to just this owner's records.
  const customerPetIds = useMemo(() => {
    const customer = clients.find((c) => c.id === customerId);
    return new Set((customer?.pets ?? []).map((p) => p.id));
  }, [customerId]);

  const { data: allReportCards = [] } = useQuery(
    trainingQueries.allReportCards(),
  );

  const cards = useMemo(() => {
    // Hide cards that are still scheduled for a future delivery — the owner
    // shouldn't see them until the schedule fires. Drafts (not sent, not
    // scheduled) are also hidden since they're trainer work-in-progress.
    return allReportCards
      .filter((c) => {
        if (!customerPetIds.has(c.petId)) return false;
        if (c.sentToOwner) return true;
        if (c.scheduledSendAt) {
          // Scheduled cards become visible the moment their send time
          // passes, even before the trainer formally flips `sentToOwner`.
          return new Date(c.scheduledSendAt).getTime() <= nowMs;
        }
        return false;
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [allReportCards, customerPetIds, nowMs]);

  const [openId, setOpenId] = useState<string | null>(() => {
    // Auto-open the most recent unread card so the demo shows the "first
    // open marks viewed" flow without a click.
    const first = cards[0];
    if (first && !first.viewedByOwner) return first.id;
    return null;
  });

  // When the owner opens a card for the first time, record viewedByOwner so
  // the trainer sees engagement. Idempotent — second-time opens are no-ops.
  const markViewed = useCallback(
    (card: TrainingReportCard) => {
      if (card.viewedByOwner) return;
      fanOutReportCardUpsert(queryClient, {
        ...card,
        viewedByOwner: new Date().toISOString(),
      });
    },
    [queryClient],
  );

  const toggle = useCallback(
    (card: TrainingReportCard) => {
      const next = openId === card.id ? null : card.id;
      setOpenId(next);
      if (next === card.id) markViewed(card);
    },
    [openId, markViewed],
  );

  const newCount = useMemo(
    () => cards.filter((c) => !c.viewedByOwner).length,
    [cards],
  );

  // Graduation follow-up tick — once per mount, scan sent graduation cards
  // with a recommended next program. Fire a toast (the demo's "system
  // message") for any whose follow-up window has elapsed without an
  // enrollment, then stamp `graduationFollowUpSentAt` so it only fires
  // once. Real-world this would be a server cron.
  const { data: moduleSettings } = useQuery(trainingQueries.moduleSettings());
  useEffect(() => {
    if (!moduleSettings?.graduationFollowUpEnabled) return;
    const delayMs =
      Math.max(1, moduleSettings.graduationFollowUpDays) * 24 * 60 * 60 * 1000;
    const template =
      moduleSettings.graduationFollowUpTemplate ??
      "{petName} has graduated — have you seen the upcoming {programName} classes?";
    for (const card of cards) {
      if (card.kind !== "series-completion") continue;
      if (!card.sentToOwner || !card.sentAt) continue;
      if (!card.recommendedNextProgram) continue;
      if (card.graduationFollowUpSentAt) continue;
      const elapsed = nowMs - new Date(card.sentAt).getTime();
      if (elapsed < delayMs) continue;
      const message = template
        .replace("{petName}", card.petName)
        .replace("{programName}", card.recommendedNextProgram.packageName);
      toast(message, {
        description: "Tap your Report Cards tab to enroll.",
        duration: 8_000,
      });
      fanOutReportCardUpsert(queryClient, {
        ...card,
        graduationFollowUpSentAt: new Date().toISOString(),
      });
    }
    // We intentionally don't depend on `cards` here — the snapshot at mount
    // time is good enough for the demo, and re-running on each card change
    // would re-fire toasts during rapid edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleSettings?.graduationFollowUpEnabled]);

  if (cards.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        No report cards yet — your instructor will send a progress summary after
        each session.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <FileText className="size-4 text-indigo-500" />
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {cards.length}
            </span>{" "}
            report card{cards.length === 1 ? "" : "s"}
          </span>
          {newCount > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
            >
              <Sparkles className="size-3" />
              {newCount} new
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-[12px]">
          Each card is a progress summary across every session — not a recap of
          just one.
        </p>
      </div>

      <ul className="space-y-3">
        {cards.map((card) => (
          <CustomerCard
            key={card.id}
            card={card}
            todayISO={todayISO}
            isOpen={openId === card.id}
            onToggle={() => toggle(card)}
          />
        ))}
      </ul>
    </div>
  );
}

function CustomerCard({
  card,
  todayISO,
  isOpen,
  onToggle,
}: {
  card: TrainingReportCard;
  todayISO: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isGraduation = card.kind === "series-completion";
  const isNew = !card.viewedByOwner;
  const progressPct = Math.round(
    (card.sessionsAttended / Math.max(1, card.totalSessions)) * 100,
  );
  const headerDateLabel =
    isGraduation && card.seriesStartDate && card.seriesEndDate
      ? `${formatDate(card.seriesStartDate)} → ${formatDate(card.seriesEndDate)}`
      : formatDate(card.date);

  return (
    <li
      className={cn(
        "bg-card overflow-hidden rounded-xl border shadow-sm",
        isGraduation && "ring-2 ring-amber-300",
        isNew && !isGraduation && "ring-2 ring-indigo-200",
      )}
    >
      {/* Theme accent bar — owner-facing seasonal banner. */}
      <div
        className={cn(
          "h-1.5 w-full bg-linear-to-r",
          REPORT_CARD_THEME_ACCENT[card.theme],
        )}
      />
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors",
          isGraduation
            ? "bg-amber-50/60 hover:bg-amber-50"
            : "hover:bg-slate-50",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative shrink-0">
            {card.petImageUrl ? (
              <div className="size-12 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
                <Image
                  src={card.petImageUrl}
                  alt={card.petName}
                  width={48}
                  height={48}
                  className="size-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
                <PawPrint className="size-5" />
              </div>
            )}
            <span
              className={cn(
                "absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full shadow-sm ring-2 ring-white",
                isGraduation
                  ? "bg-amber-500 text-white"
                  : "bg-indigo-500 text-white",
              )}
              title={isGraduation ? "Graduation card" : "Session card"}
            >
              {isGraduation ? (
                <Award className="size-3" />
              ) : (
                <FileText className="size-3" />
              )}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-base font-semibold text-slate-800">
                {isGraduation
                  ? `${card.petName} graduated`
                  : `${card.petName} · Session ${card.throughSessionNumber}`}
              </p>
              {isNew && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 text-[10px]",
                    isGraduation
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-indigo-300 bg-indigo-100 text-indigo-800",
                  )}
                >
                  <Sparkles className="size-3" />
                  New
                </Badge>
              )}
              {isGraduation && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                >
                  <Award className="size-3" />
                  Series complete
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]">
              <BookOpen className="size-3" />
              {card.courseName}
              <span className="text-muted-foreground/50">·</span>
              <span>{card.seriesName}</span>
            </p>
            <p className="text-muted-foreground mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
              <User2 className="size-3" />
              {card.createdBy}
              <span className="text-muted-foreground/50">·</span>
              <CalendarDays className="size-3" />
              <span className="tabular-nums">{headerDateLabel}</span>
              {card.sentAt && !isGraduation && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>Sent {relativeDays(card.sentAt, todayISO)}</span>
                </>
              )}
            </p>
            <div className="mt-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 border text-[11px] font-semibold",
                  TRAINING_LEVEL_BADGE_CLS[card.trainingLevel],
                )}
                title="Your dog's current training level"
              >
                <Award className="size-3" />
                {TRAINING_LEVEL_LABELS[card.trainingLevel]}
              </Badge>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {isOpen ? (
            <ChevronDown className="text-muted-foreground size-5" />
          ) : (
            <ChevronRight className="text-muted-foreground size-5" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t px-4 py-3">
          {/* Your dog's snapshot — the "where is my dog at" moment the level
              badge + assessment pair was designed for. Surfaced first so the
              owner sees it before any session-by-session detail. */}
          <div
            className={cn(
              "rounded-lg border px-3 py-3",
              TRAINING_LEVEL_BADGE_CLS[card.trainingLevel],
            )}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <Award className="size-4" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                Where {card.petName} is right now
              </span>
            </div>
            <p className="text-lg/tight font-bold">
              {TRAINING_LEVEL_LABELS[card.trainingLevel]}
            </p>
            {card.overallAssessment ? (
              <p className="mt-1.5 text-[13px]/relaxed text-slate-700">
                {card.overallAssessment}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1.5 text-[12px] italic">
                Your trainer&apos;s written assessment will appear here.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium tracking-wider uppercase">
                  <TrendingUp className="size-3" />
                  Progress
                </span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {card.sessionsAttended}/{card.totalSessions} sessions ·{" "}
                  {progressPct}%
                </span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            <div className="space-y-1.5">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium tracking-wider uppercase">
                <Users className="size-3" />
                Attendance
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {card.attendanceBreakdown.present > 0 && (
                  <Chip
                    label="Present"
                    count={card.attendanceBreakdown.present}
                    cls="border-emerald-200 bg-emerald-50 text-emerald-700"
                  />
                )}
                {card.attendanceBreakdown.late > 0 && (
                  <Chip
                    label="Late"
                    count={card.attendanceBreakdown.late}
                    cls="border-amber-200 bg-amber-50 text-amber-700"
                  />
                )}
                {card.attendanceBreakdown.absent > 0 && (
                  <Chip
                    label="Missed"
                    count={card.attendanceBreakdown.absent}
                    cls="border-rose-200 bg-rose-50 text-rose-700"
                  />
                )}
              </div>
            </div>
          </div>

          {card.sessionSummary && (
            <div className="rounded-lg border-l-2 border-l-indigo-300 bg-indigo-50/40 px-3 py-2.5">
              <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
                <Quote className="size-3" />
                {isGraduation ? "Series wrap-up" : "What we worked on"}
              </p>
              <p className="text-[13px]/relaxed text-slate-700">
                {card.sessionSummary}
              </p>
            </div>
          )}

          {card.exercisesCovered.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <Star className="size-3" />
                Exercises covered ({card.exercisesCovered.length})
              </p>
              <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 rounded-lg border bg-white px-3 py-2.5 sm:grid-cols-2">
                {card.exercisesCovered.map((ex) => (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between gap-2 text-[12.5px]"
                  >
                    <span className="truncate text-slate-700">
                      {ex.name}
                      <span className="text-muted-foreground"> — </span>
                      <span className="font-medium text-slate-800">
                        {ratingLabelForAvg(ex.avgRating)}
                      </span>
                    </span>
                    <StarRow value={ex.avgRating} count={ex.ratingsCount} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(card.topExercises.length > 0 ||
            card.needsWorkExercises.length > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ExercisePanel
                title="Strongest"
                icon={Star}
                tone="emerald"
                exercises={card.topExercises}
                emptyHint="Not enough ratings yet."
              />
              <ExercisePanel
                title="Keep practicing"
                icon={Target}
                tone="rose"
                exercises={card.needsWorkExercises}
                emptyHint="Nothing flagged — keep building reps."
              />
            </div>
          )}

          {card.assignedHomework.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <BookOpen className="size-3" />
                Homework to work on
              </p>
              <ul className="space-y-1 rounded-lg border bg-white px-3 py-2">
                {card.assignedHomework.map((hw) => (
                  <li
                    key={hw.id}
                    className="flex items-center justify-between gap-2 text-[12.5px]"
                  >
                    <span className="truncate text-slate-700">{hw.title}</span>
                    {hw.frequency && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-violet-200 bg-violet-50 text-[10px] text-violet-700"
                      >
                        <Clock className="size-3" />
                        {hw.frequency}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-[10px]">
                See the Homework tab to mark practice and watch demo videos.
              </p>
            </div>
          )}

          {card.photos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                <Camera className="size-3" />
                Photos from the session
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {card.photos.map((photo, idx) => (
                  <figure key={`${card.id}-photo-${idx}`} className="space-y-1">
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                      <Image
                        src={photo.url}
                        alt={photo.caption ?? `Session photo ${idx + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    {photo.caption && (
                      <figcaption className="text-muted-foreground text-[10px]">
                        {photo.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )}

          {card.progressNarrative && (
            <div className="rounded-lg border bg-slate-50/40 px-3 py-2.5">
              <p className="text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase">
                Progression so far
              </p>
              <p className="text-[13px]/relaxed text-slate-700">
                {card.progressNarrative}
              </p>
            </div>
          )}

          {isGraduation && (
            <div className="space-y-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3 text-center">
                <Award className="mx-auto mb-1 size-6 text-amber-500" />
                <p className="text-sm font-semibold text-amber-800">
                  Congratulations, {card.petName}!
                </p>
                <p className="mt-0.5 text-[12px] text-amber-700">
                  Series complete. We&apos;re so proud of how far you&apos;ve
                  both come.
                </p>
              </div>

              {card.recommendedNextProgram ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                      <GraduationCap className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-200">
                        Next step
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {card.petName} is ready for{" "}
                        {card.recommendedNextProgram.packageName}
                      </p>
                      {card.recommendedNextProgram.description && (
                        <p className="text-muted-foreground mt-0.5 text-[12px]/relaxed">
                          {card.recommendedNextProgram.description}
                        </p>
                      )}
                      <Button
                        asChild
                        size="sm"
                        className="mt-2 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <Link
                          href={`/customer/bookings/new?service=training&program=${encodeURIComponent(
                            card.recommendedNextProgram.packageId,
                          )}&pet=${card.petId}`}
                        >
                          See upcoming classes
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="text-muted-foreground border-t pt-2 text-center text-[11px]">
            <Button variant="ghost" size="sm" onClick={onToggle}>
              Close
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Five-star row for a single exercise's average rating. Mirrors the trainer
 *  side's StarRow so both views read the same. */
function StarRow({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
      <span
        className="inline-flex items-center"
        aria-label={`${value} out of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < full;
          const half = !filled && i === full && hasHalf;
          return (
            <Star
              key={i}
              className={cn(
                "size-3",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : half
                    ? "fill-amber-400/60 text-amber-400"
                    : "text-slate-300",
              )}
            />
          );
        })}
      </span>
      <span className="text-muted-foreground text-[10px]">
        {value.toFixed(1)} · {count}×
      </span>
    </span>
  );
}

function Chip({
  label,
  count,
  cls,
}: {
  label: string;
  count: number;
  cls: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1 border text-[10px]", cls)}>
      <span className="font-semibold tabular-nums">{count}</span>
      {label}
    </Badge>
  );
}

function ExercisePanel({
  title,
  icon: Icon,
  tone,
  exercises,
  emptyHint,
}: {
  title: string;
  icon: typeof Star;
  tone: "emerald" | "rose";
  exercises: TrainingReportCardExerciseSummary[];
  emptyHint: string;
}) {
  const toneCls = tone === "emerald" ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="rounded-lg border bg-white px-3 py-2.5">
      <p
        className={cn(
          "mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase",
          toneCls,
        )}
      >
        <Icon className="size-3" />
        {title}
      </p>
      {exercises.length === 0 ? (
        <p className="text-muted-foreground text-[11px] italic">{emptyHint}</p>
      ) : (
        <ul className="space-y-1">
          {exercises.map((ex) => (
            <li
              key={ex.name}
              className="flex items-center justify-between gap-2 text-[12px] text-slate-700"
            >
              <span className="truncate">
                {ex.name}
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium">
                  {ratingLabelForAvg(ex.avgRating)}
                </span>
              </span>
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 tabular-nums">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {ex.avgRating.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
