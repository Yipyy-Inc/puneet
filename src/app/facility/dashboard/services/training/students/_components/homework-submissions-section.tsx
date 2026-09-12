"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
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
  /** Resolves once the response is saved, and rejects when it was not. */
  onSaveResponse: (practiceDate: string, response: string) => Promise<void>;
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

/** The days a piece of homework was practised, newest first, each with the
 *  trainer's response to it.
 *
 *  It listed only days that carried a video, and a video was a `blob:` URL
 *  that never left the owner's browser tab — so it listed nothing a trainer
 *  could ever see. Every logged day is a `training_homework_practice` row
 *  now, and the response is saved onto that row. */
export function HomeworkSubmissionsSection({
  homework,
  todayISO,
  onSaveResponse,
}: Props) {
  const submissions = useMemo<HomeworkPracticeEntry[]>(() => {
    return (homework.practiceLog ?? [])
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [homework.practiceLog]);

  // Default open when at least one practised day is awaiting a response.
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
        <MessageSquare className="size-3" />
        Practice check-ins · {submissions.length}
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
  onSaveResponse: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(entry.trainerResponse ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Keep the textarea in sync when the saved response changes underneath it
  // (another tab responded, or the trainer reopened the page).
  useEffect(() => {
    setDraft(entry.trainerResponse ?? "");
  }, [entry.trainerResponse]);

  const isDirty = draft.trim() !== (entry.trainerResponse ?? "").trim();
  const hasResponse = !!entry.trainerResponse;

  async function save() {
    setSaving(true);
    try {
      await onSaveResponse(draft);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      // The caller says what went wrong; the draft stays, so nothing typed is
      // lost.
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border bg-slate-50/50">
      <div className="space-y-2 p-2.5">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="font-semibold text-slate-700">
            {formatPracticeDate(entry.date)}
          </span>
          <span>· logged {relativeWhen(entry.markedAt, todayISO)}</span>
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
            className="min-h-[64px] text-[13px]/relaxed"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-[10px]">
            {entry.trainerRespondedAt && entry.trainerRespondedBy
              ? `Responded ${relativeWhen(entry.trainerRespondedAt, todayISO)} by ${entry.trainerRespondedBy}`
              : "No response yet."}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            loading={saving}
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
    </li>
  );
}
