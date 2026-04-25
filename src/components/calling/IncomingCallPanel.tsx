"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  PhoneOff,
  Voicemail,
  Dog,
  Star,
  AlertTriangle,
  UserX,
  UserPlus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveCall } from "@/types/calling";

interface IncomingCallPanelProps {
  call: ActiveCall;
  onAnswer: (call: ActiveCall) => void;
  onDecline: () => void;
  onVoicemail: () => void;
  onAnswerCreateProfile: () => void;
}

const tagConfig: Record<
  string,
  { label: string; variant: "destructive" | "secondary" | "outline"; icon: React.ComponentType<{ className?: string }> }
> = {
  vip: { label: "VIP", variant: "secondary", icon: Star },
  high_maintenance: { label: "High Maintenance", variant: "outline", icon: AlertTriangle },
  frequent_no_show: { label: "Frequent No-Show", variant: "destructive", icon: UserX },
  new_client: { label: "New Client", variant: "secondary", icon: UserPlus },
  allergy_alert: { label: "Allergy Alert", variant: "destructive", icon: AlertTriangle },
  aggression_flag: { label: "Aggression Flag", variant: "destructive", icon: AlertTriangle },
};

function RingPulse() {
  return (
    <span className="relative flex size-3">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex size-3 rounded-full bg-green-500" />
    </span>
  );
}

export function IncomingCallPanel({
  call,
  onAnswer,
  onDecline,
  onVoicemail,
  onAnswerCreateProfile,
}: IncomingCallPanelProps) {
  const [ring, setRing] = useState(0);
  const isUnknown = !call.clientId;

  useEffect(() => {
    const id = setInterval(() => setRing((r) => r + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-20 right-4 z-50 w-[360px] overflow-hidden rounded-2xl border shadow-2xl",
        "bg-background/95 backdrop-blur-xl",
        ring % 2 === 0 ? "ring-2 ring-green-400/40" : "ring-2 ring-green-400/20",
        "transition-all duration-500",
      )}
    >
      {/* Recording bar */}
      <div className="flex items-center justify-center gap-1.5 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-600">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-red-500" />
        </span>
        Call is being recorded
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <RingPulse />
          Incoming Call
        </div>

        {isUnknown ? (
          /* Unknown caller layout */
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted">
                <Phone className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold text-muted-foreground">Unknown Caller</p>
                <p className="font-mono text-base font-medium">{call.from}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="col-span-2 h-12 gap-2 bg-green-600 text-base hover:bg-green-700"
                onClick={onAnswerCreateProfile}
              >
                <UserPlus className="size-5" />
                Answer &amp; Create Profile
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 gap-2 text-muted-foreground"
                onClick={onVoicemail}
              >
                <Voicemail className="size-4" />
                Voicemail
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-11 gap-2"
                onClick={onDecline}
              >
                <PhoneOff className="size-4" />
                Decline
              </Button>
            </div>
          </div>
        ) : (
          /* Known caller layout */
          <div className="space-y-4">
            {/* Client info */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="size-14 border-2 border-green-400/50">
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {call.clientName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -right-1 -bottom-1 rounded-full bg-background p-0.5">
                  <RingPulse />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold">{call.clientName}</p>
                <p className="font-mono text-sm text-muted-foreground">{call.from}</p>
                {call.previousUnresolved && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="size-3 shrink-0" />
                    {call.previousUnresolved}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            {call.tags && call.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {call.tags.map((tag) => {
                  const cfg = tagConfig[tag];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <Badge key={tag} variant={cfg.variant} className="gap-1 text-xs">
                      <Icon className="size-3" />
                      {cfg.label}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Pet info */}
            {call.pets && call.pets.length > 0 && (
              <div className="rounded-xl border bg-muted/40 px-3 py-2">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Dog className="size-3.5" />
                  Pet{call.pets.length > 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {call.pets.map((pet) => (
                    <div key={pet.name} className="flex items-center gap-1.5">
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-amber-100 text-xs font-bold text-amber-700">
                          {pet.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold">{pet.name}</span>
                      <span className="text-xs text-muted-foreground">· {pet.breed}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context chips */}
            <div className="flex flex-wrap gap-2">
              {call.upcomingAppointments !== undefined && call.upcomingAppointments > 0 && (
                <span className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                  <Zap className="size-3 text-blue-500" />
                  {call.upcomingAppointments} upcoming appt{call.upcomingAppointments > 1 ? "s" : ""}
                </span>
              )}
              {call.outstandingBalance !== undefined && call.outstandingBalance > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  ${call.outstandingBalance.toFixed(2)} balance
                </span>
              )}
              {call.currentService && (
                <span className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                  {call.currentService}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                size="lg"
                className="col-span-1 h-12 flex-col gap-0.5 bg-green-600 py-2 text-xs hover:bg-green-700"
                onClick={() => onAnswer(call)}
              >
                <Phone className="size-5" />
                Answer
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 flex-col gap-0.5 py-2 text-xs text-muted-foreground"
                onClick={onVoicemail}
              >
                <Voicemail className="size-5" />
                Voicemail
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-12 flex-col gap-0.5 py-2 text-xs"
                onClick={onDecline}
              >
                <PhoneOff className="size-5" />
                Decline
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
