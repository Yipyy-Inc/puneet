"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Inbox,
  PawPrint,
  Quote,
  Send,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User2,
  Users,
  X,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import {
  TRAINING_LEVELS,
  TRAINING_LEVEL_BADGE_CLS,
  TRAINING_LEVEL_HELP,
  TRAINING_LEVEL_LABELS,
  REPORT_CARD_THEME_ACCENT,
  REPORT_CARD_THEME_LABELS,
  fanOutReportCardUpsert,
} from "@/lib/training-report-cards";
import type {
  TrainingLevel,
  TrainingReportCard,
  TrainingReportCardExerciseSummary,
} from "@/lib/training-enrollment";
import { ReportCardSendDialog } from "@/components/facility/training/report-card-send-dialog";

interface Props {
  petId: number;
  petName: string;
}

function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

export function TrainingProfileReportCards({ petId, petName }: Props) {
  const queryClient = useQueryClient();
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0]!,
    [],
  );

  const reportCardsQuery = trainingQueries.reportCardsForPet(petId);
  const { data: reportCards = [] } = useQuery(reportCardsQuery);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAssessment, setEditAssessment] = useState("");
  const [editLevel, setEditLevel] = useState<TrainingLevel>("progressing");
  const [sendDialogCard, setSendDialogCard] = useState<TrainingReportCard | null>(
    null,
  );

  const sorted = useMemo(
    () => reportCards.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [reportCards],
  );

  const summary = useMemo(() => {
    let drafts = 0;
    let scheduled = 0;
    let sent = 0;
    let viewed = 0;
    for (const r of reportCards) {
      if (r.sentToOwner) {
        sent++;
        if (r.viewedByOwner) viewed++;
      } else if (r.scheduledSendAt) {
        scheduled++;
      } else {
        drafts++;
      }
    }
    return { drafts, scheduled, sent, viewed };
  }, [reportCards]);

  function startEdit(card: TrainingReportCard) {
    setEditingId(card.id);
    setEditAssessment(card.overallAssessment);
    setEditLevel(card.trainingLevel);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAssessment("");
  }

  function saveAssessment(card: TrainingReportCard) {
    fanOutReportCardUpsert(queryClient, {
      ...card,
      overallAssessment: editAssessment,
      trainingLevel: editLevel,
    });
    toast.success("Overall assessment updated.");
    setEditingId(null);
    setEditAssessment("");
  }

  function openSendDialog(card: TrainingReportCard) {
    setSendDialogCard(card);
  }

  function cancelSchedule(card: TrainingReportCard) {
    fanOutReportCardUpsert(queryClient, {
      ...card,
      scheduledSendAt: null,
    });
    toast.success("Scheduled send cancelled — card is back to draft.");
  }

  if (reportCards.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
        <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
        No report cards yet — one is drafted automatically after every session
        {petName} attends, plus a graduation card when a series finishes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <div className="flex items-center gap-3 text-slate-700">
          <FileText className="text-muted-foreground size-4" />
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {reportCards.length}
            </span>{" "}
            report card{reportCards.length === 1 ? "" : "s"}
          </span>
          {summary.drafts > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
            >
              <Clock className="size-3" />
              {summary.drafts} draft{summary.drafts === 1 ? "" : "s"}
            </Badge>
          )}
          {summary.scheduled > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-purple-200 bg-purple-50 text-[10px] text-purple-700"
            >
              <CalendarClock className="size-3" />
              {summary.scheduled} scheduled
            </Badge>
          )}
          {summary.sent > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-sky-200 bg-sky-50 text-[10px] text-sky-700"
            >
              <Send className="size-3" />
              {summary.sent} sent
            </Badge>
          )}
          {summary.viewed > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            >
              <Eye className="size-3" />
              {summary.viewed} viewed
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <Sparkles className="size-3" />
          Cumulative progress — not single-session recaps.
        </p>
      </div>

      <ul className="space-y-3">
        {sorted.map((card) => (
          <ReportCardPanel
            key={card.id}
            card={card}
            todayISO={todayISO}
            isEditing={editingId === card.id}
            editAssessment={editAssessment}
            onEditAssessmentChange={setEditAssessment}
            editLevel={editLevel}
            onEditLevelChange={setEditLevel}
            onStartEdit={() => startEdit(card)}
            onCancelEdit={cancelEdit}
            onSaveAssessment={() => saveAssessment(card)}
            onOpenSend={() => openSendDialog(card)}
            onCancelSchedule={() => cancelSchedule(card)}
          />
        ))}
      </ul>

      <ReportCardSendDialog
        open={!!sendDialogCard}
        onOpenChange={(o) => {
          if (!o) setSendDialogCard(null);
        }}
        card={sendDialogCard}
        todayISO={todayISO}
      />
    </div>
  );
}

function ReportCardPanel({
  card,
  todayISO,
  isEditing,
  editAssessment,
  onEditAssessmentChange,
  editLevel,
  onEditLevelChange,
  onStartEdit,
  onCancelEdit,
  onSaveAssessment,
  onOpenSend,
  onCancelSchedule,
}: {
  card: TrainingReportCard;
  todayISO: string;
  isEditing: boolean;
  editAssessment: string;
  onEditAssessmentChange: (value: string) => void;
  editLevel: TrainingLevel;
  onEditLevelChange: (value: TrainingLevel) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveAssessment: () => void;
  onOpenSend: () => void;
  onCancelSchedule: () => void;
}) {
  const isGraduation = card.kind === "series-completion";
  const isScheduled = !card.sentToOwner && !!card.scheduledSendAt;
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
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        isGraduation && "ring-2 ring-amber-200",
      )}
    >
      {/* Theme accent bar — visible at-a-glance signal of the seasonal theme.
          The customer-portal card uses the same gradient so trainers see
          exactly what the owner will. */}
      <div
        className={cn(
          "h-1.5 w-full bg-linear-to-r",
          REPORT_CARD_THEME_ACCENT[card.theme],
        )}
        title={`Theme: ${REPORT_CARD_THEME_LABELS[card.theme]}`}
      />

      {/* Header ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 rounded-t-xl border-b px-4 py-3",
          isGraduation ? "bg-amber-50/60" : "bg-slate-50/60",
        )}
      >
        <div className="flex items-start gap-3">
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
                "absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full ring-2 ring-white shadow-sm",
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
            <p className="text-base font-semibold text-slate-800">
              {isGraduation
                ? `${card.petName} graduated — ${card.courseName}`
                : `${card.petName} · Progress through Session ${card.throughSessionNumber}`}
            </p>
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
              <span className="tabular-nums">{headerDateLabel}</span>
              {!isGraduation && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{relativeDays(card.date, todayISO)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isGraduation && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-100 text-[10px] text-amber-800"
            >
              <Award className="size-3" />
              Series complete
            </Badge>
          )}
          {isScheduled ? (
            <Badge
              variant="outline"
              className="gap-1 border-purple-200 bg-purple-50 text-[10px] text-purple-700"
              title={`Scheduled for ${formatDateTime(card.scheduledSendAt!)}`}
            >
              <CalendarClock className="size-3" />
              Scheduled · {formatDateTime(card.scheduledSendAt!)}
            </Badge>
          ) : !card.sentToOwner ? (
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
            >
              <Clock className="size-3" />
              Draft
            </Badge>
          ) : (
            <>
              <Badge
                variant="outline"
                className="gap-1 border-sky-200 bg-sky-50 text-[10px] text-sky-700"
                title={card.sentAt ? `Sent ${formatDateTime(card.sentAt)}` : undefined}
              >
                <Send className="size-3" />
                Sent
              </Badge>
              {card.viewedByOwner ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  title={`Viewed ${formatDateTime(card.viewedByOwner)}`}
                >
                  <Eye className="size-3" />
                  Viewed
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-slate-200 bg-slate-50 text-[10px] text-slate-500"
                  title="Owner has not opened the report card yet"
                >
                  <Eye className="size-3" />
                  Not viewed
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 px-4 py-3">
        {/* Progress + attendance ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider">
                <TrendingUp className="size-3" />
                Progress
              </span>
              <span className="font-semibold tabular-nums text-slate-800">
                {card.sessionsAttended}/{card.totalSessions} sessions ·{" "}
                {progressPct}%
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
          <div className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider">
              <Users className="size-3" />
              Attendance
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {card.attendanceBreakdown.present > 0 && (
                <AttendanceChip
                  label="Present"
                  count={card.attendanceBreakdown.present}
                  cls="border-emerald-200 bg-emerald-50 text-emerald-700"
                />
              )}
              {card.attendanceBreakdown.late > 0 && (
                <AttendanceChip
                  label="Late"
                  count={card.attendanceBreakdown.late}
                  cls="border-amber-200 bg-amber-50 text-amber-700"
                />
              )}
              {card.attendanceBreakdown.absent > 0 && (
                <AttendanceChip
                  label="Absent"
                  count={card.attendanceBreakdown.absent}
                  cls="border-rose-200 bg-rose-50 text-rose-700"
                />
              )}
              {card.attendanceBreakdown.excused > 0 && (
                <AttendanceChip
                  label="Excused"
                  count={card.attendanceBreakdown.excused}
                  cls="border-slate-200 bg-slate-50 text-slate-600"
                />
              )}
            </div>
          </div>
        </div>

        {/* Session summary — verbatim from the completion log ─────────── */}
        {card.sessionSummary && (
          <div className="rounded-lg border-l-2 border-l-indigo-300 bg-indigo-50/40 px-3 py-2.5">
            <p className="text-indigo-700 mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Quote className="size-3" />
              {isGraduation ? "Series wrap-up" : "Session summary"}
            </p>
            <p className="text-[13px]/relaxed text-slate-700">
              {card.sessionSummary}
            </p>
          </div>
        )}

        {/* Exercises covered — full list with star icons ──────────────── */}
        {card.exercisesCovered.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Star className="size-3" />
              Exercises covered ({card.exercisesCovered.length})
            </p>
            <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 rounded-lg border bg-white px-3 py-2.5 sm:grid-cols-2">
              {card.exercisesCovered.map((ex) => (
                <div
                  key={ex.name}
                  className="flex items-center justify-between gap-2 text-[12.5px]"
                >
                  <span className="truncate text-slate-700">{ex.name}</span>
                  <StarRow value={ex.avgRating} count={ex.ratingsCount} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercises — top vs needs work derived view ─────────────────── */}
        {(card.topExercises.length > 0 || card.needsWorkExercises.length > 0) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ExercisePanel
              title="Strongest"
              icon={Star}
              tone="emerald"
              exercises={card.topExercises}
              emptyHint="Not enough ratings yet."
            />
            <ExercisePanel
              title="Needs work"
              icon={Target}
              tone="rose"
              exercises={card.needsWorkExercises}
              emptyHint="Nothing flagged yet — keep building reps."
            />
          </div>
        )}

        {/* Assigned homework ──────────────────────────────────────────── */}
        {card.assignedHomework.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <BookOpen className="size-3" />
              Assigned homework
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
          </div>
        )}

        {/* Session photos ─────────────────────────────────────────────── */}
        {card.photos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Camera className="size-3" />
              Photos ({card.photos.length})
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {card.photos.map((photo, idx) => (
                <figure
                  key={`${card.id}-photo-${idx}`}
                  className="space-y-1"
                >
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

        {/* Progress narrative — auto-drafted arc ──────────────────────── */}
        {card.progressNarrative && (
          <div className="rounded-lg border bg-slate-50/40 px-3 py-2.5">
            <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase tracking-wider">
              Progression arc
            </p>
            <p className="text-[13px]/relaxed text-slate-700">
              {card.progressNarrative}
            </p>
          </div>
        )}

        {/* Overall assessment + Training Level ────────────────────────── */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <Award className="size-3" />
            Overall assessment
          </p>
          {isEditing ? (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Training level
                </p>
                <div className="flex flex-wrap gap-1">
                  {TRAINING_LEVELS.map((level) => {
                    const active = editLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onEditLevelChange(level)}
                        data-active={active || undefined}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors",
                          "hover:bg-slate-100",
                          "data-active:border-slate-900 data-active:bg-slate-900 data-active:text-white",
                        )}
                        title={TRAINING_LEVEL_HELP[level]}
                      >
                        <Award className="size-3" />
                        {TRAINING_LEVEL_LABELS[level]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-muted-foreground text-[10.5px]">
                  {TRAINING_LEVEL_HELP[editLevel]}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Assessment (1-2 sentences)
                </p>
                <Textarea
                  rows={3}
                  value={editAssessment}
                  onChange={(e) => onEditAssessmentChange(e.target.value)}
                  placeholder="A clear snapshot of where the dog is — what they're nailing and what's next."
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={onSaveAssessment}>
                  Save assessment
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 border text-[11px] font-semibold",
                  TRAINING_LEVEL_BADGE_CLS[card.trainingLevel],
                )}
                title={TRAINING_LEVEL_HELP[card.trainingLevel]}
              >
                <Award className="size-3" />
                {TRAINING_LEVEL_LABELS[card.trainingLevel]}
              </Badge>
              {card.overallAssessment ? (
                <p className="text-[13px]/relaxed text-slate-700">
                  {card.overallAssessment}
                </p>
              ) : (
                <p className="text-muted-foreground text-[12px] italic">
                  No assessment yet — add the trainer&apos;s 1-2 sentence take
                  before sending.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-slate-50/40 px-4 py-2">
        <p className="text-muted-foreground text-[11px]">
          {card.kind === "series-completion"
            ? "Graduation report — a milestone summary the owner can keep."
            : "Auto-drafted after this session."}{" "}
          <span className="text-muted-foreground/70">
            By {card.createdBy} · {formatDate(card.createdAt)}
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-[11px]"
              onClick={onStartEdit}
            >
              <Edit className="size-3" />
              {card.overallAssessment ? "Edit assessment" : "Add assessment"}
            </Button>
          )}
          {isScheduled ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={onCancelSchedule}
              >
                <X className="size-3" />
                Cancel schedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={onOpenSend}
                title="Reschedule or send now"
              >
                <CalendarClock className="size-3" />
                Reschedule
              </Button>
            </>
          ) : !card.sentToOwner ? (
            <Button
              size="sm"
              className="h-7 gap-1 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
              onClick={onOpenSend}
            >
              <Send className="size-3" />
              Send / Schedule
            </Button>
          ) : (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="size-3 text-emerald-500" />
              Delivered{" "}
              {card.sentAt ? `· ${relativeDays(card.sentAt, todayISO)}` : ""}
              <ChevronRight className="size-3" />
              {card.viewedByOwner
                ? "Owner has read it"
                : "Awaiting owner read"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/** Five-star row for a single exercise's average rating. Renders a full star
 *  for each whole point and a half-filled star for the .5 remainder so a 3.5
 *  reads "★★★½☆☆" at a glance. */
function StarRow({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
      <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
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

function AttendanceChip({
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
          "mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
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
              <span className="truncate">{ex.name}</span>
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 tabular-nums">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {ex.avgRating.toFixed(1)}
                <span className="text-muted-foreground/60 text-[10px]">
                  · {ex.ratingsCount}×
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
