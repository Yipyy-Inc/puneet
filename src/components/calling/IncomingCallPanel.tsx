"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone, PhoneOff, Voicemail, MapPin,
  Star, AlertTriangle, UserX, UserPlus, Dog, Zap, DollarSign, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ActiveCall } from "@/types/calling";

// ─── Yipyy brand palette ─────────────────────────────────────────────────────
// Light sky:  #CDEAF5   (logo background / brand signature)
// Sky blue:   #0EA5E9   (primary — derived from brand sky)
// Orange:     #F27E13   (logo dog-ear accent — brand warm)
// Dark base:  #071a24   (deep teal-black, darkened brand sky)
// Surface:    #0d2535   (card surface)
// ─────────────────────────────────────────────────────────────────────────────

interface IncomingCallPanelProps {
  call: ActiveCall;
  onAnswer: (call: ActiveCall) => void;
  onDecline: () => void;
  onVoicemail: () => void;
  onAnswerCreateProfile: () => void;
}

const tagConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  vip:              { label: "VIP",             color: "bg-[#F27E13]/20 text-[#F27E13] border-[#F27E13]/30",  icon: Star },
  high_maintenance: { label: "High Maintenance", color: "bg-[#F27E13]/15 text-orange-300 border-orange-400/25", icon: AlertTriangle },
  frequent_no_show: { label: "No-Show Risk",     color: "bg-red-500/20 text-red-300 border-red-400/30",         icon: UserX },
  new_client:       { label: "New Client",       color: "bg-[#CDEAF5]/15 text-[#CDEAF5] border-[#CDEAF5]/25",  icon: UserPlus },
  allergy_alert:    { label: "Allergy Alert",    color: "bg-red-500/20 text-red-300 border-red-400/30",         icon: AlertTriangle },
  aggression_flag:  { label: "Aggression Flag",  color: "bg-red-500/20 text-red-300 border-red-400/30",         icon: AlertTriangle },
};

function useRingPulse() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return pulse;
}

// ─── Desktop compact widget ──────────────────────────────────────────────────
function DesktopWidget({ call, onAnswer, onDecline, onVoicemail, onAnswerCreateProfile }: IncomingCallPanelProps) {
  const pulse = useRingPulse();
  const isUnknown = !call.clientId;
  const initials = call.clientName?.split(" ").map((n) => n[0]).join("") ?? "?";

  return (
    <div className={cn(
      "fixed top-[72px] right-4 z-50 hidden sm:block",
      "w-[320px] overflow-hidden rounded-2xl text-white",
      "border border-[#CDEAF5]/15",
      "shadow-[0_20px_60px_rgba(7,26,36,0.7),0_0_0_1px_rgba(205,234,245,0.08)]",
      pulse % 2 === 0 ? "ring-1 ring-[#0EA5E9]/35" : "ring-1 ring-[#0EA5E9]/12",
      "transition-all duration-700",
    )}
      style={{ background: "linear-gradient(160deg,#0d2535 0%,#071a24 100%)" }}
    >
      {/* Top strip */}
      <div className="flex items-center gap-2 border-b border-[#CDEAF5]/8 px-4 py-2.5"
        style={{ background: "rgba(14,165,233,0.12)" }}>
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0EA5E9] opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-[#0EA5E9]" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#CDEAF5]">
          Incoming call
        </span>
      </div>

      <div className="space-y-3 p-4">
        {/* Client row */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className={cn(
              "size-12 border-2 transition-all duration-700",
              pulse % 2 === 0 ? "border-[#0EA5E9]/60" : "border-[#0EA5E9]/20",
            )}>
              <AvatarFallback style={{ background: "rgba(205,234,245,0.12)" }}
                className="text-base font-bold text-[#CDEAF5]">
                {isUnknown ? <Phone className="size-5 text-white/40" /> : initials}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "absolute inset-0 rounded-full border-2 border-[#0EA5E9] transition-all duration-700",
              pulse % 2 === 0 ? "scale-[1.28] opacity-0" : "scale-100 opacity-20",
            )} />
          </div>
          <div className="min-w-0 flex-1">
            {call.clientId ? (
              <Link
                href={`/facility/dashboard/clients/${call.clientId}`}
                className="group flex items-center gap-1.5 truncate"
                title="Open client account"
              >
                <span className="truncate text-[15px] font-bold leading-tight text-white underline-offset-2 group-hover:text-[#CDEAF5] group-hover:underline transition-colors">
                  {call.clientName}
                </span>
                <ExternalLink className="size-3 shrink-0 text-[#CDEAF5]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ) : (
              <p className="truncate text-[15px] font-bold leading-tight text-white">{call.clientName ?? "Unknown Caller"}</p>
            )}
            <p className="font-mono text-[11px] text-[#CDEAF5]/45">{call.from}</p>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5">
          {call.currentService && (
            <div className="flex items-center gap-2 text-[12px] text-[#CDEAF5]/55">
              <MapPin className="size-3 shrink-0 text-[#F27E13]/70" />
              <span className="truncate">{call.currentService}</span>
            </div>
          )}
          {call.pets && call.pets.length > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-[#CDEAF5]/55">
              <Dog className="size-3 shrink-0 text-[#F27E13]/80" />
              <span className="truncate">{call.pets.map((p) => `${p.name} · ${p.breed}`).join(", ")}</span>
            </div>
          )}
          {call.upcomingAppointments !== undefined && call.upcomingAppointments > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-[#0EA5E9]/85">
              <Zap className="size-3 shrink-0" />
              <span>{call.upcomingAppointments} upcoming appointment{call.upcomingAppointments > 1 ? "s" : ""}</span>
            </div>
          )}
          {call.outstandingBalance !== undefined && call.outstandingBalance > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-[#F27E13]">
              <DollarSign className="size-3 shrink-0" />
              <span className="font-semibold">${call.outstandingBalance.toFixed(2)} outstanding</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {call.tags && call.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {call.tags.map((tag) => {
              const cfg = tagConfig[tag];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <span key={tag} className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", cfg.color)}>
                  <Icon className="size-2.5" />{cfg.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isUnknown ? (
            <>
              <button
                onClick={onAnswerCreateProfile}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 4px 16px rgba(14,165,233,0.4)" }}
              >
                <Phone className="size-3.5" />Answer &amp; Create Profile
              </button>
              <button onClick={onDecline}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-red-500/70 hover:text-white"
                style={{ background: "rgba(205,234,245,0.08)" }}>
                <PhoneOff className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={onVoicemail}
                className="flex-1 rounded-xl py-2.5 text-[12px] font-semibold text-[#CDEAF5]/60 transition-colors hover:text-white"
                style={{ background: "rgba(205,234,245,0.08)" }}>
                Dismiss
              </button>
              <button onClick={() => onAnswer(call)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 4px 16px rgba(14,165,233,0.45)" }}>
                <Phone className="size-3.5" />Answer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile full-screen ──────────────────────────────────────────────────────
function MobileFullscreen({ call, onAnswer, onDecline, onVoicemail, onAnswerCreateProfile }: IncomingCallPanelProps) {
  const pulse = useRingPulse();
  const isUnknown = !call.clientId;
  const initials = call.clientName?.split(" ").map((n) => n[0]).join("") ?? "?";

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:hidden overflow-hidden">
      {/* Deep brand teal-black gradient */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#071a24 0%,#040f17 60%,#020a11 100%)" }} />
      {/* Sky-blue brand glow */}
      <div className={cn(
        "absolute left-1/2 top-[20%] -translate-x-1/2 size-80 rounded-full blur-[100px] transition-opacity duration-1000",
        pulse % 2 === 0 ? "opacity-30" : "opacity-15",
      )} style={{ background: "radial-gradient(circle,#CDEAF5 0%,#0EA5E9 60%,transparent 100%)" }} />
      {/* Orange accent glow bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-60 rounded-full blur-[70px] opacity-20"
        style={{ background: "#F27E13" }} />

      <div className="relative flex flex-1 flex-col items-center justify-between px-6 py-16 text-white">

        {/* Incoming label */}
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#CDEAF5]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0EA5E9] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#0EA5E9]" />
          </span>
          Incoming call
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative flex items-center justify-center">
            <span className={cn(
              "absolute rounded-full border border-[#0EA5E9]/25 transition-all duration-1000",
              pulse % 2 === 0 ? "size-40 opacity-100" : "size-44 opacity-0",
            )} />
            <span className={cn(
              "absolute rounded-full border border-[#CDEAF5]/20 transition-all duration-700",
              pulse % 2 === 0 ? "size-28 opacity-100" : "size-32 opacity-0",
            )} />
            <Avatar className="relative size-24 border-4 border-[#0EA5E9]/50"
              style={{ boxShadow: "0 0 48px rgba(14,165,233,0.35),0 0 80px rgba(205,234,245,0.1)" }}>
              <AvatarFallback style={{ background: "rgba(205,234,245,0.12)" }}
                className="text-3xl font-bold text-[#CDEAF5]">
                {isUnknown ? <Phone className="size-10 text-white/30" /> : initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-1">
            {call.clientId ? (
              <Link
                href={`/facility/dashboard/clients/${call.clientId}`}
                className="group inline-flex items-center gap-2"
                title="Open client account"
              >
                <span className="text-2xl font-bold tracking-tight underline-offset-2 group-hover:text-[#CDEAF5] group-hover:underline transition-colors">
                  {call.clientName}
                </span>
                <ExternalLink className="size-4 shrink-0 text-[#CDEAF5]/35 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ) : (
              <p className="text-2xl font-bold tracking-tight">{call.clientName ?? "Unknown Caller"}</p>
            )}
            <p className="font-mono text-sm text-[#CDEAF5]/45">{call.from}</p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {call.currentService && (
                <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-[#CDEAF5]/65"
                  style={{ background: "rgba(205,234,245,0.1)" }}>
                  <MapPin className="size-3 text-[#F27E13]/80" />{call.currentService}
                </span>
              )}
              {call.pets && call.pets.length > 0 && (
                <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-[#CDEAF5]/65"
                  style={{ background: "rgba(205,234,245,0.1)" }}>
                  <Dog className="size-3 text-[#F27E13]/90" />{call.pets.map((p) => p.name).join(", ")}
                </span>
              )}
              {call.upcomingAppointments !== undefined && call.upcomingAppointments > 0 && (
                <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-[#CDEAF5]"
                  style={{ background: "rgba(14,165,233,0.18)" }}>
                  <Zap className="size-3" />{call.upcomingAppointments} appt{call.upcomingAppointments > 1 ? "s" : ""}
                </span>
              )}
              {call.outstandingBalance !== undefined && call.outstandingBalance > 0 && (
                <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-[#F27E13]"
                  style={{ background: "rgba(242,126,19,0.18)" }}>
                  <DollarSign className="size-3" />${call.outstandingBalance.toFixed(2)} balance
                </span>
              )}
            </div>

            {call.tags && call.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {call.tags.map((tag) => {
                  const cfg = tagConfig[tag];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  return (
                    <span key={tag} className={cn("flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", cfg.color)}>
                      <Icon className="size-2.5" />{cfg.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full space-y-4">
          {isUnknown ? (
            <>
              <button onClick={onAnswerCreateProfile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 8px 32px rgba(14,165,233,0.45)" }}>
                <Phone className="size-5" />Answer &amp; Create Profile
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={onVoicemail}
                  className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-[#CDEAF5]/60 transition-all active:scale-95"
                  style={{ background: "rgba(205,234,245,0.08)" }}>
                  <Voicemail className="size-4" />Voicemail
                </button>
                <button onClick={onDecline}
                  className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: "rgba(239,68,68,0.75)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
                  <PhoneOff className="size-4" />Decline
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-end justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <button onClick={onDecline}
                  className="flex size-16 items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ background: "#EF4444", boxShadow: "0 8px 24px rgba(239,68,68,0.45)" }}>
                  <PhoneOff className="size-7 text-white" />
                </button>
                <span className="text-xs text-[#CDEAF5]/35">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onVoicemail}
                  className="flex size-12 items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ background: "rgba(205,234,245,0.1)" }}>
                  <Voicemail className="size-5 text-[#CDEAF5]/50" />
                </button>
                <span className="text-xs text-[#CDEAF5]/35">Voicemail</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => onAnswer(call)}
                  className="flex size-16 items-center justify-center rounded-full transition-all active:scale-90"
                  style={{ background: "linear-gradient(135deg,#0EA5E9,#0284C7)", boxShadow: "0 8px 24px rgba(14,165,233,0.5)" }}>
                  <Phone className="size-7 text-white" />
                </button>
                <span className="text-xs text-[#CDEAF5]/35">Answer</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IncomingCallPanel(props: IncomingCallPanelProps) {
  return (
    <>
      <DesktopWidget {...props} />
      <MobileFullscreen {...props} />
    </>
  );
}
