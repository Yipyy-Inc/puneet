"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Phone,
  Voicemail,
  Edit3,
  Clock,
  UserPlus,
  Zap,
  RotateCcw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CallLog } from "@/data/communications-hub";
import type { VoicemailGreeting } from "@/types/calling";
import type { FollowUpStatus } from "@/types/communications";
import { holidayCalendar, defaultCallingSettings } from "@/data/calling";
import { CallTranscriptSummary } from "@/components/calling/CallTranscriptSummary";
import { FollowUpStatusPill } from "@/components/calling/FollowUpStatusPill";
import { FOLLOW_UP_META, FOLLOW_UP_OPTIONS } from "@/lib/calling/follow-up-status";
import { staffMembers } from "@/data/staff";
import {
  computeScheduledGreeting,
  type ScheduledGreetingType,
} from "@/lib/calling/greeting-schedule";

const UNASSIGNED = "__unassigned__";
const ACTIVE_STAFF = staffMembers.filter((s) => s.isActive);

interface VoicemailInboxProps {
  voicemails: CallLog[];
  greetings: VoicemailGreeting[];
  /** Set a voicemail's follow-up resolution (same handler as the call log). */
  onSetFollowUp?: (id: string, status: FollowUpStatus) => void;
  /** Assign a voicemail to a staff member (creates a task). "" = unassign. */
  onAssign?: (id: string, staffId: string) => void;
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

type VoicemailStatus = "new" | "played";

const typeColors: Record<string, string> = {
  default: "text-blue-600 bg-blue-50 border-blue-200",
  after_hours: "text-purple-600 bg-purple-50 border-purple-200",
  holiday: "text-green-600 bg-green-50 border-green-200",
  temporary: "text-amber-600 bg-amber-50 border-amber-200",
};

export function VoicemailInbox({ voicemails, greetings, onSetFollowUp, onAssign }: VoicemailInboxProps) {
  const [statuses, setStatuses] = useState<Record<string, VoicemailStatus>>(
    Object.fromEntries(voicemails.map((v) => [v.id, "new"])),
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Automatic greeting scheduling ──────────────────────────────────────────
  // A 5-minute "cron" re-evaluates business hours + the holiday calendar and
  // activates the right greeting (in production this runs server-side). Staff
  // can override manually; auto-management resumes at the next scheduled switch.
  const [scheduledType, setScheduledType] = useState<ScheduledGreetingType>(() =>
    computeScheduledGreeting(new Date(), defaultCallingSettings.businessHours, holidayCalendar),
  );
  const [isAuto, setIsAuto] = useState(true);
  const [manualGreetingId, setManualGreetingId] = useState<string | null>(null);
  const overrideBaselineRef = useRef<ScheduledGreetingType | null>(null);

  useEffect(() => {
    const evaluate = () => {
      const next = computeScheduledGreeting(
        new Date(),
        defaultCallingSettings.businessHours,
        holidayCalendar,
      );
      setScheduledType(next);
      // If overridden, resume auto-management once the schedule actually switches.
      if (overrideBaselineRef.current !== null && next !== overrideBaselineRef.current) {
        overrideBaselineRef.current = null;
        setManualGreetingId(null);
        setIsAuto(true);
      }
    };
    evaluate();
    const id = setInterval(evaluate, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const greetingForType = (type: ScheduledGreetingType) =>
    greetings.find((g) => g.type === type) ??
    greetings.find((g) => g.type === "default") ??
    greetings[0];
  const scheduledGreetingId = greetingForType(scheduledType)?.id;
  const activeGreeting = isAuto ? scheduledGreetingId : manualGreetingId ?? scheduledGreetingId;

  const selectGreeting = (id: string) => {
    setManualGreetingId(id);
    setIsAuto(false);
    overrideBaselineRef.current = scheduledType;
  };
  const resumeAuto = () => {
    overrideBaselineRef.current = null;
    setManualGreetingId(null);
    setIsAuto(true);
  };

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
            const followUp = vm.followUpStatus ?? "pending";
            const isResolved = followUp === "completed" || followUp === "no_action";
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
                  {/* Read-state dot (new / listened) */}
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      status === "new" ? "bg-blue-500" : "bg-muted-foreground/40",
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
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(vm.timestamp).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <FollowUpStatusPill status={followUp} />
                    </div>
                    {/* Transcript preview — lets staff scan the gist without listening */}
                    {vm.transcription && !isExpanded && (
                      <p className="mt-0.5 line-clamp-1 text-xs italic text-muted-foreground/90">
                        &ldquo;{vm.transcription}&rdquo;
                      </p>
                    )}
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
                    <Select
                      value={followUp}
                      onValueChange={(v) => onSetFollowUp?.(vm.id, v as FollowUpStatus)}
                    >
                      <SelectTrigger className="h-7 w-[124px] gap-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLLOW_UP_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {FOLLOW_UP_META[opt].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Expanded: full audio + transcript */}
                {isExpanded && (
                  <div className="space-y-2 border-t px-3 pb-3 pt-2.5">
                    {vm.recordingUrl && (
                      <AudioBar duration={vm.duration || 30} onPlay={() => markPlayed(vm.id)} />
                    )}
                    <CallTranscriptSummary callId={vm.id} transcription={vm.transcription} />

                    {/* Assign to a staff member — creates a follow-up task */}
                    {onAssign && (
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <UserPlus className="size-3" />
                          Assigned to
                        </p>
                        <Select
                          value={vm.assignedTo || UNASSIGNED}
                          onValueChange={(v) => onAssign(vm.id, v === UNASSIGNED ? "" : v)}
                        >
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                            {ACTIVE_STAFF.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} · {s.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Edit3 className="size-3.5 text-muted-foreground" />
            Greetings
          </h3>
          {isAuto ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Zap className="size-2.5" />
              Auto-managed
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={resumeAuto}
            >
              <RotateCcw className="size-3" />
              Resume auto
            </Button>
          )}
        </div>

        {/* Schedule status / override notice */}
        <p className="mb-2 text-[11px] text-muted-foreground">
          {isAuto
            ? "Greeting switches automatically with business hours and the holiday calendar."
            : "Manual override active — automatic scheduling resumes at the next scheduled switch."}
        </p>

        <div className="space-y-1.5">
          {greetings.map((g) => {
            const isActive = activeGreeting === g.id;
            return (
              <div
                key={g.id}
                onClick={() => selectGreeting(g.id)}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className={cn("rounded-full border px-1.5 py-0 text-[10px] font-semibold capitalize", typeColors[g.type])}>
                      {g.type.replace("_", " ")}
                    </span>
                    {isActive && <Badge className="h-4 px-1.5 text-[10px]">Active</Badge>}
                    {isActive && isAuto && (
                      <Badge
                        variant="outline"
                        className="h-4 gap-0.5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        <Zap className="size-2.5" />
                        Auto-managed
                      </Badge>
                    )}
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
