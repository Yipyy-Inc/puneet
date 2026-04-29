"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mic, MicOff, Phone, PhoneForwarded, Pause, Play,
  Grid3x3, Users, Dog, DollarSign, CalendarDays, X,
  Star, AlertTriangle, UserX, ExternalLink,
  Minimize2, Maximize2, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveCall } from "@/types/calling";

// ─── Yipyy brand palette ─────────────────────────────────────────────────────
// #CDEAF5  — logo signature sky (light tint, text / subtle fills)
// #0EA5E9  — primary sky blue (active state, answer, live indicator)
// #F27E13  — logo dog-ear orange (hold, pets, balance, accent)
// #071a24  — dark base (deepened brand sky)
// #0d2535  — widget card surface
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveCallPanelProps {
  call: ActiveCall;
  onEnd: () => void;
  onTransfer: () => void;
  onMinimizeChange?: (minimized: boolean) => void;
}

const tagConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  vip:              { label: "VIP",             color: "bg-[#F27E13]/20 text-[#F27E13] border-[#F27E13]/30",  icon: Star },
  high_maintenance: { label: "High Maintenance", color: "bg-[#F27E13]/15 text-orange-300 border-orange-400/25", icon: AlertTriangle },
  frequent_no_show: { label: "No-Show Risk",     color: "bg-red-500/20 text-red-300 border-red-400/30",         icon: UserX },
  new_client:       { label: "New Client",       color: "bg-[#CDEAF5]/15 text-[#CDEAF5] border-[#CDEAF5]/25",  icon: UserX },
  allergy_alert:    { label: "Allergy Alert",    color: "bg-red-500/20 text-red-300 border-red-400/30",         icon: AlertTriangle },
  aggression_flag:  { label: "Aggression Flag",  color: "bg-red-500/20 text-red-300 border-red-400/30",         icon: AlertTriangle },
};

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

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

function CtrlBtn({ icon: Icon, label, active, activeBg, activeText, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; active?: boolean;
  activeBg?: string; activeText?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-[11px] font-semibold transition-all active:scale-95"
      style={active
        ? { background: activeBg ?? "rgba(14,165,233,0.2)", color: activeText ?? "#0EA5E9" }
        : { background: "rgba(205,234,245,0.07)", color: "rgba(205,234,245,0.55)" }
      }
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

// ─── Minimized pill ──────────────────────────────────────────────────────────
function MinimizedPill({ call, timer, muted, onHold, setMuted, setOnHold, onEnd, onExpand }: {
  call: ActiveCall; timer: string; muted: boolean; onHold: boolean;
  setMuted: (v: boolean) => void; setOnHold: (v: boolean) => void;
  onEnd: () => void; onExpand: () => void;
}) {
  const initials = call.clientName?.split(" ").map((n) => n[0]).join("") ?? "?";
  const liveColor = onHold ? "#F27E13" : "#0EA5E9";

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden sm:flex items-center gap-3 rounded-2xl px-4 py-2.5 text-white"
      style={{
        minWidth: 288,
        background: "linear-gradient(160deg,#0d2535 0%,#071a24 100%)",
        border: `1px solid ${liveColor}25`,
        boxShadow: `0 12px 40px rgba(7,26,36,0.7), 0 0 0 1px ${liveColor}18`,
      }}>
      <span className="relative flex size-2.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full opacity-70" style={{ backgroundColor: liveColor }} />
        <span className="relative inline-flex size-2.5 rounded-full" style={{ backgroundColor: liveColor }} />
      </span>

      <Avatar className="size-8 shrink-0 border-2" style={{ borderColor: `${liveColor}50` }}>
        <AvatarFallback style={{ background: "rgba(205,234,245,0.12)" }}
          className="text-[11px] font-bold text-[#CDEAF5]">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-white">{call.clientName ?? "Unknown Caller"}</p>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: liveColor }}>{timer}</span>
          {onHold && <span className="text-[10px]" style={{ color: liveColor }}>· On Hold</span>}
          {call.isRecording && !onHold && (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> REC
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setMuted(!muted)}
          className="flex size-8 items-center justify-center rounded-xl transition-colors"
          style={muted
            ? { background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }
            : { background: "rgba(205,234,245,0.08)", color: "rgba(205,234,245,0.45)", border: "1px solid rgba(205,234,245,0.1)" }}>
          {muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
        </button>
        <button onClick={() => setOnHold(!onHold)}
          className="flex size-8 items-center justify-center rounded-xl transition-colors"
          style={onHold
            ? { background: "rgba(242,126,19,0.2)", color: "#F27E13", border: "1px solid rgba(242,126,19,0.3)" }
            : { background: "rgba(205,234,245,0.08)", color: "rgba(205,234,245,0.45)", border: "1px solid rgba(205,234,245,0.1)" }}>
          {onHold ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
        <button onClick={onEnd}
          className="flex size-8 items-center justify-center rounded-xl text-white transition-colors hover:brightness-110"
          style={{ background: "#EF4444" }}>
          <Phone className="size-3.5 rotate-[135deg]" />
        </button>
        <button onClick={onExpand}
          className="flex size-8 items-center justify-center rounded-xl transition-colors"
          style={{ background: "rgba(205,234,245,0.08)", color: "rgba(205,234,245,0.45)", border: "1px solid rgba(205,234,245,0.1)" }}>
          <Maximize2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Desktop expanded floating widget ───────────────────────────────────────
function DesktopWidget({ call, timer, muted, onHold, showKeypad, notes, dtmfInput,
  setMuted, setOnHold, setShowKeypad, setNotes, setDtmfInput, onEnd, onTransfer, onMinimize,
}: {
  call: ActiveCall; timer: string; muted: boolean; onHold: boolean;
  showKeypad: boolean; notes: string; dtmfInput: string;
  setMuted: (v: boolean) => void; setOnHold: (v: boolean) => void;
  setShowKeypad: (v: boolean) => void; setNotes: (v: string) => void;
  setDtmfInput: (v: string) => void;
  onEnd: () => void; onTransfer: () => void; onMinimize: () => void;
}) {
  const initials = call.clientName?.split(" ").map((n) => n[0]).join("") ?? "?";
  const liveColor = onHold ? "#F27E13" : "#0EA5E9";

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden sm:flex flex-col w-[320px] overflow-hidden rounded-2xl text-white"
      style={{
        background: "linear-gradient(160deg,#0d2535 0%,#071a24 100%)",
        border: `1px solid ${liveColor}20`,
        boxShadow: `0 20px 60px rgba(7,26,36,0.75), 0 0 0 1px ${liveColor}14`,
      }}>

      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: "rgba(205,234,245,0.07)", background: `${liveColor}12` }}>
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-70" style={{ backgroundColor: liveColor }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: liveColor }} />
        </span>
        <Avatar className="size-9 shrink-0 border-2 transition-all" style={{ borderColor: `${liveColor}55` }}>
          <AvatarFallback style={{ background: "rgba(205,234,245,0.12)" }}
            className="text-xs font-bold text-[#CDEAF5]">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-bold leading-tight text-white">{call.clientName ?? "Unknown Caller"}</p>
            <button onClick={() => alert("Opening client profile…")}
              className="shrink-0 transition-colors" style={{ color: "rgba(205,234,245,0.25)" }}>
              <ExternalLink className="size-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: liveColor }}>{timer}</span>
            <span className="text-[10px] font-medium" style={{ color: `${liveColor}85` }}>
              {onHold ? "· On Hold" : "· Active"}
            </span>
            {call.isRecording && !onHold && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> REC
              </span>
            )}
          </div>
        </div>
        <button onClick={onMinimize}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{ border: "1px solid rgba(205,234,245,0.1)", color: "rgba(205,234,245,0.3)" }}
          title="Minimise">
          <Minimize2 className="size-3.5" />
        </button>
      </div>

      {/* Context */}
      <div className="border-b px-4 py-3 space-y-1.5" style={{ borderColor: "rgba(205,234,245,0.07)" }}>
        {call.pets && call.pets.length > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-[#CDEAF5]/50">
            <Dog className="size-3 shrink-0 text-[#F27E13]/70" />
            <span className="truncate">{call.pets.map((p) => `${p.name} · ${p.breed}`).join(", ")}</span>
          </div>
        )}
        {call.currentService && (
          <div className="flex items-center gap-2 text-[12px] text-[#CDEAF5]/50">
            <CalendarDays className="size-3 shrink-0 text-[#0EA5E9]/60" />
            <span className="truncate">{call.currentService}</span>
          </div>
        )}
        {call.upcomingAppointments !== undefined && call.upcomingAppointments > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-[#0EA5E9]/85">
            <Zap className="size-3 shrink-0" />
            <span>{call.upcomingAppointments} upcoming appt{call.upcomingAppointments > 1 ? "s" : ""}</span>
          </div>
        )}
        {call.outstandingBalance !== undefined && call.outstandingBalance > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-[#F27E13]">
            <DollarSign className="size-3 shrink-0" />
            <span className="font-semibold">${call.outstandingBalance.toFixed(2)} outstanding</span>
          </div>
        )}
        {call.tags && call.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
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
      </div>

      {/* Notes */}
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(205,234,245,0.07)" }}>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#CDEAF5]/25">Call Notes</p>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Type notes during the call…"
          className="w-full resize-none rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-[#CDEAF5]/20 focus:outline-none"
          style={{ background: "rgba(205,234,245,0.06)", border: "1px solid rgba(205,234,245,0.08)" }} />
      </div>

      {/* DTMF */}
      {showKeypad && (
        <div className="border-b px-4 py-3" style={{ borderColor: "rgba(205,234,245,0.07)" }}>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 rounded-xl px-3 py-1.5 font-mono text-[13px] text-white"
              style={{ background: "rgba(205,234,245,0.06)", border: "1px solid rgba(205,234,245,0.08)" }}>
              {dtmfInput || <span style={{ color: "rgba(205,234,245,0.2)" }}>—</span>}
            </div>
            <button onClick={() => setDtmfInput("")}
              className="flex size-7 items-center justify-center rounded-lg"
              style={{ border: "1px solid rgba(205,234,245,0.1)", color: "rgba(205,234,245,0.35)" }}>
              <X className="size-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {DTMF_KEYS.map((k) => (
              <button key={k} onClick={() => setDtmfInput(dtmfInput + k)}
                className="rounded-xl py-2 text-[15px] font-semibold text-white transition-all active:scale-95"
                style={{ background: "rgba(205,234,245,0.08)" }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="px-3 py-3 space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          <CtrlBtn icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} active={muted}
            activeBg="rgba(239,68,68,0.2)" activeText="#f87171" onClick={() => setMuted(!muted)} />
          <CtrlBtn icon={onHold ? Play : Pause} label={onHold ? "Resume" : "Hold"} active={onHold}
            activeBg="rgba(242,126,19,0.2)" activeText="#F27E13" onClick={() => setOnHold(!onHold)} />
          <CtrlBtn icon={Grid3x3} label="Keypad" active={showKeypad}
            activeBg="rgba(14,165,233,0.2)" activeText="#0EA5E9" onClick={() => setShowKeypad(!showKeypad)} />
          <CtrlBtn icon={PhoneForwarded} label="Transfer" onClick={onTransfer} />
        </div>
        <button onClick={() => alert("Adding staff to call…")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-[12px] font-semibold transition-colors text-[#CDEAF5]/55 hover:text-[#CDEAF5]"
          style={{ background: "rgba(205,234,245,0.07)" }}>
          <Users className="size-4" />Add Staff to Call
        </button>
        <button onClick={onEnd}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-bold text-white transition-all active:scale-[0.98]"
          style={{ background: "#EF4444", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}>
          <Phone className="size-4 rotate-[135deg]" />End Call
        </button>
      </div>
    </div>
  );
}

// ─── Mobile full-screen active call ─────────────────────────────────────────
function MobileActiveCall({ call, timer, muted, onHold, showKeypad, notes, dtmfInput,
  setMuted, setOnHold, setShowKeypad, setNotes, setDtmfInput, onEnd, onTransfer,
}: {
  call: ActiveCall; timer: string; muted: boolean; onHold: boolean;
  showKeypad: boolean; notes: string; dtmfInput: string;
  setMuted: (v: boolean) => void; setOnHold: (v: boolean) => void;
  setShowKeypad: (v: boolean) => void; setNotes: (v: string) => void;
  setDtmfInput: (v: string) => void;
  onEnd: () => void; onTransfer: () => void;
}) {
  const initials = call.clientName?.split(" ").map((n) => n[0]).join("") ?? "?";
  const liveColor = onHold ? "#F27E13" : "#0EA5E9";

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:hidden overflow-hidden">
      {/* Deep Yipyy teal-black */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#071a24 0%,#040f17 60%,#020a11 100%)" }} />
      {/* Brand sky glow — transitions with hold state */}
      <div className="absolute left-1/2 top-1/4 -translate-x-1/2 size-72 rounded-full blur-[80px] opacity-22 transition-all duration-700"
        style={{ background: `radial-gradient(circle,${liveColor} 0%,transparent 70%)` }} />
      {/* Orange accent glow bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-56 rounded-full blur-[70px] opacity-18"
        style={{ background: "#F27E13" }} />

      <div className="relative flex flex-1 flex-col text-white overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#CDEAF5]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-70" style={{ backgroundColor: liveColor }} />
              <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: liveColor }} />
            </span>
            {onHold ? "On Hold" : "Active Call"}
          </div>
          {call.isRecording && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> REC
            </span>
          )}
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute size-28 animate-ping rounded-full border opacity-15 transition-colors duration-700"
              style={{ borderColor: liveColor, animationDuration: "2s" }} />
            <Avatar className="relative size-20 border-4 transition-all duration-700"
              style={{
                borderColor: `${liveColor}55`,
                boxShadow: `0 0 40px ${liveColor}35`,
              }}>
              <AvatarFallback style={{ background: "rgba(205,234,245,0.12)" }}
                className="text-2xl font-bold text-[#CDEAF5]">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="text-xl font-bold">{call.clientName ?? "Unknown Caller"}</p>
            <p className="font-mono text-sm text-[#CDEAF5]/45">{call.from}</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums transition-colors duration-700" style={{ color: liveColor }}>{timer}</p>
          </div>

          {/* Context chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {call.currentService && (
              <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] text-[#CDEAF5]/60"
                style={{ background: "rgba(205,234,245,0.08)" }}>
                <CalendarDays className="size-3 text-[#0EA5E9]/70" />{call.currentService}
              </span>
            )}
            {call.pets && call.pets.length > 0 && (
              <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] text-[#CDEAF5]/60"
                style={{ background: "rgba(205,234,245,0.08)" }}>
                <Dog className="size-3 text-[#F27E13]/80" />{call.pets.map((p) => p.name).join(", ")}
              </span>
            )}
            {call.outstandingBalance !== undefined && call.outstandingBalance > 0 && (
              <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] text-[#F27E13]"
                style={{ background: "rgba(242,126,19,0.15)" }}>
                <DollarSign className="size-3" />${call.outstandingBalance.toFixed(2)}
              </span>
            )}
          </div>

          {call.tags && call.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
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

        {/* Notes */}
        <div className="px-5 pb-4">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Call notes…"
            className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-white placeholder:text-[#CDEAF5]/20 focus:outline-none"
            style={{ background: "rgba(205,234,245,0.07)", border: "1px solid rgba(205,234,245,0.08)" }} />
        </div>

        {/* DTMF */}
        {showKeypad && (
          <div className="px-5 pb-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex-1 rounded-2xl px-4 py-2 font-mono text-sm text-white"
                style={{ background: "rgba(205,234,245,0.07)", border: "1px solid rgba(205,234,245,0.08)" }}>
                {dtmfInput || <span style={{ color: "rgba(205,234,245,0.2)" }}>—</span>}
              </div>
              <button onClick={() => setDtmfInput("")}
                className="flex size-9 items-center justify-center rounded-xl"
                style={{ border: "1px solid rgba(205,234,245,0.1)", color: "rgba(205,234,245,0.35)" }}>
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DTMF_KEYS.map((k) => (
                <button key={k} onClick={() => setDtmfInput(dtmfInput + k)}
                  className="rounded-2xl py-3.5 text-lg font-semibold text-white active:scale-95"
                  style={{ background: "rgba(205,234,245,0.08)" }}>
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-5 pb-4">
          <div className="grid grid-cols-4 gap-2">
            <CtrlBtn icon={muted ? MicOff : Mic} label={muted ? "Unmute" : "Mute"} active={muted}
              activeBg="rgba(239,68,68,0.2)" activeText="#f87171" onClick={() => setMuted(!muted)} />
            <CtrlBtn icon={onHold ? Play : Pause} label={onHold ? "Resume" : "Hold"} active={onHold}
              activeBg="rgba(242,126,19,0.2)" activeText="#F27E13" onClick={() => setOnHold(!onHold)} />
            <CtrlBtn icon={Grid3x3} label="Keypad" active={showKeypad}
              activeBg="rgba(14,165,233,0.2)" activeText="#0EA5E9" onClick={() => setShowKeypad(!showKeypad)} />
            <CtrlBtn icon={PhoneForwarded} label="Transfer" onClick={onTransfer} />
          </div>
        </div>

        {/* Add staff + end */}
        <div className="px-5 pb-10 space-y-3">
          <button onClick={() => alert("Adding staff to call…")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-[#CDEAF5]/55 transition-colors"
            style={{ background: "rgba(205,234,245,0.07)" }}>
            <Users className="size-4" />Add Staff to Call
          </button>
          <button onClick={onEnd}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: "#EF4444", boxShadow: "0 8px 32px rgba(239,68,68,0.4)" }}>
            <Phone className="size-5 rotate-[135deg]" />End Call
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
export function ActiveCallPanel({ call, onEnd, onTransfer, onMinimizeChange }: ActiveCallPanelProps) {
  const [muted, setMuted] = useState(call.isMuted);
  const [onHold, setOnHold] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [notes, setNotes] = useState("");
  const [dtmfInput, setDtmfInput] = useState("");
  const [minimized, setMinimized] = useState(false);
  const timer = useCallTimer(call.startTime);

  const handleMinimize = (val: boolean) => {
    setMinimized(val);
    onMinimizeChange?.(val);
  };

  const shared = { call, timer, muted, onHold, showKeypad, notes, dtmfInput, setMuted, setOnHold, setShowKeypad, setNotes, setDtmfInput, onEnd, onTransfer };

  return (
    <>
      {minimized
        ? <MinimizedPill {...{ call, timer, muted, onHold, setMuted, setOnHold, onEnd }} onExpand={() => handleMinimize(false)} />
        : <DesktopWidget {...shared} onMinimize={() => handleMinimize(true)} />
      }
      <MobileActiveCall {...shared} />
    </>
  );
}
