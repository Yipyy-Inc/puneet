"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Mic,
  MicOff,
  Phone,
  PhoneForwarded,
  Pause,
  Play,
  Grid3x3,
  Users,
  Dog,
  DollarSign,
  CalendarDays,
  X,
  Star,
  AlertTriangle,
  UserX,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveCall } from "@/types/calling";

interface ActiveCallPanelProps {
  call: ActiveCall;
  onEnd: () => void;
  onTransfer: () => void;
}

const tagConfig: Record<string, { label: string; color: string }> = {
  vip: { label: "VIP", color: "text-amber-600 bg-amber-50 border-amber-200" },
  high_maintenance: { label: "High Maintenance", color: "text-orange-600 bg-orange-50 border-orange-200" },
  frequent_no_show: { label: "No-Show Risk", color: "text-red-600 bg-red-50 border-red-200" },
  new_client: { label: "New Client", color: "text-blue-600 bg-blue-50 border-blue-200" },
  allergy_alert: { label: "Allergy Alert", color: "text-red-600 bg-red-50 border-red-200" },
  aggression_flag: { label: "Aggression Flag", color: "text-red-600 bg-red-50 border-red-200" },
};

function useCallTimer(startTime: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function ActiveCallPanel({ call, onEnd, onTransfer }: ActiveCallPanelProps) {
  const [muted, setMuted] = useState(call.isMuted);
  const [onHold, setOnHold] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [notes, setNotes] = useState("");
  const [dtmfInput, setDtmfInput] = useState("");
  const timer = useCallTimer(call.startTime);

  return (
    <div className="fixed right-0 top-16 bottom-0 z-50 flex w-[300px] flex-col border-l bg-background shadow-2xl">

      {/* Recording bar */}
      <div className="flex shrink-0 items-center justify-center gap-2 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-600">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-red-500" />
        </span>
        Recording in progress
      </div>

      {/* Client header */}
      <div className="shrink-0 border-b bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-11 border-2 border-green-400/60 ring-2 ring-green-400/20">
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {call.clientName
                ? call.clientName.split(" ").map((n) => n[0]).join("")
                : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-bold leading-tight">
                {call.clientName ?? "Unknown Caller"}
              </p>
              <button
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                title="View client profile"
                onClick={() => alert("Opening client profile…")}
              >
                <ExternalLink className="size-3.5" />
              </button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{call.from}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge
                variant={onHold ? "secondary" : "default"}
                className={cn(
                  "gap-1 px-2 py-0 text-[11px]",
                  !onHold && "bg-green-600 hover:bg-green-700",
                )}
              >
                <span className={cn("size-1.5 rounded-full", onHold ? "bg-muted-foreground" : "bg-white animate-pulse")} />
                {onHold ? "On Hold" : "Active"}
              </Badge>
              <span className="font-mono text-sm font-semibold tabular-nums text-green-600">
                {timer}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {call.tags && call.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {call.tags.map((tag) => {
              const cfg = tagConfig[tag];
              if (!cfg) return null;
              return (
                <span
                  key={tag}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    cfg.color,
                  )}
                >
                  {tag === "vip" && <Star className="size-2.5" />}
                  {(tag === "allergy_alert" || tag === "high_maintenance" || tag === "aggression_flag") && (
                    <AlertTriangle className="size-2.5" />
                  )}
                  {tag === "frequent_no_show" && <UserX className="size-2.5" />}
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable middle: context + notes */}
      <div className="flex-1 overflow-y-auto">
        {/* Context info */}
        <div className="space-y-2 border-b p-4">
          {call.pets && call.pets.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Dog className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold leading-tight">
                  {call.pets.map((p) => p.name).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {call.pets.map((p) => p.breed).join(" · ")}
                </p>
              </div>
            </div>
          )}
          {call.currentService && (
            <div className="flex items-start gap-2 text-sm">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-500" />
              <p>{call.currentService}</p>
            </div>
          )}
          {call.upcomingAppointments !== undefined && call.upcomingAppointments > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
              <span>{call.upcomingAppointments} upcoming appointment{call.upcomingAppointments > 1 ? "s" : ""}</span>
            </div>
          )}
          {call.outstandingBalance !== undefined && call.outstandingBalance > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="size-4 shrink-0 text-amber-500" />
              <span className="font-semibold text-amber-600">
                ${call.outstandingBalance.toFixed(2)} outstanding
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Call Notes
          </p>
          <Textarea
            className="min-h-[100px] resize-none text-sm"
            placeholder="Type notes during the call…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* DTMF Keypad */}
      {showKeypad && (
        <div className="shrink-0 border-t bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 rounded border bg-background px-2 py-1 font-mono text-sm">
              {dtmfInput || <span className="text-muted-foreground">—</span>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setDtmfInput("")}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {DTMF_KEYS.map((k) => (
              <Button
                key={k}
                variant="outline"
                size="sm"
                className="h-9 text-base font-semibold"
                onClick={() => setDtmfInput((d) => d + k)}
              >
                {k}
              </Button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Call controls — always pinned at bottom */}
      <div className="shrink-0 p-3 space-y-2">
        {/* 4 secondary controls */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setMuted((m) => !m)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition-colors",
              muted
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={() => setOnHold((h) => !h)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition-colors",
              onHold
                ? "border-amber-200 bg-amber-50 text-amber-600"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {onHold ? <Play className="size-5" /> : <Pause className="size-5" />}
            {onHold ? "Resume" : "Hold"}
          </button>
          <button
            onClick={() => setShowKeypad((k) => !k)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition-colors",
              showKeypad
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            <Grid3x3 className="size-5" />
            Keypad
          </button>
          <button
            onClick={onTransfer}
            className="flex flex-col items-center gap-1 rounded-xl border border-border bg-background p-2 text-[11px] font-medium transition-colors hover:bg-muted"
          >
            <PhoneForwarded className="size-5" />
            Transfer
          </button>
        </div>

        {/* Add Staff */}
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2 text-xs font-medium transition-colors hover:bg-muted"
          onClick={() => alert("Adding staff to call…")}
        >
          <Users className="size-4" />
          Add Staff to Call
        </button>

        {/* End Call */}
        <Button
          className="h-11 w-full gap-2 bg-red-600 text-sm font-semibold hover:bg-red-700"
          onClick={onEnd}
        >
          <Phone className="size-4 rotate-[135deg]" />
          End Call
        </Button>
      </div>
    </div>
  );
}
