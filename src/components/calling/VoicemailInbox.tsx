"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Play,
  Pause,
  Phone,
  CheckCircle2,
  User,
  Voicemail,
  FileText,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/data/communications-hub";
import type { VoicemailGreeting } from "@/types/calling";

interface VoicemailInboxProps {
  voicemails: CallLog[];
  greetings: VoicemailGreeting[];
}

function AudioBar({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const m = Math.floor(duration / 60);
  const s = (duration % 60).toString().padStart(2, "0");

  const toggle = () => {
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
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={toggle}
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </Button>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-250"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {m}:{s}
      </span>
    </div>
  );
}

type VoicemailStatus = "new" | "played" | "resolved";

export function VoicemailInbox({ voicemails, greetings }: VoicemailInboxProps) {
  const [statuses, setStatuses] = useState<Record<string, VoicemailStatus>>(
    Object.fromEntries(voicemails.map((v) => [v.id, "new"])),
  );
  const [activeGreeting, setActiveGreeting] = useState(
    greetings.find((g) => g.isActive)?.id ?? greetings[0]?.id,
  );

  const markResolved = (id: string) =>
    setStatuses((s) => ({ ...s, [id]: "resolved" }));

  const markPlayed = (id: string) =>
    setStatuses((s) =>
      s[id] === "new" ? { ...s, [id]: "played" } : s,
    );

  const newCount = Object.values(statuses).filter((s) => s === "new").length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold">Voicemail</h2>
        {newCount > 0 && (
          <Badge variant="destructive" className="gap-1.5 px-3 py-1">
            <Voicemail className="size-3.5" />
            {newCount} New
          </Badge>
        )}
      </div>

      {/* Voicemail list */}
      {voicemails.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-muted-foreground">
          <Voicemail className="mb-3 size-12 opacity-30" />
          <p className="text-sm font-medium">No voicemails</p>
          <p className="text-xs">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {voicemails.map((vm) => {
            const status = statuses[vm.id] ?? "new";
            const isResolved = status === "resolved";
            return (
              <Card
                key={vm.id}
                className={cn(
                  "transition-all",
                  isResolved && "opacity-60",
                  status === "new" && "border-l-4 border-l-blue-500",
                )}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Caller info */}
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {vm.clientName ?? "Unknown Caller"}
                          </p>
                          {status === "new" && (
                            <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                              NEW
                            </Badge>
                          )}
                          {status === "resolved" && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{vm.from}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(vm.timestamp).toLocaleString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => alert(`Calling back ${vm.from}…`)}
                      >
                        <Phone className="size-3.5" />
                        Call Back
                      </Button>
                      {!isResolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-green-600 hover:text-green-700"
                          onClick={() => markResolved(vm.id)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Audio player */}
                  {vm.recordingUrl && (
                    <div className="mt-3" onClick={() => markPlayed(vm.id)}>
                      <AudioBar duration={vm.duration || 30} />
                    </div>
                  )}

                  {/* Transcription */}
                  {vm.transcription && (
                    <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <FileText className="size-3" />
                        Transcript
                      </p>
                      <p className="text-sm leading-relaxed">{vm.transcription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Voicemail Greetings */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Edit3 className="size-4 text-muted-foreground" />
          Voicemail Greetings
        </h3>
        <div className="space-y-2">
          {greetings.map((g) => {
            const isActive = activeGreeting === g.id;
            const typeColors: Record<string, string> = {
              default: "text-blue-600 bg-blue-50 border-blue-200",
              after_hours: "text-purple-600 bg-purple-50 border-purple-200",
              holiday: "text-green-600 bg-green-50 border-green-200",
              temporary: "text-amber-600 bg-amber-50 border-amber-200",
            };
            return (
              <Card
                key={g.id}
                className={cn(
                  "cursor-pointer transition-all",
                  isActive && "border-primary/40 bg-primary/5",
                )}
                onClick={() => setActiveGreeting(g.id)}
              >
                <CardContent className="py-3 pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 size-4 rounded-full border-2 transition-all", isActive ? "border-primary bg-primary" : "border-muted-foreground/30")} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{g.name}</p>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize", typeColors[g.type])}>
                            {g.type.replace("_", " ")}
                          </span>
                          {isActive && <Badge className="h-4 px-1.5 text-[10px]">Active</Badge>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {g.transcription}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Updated {new Date(g.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Edit greeting: ${g.name}`);
                      }}
                    >
                      <Edit3 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
