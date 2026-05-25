"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  Inbox,
  PawPrint,
  PartyPopper,
  Search,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import {
  BEHAVIOR_TAG_BADGE_CLS,
  BEHAVIOR_TAG_LABELS,
  EXERCISE_RATING_BADGE_CLS,
  EXERCISE_RATING_LABELS,
  TRAINING_LEVELS,
  TRAINING_LEVEL_BADGE_CLS,
  TRAINING_LEVEL_HELP,
  TRAINING_LEVEL_LABELS,
  TRAINING_REPORT_CARD_BEHAVIOR_TAGS,
  REPORT_CARD_THEME_ACCENT,
  REPORT_CARD_THEME_LABELS,
  fanOutReportCardUpsert,
} from "@/lib/training-report-cards";
import type {
  TrainingLevel,
  TrainingReportCard,
  TrainingReportCardBehaviorTag,
} from "@/lib/training-enrollment";
import type { ReportCardTheme } from "@/types/pet";
import { Switch } from "@/components/ui/switch";
import { ReportCardSendDialog } from "@/components/facility/training/report-card-send-dialog";

type StatusFilter = "all" | "draft" | "scheduled" | "sent";

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

/** Resolve the lifecycle bucket for a report card — drives the status
 *  badge, list filters, and the editor's footer affordances. */
function resolveStatus(card: TrainingReportCard): {
  bucket: "draft" | "scheduled" | "sent" | "viewed";
  label: string;
  cls: string;
} {
  if (card.viewedByOwner) {
    return {
      bucket: "viewed",
      label: "Viewed",
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (card.sentToOwner) {
    return {
      bucket: "sent",
      label: "Sent",
      cls: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }
  if (card.scheduledSendAt) {
    return {
      bucket: "scheduled",
      label: "Scheduled",
      cls: "border-purple-200 bg-purple-50 text-purple-700",
    };
  }
  return {
    bucket: "draft",
    label: "Draft",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

export function FacilityTrainingReportCards() {
  const queryClient = useQueryClient();
  const { data: cards = [] } = useQuery(trainingQueries.allReportCards());

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [editingCard, setEditingCard] = useState<TrainingReportCard | null>(
    null,
  );
  const [sendDialogCard, setSendDialogCard] = useState<TrainingReportCard | null>(
    null,
  );

  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0]!,
    [],
  );

  // Counts by bucket — feeds the filter pills.
  const counts = useMemo(() => {
    let draft = 0;
    let scheduled = 0;
    let sent = 0;
    for (const c of cards) {
      const status = resolveStatus(c).bucket;
      if (status === "draft") draft++;
      else if (status === "scheduled") scheduled++;
      else sent++;
    }
    return { all: cards.length, draft, scheduled, sent };
  }, [cards]);

  // Filtered + sorted list — newest cards (drafts first within "all") on top.
  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = cards.filter((c) => {
      const status = resolveStatus(c).bucket;
      if (statusFilter === "draft" && status !== "draft") return false;
      if (statusFilter === "scheduled" && status !== "scheduled") return false;
      if (statusFilter === "sent" && status !== "sent" && status !== "viewed")
        return false;
      if (q) {
        const hay =
          `${c.petName} ${c.courseName} ${c.seriesName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    filtered.sort((a, b) => {
      // Drafts first; within same bucket, newest createdAt first.
      const aStatus = resolveStatus(a).bucket;
      const bStatus = resolveStatus(b).bucket;
      if (aStatus !== bStatus) {
        const rank: Record<typeof aStatus, number> = {
          draft: 0,
          scheduled: 1,
          sent: 2,
          viewed: 3,
        };
        return rank[aStatus] - rank[bStatus];
      }
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    return filtered;
  }, [cards, statusFilter, search]);

  function refreshEditingCard(updated: TrainingReportCard) {
    // Mirror local editor state to the upserted card so the open sheet keeps
    // reflecting the latest persisted version after Save / Send.
    setEditingCard(updated);
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header strip ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Training report cards
          </h1>
          <p className="text-muted-foreground text-sm">
            Drafts auto-generate after each session. Edit them here, then send
            or schedule delivery to owners.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by pet, course, or series…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter pills ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterPill
          label="All"
          count={counts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <FilterPill
          label="Drafts"
          count={counts.draft}
          tone="amber"
          active={statusFilter === "draft"}
          onClick={() => setStatusFilter("draft")}
        />
        <FilterPill
          label="Scheduled"
          count={counts.scheduled}
          tone="purple"
          active={statusFilter === "scheduled"}
          onClick={() => setStatusFilter("scheduled")}
        />
        <FilterPill
          label="Sent"
          count={counts.sent}
          tone="sky"
          active={statusFilter === "sent"}
          onClick={() => setStatusFilter("sent")}
        />
      </div>

      {/* Cards list ───────────────────────────────────────────────────────── */}
      {visibleCards.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          {cards.length === 0
            ? "No report cards yet — one is auto-drafted after every completed session."
            : "No report cards match the current filters."}
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleCards.map((card) => (
            <ReportCardRow
              key={card.id}
              card={card}
              onOpen={() => setEditingCard(card)}
            />
          ))}
        </ul>
      )}

      {/* Editor sheet ─────────────────────────────────────────────────────── */}
      <ReportCardEditorSheet
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onPersist={refreshEditingCard}
        onOpenSend={(c) => setSendDialogCard(c)}
        queryClient={queryClient}
      />

      {/* Existing Send / Schedule dialog */}
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

function FilterPill({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: "amber" | "purple" | "sky";
  onClick: () => void;
}) {
  const activeTone =
    tone === "amber"
      ? "border-amber-300 bg-amber-100 text-amber-800"
      : tone === "purple"
        ? "border-purple-300 bg-purple-100 text-purple-800"
        : tone === "sky"
          ? "border-sky-300 bg-sky-100 text-sky-800"
          : "border-slate-400 bg-slate-100 text-slate-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors",
        active
          ? activeTone
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {label}
      <span className="text-muted-foreground tabular-nums text-[11px]">
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// Photo section — hero pick + optional before/after
// ============================================================================

function ReportCardPhotoSection({
  photos,
  heroPhotoUrl,
  beforePhotoUrl,
  afterPhotoUrl,
  onTogglePhotoSlot,
}: {
  photos: TrainingReportCard["photos"];
  heroPhotoUrl?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  onTogglePhotoSlot: (
    slot: "hero" | "before" | "after",
    url: string,
  ) => void;
}) {
  const beforeAfterReady = !!(beforePhotoUrl && afterPhotoUrl);
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-bold uppercase tracking-wider">
        Photos
      </Label>
      <p className="text-muted-foreground text-[11px]">
        {photos.length} captured during the session. Tap a photo to mark it as
        the hero or part of a before/after pair.
      </p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, idx) => {
          const isHero = photo.url === heroPhotoUrl;
          const isBefore = photo.url === beforePhotoUrl;
          const isAfter = photo.url === afterPhotoUrl;
          return (
            <li
              key={`${photo.url}-${idx}`}
              className={cn(
                "bg-card relative overflow-hidden rounded-lg border shadow-sm",
                isHero && "ring-2 ring-indigo-400",
                isBefore && "ring-2 ring-sky-400",
                isAfter && "ring-2 ring-emerald-400",
              )}
            >
              <div className="relative aspect-square w-full bg-slate-100">
                <Image
                  src={photo.url}
                  alt={photo.caption ?? `Session photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
                {(isHero || isBefore || isAfter) && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">
                    {isHero
                      ? "Hero"
                      : isBefore
                        ? "Before"
                        : "After"}
                  </span>
                )}
              </div>
              {photo.caption && (
                <p
                  className="text-muted-foreground border-t px-2 py-1 text-[10.5px]"
                  title={photo.caption}
                >
                  <span className="line-clamp-1">{photo.caption}</span>
                </p>
              )}
              <div className="grid grid-cols-3 gap-px border-t bg-slate-200">
                <button
                  type="button"
                  onClick={() => onTogglePhotoSlot("hero", photo.url)}
                  className={cn(
                    "py-1 text-[10px] font-medium transition-colors",
                    isHero
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-white hover:bg-indigo-50 text-slate-600",
                  )}
                  title="Use as the hero image"
                >
                  Hero
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePhotoSlot("before", photo.url)}
                  className={cn(
                    "py-1 text-[10px] font-medium transition-colors",
                    isBefore
                      ? "bg-sky-100 text-sky-700"
                      : "bg-white hover:bg-sky-50 text-slate-600",
                  )}
                >
                  Before
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePhotoSlot("after", photo.url)}
                  className={cn(
                    "py-1 text-[10px] font-medium transition-colors",
                    isAfter
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white hover:bg-emerald-50 text-slate-600",
                  )}
                >
                  After
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {beforeAfterReady && (
        <p className="text-emerald-700 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <ImageIcon className="size-3" />
          Before/after layout will render side-by-side on the card.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Graduation card extras — exercise progression + next-program pitch
// ============================================================================

function GraduationProgressionSection({
  card,
}: {
  card: TrainingReportCard;
}) {
  const progression = card.exerciseProgression ?? [];
  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-center gap-2">
        <div className="bg-amber-500 text-white flex size-8 items-center justify-center rounded-xl shadow-sm">
          <PartyPopper className="size-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
            Graduation card
          </p>
          <p className="text-amber-800/80 dark:text-amber-200/80 text-[11px]">
            Congratulations message + journey summary the owner will see.
          </p>
        </div>
      </div>

      {progression.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-amber-900 dark:text-amber-100 text-[10px] font-bold uppercase tracking-wider">
            Start → final per exercise
          </p>
          <ul className="space-y-1.5">
            {progression.map((row) => {
              const delta = row.endRating - row.startRating;
              return (
                <li
                  key={row.name}
                  className="bg-card flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
                    {row.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-[10px]",
                      EXERCISE_RATING_BADGE_CLS[row.startRating],
                    )}
                    title={`Started at ${EXERCISE_RATING_LABELS[row.startRating]}`}
                  >
                    {row.startRating} ·{" "}
                    {EXERCISE_RATING_LABELS[row.startRating]}
                  </Badge>
                  <ArrowRight className="text-muted-foreground size-3" />
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-[10px]",
                      EXERCISE_RATING_BADGE_CLS[row.endRating],
                    )}
                    title={`Finished at ${EXERCISE_RATING_LABELS[row.endRating]}`}
                  >
                    {row.endRating} · {EXERCISE_RATING_LABELS[row.endRating]}
                  </Badge>
                  {delta > 0 && (
                    <span className="text-emerald-700 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold">
                      <TrendingUp className="size-3" />+{delta}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed py-3 text-center text-[11px]">
          No rated exercises across the series — nothing to surface in the
          journey block.
        </p>
      )}

      {card.recommendedNextProgram ? (
        <div className="rounded-lg border border-indigo-200 bg-white p-2.5 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/60">
          <p className="text-indigo-700 dark:text-indigo-200 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <Award className="size-3" />
            Graduate into
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {card.recommendedNextProgram.packageName}
          </p>
          {card.recommendedNextProgram.description && (
            <p className="text-muted-foreground mt-0.5 text-[12px]/relaxed">
              {card.recommendedNextProgram.description}
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-[11px]">
          No "Graduate into" course configured for {card.courseName}. Owners
          won't see a next-step recommendation on this card. Set one up via
          Settings → Programs.
        </p>
      )}
    </div>
  );
}

function ReportCardRow({
  card,
  onOpen,
}: {
  card: TrainingReportCard;
  onOpen: () => void;
}) {
  const status = resolveStatus(card);
  const isGraduation = card.kind === "series-completion";
  const headerDateLabel =
    isGraduation && card.seriesStartDate && card.seriesEndDate
      ? `${formatDate(card.seriesStartDate)} → ${formatDate(card.seriesEndDate)}`
      : formatDate(card.date);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="bg-card w-full overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className={cn(
            "h-1 w-full bg-linear-to-r",
            REPORT_CARD_THEME_ACCENT[card.theme],
          )}
        />
        <div className="flex items-start gap-3 px-4 py-3 text-left">
          <div className="relative shrink-0">
            {card.petImageUrl ? (
              <div className="size-11 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
                <Image
                  src={card.petImageUrl}
                  alt={card.petName}
                  width={44}
                  height={44}
                  className="size-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
                <PawPrint className="size-5" />
              </div>
            )}
            <span
              className={cn(
                "absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-white",
                isGraduation ? "bg-amber-500" : "bg-indigo-500",
              )}
            >
              {isGraduation ? (
                <Award className="size-3" />
              ) : (
                <FileText className="size-3" />
              )}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <p className="truncate text-sm font-semibold text-slate-800">
                {card.petName}
              </p>
              <span className="text-muted-foreground text-[12px]">
                {isGraduation ? "Graduation card" : `Session ${card.throughSessionNumber}`}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-[12px]">
              {card.seriesName} · {card.courseName}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("gap-1 text-[10px]", status.cls)}
              >
                {status.bucket === "draft" && <FileText className="size-3" />}
                {status.bucket === "scheduled" && (
                  <CalendarClock className="size-3" />
                )}
                {status.bucket === "sent" && <Send className="size-3" />}
                {status.bucket === "viewed" && <Eye className="size-3" />}
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[10px]",
                  TRAINING_LEVEL_BADGE_CLS[card.trainingLevel],
                )}
              >
                {TRAINING_LEVEL_LABELS[card.trainingLevel]}
              </Badge>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                <CalendarDays className="size-3" />
                {headerDateLabel}
              </span>
              {card.scheduledSendAt && status.bucket === "scheduled" && (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <CalendarClock className="size-3" />
                  Sends {formatDateTime(card.scheduledSendAt)}
                </span>
              )}
              {card.sentAt && (
                <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                  <Send className="size-3" />
                  Sent {formatDateTime(card.sentAt)}
                </span>
              )}
            </div>
          </div>
          <ArrowUpRight className="text-muted-foreground size-4 shrink-0" />
        </div>
      </button>
    </li>
  );
}

function ReportCardEditorSheet({
  card,
  onClose,
  onPersist,
  onOpenSend,
  queryClient,
}: {
  card: TrainingReportCard | null;
  onClose: () => void;
  onPersist: (next: TrainingReportCard) => void;
  onOpenSend: (card: TrainingReportCard) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  // Local drafts so the editor doesn't fire writes on every keystroke. Reset
  // whenever the active card flips (close + reopen on a different draft).
  const [overallAssessment, setOverallAssessment] = useState(
    card?.overallAssessment ?? "",
  );
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>(
    card?.trainingLevel ?? "progressing",
  );
  const [progressNarrative, setProgressNarrative] = useState(
    card?.progressNarrative ?? "",
  );
  const [sessionSummary, setSessionSummary] = useState(
    card?.sessionSummary ?? "",
  );
  const [theme, setTheme] = useState<ReportCardTheme>(card?.theme ?? "everyday");
  const [personalizedMessage, setPersonalizedMessage] = useState(
    card?.personalizedMessage ?? "",
  );
  const [behaviorTags, setBehaviorTags] = useState<TrainingReportCardBehaviorTag[]>(
    card?.behaviorTags ?? [],
  );
  const [ratingOverrides, setRatingOverrides] = useState<
    Record<string, 1 | 2 | 3 | 4 | 5>
  >(card?.exerciseRatingOverrides ?? {});
  const [heroPhotoUrl, setHeroPhotoUrl] = useState<string | undefined>(
    card?.heroPhotoUrl,
  );
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | undefined>(
    card?.beforeAfterPhotoUrls?.before,
  );
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | undefined>(
    card?.beforeAfterPhotoUrls?.after,
  );
  // Default the Send-to-owner toggle to the card's current sent state so an
  // already-sent card opens with the switch on (and a Re-send action), and
  // a fresh draft opens with it off (internal-only by default).
  const [sendToOwner, setSendToOwner] = useState<boolean>(
    card?.sentToOwner ?? false,
  );

  // Re-seed the local drafts every time a new card slides in.
  const currentId = card?.id ?? null;
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  if (currentId !== hydratedFor && card) {
    setHydratedFor(currentId);
    setOverallAssessment(card.overallAssessment);
    setTrainingLevel(card.trainingLevel);
    setProgressNarrative(card.progressNarrative);
    setSessionSummary(card.sessionSummary);
    setTheme(card.theme);
    setPersonalizedMessage(card.personalizedMessage ?? "");
    setBehaviorTags(card.behaviorTags ?? []);
    setRatingOverrides(card.exerciseRatingOverrides ?? {});
    setHeroPhotoUrl(card.heroPhotoUrl);
    setBeforePhotoUrl(card.beforeAfterPhotoUrls?.before);
    setAfterPhotoUrl(card.beforeAfterPhotoUrls?.after);
    setSendToOwner(card.sentToOwner);
  }

  if (!card) return null;
  const status = resolveStatus(card);
  const overridesChanged =
    JSON.stringify(ratingOverrides) !==
    JSON.stringify(card.exerciseRatingOverrides ?? {});
  const tagsChanged =
    JSON.stringify(behaviorTags.slice().sort()) !==
    JSON.stringify((card.behaviorTags ?? []).slice().sort());
  const beforeAfterPair =
    beforePhotoUrl && afterPhotoUrl
      ? { before: beforePhotoUrl, after: afterPhotoUrl }
      : undefined;
  const beforeAfterChanged =
    JSON.stringify(beforeAfterPair) !==
    JSON.stringify(card.beforeAfterPhotoUrls);
  const dirty =
    overallAssessment !== card.overallAssessment ||
    trainingLevel !== card.trainingLevel ||
    progressNarrative !== card.progressNarrative ||
    sessionSummary !== card.sessionSummary ||
    theme !== card.theme ||
    personalizedMessage !== (card.personalizedMessage ?? "") ||
    tagsChanged ||
    overridesChanged ||
    heroPhotoUrl !== card.heroPhotoUrl ||
    beforeAfterChanged;

  function buildUpdated(): TrainingReportCard {
    return {
      ...card!,
      overallAssessment,
      trainingLevel,
      progressNarrative,
      sessionSummary,
      theme,
      personalizedMessage: personalizedMessage.trim() || undefined,
      behaviorTags: behaviorTags.length > 0 ? behaviorTags : undefined,
      exerciseRatingOverrides:
        Object.keys(ratingOverrides).length > 0 ? ratingOverrides : undefined,
      heroPhotoUrl,
      beforeAfterPhotoUrls: beforeAfterPair,
    };
  }

  function handleSave() {
    if (!card) return;
    const updated = buildUpdated();
    fanOutReportCardUpsert(queryClient, updated);
    onPersist(updated);
    toast.success("Report card saved.");
  }

  /** Primary footer action — saves all in-flight edits, and respects the
   *  Send-to-owner toggle: ON delivers the card immediately, OFF saves as
   *  an internal record only. */
  function handlePrimary() {
    if (!card) return;
    const nowISO = new Date().toISOString();
    const updated: TrainingReportCard = sendToOwner
      ? {
          ...buildUpdated(),
          sentToOwner: true,
          sentAt: card.sentAt ?? nowISO,
          scheduledSendAt: null,
        }
      : {
          ...buildUpdated(),
          sentToOwner: false,
          sentAt: null,
        };
    fanOutReportCardUpsert(queryClient, updated);
    onPersist(updated);
    if (sendToOwner) {
      toast.success(
        card.sentToOwner
          ? `Report card re-sent to ${card.petName}'s owner.`
          : `Report card sent to ${card.petName}'s owner.`,
        {
          description: "Email + portal notification dispatched.",
        },
      );
    } else {
      toast(`Report card saved as internal record only.`);
    }
  }

  function handleOpenSchedule() {
    if (!card) return;
    if (dirty) handleSave();
    onOpenSend(buildUpdated());
  }

  function toggleBehaviorTag(tag: TrainingReportCardBehaviorTag) {
    setBehaviorTags((curr) =>
      curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag],
    );
  }

  function adjustRating(exerciseName: string, next: 1 | 2 | 3 | 4 | 5) {
    setRatingOverrides((prev) => ({ ...prev, [exerciseName]: next }));
  }

  function clearOverride(exerciseName: string) {
    setRatingOverrides((prev) => {
      const { [exerciseName]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
  }

  function togglePhotoSlot(
    slot: "hero" | "before" | "after",
    url: string,
  ) {
    if (slot === "hero") {
      setHeroPhotoUrl((curr) => (curr === url ? undefined : url));
      return;
    }
    if (slot === "before") {
      setBeforePhotoUrl((curr) => (curr === url ? undefined : url));
      return;
    }
    setAfterPhotoUrl((curr) => (curr === url ? undefined : url));
  }

  return (
    <Sheet open={!!card} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader className="space-y-2 border-b pb-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {card.petImageUrl ? (
                <div className="size-11 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
                  <Image
                    src={card.petImageUrl}
                    alt={card.petName}
                    width={44}
                    height={44}
                    className="size-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
                  <PawPrint className="size-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <SheetTitle className="text-base">
                {card.petName} ·{" "}
                {card.kind === "series-completion"
                  ? "Graduation card"
                  : `Session ${card.throughSessionNumber}`}
              </SheetTitle>
              <SheetDescription className="text-[12px]">
                {card.seriesName}{" "}
                <span className="text-muted-foreground">· {card.courseName}</span>
              </SheetDescription>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px]">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {card.kind === "series-completion" &&
                  card.seriesStartDate &&
                  card.seriesEndDate
                    ? `${formatDate(card.seriesStartDate)} → ${formatDate(card.seriesEndDate)}`
                    : formatDate(card.date)}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1">
                  <User2 className="size-3" />
                  Trainer: {card.createdBy}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("gap-1 text-[10px]", status.cls)}
                >
                  {status.label}
                </Badge>
                <Link
                  href={`/facility/dashboard/services/training/students/${card.petId}?tab=report-cards`}
                  className="text-muted-foreground inline-flex items-center gap-0.5 text-[11px] hover:underline"
                  onClick={onClose}
                >
                  Open in student profile
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 py-4">
          {/* Overall assessment ────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rc-overall"
              className="text-[12px] font-bold uppercase tracking-wider"
            >
              Overall assessment
            </Label>
            <p className="text-muted-foreground text-[11px]">
              Your 1–2 sentence take on how {card.petName} is doing — the
              owner sees this on top of the card.
            </p>
            <Textarea
              id="rc-overall"
              value={overallAssessment}
              onChange={(e) => setOverallAssessment(e.target.value)}
              placeholder={`E.g. "${card.petName} nailed loose-leash walking this week. We'll layer in distractions next session."`}
              className="min-h-[80px] text-[13px] leading-relaxed"
            />
          </div>

          {/* Personalized message — warmer parent-facing addition ────── */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rc-personalized"
              className="text-[12px] font-bold uppercase tracking-wider"
            >
              Personalized message{" "}
              <span className="text-muted-foreground font-normal normal-case tracking-normal">
                (optional)
              </span>
            </Label>
            <p className="text-muted-foreground text-[11px]">
              A warmer, parent-friendly note — totally voluntary. Use this to
              add a personal touch above the analytics.
            </p>
            <Textarea
              id="rc-personalized"
              value={personalizedMessage}
              onChange={(e) => setPersonalizedMessage(e.target.value)}
              placeholder={`E.g. "${card.petName} was such a sweetheart today — already nailing things faster than his classmates."`}
              className="min-h-[60px] text-[13px] leading-relaxed"
            />
          </div>

          {/* Behavior tags — multi-select chips the parent sees ─────────── */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold uppercase tracking-wider">
              Mood / behavior tags
            </Label>
            <p className="text-muted-foreground text-[11px]">
              Pick any that describe today's session. They render as chips on
              the parent's report card.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRAINING_REPORT_CARD_BEHAVIOR_TAGS.map((tag) => {
                const isActive = behaviorTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleBehaviorTag(tag)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-medium transition-colors",
                      isActive
                        ? BEHAVIOR_TAG_BADGE_CLS[tag]
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {isActive && <CheckCircle2 className="size-3" />}
                    {BEHAVIOR_TAG_LABELS[tag]}
                  </button>
                );
              })}
            </div>
            {behaviorTags.length > 0 && (
              <p className="text-muted-foreground text-[11px]">
                {behaviorTags.length} tag
                {behaviorTags.length === 1 ? "" : "s"} selected · tap again to
                remove
              </p>
            )}
          </div>

          {/* Photo section — pick hero + optional before/after ───────────── */}
          {card.photos.length > 0 && (
            <ReportCardPhotoSection
              photos={card.photos}
              heroPhotoUrl={heroPhotoUrl}
              beforePhotoUrl={beforePhotoUrl}
              afterPhotoUrl={afterPhotoUrl}
              onTogglePhotoSlot={togglePhotoSlot}
            />
          )}

          {/* Graduation-only — exercise progression + next-course pitch */}
          {card.kind === "series-completion" && (
            <GraduationProgressionSection card={card} />
          )}

          {/* Exercises covered — per-exercise star + label override ────── */}
          {card.exercisesCovered.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[12px] font-bold uppercase tracking-wider">
                Exercises covered
              </Label>
              <p className="text-muted-foreground text-[11px]">
                Tap a label to adjust the rating shown on the parent&apos;s
                card. The underlying training data stays intact — the chart
                still reflects what you logged in session.
              </p>
              <ul className="space-y-2 rounded-lg border bg-slate-50/40 p-2.5 dark:bg-slate-900/40">
                {card.exercisesCovered.map((ex) => {
                  const baseRating = Math.max(
                    1,
                    Math.min(5, Math.round(ex.avgRating)),
                  ) as 1 | 2 | 3 | 4 | 5;
                  const override = ratingOverrides[ex.name];
                  const effective = override ?? baseRating;
                  return (
                    <li
                      key={ex.name}
                      className="bg-card rounded-md border px-2.5 py-2"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[13px] font-semibold text-slate-800">
                          {ex.name}
                        </p>
                        <span className="text-muted-foreground text-[11px]">
                          {ex.ratingsCount} rating
                          {ex.ratingsCount === 1 ? "" : "s"}
                          {override !== undefined && (
                            <>
                              {" · "}
                              <button
                                type="button"
                                onClick={() => clearOverride(ex.name)}
                                className="text-indigo-600 underline-offset-2 hover:underline"
                              >
                                Reset
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {/* Star row — visual at-a-glance signal */}
                        <span
                          className="inline-flex items-center"
                          aria-label={`${effective} of 5`}
                          title={`${effective} of 5 — ${EXERCISE_RATING_LABELS[effective]}`}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={cn(
                                "size-3.5",
                                n <= effective
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300",
                              )}
                            />
                          ))}
                        </span>
                        {/* Labeled scale picker — each label = clickable chip */}
                        <div className="flex flex-wrap gap-1">
                          {([1, 2, 3, 4, 5] as const).map((n) => {
                            const isActive = effective === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => adjustRating(ex.name, n)}
                                className={cn(
                                  "inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition-colors",
                                  isActive
                                    ? EXERCISE_RATING_BADGE_CLS[n]
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                                )}
                                title={`Set ${ex.name} to "${EXERCISE_RATING_LABELS[n]}"`}
                              >
                                {n} · {EXERCISE_RATING_LABELS[n]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Training level ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold uppercase tracking-wider">
              Training level
            </Label>
            <Select
              value={trainingLevel}
              onValueChange={(v) => setTrainingLevel(v as TrainingLevel)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex flex-col">
                      <span>{TRAINING_LEVEL_LABELS[level]}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {TRAINING_LEVEL_HELP[level]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme picker ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold uppercase tracking-wider">
              Theme
            </Label>
            <p className="text-muted-foreground text-[11px]">
              Seasonal accent the owner sees on the report card.
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {Object.entries(REPORT_CARD_THEME_LABELS).map(([id, label]) => {
                const isActive = theme === (id as ReportCardTheme);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id as ReportCardTheme)}
                    className={cn(
                      "overflow-hidden rounded-md border text-[11px] font-medium transition-colors",
                      isActive
                        ? "border-indigo-500 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "block h-3 w-full bg-linear-to-r",
                        REPORT_CARD_THEME_ACCENT[id as ReportCardTheme],
                      )}
                    />
                    <span className="block px-2 py-1">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress narrative — auto-drafted, editable */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rc-narrative"
              className="text-[12px] font-bold uppercase tracking-wider"
            >
              Progress narrative
            </Label>
            <p className="text-muted-foreground text-[11px]">
              The arc from start of the program to now. Auto-drafted — tweak
              before sending.
            </p>
            <Textarea
              id="rc-narrative"
              value={progressNarrative}
              onChange={(e) => setProgressNarrative(e.target.value)}
              className="min-h-[80px] text-[13px] leading-relaxed"
            />
          </div>

          {/* Session summary */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rc-summary"
              className="text-[12px] font-bold uppercase tracking-wider"
            >
              Session summary
            </Label>
            <p className="text-muted-foreground text-[11px]">
              What happened in the triggering session. Pre-filled from the
              trainer notes saved at session completion.
            </p>
            <Textarea
              id="rc-summary"
              value={sessionSummary}
              onChange={(e) => setSessionSummary(e.target.value)}
              className="min-h-[80px] text-[13px] leading-relaxed"
            />
          </div>

          {/* Derived data — exercises + homework + photos, read-only here.
              Full editing lives on the per-pet profile; this editor is for
              the trainer-narrated fields. */}
          <div className="space-y-1.5 rounded-lg border bg-slate-50/40 px-3 py-2 text-[12px] dark:bg-slate-900/40">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="size-3" />
              Auto-included on the card
            </p>
            <ul className="space-y-0.5 text-slate-700 dark:text-slate-200">
              <li>
                {card.exercisesCovered.length} exercise
                {card.exercisesCovered.length === 1 ? "" : "s"} tracked ·{" "}
                {card.topExercises.length} top · {card.needsWorkExercises.length}{" "}
                needs work
              </li>
              <li>
                {card.assignedHomework.length} homework item
                {card.assignedHomework.length === 1 ? "" : "s"} assigned
              </li>
              <li>
                {card.photos.length} photo{card.photos.length === 1 ? "" : "s"}{" "}
                attached
              </li>
            </ul>
          </div>
        </div>

        <SheetFooter className="flex-col gap-3 border-t bg-slate-50/40 pt-3 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-start gap-3 sm:max-w-[280px]">
            <Switch
              id="rc-send-toggle"
              checked={sendToOwner}
              onCheckedChange={setSendToOwner}
              className="mt-0.5"
            />
            <Label
              htmlFor="rc-send-toggle"
              className="cursor-pointer space-y-0.5 text-[12px] font-medium"
            >
              <span className="block text-slate-800 dark:text-slate-100">
                Send to owner
              </span>
              <span className="text-muted-foreground block text-[11px] font-normal">
                {sendToOwner
                  ? "Delivers immediately via portal + email."
                  : "Saves as internal record only."}
              </span>
            </Label>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleOpenSchedule}
              className="text-muted-foreground text-[12px]"
              title="Open the scheduling dialog to queue this for a future send."
            >
              <CalendarClock className="size-3.5" />
              Schedule for later
            </Button>
            <Button
              type="button"
              onClick={handlePrimary}
              className={cn(
                "gap-1.5",
                sendToOwner
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-700 text-white hover:bg-slate-800",
              )}
            >
              {sendToOwner ? (
                <>
                  <Send className="size-4" />
                  {card.sentToOwner ? "Re-send to owner" : "Send to owner"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Save as internal
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
