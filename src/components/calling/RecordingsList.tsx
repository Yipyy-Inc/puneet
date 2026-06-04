"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Clock,
  Play,
  Download,
  User,
  ExternalLink,
  Headphones,
  X,
  Star,
  ClipboardCheck,
  Flag,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/data/communications-hub";
import { CallTranscriptSummary } from "./CallTranscriptSummary";
import { DateRangeFilter } from "./DateRangeFilter";
import { dateRangeBounds, type DateRange } from "@/lib/calling/date-range";
import { matchedFlagKeyword } from "@/lib/calling/flag-call";

const ALL_STAFF = "__all__";

function fmtDuration(s: number): string {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// QA scoring panel (1–5 + private manager note). Keyed by recording id so the
// draft resets per recording. Only rendered for managers/owners.
function QaScorePanel({
  rec,
  onScore,
}: {
  rec: CallLog;
  onScore: (id: string, score: number, note: string) => void;
}) {
  const [score, setScore] = useState(rec.qaScore ?? 0);
  const [note, setNote] = useState(rec.managerNote ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = score !== (rec.qaScore ?? 0) || note !== (rec.managerNote ?? "");

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardCheck className="size-3" />
        QA Score · manager only
      </p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            title={`${n}/5`}
            onClick={() => {
              setScore(n);
              setSaved(false);
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-md border transition-colors",
              score >= n
                ? "border-amber-400 bg-amber-50 text-amber-600"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <Star className={cn("size-3.5", score >= n && "fill-amber-400")} />
          </button>
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
          {score ? `${score}/5` : "Not scored"}
        </span>
      </div>
      <Textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder="Private manager note (not visible to staff)…"
        rows={2}
        className="resize-none text-xs"
      />
      <div className="flex items-center justify-end gap-2">
        {saved && <span className="text-[11px] font-medium text-green-600">Saved</span>}
        <Button
          size="sm"
          variant="secondary"
          disabled={!score || !dirty}
          onClick={() => {
            onScore(rec.id, score, note);
            setSaved(true);
          }}
        >
          Save QA score
        </Button>
      </div>
    </div>
  );
}

export function RecordingsList({
  recordings,
  canScore = false,
  onScore,
  onClearFlag,
}: {
  recordings: CallLog[];
  canScore?: boolean;
  onScore?: (id: string, score: number, note: string) => void;
  onClearFlag?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [handledBy, setHandledBy] = useState<string>(ALL_STAFF);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [qaOnly, setQaOnly] = useState(false);

  const handlers = useMemo(
    () => [...new Set(recordings.map((r) => r.handledBy).filter(Boolean))] as string[],
    [recordings],
  );

  const filtered = useMemo(() => {
    const { from, to } = dateRangeBounds(dateRange, customFrom, customTo);
    return recordings.filter((r) => {
      if (handledBy !== ALL_STAFF && r.handledBy !== handledBy) return false;
      if (qaOnly && typeof r.qaScore !== "number") return false;
      if (from !== null || to !== null) {
        const t = new Date(r.timestamp).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
      }
      return true;
    });
  }, [recordings, handledBy, dateRange, customFrom, customTo, qaOnly]);

  // Flagged recordings (newest first) for the Needs Review worklist.
  const flaggedRecs = useMemo(
    () =>
      [...recordings]
        .filter((r) => r.flagged)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [recordings],
  );

  const filtersActive = handledBy !== ALL_STAFF || dateRange !== "all" || qaOnly;
  const clearFilters = () => {
    setHandledBy(ALL_STAFF);
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
    setQaOnly(false);
  };

  return (
    <div className="space-y-4">
      {/* Needs Review — flagged recordings (low sentiment or risky keywords) */}
      {flaggedRecs.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center gap-2">
            <Flag className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold">Needs Review</h3>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              {flaggedRecs.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {flaggedRecs.map((rec) => {
              const kw = matchedFlagKeyword(rec.transcription);
              const reason = kw ? `Mentions “${kw}”` : "Low AI sentiment";
              const d = new Date(rec.timestamp);
              return (
                <div
                  key={rec.id}
                  className="flex items-center gap-3 rounded-lg border border-amber-200/70 bg-card px-3 py-2 dark:border-amber-900/40"
                >
                  <Flag className="size-3.5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {rec.clientName || "Unknown Caller"}{" "}
                      <span className="font-mono text-[11px] font-normal text-muted-foreground">
                        {rec.from}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {reason}
                      {rec.handledBy && <> · {rec.handledBy}</>} ·{" "}
                      {d.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  {onClearFlag && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1 text-xs"
                      onClick={() => onClearFlag(rec.id)}
                    >
                      <X className="size-3" /> Clear flag
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={handledBy} onValueChange={setHandledBy}>
          <SelectTrigger className="w-48 gap-1.5">
            <Headphones className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STAFF}>All staff</SelectItem>
            {handlers.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          customFrom={customFrom}
          onCustomFrom={setCustomFrom}
          customTo={customTo}
          onCustomTo={setCustomTo}
        />

        {canScore && (
          <button
            type="button"
            onClick={() => setQaOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
              qaOnly
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <Star className={cn("size-3", qaOnly && "fill-amber-400")} />
            QA scored
          </button>
        )}

        {filtersActive && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearFilters}>
            <X className="size-3.5" /> Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} recording{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          <Play className="mx-auto mb-3 size-8 opacity-30" />
          <p className="text-sm">No recordings match these filters</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((rec) => {
            const isExpanded = expanded === rec.id;
            const d = new Date(rec.timestamp);
            return (
              <div key={rec.id} className="rounded-xl border bg-card">
                {/* Row (click anywhere to expand the transcript + AI summary) */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                  onClick={() => setExpanded(isExpanded ? null : rec.id)}
                >
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />

                  {/* Contact */}
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      {rec.clientId ? (
                        <Link
                          href={`/facility/dashboard/clients/${rec.clientId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="group flex items-center gap-1 hover:text-primary"
                        >
                          <span className="truncate text-sm font-semibold leading-tight group-hover:underline">
                            {rec.clientName || "Unknown Caller"}
                          </span>
                          <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-semibold text-muted-foreground">
                          {rec.clientName || "Unknown Caller"}
                        </span>
                      )}
                      <div className="font-mono text-[11px] text-muted-foreground">{rec.from}</div>
                      {rec.handledBy && (
                        <div className="text-[11px] text-muted-foreground">
                          Handled by{" "}
                          <span className="font-medium text-foreground">{rec.handledBy}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Review flag */}
                  {rec.flagged && (
                    <span className="hidden shrink-0 items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 sm:inline-flex">
                      <Flag className="size-2.5" />
                      Flagged
                    </span>
                  )}

                  {/* QA score badge (manager/owner only) */}
                  {canScore && typeof rec.qaScore === "number" && (
                    <span className="hidden shrink-0 items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 sm:inline-flex">
                      <Star className="size-2.5 fill-amber-400" />
                      QA {rec.qaScore}/5
                    </span>
                  )}

                  {/* Duration */}
                  <div className="hidden shrink-0 items-center gap-1.5 text-sm md:flex">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span className="font-mono tabular-nums">{fmtDuration(rec.duration)}</span>
                  </div>

                  {/* Recorded */}
                  <div className="hidden shrink-0 text-right text-sm lg:block">
                    <div className="font-medium">
                      {d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => alert("Playing…")}
                      title="Play recording"
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Play className="size-3.5" />
                      Play
                    </button>
                    <button
                      onClick={() => alert("Downloading…")}
                      title="Download"
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded: transcription + AI summary (+ QA scoring for managers) */}
                {isExpanded && (
                  <div className="space-y-2 border-t px-3 pb-3 pt-2.5">
                    <CallTranscriptSummary callId={rec.id} transcription={rec.transcription} />
                    {canScore && onScore && <QaScorePanel key={rec.id} rec={rec} onScore={onScore} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
