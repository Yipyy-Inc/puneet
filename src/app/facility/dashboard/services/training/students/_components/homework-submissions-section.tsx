"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Play,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  HomeworkPracticeEntry,
  TrainingHomework,
} from "@/lib/training-enrollment";

interface Props {
  homework: TrainingHomework;
  todayISO: string;
  onSaveResponse: (practiceDate: string, response: string) => void;
}

function formatPracticeDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function relativeWhen(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((today - target) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function HomeworkSubmissionsSection({
  homework,
  todayISO,
  onSaveResponse,
}: Props) {
  const submissions = useMemo<HomeworkPracticeEntry[]>(() => {
    return (homework.practiceLog ?? [])
      .filter((entry) => !!entry.videoUrl)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [homework.practiceLog]);

  // Default open when at least one submission is awaiting a response.
  const hasUnreviewed = submissions.some((s) => !s.trainerResponse);
  const [open, setOpen] = useState(hasUnreviewed);

  if (submissions.length === 0) return null;

  return (
    <section className="space-y-2 border-t pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase"
      >
        <Video className="size-3" />
        Owner submissions · {submissions.length}
        {hasUnreviewed && (
          <span className="ml-1 inline-flex h-4 items-center rounded-full bg-amber-100 px-1.5 text-[9px] font-bold text-amber-700 uppercase">
            New
          </span>
        )}
        {open ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
      </button>

      {open && (
        <ul className="space-y-2">
          {submissions.map((entry) => (
            <SubmissionRow
              key={entry.date}
              entry={entry}
              todayISO={todayISO}
              onSaveResponse={(value) => onSaveResponse(entry.date, value)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SubmissionRow({
  entry,
  todayISO,
  onSaveResponse,
}: {
  entry: HomeworkPracticeEntry;
  todayISO: string;
  onSaveResponse: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(entry.trainerResponse ?? "");
  const [savedFlash, setSavedFlash] = useState(false);

  // Keep the textarea in sync if the underlying record is updated externally
  // (e.g. another tab saved a response, or the trainer reopened the page).
  useEffect(() => {
    setDraft(entry.trainerResponse ?? "");
  }, [entry.trainerResponse]);

  const isDirty = draft.trim() !== (entry.trainerResponse ?? "").trim();
  const hasResponse = !!entry.trainerResponse;

  function save() {
    onSaveResponse(draft);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1500);
  }

  return (
    <li className="rounded-lg border bg-slate-50/50 dark:bg-slate-900/40">
      <div className="grid gap-2.5 p-2.5 sm:grid-cols-[160px_1fr]">
        {/* Thumbnail / player */}
        <div className="relative overflow-hidden rounded-md bg-slate-900">
          <video
            src={entry.videoUrl}
            controls={expanded}
            playsInline
            preload="metadata"
            muted={!expanded}
            className="aspect-video w-full object-contain"
          />
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 text-white transition-colors hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              aria-label="Play submitted video"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg">
                <Play className="size-5" />
              </span>
            </button>
          )}
        </div>

        {/* Meta + response editor */}
        <div className="space-y-2">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatPracticeDate(entry.date)}
            </span>
            <span>
              · submitted{" "}
              {relativeWhen(entry.videoAttachedAt ?? entry.markedAt, todayISO)}
            </span>
          </div>

          <label className="block space-y-1">
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
              <MessageSquare className="size-3" />
              Trainer Response{" "}
              {hasResponse && (
                <span className="ml-1 tracking-normal text-emerald-600 normal-case">
                  · client will see this
                </span>
              )}
            </span>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a quick note back to the owner — what looked great, what to refine. They'll see this in their portal."
              className="min-h-[64px] text-[13px] leading-relaxed"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-[10px]">
              {entry.trainerRespondedAt && entry.trainerRespondedBy
                ? `Responded ${relativeWhen(entry.trainerRespondedAt, todayISO)} by ${entry.trainerRespondedBy}`
                : "No response yet — owner sees a pending state."}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={!isDirty}
              className={cn(
                "h-7 gap-1 text-[11px]",
                savedFlash
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-indigo-600 text-white hover:bg-indigo-700",
              )}
            >
              <MessageSquare className="size-3" />
              {savedFlash
                ? "Saved"
                : hasResponse
                  ? "Update response"
                  : "Send response"}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
