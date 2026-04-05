"use client";

import { cn } from "@/lib/utils";
import {
  Check,
  CheckCheck,
  AlertCircle,
  Mail,
  Smartphone,
  MessageSquare,
} from "lucide-react";
import type { Message } from "@/types/communications";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "sent") return <Check className="size-3 text-white/40" />;
  if (status === "delivered")
    return <CheckCheck className="size-3 text-white/40" />;
  if (status === "read") return <CheckCheck className="size-3 text-sky-200" />;
  if (status === "failed")
    return <AlertCircle className="size-3 text-red-300" />;
  return null;
}

function ChannelIcon({ type }: { type: string }) {
  if (type === "email") return <Mail className="size-2.5 text-slate-300" />;
  if (type === "sms") return <Smartphone className="size-2.5 text-slate-300" />;
  return <MessageSquare className="size-2.5 text-slate-300" />;
}

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
];

export function MessageBubble({
  message,
  clientName,
  showAvatar = true,
}: {
  message: Message;
  clientName?: string;
  showAvatar?: boolean;
}) {
  const out = message.direction === "outbound";
  const failed = message.status === "failed";
  const color =
    AVATAR_COLORS[(clientName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

  return (
    <div
      className={cn(
        "group flex gap-2 py-[3px]",
        out ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar — only for inbound */}
      {!out && showAvatar ? (
        <div
          className={cn(
            "mt-auto flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm",
            color,
          )}
        >
          {clientName?.charAt(0).toUpperCase() ?? "?"}
        </div>
      ) : !out ? (
        <div className="w-8 shrink-0" />
      ) : null}

      <div className={cn("max-w-[60%]")}>
        {/* Bubble */}
        <div
          className={cn(
            "relative px-4 py-2.5",
            out
              ? "rounded-[20px] rounded-br-[6px] bg-blue-500 text-white shadow-sm"
              : "rounded-[20px] rounded-bl-[6px] border border-slate-100 bg-white text-slate-800 shadow-sm",
            failed && "ring-2 ring-red-400/40",
          )}
        >
          {/* Email subject line */}
          {message.subject && (
            <p
              className={cn(
                "mb-1 text-[11px] font-semibold",
                out ? "text-white/80" : "text-slate-500",
              )}
            >
              {message.subject}
            </p>
          )}

          <p className="text-[13.5px] leading-[1.55] whitespace-pre-wrap">
            {message.body}
          </p>

          {/* Time + status row inside bubble */}
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1.5",
              out ? "justify-end" : "justify-start",
            )}
          >
            {!out && <ChannelIcon type={message.type} />}
            <span
              className={cn(
                "text-[10px]",
                out ? "text-white/50" : "text-slate-400",
              )}
            >
              {formatTime(message.timestamp)}
            </span>
            {out && <StatusIcon status={message.status} />}
          </div>
        </div>

        {/* Failed retry */}
        {failed && (
          <p
            className={cn(
              "mt-1 text-[10px] text-red-500",
              out ? "text-right" : "text-left",
            )}
          >
            Not delivered ·{" "}
            <button type="button" className="font-semibold underline">
              Retry
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="h-px flex-1 bg-slate-200/70" />
      <span className="text-[11px] font-medium text-slate-400">{date}</span>
      <div className="h-px flex-1 bg-slate-200/70" />
    </div>
  );
}

export function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-slate-100 px-4 py-1.5 text-[11px] text-slate-400">
        {text}
      </span>
    </div>
  );
}
