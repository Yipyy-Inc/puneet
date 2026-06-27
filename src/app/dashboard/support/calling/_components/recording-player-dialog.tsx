"use client";

import { Flag, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { lookupFacilityByPhone } from "@/data/support-calls";
import type { SupportRecording } from "@/types/support-call";
import { FacilityAvatar } from "../../chat/_components/facility-avatar";
import { AudioBar } from "./audio-bar";
import { formatFullTime } from "./call-log-utils";
import { flagReasonText } from "./recording-utils";

function sentimentClass(score: number): string {
  if (score >= 7) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 4) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function RecordingPlayerDialog({
  recording,
  open,
  onOpenChange,
}: {
  recording: SupportRecording | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const facility = recording
    ? lookupFacilityByPhone(recording.callerNumber)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {recording && (
          <>
            <DialogHeader>
              <DialogTitle>Call recording</DialogTitle>
              <DialogDescription>
                {facility?.facilityName ?? "Unknown caller"} ·{" "}
                {formatFullTime(recording.at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FacilityAvatar
                  name={recording.agentName}
                  id={recording.agentId}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{recording.agentName}</p>
                  <p className="text-muted-foreground text-xs">
                    Handled this call · {recording.callerNumber || "—"}
                  </p>
                </div>
              </div>

              <div className="bg-muted/40 rounded-lg border p-3">
                <AudioBar durationSeconds={recording.durationSeconds} />
              </div>

              <div className="bg-muted/40 rounded-lg border p-3">
                <p className="text-muted-foreground mb-1 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
                  <Sparkles className="size-3 text-violet-500" />
                  AI transcription
                  <span className="text-muted-foreground/80 ml-1 font-normal normal-case">
                    · sentiment{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        sentimentClass(recording.sentimentScore),
                      )}
                    >
                      {recording.sentimentScore.toFixed(1)}/10
                    </span>
                  </span>
                </p>
                <p className="text-foreground/90 text-sm">
                  “{recording.transcript}”
                </p>
              </div>

              {recording.flagged && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-sm text-amber-700 dark:text-amber-300">
                  <Flag className="size-4 shrink-0" />
                  Flagged for review — {flagReasonText(recording)}
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">QA score</span>
                {recording.qaScore != null ? (
                  <Badge variant="outline" className="gap-1">
                    {recording.qaScore}/5
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not scored</span>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
