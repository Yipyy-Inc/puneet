"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Zap,
  User,
  Clock,
  FileText,
  Play,
  PhoneOff,
  Voicemail,
  CheckCircle2,
  AlertCircle,
  Bot,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { type CallLog } from "@/data/communications-hub";
import { aiCallSummaries } from "@/data/calling";

interface CallDetailsModalProps {
  call: CallLog;
  onClose: () => void;
}

export function CallDetailsModal({ call, onClose }: CallDetailsModalProps) {
  const duration = {
    minutes: Math.floor(call.duration / 60),
    seconds: call.duration % 60,
  };
  const durationStr = call.duration === 0
    ? "—"
    : `${duration.minutes}:${duration.seconds.toString().padStart(2, "0")}`;

  const aiSummary = aiCallSummaries.find((s) => s.callId === call.id);

  const statusConfig = {
    completed: { cls: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="size-3" /> },
    missed:    { cls: "bg-red-50 text-red-700 border-red-200",       icon: <PhoneOff className="size-3" /> },
    voicemail: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <Voicemail className="size-3" /> },
    failed:    { cls: "bg-red-50 text-red-700 border-red-200",       icon: <PhoneOff className="size-3" /> },
  } as const;
  const sc = statusConfig[call.status];

  const sentimentColor = !aiSummary ? "" :
    aiSummary.sentimentScore >= 7 ? "text-green-600" :
    aiSummary.sentimentScore >= 4 ? "text-amber-500" : "text-red-500";

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${call.type === "inbound" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}>
            {call.type === "inbound" ? <PhoneIncoming className="size-5" /> : <PhoneOutgoing className="size-5" />}
          </div>
          <div>
            <DialogTitle className="text-lg">{call.clientName ?? "Unknown Caller"}</DialogTitle>
            <DialogDescription className="font-mono text-sm">{call.from}</DialogDescription>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${sc.cls}`}>
              {sc.icon}{call.status}
            </span>
            {call.aiHandled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                <Bot className="size-3" />AI Handled
              </span>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Key metadata grid */}
        <div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/40 border px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Direction</p>
            <span className="flex items-center gap-1.5 text-sm font-medium capitalize">
              {call.type === "inbound" ? <PhoneIncoming className="size-3.5 text-green-600" /> : <PhoneOutgoing className="size-3.5 text-blue-600" />}
              {call.type}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Duration</p>
            <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
              <Clock className="size-3.5 text-muted-foreground" />
              {durationStr}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Handled by</p>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {call.aiHandled
                ? <><Bot className="size-3.5 text-violet-500" />AI Receptionist</>
                : <><UserCheck className="size-3.5 text-blue-500" />Staff</>}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">From</p>
            <p className="font-mono text-sm">{call.from}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">To</p>
            <p className="font-mono text-sm">{call.to}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Time</p>
            <p className="text-sm">{new Date(call.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </div>

        {/* Outcome + notes */}
        {(call.outcome ?? call.notes) && (
          <div className="flex items-start gap-3 rounded-xl bg-muted/40 border px-4 py-3">
            <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1">
              {call.outcome && (
                <Badge variant="secondary" className="capitalize text-xs mb-1">{call.outcome.replace(/_/g, " ")}</Badge>
              )}
              {call.notes && <p className="text-sm text-muted-foreground">{call.notes}</p>}
            </div>
          </div>
        )}

        {/* Recording */}
        {call.recordingUrl && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Recording</p>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => alert("Playing…")}>
                    <Play className="size-3.5" />Play
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => alert("Downloading…")}>
                    <Download className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <button
                  onClick={() => alert("Playing…")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Play className="size-3.5 ml-0.5" />
                </button>
                <div className="flex-1 space-y-1.5">
                  <div className="h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
                    <div className="h-full w-[30%] rounded-full bg-primary/60" />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    0:00 / {durationStr}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcription */}
        {call.transcription && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Transcription</p>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => navigator.clipboard?.writeText(call.transcription ?? "")}>
                <FileText className="size-3.5" />Copy
              </Button>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3">
              <p className="text-sm leading-relaxed text-muted-foreground italic">&ldquo;{call.transcription}&rdquo;</p>
            </div>
          </div>
        )}

        {/* Voicemail note */}
        {call.status === "voicemail" && !call.transcription && (
          <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
            <Voicemail className="size-4 shrink-0" />
            Caller left a voicemail — recording available above.
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-violet-500" />
                <p className="text-sm font-semibold">AI Call Summary</p>
                <span className={`ml-auto text-xs font-semibold ${sentimentColor}`}>
                  Sentiment {aiSummary.sentimentScore}/10
                </span>
                {aiSummary.assignedTo && (
                  <span className="text-xs text-muted-foreground">· {aiSummary.assignedTo}</span>
                )}
              </div>
              <div className="rounded-xl bg-violet-50/70 border border-violet-100 p-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-violet-800 mb-0.5">Reason</p>
                  <p className="text-muted-foreground">{aiSummary.callReason}</p>
                </div>
                {aiSummary.followUpTask && (
                  <div>
                    <p className="font-semibold text-violet-800 mb-0.5">Follow-up task</p>
                    <p className="text-muted-foreground">{aiSummary.followUpTask}</p>
                  </div>
                )}
                {aiSummary.specialCareNotes && (
                  <div>
                    <p className="font-semibold text-violet-800 mb-0.5">Special care notes</p>
                    <p className="text-muted-foreground">{aiSummary.specialCareNotes}</p>
                  </div>
                )}
                {aiSummary.behaviorAlerts && (
                  <div>
                    <p className="font-semibold text-violet-800 mb-0.5">Behavior alerts</p>
                    <p className="text-muted-foreground">{aiSummary.behaviorAlerts}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {aiSummary.riskFlag !== "none" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 capitalize border border-red-200">
                      <AlertCircle className="size-3" />{aiSummary.riskFlag.replace(/_/g, " ")}
                    </span>
                  )}
                  {aiSummary.savedToProfile && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 border border-green-200">
                      <CheckCircle2 className="size-3" />Saved to profile
                    </span>
                  )}
                </div>
                {aiSummary.upsellOpportunities.length > 0 && (
                  <div>
                    <p className="font-semibold text-violet-800 mb-1">Upsell opportunities</p>
                    <ul className="space-y-0.5">
                      {aiSummary.upsellOpportunities.map((u) => (
                        <li key={u} className="text-muted-foreground text-sm">• {u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Client profile link */}
        {call.clientId && (
          <Link
            href={`/facility/dashboard/clients/${call.clientId}`}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors group"
            onClick={onClose}
          >
            <User className="size-4 text-muted-foreground" />
            <span>Open {call.clientName}'s client profile</span>
            <ExternalLink className="size-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => alert(`Calling ${call.from}…`)} className="gap-1.5">
          <Phone className="size-4" />Call Back
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}
