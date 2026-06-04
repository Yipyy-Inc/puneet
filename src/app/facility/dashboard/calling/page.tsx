"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Phone, PhoneCall, PhoneOff, PhoneIncoming, PhoneOutgoing,
  Voicemail, Play, AlertCircle, Settings,
  BarChart3, Radio, Search, Download, PhoneForwarded,
  Clock, CheckCircle2, ExternalLink, User, Filter,
  Mic, Bot, UserCheck, ChevronRight, X, MessageSquare,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { aiCallSummaries } from "@/data/calling";
import Link from "next/link";
import { callLogs } from "@/data/communications-hub";
import { CallDetailsModal } from "@/components/communications/CallDetailsModal";
import { IncomingCallPanel } from "@/components/calling/IncomingCallPanel";
import { ActiveCallPanel } from "@/components/calling/ActiveCallPanel";
import { InquiryTagPill } from "@/components/calling/InquiryTagPill";
import { FollowUpStatusPill } from "@/components/calling/FollowUpStatusPill";
import {
  FOLLOW_UP_META,
  FOLLOW_UP_OPTIONS,
  defaultFollowUpStatus,
} from "@/lib/calling/follow-up-status";
import type { FollowUpStatus } from "@/types/communications";
import { staffMembers } from "@/data/staff";
import { addStandaloneTask } from "@/data/work-tasks";
import { INQUIRY_TAG_META } from "@/lib/calling/inquiry-tags";
import { IVRBuilder } from "@/components/calling/IVRBuilder";
import { RoutingRulesBuilder } from "@/components/calling/RoutingRulesBuilder";
import { CallAnalyticsDashboard } from "@/components/calling/CallAnalyticsDashboard";
import { CallMetricsOverview } from "@/components/calling/CallMetricsOverview";
import { CallingSettingsPanel } from "@/components/calling/CallingSettingsPanel";
import { VoicemailInbox } from "@/components/calling/VoicemailInbox";
import { RecordingsList } from "@/components/calling/RecordingsList";
import { DateRangeFilter } from "@/components/calling/DateRangeFilter";
import { dateRangeBounds, type DateRange } from "@/lib/calling/date-range";
import { getFacilityRole } from "@/lib/role-utils";
import { shouldAutoFlag } from "@/lib/calling/flag-call";
import {
  mockIncomingCall, mockUnknownIncomingCall, mockActiveCall,
  callQueue, ivrConfig, voicemailGreetings,
  defaultCallingSettings, callAnalytics, missedCallTasks,
  callRoutingRules,
} from "@/data/calling";
import type { ActiveCall, MissedCallTask } from "@/types/calling";
import { toast } from "sonner";
import { LocationScopePicker } from "@/components/hq/LocationScopePicker";
import { useLocationContext } from "@/hooks/use-location-context";
import { deriveLocationId } from "@/data/locations";

// ─── helpers ────────────────────────────────────────────────
// Persisted per browser so staff keep their last-used Call Log filters.
const CALL_LOG_FILTERS_KEY = "calling:callLogFilters:v1";

// Radix Select forbids an empty value, so "no assignee" uses a sentinel.
const UNASSIGNED = "__unassigned__";
const ACTIVE_STAFF = staffMembers.filter((s) => s.isActive);

/**
 * Due target for a follow-up call-back task: same day 5pm if assigned on a
 * weekday before 5pm, otherwise the next business morning at 9am.
 */
function followUpDue(now = new Date()): { dueDate: string; dueTime: string } {
  const isWeekend = (x: Date) => x.getDay() === 0 || x.getDay() === 6;
  const toISO = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const d = new Date(now);
  if (!isWeekend(d) && d.getHours() < 17) {
    return { dueDate: toISO(d), dueTime: "17:00" };
  }
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  while (isWeekend(next)) next.setDate(next.getDate() + 1);
  return { dueDate: toISO(next), dueTime: "09:00" };
}

// ─── Live Tab ───────────────────────────────────────────────
function LiveTab({
  activeCall,
  onSimulateIncoming,
  onSimulateUnknown,
  onAnswerDemo,
  missedTasks,
  onCallBack,
  onMarkHandled,
}: {
  activeCall: ActiveCall | null;
  onSimulateIncoming: () => void;
  onSimulateUnknown: () => void;
  onAnswerDemo: () => void;
  missedTasks: MissedCallTask[];
  onCallBack: (task: MissedCallTask) => void;
  onMarkHandled: (task: MissedCallTask) => void;
}) {
  // Hide cards that have been resolved (Mark as handled) — they drop off the
  // live worklist but the resolution is retained on the record.
  const openMissed = missedTasks.filter((t) => t.status !== "resolved");
  return (
    <div className="space-y-6">
      {/* Demo controls */}
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center gap-3 pt-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Demo Controls
          </span>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onSimulateIncoming}>
            <PhoneIncoming className="size-4 text-green-600" />
            Simulate Known Caller
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onSimulateUnknown}>
            <PhoneIncoming className="size-4 text-amber-500" />
            Simulate Unknown Caller
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onAnswerDemo}>
            <PhoneCall className="size-4 text-blue-600" />
            Show Active Call Panel
          </Button>
        </CardContent>
      </Card>

      {/* Active call or idle */}
      {activeCall ? (
        <Card className="border-2 border-green-500/30 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-green-500" />
              </span>
              Active Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <p className="font-bold">
                  {activeCall.clientId && activeCall.clientName ? (
                    <Link
                      href={`/facility/dashboard/clients/${activeCall.clientId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {activeCall.clientName}
                    </Link>
                  ) : (
                    activeCall.clientName ?? "Unknown Caller"
                  )}
                </p>
                <p className="text-muted-foreground">{activeCall.from}</p>
              </div>
              <Badge className="bg-green-600 hover:bg-green-700">Live</Badge>
              {activeCall.isRecording && (
                <Badge variant="outline" className="gap-1 text-red-600 border-red-200">
                  <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                  Recording
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-500/20 bg-green-50/40">
          <CardContent className="flex items-center gap-3 pt-5">
            <Radio className="size-5 animate-pulse text-green-600" />
            <div>
              <p className="font-semibold text-green-700">System Online</p>
              <p className="text-xs text-muted-foreground">All lines available · No active calls</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Queue */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Clock className="size-4 text-muted-foreground" />
          Call Queue
          {callQueue.length > 0 && (
            <Badge variant="secondary">{callQueue.length} waiting</Badge>
          )}
        </h3>
        {callQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No callers in queue
          </div>
        ) : (
          <div className="space-y-2">
            {callQueue.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                  {entry.position}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {entry.clientId && entry.clientName ? (
                      <Link
                        href={`/facility/dashboard/clients/${entry.clientId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {entry.clientName}
                      </Link>
                    ) : (
                      entry.clientName ?? "Unknown Caller"
                    )}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{entry.from}</p>
                  {entry.inquiryTag ? (
                    <div className="mt-1">
                      <InquiryTagPill tag={entry.inquiryTag} />
                    </div>
                  ) : entry.reason ? (
                    <p className="text-xs text-muted-foreground">{entry.reason}</p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="font-semibold text-amber-600">{entry.waitTime}s waiting</p>
                  {entry.estimatedWait && <p>~{Math.ceil(entry.estimatedWait / 60)}m est.</p>}
                </div>
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => alert("Picking up queue call…")}>
                  <Phone className="size-3.5" />
                  Answer
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missed call tasks */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <PhoneOff className="size-4 text-red-500" />
          Unanswered Calls
          {missedTasks.filter((t) => t.status === "unresolved").length > 0 && (
            <Badge variant="destructive">
              {missedTasks.filter((t) => t.status === "unresolved").length}
            </Badge>
          )}
        </h3>
        {openMissed.length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No unanswered calls — all caught up
          </div>
        ) : (
        <div className="space-y-2">
          {openMissed.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <div className={`mt-0.5 size-2.5 shrink-0 rounded-full ${task.status === "unresolved" ? "bg-red-500" : task.status === "called_back" ? "bg-amber-500" : "bg-green-500"}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {task.clientId && task.clientName ? (
                    <Link
                      href={`/facility/dashboard/clients/${task.clientId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {task.clientName}
                    </Link>
                  ) : (
                    task.clientName ?? "Unknown"
                  )}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{task.from}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(task.callTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {task.missedBy && ` · Missed by ${task.missedBy}`}
                </p>
                {task.autoSMSSent && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-teal-600">
                    <CheckCircle2 className="size-3" /> Auto-SMS sent
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge variant={task.status === "unresolved" ? "destructive" : task.status === "called_back" ? "secondary" : "default"} className="capitalize text-xs">
                  {task.status.replace("_", " ")}
                </Badge>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 text-xs hover:bg-green-700"
                    onClick={() => onCallBack(task)}
                  >
                    <Phone className="size-3.5" />
                    Call Back
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => onMarkHandled(task)}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Mark as handled
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

// ─── Dialer Tab ─────────────────────────────────────────────
function DialerTab() {
  const [phone, setPhone] = useState("");
  const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outbound Dialer</CardTitle>
        <p className="text-sm text-muted-foreground">Make outbound calls using your business number</p>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-xs space-y-4">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (514) …"
            className="text-center text-xl font-mono font-semibold h-12"
          />
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <Button key={k} variant="outline" className="h-14 text-xl font-semibold rounded-2xl"
                onClick={() => setPhone((p) => p + k)}>
                {k}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPhone("")}>Clear</Button>
            <Button className="flex-1 h-12 gap-2 bg-green-600 hover:bg-green-700 text-base"
              disabled={!phone.trim()}
              onClick={() => alert(`Dialing ${phone}…`)}>

              <Phone className="size-5" />
              Dial
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Call Log Detail Panel ───────────────────────────────────
function CallLogDetail({
  call,
  onClose,
  onSaveNotes,
  onCallBack,
  onSendSms,
  onSetFollowUp,
  onAssign,
}: {
  call: (typeof callLogs)[0];
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
  onCallBack: () => void;
  onSendSms: () => void;
  onSetFollowUp: (status: FollowUpStatus) => void;
  onAssign: (staffId: string) => void;
}) {
  const aiSummary = aiCallSummaries.find((s) => s.callId === call.id);
  const duration = { m: Math.floor(call.duration / 60), s: call.duration % 60 };

  // Pre-filled from the persisted note (e.g. auto-saved when the call ended);
  // editable so staff can refine it. Component is keyed by call id at the render
  // site, so this resets correctly when a different call is selected.
  const [noteDraft, setNoteDraft] = useState(call.notes ?? "");
  const [justSaved, setJustSaved] = useState(false);

  const statusConfig = {
    completed: { label: "Completed", cls: "text-green-700 bg-green-50 border-green-200", icon: <CheckCircle2 className="size-3" /> },
    missed:    { label: "Missed",    cls: "text-red-700 bg-red-50 border-red-200",       icon: <PhoneOff className="size-3" /> },
    voicemail: { label: "Voicemail", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: <Voicemail className="size-3" /> },
    failed:    { label: "Failed",    cls: "text-red-700 bg-red-50 border-red-200",       icon: <PhoneOff className="size-3" /> },
  } as const;
  const sc = statusConfig[call.status];

  const sentimentColor = !aiSummary ? "" :
    aiSummary.sentimentScore >= 7 ? "text-green-600" :
    aiSummary.sentimentScore >= 4 ? "text-amber-600" : "text-red-500";

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${call.type === "inbound" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
            {call.type === "inbound" ? <PhoneIncoming className="size-5" /> : <PhoneOutgoing className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {call.clientId && call.clientName ? (
                <Link
                  href={`/facility/dashboard/clients/${call.clientId}`}
                  className="hover:text-primary hover:underline"
                >
                  {call.clientName}
                </Link>
              ) : (
                call.clientName ?? "Unknown Caller"
              )}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">{call.from}</p>
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 flex size-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Key metadata */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Status</p>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sc.cls}`}>
                {sc.icon}{sc.label}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Direction</p>
              <span className="text-sm font-medium capitalize">{call.type}</span>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Duration</p>
              <span className="font-mono text-sm tabular-nums">
                {call.duration === 0 ? "—" : `${duration.m}:${duration.s.toString().padStart(2, "0")}`}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Handled by</p>
              <span className="inline-flex items-center gap-1 text-sm">
                {call.aiHandled ? <><Bot className="size-3.5 text-violet-500" />AI</> : <><UserCheck className="size-3.5 text-blue-500" />Staff</>}
              </span>
            </div>
            {call.inquiryTag && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Inquiry</p>
                <InquiryTagPill tag={call.inquiryTag} />
              </div>
            )}
            <div className="col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Time</p>
              <span className="text-sm">{new Date(call.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          </div>

          <Separator />

          {/* Recording */}
          {call.recordingUrl && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recording</p>
              <div className="rounded-xl bg-muted/60 p-3 flex items-center gap-3">
                <button
                  onClick={() => alert("Playing recording…")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Play className="size-3.5 ml-0.5" />
                </button>
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                    <div className="h-full w-[30%] rounded-full bg-primary/60" />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    0:00 / {duration.m}:{duration.s.toString().padStart(2, "0")}
                  </p>
                </div>
                <button onClick={() => alert("Downloading…")} className="flex size-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground">
                  <Download className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Transcription */}
          {call.transcription && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Transcription</p>
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
                <p className="text-sm leading-relaxed text-muted-foreground italic">&ldquo;{call.transcription}&rdquo;</p>
              </div>
            </div>
          )}

          {/* Follow-up resolution — only for calls that need one */}
          {call.followUpStatus && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Follow-up</p>
              <div className="flex items-center gap-2">
                <Select
                  value={call.followUpStatus}
                  onValueChange={(v) => onSetFollowUp(v as FollowUpStatus)}
                >
                  <SelectTrigger className="flex-1">
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
                <FollowUpStatusPill status={call.followUpStatus} />
              </div>
            </div>
          )}

          {/* Assign for follow-up — creates a task for the chosen staff member */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Assigned to</p>
            <Select
              value={call.assignedTo || UNASSIGNED}
              onValueChange={(v) => onAssign(v === UNASSIGNED ? "" : v)}
            >
              <SelectTrigger className="w-full">
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

          {/* Primary action — one-click callback to this contact */}
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            onClick={onCallBack}
          >
            <Phone className="size-4" />
            Call Back
          </Button>

          {/* Send a quick SMS instead — opens Messages pre-filled */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onSendSms}
          >
            <MessageSquare className="size-4" />
            Send SMS
          </Button>

          {/* Staff Notes — pre-filled from notes typed during the call, editable */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Staff Notes</p>
            <Textarea
              value={noteDraft}
              onChange={(e) => { setNoteDraft(e.target.value); setJustSaved(false); }}
              rows={4}
              placeholder="Add notes about this call…"
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-end gap-2">
              {justSaved && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
                  <CheckCircle2 className="size-3" /> Saved
                </span>
              )}
              <Button
                size="sm"
                variant="secondary"
                disabled={noteDraft === (call.notes ?? "")}
                onClick={() => { onSaveNotes(noteDraft); setJustSaved(true); }}
              >
                Save notes
              </Button>
            </div>
          </div>

          {/* Outcome */}
          {call.outcome && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Outcome</p>
              <Badge variant="secondary" className="capitalize text-xs">{call.outcome.replace(/_/g, " ")}</Badge>
            </div>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-violet-500" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI Summary</p>
                  <span className={`ml-auto text-xs font-semibold ${sentimentColor}`}>
                    Sentiment {aiSummary.sentimentScore}/10
                  </span>
                </div>
                <div className="rounded-xl bg-violet-50/60 border border-violet-100 p-3 space-y-2 text-sm">
                  <p><span className="font-semibold text-violet-800">Reason: </span><span className="text-muted-foreground">{aiSummary.callReason}</span></p>
                  {aiSummary.followUpTask && (
                    <p><span className="font-semibold text-violet-800">Follow-up: </span><span className="text-muted-foreground">{aiSummary.followUpTask}</span></p>
                  )}
                  {aiSummary.riskFlag !== "none" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 capitalize">
                      <AlertCircle className="size-3" />{aiSummary.riskFlag.replace(/_/g, " ")}
                    </span>
                  )}
                  {aiSummary.upsellOpportunities.length > 0 && (
                    <div>
                      <p className="font-semibold text-violet-800 mb-1">Upsell opportunities:</p>
                      <ul className="space-y-0.5">
                        {aiSummary.upsellOpportunities.map((u) => (
                          <li key={u} className="text-muted-foreground text-xs">• {u}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Client link */}
          {call.clientId && (
            <Link
              href={`/facility/dashboard/clients/${call.clientId}`}
              className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm font-medium hover:bg-muted/50 transition-colors group"
            >
              <User className="size-4 text-muted-foreground" />
              <span>View client profile</span>
              <ExternalLink className="size-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function CallingPage() {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<(typeof callLogs)[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "missed" | "voicemail" | "failed">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const { locations, isMultiLocation } = useLocationContext();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  // Call log records live in state so a just-ended call (carrying the notes
  // typed during it) can be prepended, its Staff Notes edited in place, and its
  // follow-up status resolved. Seed each record's default follow-up state.
  const [logs, setLogs] = useState<typeof callLogs>(() =>
    callLogs.map((c) => {
      const summary = aiCallSummaries.find((s) => s.callId === c.id);
      return {
        ...c,
        followUpStatus: c.followUpStatus ?? defaultFollowUpStatus(c.status),
        // Auto-flag recordings on receipt: low AI sentiment or risky keywords.
        flagged:
          c.flagged ??
          (c.recordingUrl
            ? shouldAutoFlag(c.transcription, summary?.sentimentScore)
            : undefined),
      };
    }),
  );
  const [tab, setTab] = useState("live");
  // Unanswered-call worklist, stateful so Call Back / Mark as handled update it.
  const [missedTasks, setMissedTasks] = useState(missedCallTasks);

  // QA scoring + scores are visible only to managers/owners. Read the facility
  // role client-side (cookie) to avoid an SSR/hydration mismatch.
  const [canViewQa, setCanViewQa] = useState(false);
  useEffect(() => {
    const role = getFacilityRole();
    setCanViewQa(role === "owner" || role === "manager");
  }, []);

  // Persist the last-used Call Log filter selection per browser (localStorage).
  // The save effect is declared BEFORE the restore effect so that on mount it
  // runs while `filtersHydrated` is still false (skipping it), letting the
  // restore effect apply saved values without being overwritten by defaults.
  const filtersHydrated = useRef(false);
  useEffect(() => {
    if (!filtersHydrated.current) return;
    try {
      localStorage.setItem(
        CALL_LOG_FILTERS_KEY,
        JSON.stringify({ typeFilter, statusFilter, dateRange, customFrom, customTo }),
      );
    } catch {}
  }, [typeFilter, statusFilter, dateRange, customFrom, customTo]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CALL_LOG_FILTERS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.typeFilter) setTypeFilter(s.typeFilter);
        if (s.statusFilter) setStatusFilter(s.statusFilter);
        if (s.dateRange) setDateRange(s.dateRange);
        if (typeof s.customFrom === "string") setCustomFrom(s.customFrom);
        if (typeof s.customTo === "string") setCustomTo(s.customTo);
      }
    } catch {}
    filtersHydrated.current = true;
  }, []);

  const filteredCalls = useMemo(() => {
    const { from, to } = dateRangeBounds(dateRange, customFrom, customTo);
    return logs.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (from !== null || to !== null) {
        const t = new Date(c.timestamp).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
      }
      if (locationFilter.length > 0) {
        const callLocId = deriveLocationId(c.id);
        if (!locationFilter.includes(callLocId)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!c.clientName?.toLowerCase().includes(q) && !c.from.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchQuery, typeFilter, statusFilter, dateRange, customFrom, customTo, locationFilter]);

  const voicemails = useMemo(() => logs.filter((c) => c.status === "voicemail"), [logs]);
  // Voicemails still awaiting follow-up — drives the "needs attention" counts
  // (the inbox itself still lists every voicemail).
  const pendingVoicemails = useMemo(
    () => voicemails.filter((c) => c.followUpStatus === "pending"),
    [voicemails],
  );
  // Only missed calls still awaiting follow-up count toward the "needs attention"
  // badge — resolving a call (scheduled / completed / no action) clears it.
  const missedCalls = useMemo(
    () => logs.filter((c) => c.status === "missed" && c.followUpStatus === "pending"),
    [logs],
  );
  const callsWithRecordings = useMemo(() => logs.filter((c) => c.recordingUrl), [logs]);

  // Flagged recordings from this week (since Sunday) — Analytics count card.
  const flaggedThisWeek = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    const from = start.getTime();
    return logs.filter(
      (c) => c.flagged && c.recordingUrl && new Date(c.timestamp).getTime() >= from,
    ).length;
  }, [logs]);

  const handleAnswer = (call: ActiveCall) => {
    setIncomingCall(null);
    setCallMinimized(false);
    setActiveCall({ ...call, status: "active", isRecording: true });
  };

  // On call end: write a call-log record for the call, carrying the notes typed
  // in the panel into the record's Staff Notes, then surface it in the Call Log
  // (selected, with the side panel pre-filled) so staff don't re-type anything.
  const handleEndCall = (notes: string) => {
    if (activeCall) {
      const endedAtMs = Date.now();
      const durationSec = Math.max(
        0,
        Math.round((endedAtMs - new Date(activeCall.startTime).getTime()) / 1000),
      );
      const record: (typeof callLogs)[number] = {
        id: activeCall.id,
        type: activeCall.type,
        from: activeCall.from,
        to: activeCall.to,
        clientId: activeCall.clientId,
        clientName: activeCall.clientName,
        duration: durationSec,
        status: "completed",
        timestamp: new Date(endedAtMs).toISOString(),
        aiHandled: false,
        notes: notes.trim() || undefined,
        inquiryTag: activeCall.inquiryTag,
        followUpStatus: defaultFollowUpStatus("completed"),
      };
      // Replace any prior record with the same id (e.g. re-running the demo),
      // then prepend so the just-ended call sits at the top of the log.
      setLogs((prev) => [record, ...prev.filter((c) => c.id !== record.id)]);
      setSelectedCall(record);
      setTab("calls");
    }
    setActiveCall(null);
    setCallMinimized(false);
  };

  // Edit the persisted Staff Notes from the call-log side panel.
  const handleSaveNotes = (callId: string, notes: string) => {
    const next = notes.trim() || undefined;
    setLogs((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, notes: next } : c)),
    );
    setSelectedCall((prev) =>
      prev && prev.id === callId ? { ...prev, notes: next } : prev,
    );
  };

  // Assign a call to a staff member for follow-up. Records assignedTo on the
  // call and creates a one-off task in the Tasks module for that staff member.
  const handleAssign = (call: (typeof callLogs)[number], staffId: string) => {
    const next = staffId || null;
    setLogs((prev) =>
      prev.map((c) => (c.id === call.id ? { ...c, assignedTo: next } : c)),
    );
    setSelectedCall((prev) =>
      prev && prev.id === call.id ? { ...prev, assignedTo: next } : prev,
    );
    if (!staffId) {
      toast.info("Follow-up unassigned");
      return;
    }
    if (call.assignedTo === staffId) return; // already assigned to this person
    const staff = ACTIVE_STAFF.find((s) => s.id === staffId);
    if (!staff) return;
    const callerName = call.clientName ?? call.from;
    const inquiry = call.inquiryTag ? INQUIRY_TAG_META[call.inquiryTag].label : "follow-up";
    const isVoicemail = call.status === "voicemail";
    const title = isVoicemail
      ? `Listen to voicemail + call back ${callerName}`
      : `Call back ${callerName} re: ${inquiry}`;
    const { dueDate, dueTime } = followUpDue();
    addStandaloneTask({
      id: `task-cb-${call.id}-${Date.now()}`,
      title,
      description: isVoicemail
        ? `Listen to the voicemail and return the call. Linked to call ${call.id}.`
        : `Follow up on ${call.type} call (${call.status}). Linked to call ${call.id}.`,
      category: "customer-service",
      priority: "high",
      status: "pending",
      assignedToId: staff.id,
      assignedToName: staff.name,
      dueDate,
      dueTime,
      estimatedMinutes: 10,
      requiresPhoto: false,
      requiresSignoff: false,
      callLogId: call.id,
      createdAt: new Date().toISOString(),
    });
    toast.success(`Assigned to ${staff.name}`, {
      description: `Task created: "${title}" · due ${dueDate} ${dueTime}`,
    });
  };

  // Resolve a call's follow-up status from the side-panel dropdown.
  const handleSetFollowUp = (callId: string, status: FollowUpStatus) => {
    setLogs((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, followUpStatus: status } : c)),
    );
    setSelectedCall((prev) =>
      prev && prev.id === callId ? { ...prev, followUpStatus: status } : prev,
    );
  };

  // Submit a QA score (1–5) + private manager note for a recorded call.
  const handleScoreCall = (callId: string, qaScore: number, managerNote: string) => {
    const note = managerNote.trim() || undefined;
    setLogs((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, qaScore, managerNote: note } : c)),
    );
    setSelectedCall((prev) =>
      prev && prev.id === callId ? { ...prev, qaScore, managerNote: note } : prev,
    );
  };

  // Clear a recording's review flag after a manager has reviewed it.
  const handleClearFlag = (callId: string) => {
    setLogs((prev) => prev.map((c) => (c.id === callId ? { ...c, flagged: false } : c)));
  };

  // Shared: POST to Twilio outbound (to=number, from=businessNumber) and open
  // the active call panel. Mocked here — this is the integration point.
  const placeOutboundCall = (opts: {
    id: string;
    number: string;
    clientId?: number;
    clientName?: string;
  }) => {
    setActiveCall({
      id: opts.id,
      type: "outbound",
      from: opts.number,
      to: defaultCallingSettings.businessNumber,
      clientId: opts.clientId,
      clientName: opts.clientName,
      startTime: new Date().toISOString(),
      status: "active",
      isMuted: false,
      isRecording: defaultCallingSettings.autoRecord,
    });
    setCallMinimized(false);
    toast.success(`Calling ${opts.clientName ?? opts.number} back…`, {
      description: "Outbound call placed via Twilio.",
    });
  };

  // Call Back from the unanswered worklist — also records the callback on the
  // task (status + outcome).
  const handleCallBack = (task: MissedCallTask) => {
    placeOutboundCall({
      id: `cb-${task.id}`,
      number: task.from,
      clientId: task.clientId,
      clientName: task.clientName,
    });
    setMissedTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: "called_back", outcome: "called_back", callbackTime: new Date().toISOString() }
          : t,
      ),
    );
  };

  // Send SMS — deep-link to the Messages module pre-filled with a missed-call
  // template for this contact. `to` = the other party, `source` = this call.
  const handleSendSms = (call: (typeof callLogs)[number]) => {
    const number = call.type === "inbound" ? call.from : call.to;
    router.push(
      `/facility/dashboard/messaging?to=${encodeURIComponent(number)}&source=${encodeURIComponent(call.id)}`,
    );
  };

  // Call Back from a call-log row / detail panel. Dial the other party: the
  // caller's number for inbound calls, the number we dialed for outbound.
  const handleLogCallBack = (call: (typeof callLogs)[number]) => {
    placeOutboundCall({
      id: `cb-${call.id}`,
      number: call.type === "inbound" ? call.from : call.to,
      clientId: call.clientId,
      clientName: call.clientName,
    });
  };

  // Mark as handled — resolves the task (drops it from the live worklist) and
  // records the outcome.
  const handleMarkHandled = (task: MissedCallTask) => {
    setMissedTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: "resolved", outcome: "resolved" } : t,
      ),
    );
    toast.success(`Marked ${task.clientName ?? task.from} as handled`);
  };

  return (
    <div>
      {/* Incoming call overlay */}
      {incomingCall && (
        <IncomingCallPanel
          call={incomingCall}
          onAnswer={handleAnswer}
          onDecline={() => setIncomingCall(null)}
          onVoicemail={() => { alert("Sending to voicemail…"); setIncomingCall(null); }}
          onAnswerCreateProfile={() => { alert("Opening new profile form…"); setIncomingCall(null); }}
        />
      )}

      {/* Active call side panel */}
      {activeCall && (
        <ActiveCallPanel
          call={activeCall}
          onEnd={handleEndCall}
          onTransfer={() => alert("Transfer UI coming soon…")}
          onMinimizeChange={setCallMinimized}
        />
      )}

      <div className="space-y-6 p-6">
        {/* Header + quick stats */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calling</h1>
            <p className="mt-1 text-muted-foreground">Phone system</p>
          </div>
          <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => alert("Opening dialer…")}>
            <Phone className="size-4" />
            New Call
          </Button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-2 border-green-500/20 bg-green-50/50">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-green-600">
                <Radio className="size-4 animate-pulse" />
                <span className="text-sm font-semibold">System Status</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-green-600">Online</p>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
          <Card className={missedCalls.length > 0 ? "border-2 border-red-500/20 bg-red-50/50" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <PhoneOff className="size-4" /> Missed
              </div>
              <p className={`mt-1 text-2xl font-bold ${missedCalls.length > 0 ? "text-red-600" : ""}`}>{missedCalls.length}</p>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
          <Card className={pendingVoicemails.length > 0 ? "border-2 border-orange-500/20 bg-orange-50/50" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Voicemail className="size-4" /> Voicemails
              </div>
              <p className={`mt-1 text-2xl font-bold ${pendingVoicemails.length > 0 ? "text-orange-600" : ""}`}>{pendingVoicemails.length}</p>
              <p className="text-xs text-muted-foreground">Awaiting follow-up</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <PhoneCall className="size-4" /> Today
              </div>
              <p className="mt-1 text-2xl font-bold">
                {logs.filter((c) => new Date(c.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
              <p className="text-xs text-muted-foreground">Inbound &amp; outbound</p>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="live" className="gap-1.5">
              <Radio className="size-4" />
              Live
              {missedCalls.length > 0 && <Badge variant="destructive" className="ml-1">{missedCalls.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="dialer" className="gap-1.5">
              <Phone className="size-4" />
              Dialer
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-1.5">
              <PhoneCall className="size-4" />
              Call Log
            </TabsTrigger>
            <TabsTrigger value="voicemail" className="gap-1.5">
              <Voicemail className="size-4" />
              Voicemail
              {pendingVoicemails.length > 0 && <Badge variant="destructive" className="ml-1">{pendingVoicemails.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="recordings" className="gap-1.5">
              <Play className="size-4" />
              Recordings
            </TabsTrigger>
            <TabsTrigger value="ivr" className="gap-1.5">
              <PhoneForwarded className="size-4" />
              IVR &amp; Routing
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="size-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="size-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Live */}
          <TabsContent value="live">
            <LiveTab
              activeCall={activeCall}
              onSimulateIncoming={() => setIncomingCall(mockIncomingCall)}
              onSimulateUnknown={() => setIncomingCall(mockUnknownIncomingCall)}
              onAnswerDemo={() => setActiveCall(mockActiveCall)}
              missedTasks={missedTasks}
              onCallBack={handleCallBack}
              onMarkHandled={handleMarkHandled}
            />
          </TabsContent>

          {/* Dialer */}
          <TabsContent value="dialer">
            <DialerTab />
          </TabsContent>

          {/* Call Log */}
          <TabsContent value="calls" className="space-y-4">
            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Total", value: logs.length, icon: <PhoneCall className="size-4" />, color: "" },
                { label: "Completed", value: logs.filter((c) => c.status === "completed").length, icon: <CheckCircle2 className="size-4" />, color: "text-green-600" },
                { label: "Missed", value: missedCalls.length, icon: <PhoneOff className="size-4" />, color: "text-red-500" },
                { label: "Voicemails", value: pendingVoicemails.length, icon: <Voicemail className="size-4" />, color: "text-amber-500" },
              ].map(({ label, value, icon, color }) => (
                <Card key={label} className="py-0">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted ${color}`}>{icon}</div>
                    <div>
                      <p className="text-2xl font-bold leading-none">{value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Location filter (multi-location only) */}
            {isMultiLocation && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                  Location
                </span>
                <LocationScopePicker
                  locations={locations}
                  value={locationFilter}
                  onChange={setLocationFilter}
                  compact
                />
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="w-36 gap-1.5">
                  <Filter className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
              {(typeFilter !== "all" || statusFilter !== "all" || dateRange !== "all" || searchQuery) && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setDateRange("all"); setCustomFrom(""); setCustomTo(""); setSearchQuery(""); }}>
                  <X className="size-3.5" /> Clear
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{filteredCalls.length} result{filteredCalls.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Split panel: list + detail */}
            <div className="flex gap-4 min-h-[520px]">
              {/* Call list */}
              <div className="flex-1 min-w-0">
                <Card className="h-full">
                  <ScrollArea className="h-[560px]">
                    {filteredCalls.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <PhoneCall className="size-10 mb-3 opacity-25" />
                        <p className="text-sm">No calls match your filters</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredCalls.map((call) => {
                          const isSelected = selectedCall?.id === call.id;
                          const statusStyles = {
                            completed: "text-green-600 bg-green-50",
                            missed:    "text-red-500 bg-red-50",
                            voicemail: "text-amber-600 bg-amber-50",
                            failed:    "text-red-500 bg-red-50",
                          } as const;
                          const d = new Date(call.timestamp);
                          const isToday = d.toDateString() === new Date().toDateString();
                          return (
                            <div
                              key={call.id}
                              className={`flex items-center transition-colors hover:bg-muted/50 ${isSelected ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedCall(isSelected ? null : call)}
                                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                              >
                              {/* direction icon */}
                              <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${call.type === "inbound" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                                {call.type === "inbound" ? <PhoneIncoming className="size-4" /> : <PhoneOutgoing className="size-4" />}
                              </div>

                              {/* contact info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold truncate ${!call.clientName ? "text-muted-foreground" : ""}`}>
                                    {call.clientName ?? "Unknown Caller"}
                                  </span>
                                  {call.aiHandled && <Bot className="size-3 shrink-0 text-violet-500" />}
                                  {call.recordingUrl && <Mic className="size-3 shrink-0 text-muted-foreground/60" />}
                                  {call.inquiryTag && <InquiryTagPill tag={call.inquiryTag} className="shrink-0" />}
                                </div>
                                <p className="font-mono text-[11px] text-muted-foreground truncate">{call.from}</p>
                              </div>

                              {/* status + time */}
                              <div className="shrink-0 text-right space-y-1">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyles[call.status]}`}>
                                  {call.status === "completed" && <CheckCircle2 className="size-2.5" />}
                                  {call.status === "missed" && <PhoneOff className="size-2.5" />}
                                  {call.status === "voicemail" && <Voicemail className="size-2.5" />}
                                  {call.status}
                                </span>
                                <div className="text-[10px] text-muted-foreground">
                                  {isToday ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" })}
                                </div>
                                {call.followUpStatus && (
                                  <div className="flex justify-end">
                                    <FollowUpStatusPill status={call.followUpStatus} />
                                  </div>
                                )}
                              </div>
                                <ChevronRight className={`size-4 shrink-0 text-muted-foreground/40 transition-transform ${isSelected ? "rotate-90 text-primary" : ""}`} />
                              </button>
                              {call.status === "missed" && (
                                <Button
                                  size="sm"
                                  className="mr-3 shrink-0 gap-1.5 bg-green-600 text-xs hover:bg-green-700"
                                  onClick={() => handleLogCallBack(call)}
                                >
                                  <Phone className="size-3.5" />
                                  Call Back
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>

              {/* Detail panel */}
              {selectedCall ? (
                <div className="w-[380px] shrink-0">
                  <CallLogDetail
                    key={selectedCall.id}
                    call={selectedCall}
                    onClose={() => setSelectedCall(null)}
                    onSaveNotes={(notes) => handleSaveNotes(selectedCall.id, notes)}
                    onCallBack={() => handleLogCallBack(selectedCall)}
                    onSendSms={() => handleSendSms(selectedCall)}
                    onSetFollowUp={(status) => handleSetFollowUp(selectedCall.id, status)}
                    onAssign={(staffId) => handleAssign(selectedCall, staffId)}
                  />
                </div>
              ) : (
                <div className="w-[380px] shrink-0 flex items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                  <div className="text-center space-y-2">
                    <PhoneCall className="size-8 mx-auto opacity-20" />
                    <p className="text-sm">Select a call to view details</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Voicemail */}
          <TabsContent value="voicemail">
            <VoicemailInbox
              voicemails={voicemails}
              greetings={voicemailGreetings}
              onSetFollowUp={handleSetFollowUp}
              onAssign={(id, staffId) => {
                const call = logs.find((c) => c.id === id);
                if (call) handleAssign(call, staffId);
              }}
            />
          </TabsContent>

          {/* Recordings */}
          <TabsContent value="recordings">
            <Card>
              <CardHeader>
                <CardTitle>Call Recordings</CardTitle>
                <p className="text-sm text-muted-foreground">AES-256 encrypted · 90-day retention</p>
              </CardHeader>
              <CardContent>
                {callsWithRecordings.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Play className="mx-auto mb-4 size-12 opacity-30" />
                    <p>No recordings available</p>
                  </div>
                ) : (
                  <RecordingsList
                    recordings={callsWithRecordings}
                    canScore={canViewQa}
                    onScore={handleScoreCall}
                    onClearFlag={handleClearFlag}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IVR & Routing */}
          <TabsContent value="ivr" className="space-y-6">
            <IVRBuilder config={ivrConfig} />
            <RoutingRulesBuilder rules={callRoutingRules} />
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-8">
            <CallMetricsOverview logs={logs} summaries={aiCallSummaries} canViewStaffReport={canViewQa} />
            <CallAnalyticsDashboard data={callAnalytics} flaggedThisWeek={flaggedThisWeek} />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <CallingSettingsPanel settings={defaultCallingSettings} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-h-[90vh] min-w-3xl overflow-y-auto">
          {selectedCall && (
            <CallDetailsModal call={selectedCall} onClose={() => { setShowDetailsModal(false); setSelectedCall(null); }} />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
