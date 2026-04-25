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
  Clock, CheckCircle2, Pause, RefreshCw,
} from "lucide-react";
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
        <p className="text-sm text-muted-foreground">Make calls using your Twilio business number</p>
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
              onClick={() => alert(`Dialing ${phone}… (Twilio integration pending)`)}>
              <Phone className="size-5" />
              Dial
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function CallingPage() {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<(typeof callLogs)[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return callLogs;
    const q = searchQuery.toLowerCase();
    return callLogs.filter(
      (c) => c.clientName?.toLowerCase().includes(q) || c.from.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const voicemails = useMemo(() => callLogs.filter((c) => c.status === "voicemail"), []);
  const missedCalls = useMemo(() => callLogs.filter((c) => c.status === "missed"), []);
  const callsWithRecordings = useMemo(() => callLogs.filter((c) => c.recordingUrl), []);

  const handleAnswer = (call: ActiveCall) => {
    setIncomingCall(null);
    setActiveCall({ ...call, status: "active", isRecording: true });
  };

  const callColumns: ColumnDef<(typeof callLogs)[0]>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.type === "inbound"
            ? <PhoneIncoming className="size-4 text-green-600" />
            : <PhoneOutgoing className="size-4 text-blue-600" />}
          <Badge variant={row.original.type === "inbound" ? "default" : "outline"}>
            {row.original.type === "inbound" ? "Inbound" : "Outbound"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "from",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.clientName || "Unknown Caller"}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.from}</div>
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => formatDuration(row.original.duration),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const v = { completed: "default", missed: "destructive", voicemail: "secondary", failed: "destructive" } as const;
        return (
          <Badge variant={v[row.original.status]}>
            {row.original.status === "missed" && <PhoneOff className="mr-1 inline size-3" />}
            {row.original.status === "voicemail" && <Voicemail className="mr-1 inline size-3" />}
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        const d = new Date(row.original.timestamp);
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div className="text-sm">
            {isToday
              ? <><div className="font-medium">Today</div><div className="text-muted-foreground text-xs">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></>
              : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.recordingUrl && (
            <Button variant="ghost" size="sm" title="Play Recording"
              onClick={() => alert(`Playing recording from ${row.original.from}…`)}>
              <Play className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" title="View Details"
            onClick={() => { setSelectedCall(row.original); setShowDetailsModal(true); }}>
            <AlertCircle className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const recordingColumns: ColumnDef<(typeof callLogs)[0]>[] = [
    {
      accessorKey: "clientName",
      header: "Contact",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.clientName || "Unknown"}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.from}</div>
        </div>
      ),
    },
    { accessorKey: "duration", header: "Duration", cell: ({ row }) => formatDuration(row.original.duration) },
    { accessorKey: "timestamp", header: "Recorded", cell: ({ row }) => new Date(row.original.timestamp).toLocaleString() },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => alert("Playing…")}><Play className="mr-1 size-4" />Play</Button>
          <Button variant="ghost" size="sm" onClick={() => alert("Downloading…")}><Download className="size-4" /></Button>
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
    <div className={activeCall ? "pr-[320px]" : ""}>
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
          onEnd={() => setActiveCall(null)}
          onTransfer={() => alert("Transfer UI coming soon…")}
        />
      )}

      <div className="space-y-6 p-6">
        {/* Header + quick stats */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calling</h1>
            <p className="mt-1 text-muted-foreground">Phone system · Powered by Twilio</p>
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
            <Card>
              <CardContent className="pt-5">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name or phone number…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[
                { label: "Total Calls", value: filteredCalls.length, sub: "This month" },
                { label: "Avg Duration", value: `${filteredCalls.length > 0 ? Math.floor(filteredCalls.reduce((s, c) => s + c.duration, 0) / filteredCalls.length / 60) : 0}m`, sub: "Per call" },
                { label: "With Recordings", value: filteredCalls.filter((c) => c.recordingUrl).length, sub: "Available" },
              ].map(({ label, value, sub }) => (
                <Card key={label}>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Call History</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={callColumns} data={filteredCalls} searchColumn="clientName" searchPlaceholder="Search calls…" />
              </CardContent>
            </Card>
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
