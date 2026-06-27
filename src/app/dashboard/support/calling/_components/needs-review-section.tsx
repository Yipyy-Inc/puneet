"use client";

import { Flag, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { lookupFacilityByPhone } from "@/data/support-calls";
import { clearRecordingFlag } from "@/lib/support-recording-store";
import type { SupportRecording } from "@/types/support-call";
import { formatRowTime } from "./call-log-utils";
import { flagReasonText } from "./recording-utils";

export function NeedsReviewSection({
  recordings,
  nowMs,
}: {
  recordings: SupportRecording[];
  nowMs: number;
}) {
  if (recordings.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 dark:bg-amber-950/20">
      <div className="mb-2.5 flex items-center gap-2">
        <Flag className="size-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold">Needs Review</h2>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
          {recordings.length}
        </span>
        <span className="text-muted-foreground text-xs">
          Flagged by AI for low sentiment or complaint-related language
        </span>
      </div>

      <div className="space-y-2">
        {recordings.map((rec) => {
          const facility = lookupFacilityByPhone(rec.callerNumber);
          return (
            <div
              key={rec.id}
              className="bg-card flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 px-3 py-2"
            >
              <Flag className="size-3.5 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold">
                    {facility?.facilityName ?? "Unknown Caller"}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {rec.callerNumber || "—"}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    · {formatRowTime(rec.at, nowMs)}
                  </span>
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  <span className="text-xs font-medium">
                    {flagReasonText(rec)}
                  </span>
                  <span className="text-muted-foreground ml-2 text-[11px]">
                    handled by {rec.agentName}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 text-xs"
                onClick={() => {
                  clearRecordingFlag(rec.id);
                  toast.success("Flag cleared");
                }}
              >
                <X className="size-3" />
                Clear Flag
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
