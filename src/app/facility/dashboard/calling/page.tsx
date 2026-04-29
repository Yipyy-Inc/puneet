"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import {
  Phone, PhoneCall, PhoneOff, PhoneIncoming, PhoneOutgoing,
  Voicemail, Play, AlertCircle, Settings, Plus,
  BarChart3, Radio, Search, Download, PhoneForwarded,
  Clock, CheckCircle2, ExternalLink, User, Filter,
  Mic, Bot, UserCheck, ChevronRight, X,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { aiCallSummaries } from "@/data/calling";
import Link from "next/link";
import { callLogs, routingRules } from "@/data/communications-hub";
import { CallDetailsModal } from "@/components/communications/CallDetailsModal";
import { RoutingRuleModal } from "@/components/communications/RoutingRuleModal";
import { IncomingCallPanel } from "@/components/calling/IncomingCallPanel";
import { ActiveCallPanel } from "@/components/calling/ActiveCallPanel";
import { IVRBuilder } from "@/components/calling/IVRBuilder";
import { CallAnalyticsDashboard } from "@/components/calling/CallAnalyticsDashboard";
import { CallingSettingsPanel } from "@/components/calling/CallingSettingsPanel";
import { VoicemailInbox } from "@/components/calling/VoicemailInbox";
import {
  mockIncomingCall, mockUnknownIncomingCall, mockActiveCall,
  callQueue, ivrConfig, voicemailGreetings,
  defaultCallingSettings, callAnalytics, missedCallTasks,
} from "@/data/calling";
import type { ActiveCall } from "@/types/calling";

// ─── helpers ────────────────────────────────────────────────
function formatDuration(s: number) {
  if (s === 0) return "—";
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Live Tab ───────────────────────────────────────────────
function LiveTab({
  activeCall,
  onSimulateIncoming,
  onSimulateUnknown,
  onAnswerDemo,
}: {
  activeCall: ActiveCall | null;
  onSimulateIncoming: () => void;
  onSimulateUnknown: () => void;
  onAnswerDemo: () => void;
}) {
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
                <p className="font-bold">{activeCall.clientName ?? "Unknown Caller"}</p>
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
                  <p className="font-semibold text-sm">{entry.clientName ?? "Unknown Caller"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{entry.from}</p>
                  {entry.reason && <p className="text-xs text-muted-foreground">{entry.reason}</p>}
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
          {missedCallTasks.filter((t) => t.status === "unresolved").length > 0 && (
            <Badge variant="destructive">
              {missedCallTasks.filter((t) => t.status === "unresolved").length}
            </Badge>
          )}
        </h3>
        <div className="space-y-2">
          {missedCallTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <div className={`mt-0.5 size-2.5 shrink-0 rounded-full ${task.status === "unresolved" ? "bg-red-500" : task.status === "called_back" ? "bg-amber-500" : "bg-green-500"}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{task.clientName ?? "Unknown"}</p>
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
              <Badge variant={task.status === "unresolved" ? "destructive" : task.status === "called_back" ? "secondary" : "default"} className="capitalize text-xs shrink-0">
                {task.status.replace("_", " ")}
              </Badge>
              <Button size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs" onClick={() => alert(`Calling ${task.from}…`)}>
                <Phone className="size-3.5" />
                Call Back
              </Button>
            </div>
          ))}
        </div>
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
}: {
  call: (typeof callLogs)[0];
  onClose: () => void;
}) {
  const aiSummary = aiCallSummaries.find((s) => s.callId === call.id);
  const duration = { m: Math.floor(call.duration / 60), s: call.duration % 60 };

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
            <p className="font-semibold text-sm truncate">{call.clientName ?? "Unknown Caller"}</p>
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

          {/* Notes */}
          {call.notes && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Staff Notes</p>
              <p className="text-sm text-muted-foreground">{call.notes}</p>
            </div>
          )}

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
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<(typeof callLogs)[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "inbound" | "outbound">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "missed" | "voicemail" | "failed">("all");
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);

  const filteredCalls = useMemo(() => {
    return callLogs.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!c.clientName?.toLowerCase().includes(q) && !c.from.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  const voicemails = useMemo(() => callLogs.filter((c) => c.status === "voicemail"), []);
  const missedCalls = useMemo(() => callLogs.filter((c) => c.status === "missed"), []);
  const callsWithRecordings = useMemo(() => callLogs.filter((c) => c.recordingUrl), []);

  const handleAnswer = (call: ActiveCall) => {
    setIncomingCall(null);
    setCallMinimized(false);
    setActiveCall({ ...call, status: "active", isRecording: true });
  };

  const recordingColumns: ColumnDef<(typeof callLogs)[0]>[] = [
    {
      accessorKey: "clientName",
      header: "Contact",
      cell: ({ row }) => {
        const { clientId, clientName, from } = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="size-3.5" />
            </div>
            <div>
              {clientId ? (
                <Link
                  href={`/facility/dashboard/clients/${clientId}`}
                  className="group flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <span className="text-sm font-semibold leading-tight group-hover:underline underline-offset-2">
                    {clientName || "Unknown"}
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">{clientName || "Unknown"}</span>
              )}
              <div className="font-mono text-[11px] text-muted-foreground">{from}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="font-mono tabular-nums">{formatDuration(row.original.duration)}</span>
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: "Recorded",
      cell: ({ row }) => {
        const d = new Date(row.original.timestamp);
        return (
          <div className="text-sm">
            <div className="font-medium">{d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
            <div className="text-xs text-muted-foreground">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => alert("Playing…")}
            title="Play recording"
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Play className="size-3.5" />Play
          </button>
          <button
            onClick={() => alert("Downloading…")}
            title="Download"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Download className="size-3.5" />
          </button>
          {row.original.clientId && (
            <Link
              href={`/facility/dashboard/clients/${row.original.clientId}`}
              title="Open client file"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              <User className="size-3.5" />
            </Link>
          )}
        </div>
      ),
    },
  ];

  const routingColumns: ColumnDef<(typeof routingRules)[0]>[] = [
    { accessorKey: "priority", header: "Priority", cell: ({ row }) => <Badge variant="outline">#{row.original.priority}</Badge> },
    { accessorKey: "name", header: "Rule Name" },
    { accessorKey: "action", header: "Action", cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.action.replace(/_/g, " ")}</Badge> },
    { accessorKey: "enabled", header: "Status", cell: ({ row }) => <Badge variant={row.original.enabled ? "default" : "secondary"}>{row.original.enabled ? "Active" : "Inactive"}</Badge> },
    { accessorKey: "actions", header: "", cell: () => <Button variant="ghost" size="sm" onClick={() => setShowRoutingModal(true)}><Settings className="size-4" /></Button> },
  ];

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
          onEnd={() => { setActiveCall(null); setCallMinimized(false); }}
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
          <Card className={voicemails.length > 0 ? "border-2 border-orange-500/20 bg-orange-50/50" : ""}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Voicemail className="size-4" /> Voicemails
              </div>
              <p className={`mt-1 text-2xl font-bold ${voicemails.length > 0 ? "text-orange-600" : ""}`}>{voicemails.length}</p>
              <p className="text-xs text-muted-foreground">Unread messages</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <PhoneCall className="size-4" /> Today
              </div>
              <p className="mt-1 text-2xl font-bold">
                {callLogs.filter((c) => new Date(c.timestamp).toDateString() === new Date().toDateString()).length}
              </p>
              <p className="text-xs text-muted-foreground">Inbound &amp; outbound</p>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="live" className="space-y-4">
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
              {voicemails.length > 0 && <Badge variant="destructive" className="ml-1">{voicemails.length}</Badge>}
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
                { label: "Total", value: callLogs.length, icon: <PhoneCall className="size-4" />, color: "" },
                { label: "Completed", value: callLogs.filter((c) => c.status === "completed").length, icon: <CheckCircle2 className="size-4" />, color: "text-green-600" },
                { label: "Missed", value: callLogs.filter((c) => c.status === "missed").length, icon: <PhoneOff className="size-4" />, color: "text-red-500" },
                { label: "Voicemails", value: callLogs.filter((c) => c.status === "voicemail").length, icon: <Voicemail className="size-4" />, color: "text-amber-500" },
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
              {(typeFilter !== "all" || statusFilter !== "all" || searchQuery) && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setSearchQuery(""); }}>
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
                            <button
                              key={call.id}
                              onClick={() => setSelectedCall(isSelected ? null : call)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${isSelected ? "bg-primary/5 border-l-2 border-primary" : ""}`}
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
                              </div>
                              <ChevronRight className={`size-4 shrink-0 text-muted-foreground/40 transition-transform ${isSelected ? "rotate-90 text-primary" : ""}`} />
                            </button>
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
                    call={selectedCall}
                    onClose={() => setSelectedCall(null)}
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
            <VoicemailInbox voicemails={voicemails} greetings={voicemailGreetings} />
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
                  <DataTable columns={recordingColumns} data={callsWithRecordings} searchColumn="clientName" searchPlaceholder="Search recordings…" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* IVR & Routing */}
          <TabsContent value="ivr" className="space-y-6">
            <IVRBuilder config={ivrConfig} />
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Routing Rules</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Priority-based call routing conditions</p>
                  </div>
                  <Button onClick={() => setShowRoutingModal(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable columns={routingColumns} data={routingRules} searchColumn="name" searchPlaceholder="Search rules…" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <CallAnalyticsDashboard data={callAnalytics} />
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

      <Dialog open={showRoutingModal} onOpenChange={setShowRoutingModal}>
        <DialogContent className="max-h-[90vh] min-w-3xl overflow-y-auto">
          <RoutingRuleModal onClose={() => setShowRoutingModal(false)} />
        </DialogContent>
      </Dialog>

    </div>
  );
}
