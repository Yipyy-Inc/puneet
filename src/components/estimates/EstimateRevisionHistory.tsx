"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, ArrowRight } from "lucide-react";
import type { Estimate } from "@/types/booking";

interface EstimateRevisionHistoryProps {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimelineEvent {
  at: string;
  version: number;
  title: string;
  actor?: string;
  detail?: string;
  totalChange?: { from: number; to: number };
  isVersionEvent: boolean;
}

function formatEventDate(at: string) {
  return new Date(at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Merge version revisions with lifecycle actions from the activity log into a
 * single chronological timeline. Activity entries that a revision already
 * represents (Created → v1, Version → v≥2) are skipped to avoid duplicates.
 */
function buildTimeline(estimate: Estimate): TimelineEvent[] {
  const revisions = estimate.revisions ?? [];
  const activityLog = estimate.activityLog ?? [];
  const hasRevisions = revisions.length > 0;

  const versionAt = (at: string) => {
    const t = new Date(at).getTime();
    let v = 1;
    for (const r of revisions) {
      if (new Date(r.changedAt).getTime() <= t) v = Math.max(v, r.version);
    }
    return v;
  };

  const events: TimelineEvent[] = [];

  for (const r of revisions) {
    events.push({
      at: r.changedAt,
      version: r.version,
      title:
        r.version === 1 ? "Estimate created" : `Version ${r.version} created`,
      actor: r.changedBy,
      detail: r.changes,
      totalChange:
        r.previousTotal > 0
          ? { from: r.previousTotal, to: r.newTotal }
          : undefined,
      isVersionEvent: true,
    });
  }

  for (const a of activityLog) {
    const lower = a.type.toLowerCase();
    // Revisions already cover these — don't double up.
    if (hasRevisions && (lower === "version" || lower === "created")) continue;
    events.push({
      at: a.at,
      version: versionAt(a.at),
      title: a.type,
      actor: a.actor,
      detail: a.detail,
      isVersionEvent: false,
    });
  }

  return events.sort(
    (x, y) => new Date(x.at).getTime() - new Date(y.at).getTime(),
  );
}

export function EstimateRevisionHistory({
  estimate,
  open,
  onOpenChange,
}: EstimateRevisionHistoryProps) {
  const events = buildTimeline(estimate);
  const currentVersion =
    estimate.currentVersion ?? estimate.revisions?.length ?? 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" />
            History &amp; Versions
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {events.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No history yet
            </p>
          ) : (
            <div className="space-y-0">
              {events.map((event, idx) => (
                <div
                  key={`${event.at}-${idx}`}
                  className="relative flex gap-3 pb-6"
                >
                  {/* Timeline line */}
                  {idx < events.length - 1 && (
                    <div className="absolute top-6 left-[11px] h-[calc(100%-12px)] w-px bg-slate-200" />
                  )}
                  {/* Dot — shows the effective version at this point */}
                  <div
                    className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                      event.isVersionEvent
                        ? "border-slate-400"
                        : "border-slate-200"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-500">
                      v{event.version}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      {event.actor && (
                        <span className="text-muted-foreground text-xs">
                          by {event.actor}
                        </span>
                      )}
                      {event.isVersionEvent &&
                        event.version === currentVersion && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600"
                          >
                            Current
                          </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatEventDate(event.at)}
                    </p>
                    {event.detail && (
                      <p className="mt-1 text-sm text-slate-600">
                        {event.detail}
                      </p>
                    )}
                    {event.totalChange && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground tabular-nums">
                          ${event.totalChange.from.toFixed(2)}
                        </span>
                        <ArrowRight className="size-3 text-slate-400" />
                        <span className="font-semibold tabular-nums">
                          ${event.totalChange.to.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RevisionHistoryButton({ estimate }: { estimate: Estimate }) {
  const [open, setOpen] = useState(false);
  const hasHistory =
    (estimate.revisions?.length ?? 0) > 0 ||
    (estimate.activityLog?.length ?? 0) > 0;
  if (!hasHistory) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <History className="size-3" />
        History &amp; Versions
      </Button>
      <EstimateRevisionHistory
        estimate={estimate}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
