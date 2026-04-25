"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Phone,
  CheckCircle2,
  Voicemail,
  FileText,
  Edit3,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/data/communications-hub";
import type { VoicemailGreeting } from "@/types/calling";

interface VoicemailInboxProps {
  voicemails: CallLog[];
  greetings: VoicemailGreeting[];
}

function AudioBar({ duration, onPlay }: { duration: number; onPlay: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const m = Math.floor(duration / 60);
  const s = (duration % 60).toString().padStart(2, "0");

  const toggle = () => {
    onPlay();
    setPlaying((p) => {
      if (!p) {
        let current = 0;
        const step = (100 / duration) * 0.25;
        const id = setInterval(() => {
          current += step;
          if (current >= 100) {
            clearInterval(id);
            setPlaying(false);
            setProgress(0);
          } else {
            setProgress(current);
          }
        }, 250);
      }
      return !p;
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
      </button>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-250"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
        {m}:{s}
      </span>
    </div>
  );
}

type VoicemailStatus = "new" | "played" | "resolved";

const typeColors: Record<string, string> = {
  default: "text-blue-600 bg-blue-50 border-blue-200",
  after_hours: "text-purple-600 bg-purple-50 border-purple-200",
  holiday: "text-green-600 bg-green-50 border-green-200",
  temporary: "text-amber-600 bg-amber-50 border-amber-200",
};

export function VoicemailInbox({ voicemails, greetings }: VoicemailInboxProps) {
  const [statuses, setStatuses] = useState<Record<string, VoicemailStatus>>(
    Object.fromEntries(voicemails.map((v) => [v.id, "new"])),
  );
  const [activeGreeting, setActiveGreeting] = useState(
    greetings.find((g) => g.isActive)?.id ?? greetings[0]?.id,
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const markResolved = (id: string) =>
    setStatuses((s) => ({ ...s, [id]: "resolved" }));
  const markPlayed = (id: string) =>
    setStatuses((s) => (s[id] === "new" ? { ...s, [id]: "played" } : s));

  const newCount = Object.values(statuses).filter((s) => s === "new").length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Voicemail</h2>
        {newCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <Voicemail className="size-3" />
            {newCount} new
          </Badge>
        )}
      </div>

      {/* Voicemail list */}
      {voicemails.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-muted-foreground">
          <Voicemail className="mb-2 size-8 opacity-30" />
          <p className="text-sm">No voicemails — all caught up!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {voicemails.map((vm) => {
            const status = statuses[vm.id] ?? "new";
            const isResolved = status === "resolved";
            const isExpanded = expanded === vm.id;

            return (
              <div
                key={vm.id}
                className={cn(
                  "rounded-xl border bg-card transition-all",
                  isResolved && "opacity-55",
                )}
              >
                {/* Main row */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                  onClick={() => setExpanded(isExpanded ? null : vm.id)}
                >
                  {/* Status dot */}
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      status === "new" ? "bg-blue-500" : status === "played" ? "bg-muted-foreground/40" : "bg-green-500",
                    )}
                  />

                  {/* Caller info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold">
                        {vm.clientName ?? "Unknown Caller"}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{vm.from}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {new Date(vm.timestamp).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Inline audio (collapsed view) */}
                  {vm.recordingUrl && !isExpanded && (
                    <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <AudioBar duration={vm.duration || 30} onPlay={() => markPlayed(vm.id)} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => alert(`Calling back ${vm.from}…`)}
                    >
                      <Phone className="size-3" />
                      Call Back
                    </Button>
                    {!isResolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                        title="Mark resolved"
                        onClick={() => markResolved(vm.id)}
                      >
                        <CheckCircle2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded: full audio + transcript */}
                {isExpanded && (
                  <div className="space-y-2 border-t px-3 pb-3 pt-2.5">
                    {vm.recordingUrl && (
                      <AudioBar duration={vm.duration || 30} onPlay={() => markPlayed(vm.id)} />
                    )}
                    {vm.transcription && (
                      <div className="rounded-lg bg-muted/40 px-3 py-2">
                        <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <FileText className="size-3" />
                          Transcript
                        </p>
                        <p className="text-xs leading-relaxed text-foreground">{vm.transcription}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Voicemail Greetings */}
      <div>
        <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
          <Edit3 className="size-3.5 text-muted-foreground" />
          Greetings
        </h3>
        <div className="space-y-1.5">
          {greetings.map((g) => {
            const isActive = activeGreeting === g.id;
            return (
              <div
                key={g.id}
                onClick={() => setActiveGreeting(g.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                  isActive ? "border-primary/40 bg-primary/5" : "bg-card hover:bg-muted/40",
                )}
              >
                {/* Radio dot */}
                <div className={cn(
                  "size-3.5 shrink-0 rounded-full border-2 transition-all",
                  isActive ? "border-primary bg-primary" : "border-muted-foreground/30",
                )} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className={cn("rounded-full border px-1.5 py-0 text-[10px] font-semibold capitalize", typeColors[g.type])}>
                      {g.type.replace("_", " ")}
                    </span>
                    {isActive && <Badge className="h-4 px-1.5 text-[10px]">Active</Badge>}
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{g.transcription}</p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={(e) => { e.stopPropagation(); alert(`Edit greeting: ${g.name}`); }}
                >
                  <Edit3 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
