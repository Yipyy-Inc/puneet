"use client";

import { cn } from "@/lib/utils";
import { Check, CheckCheck, AlertCircle, Zap } from "lucide-react";
import { ChannelBadge } from "./ChannelBadge";
import type { Message } from "@/types/communications";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function DeliveryIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "sent":
      return <Check className="text-muted-foreground size-3" />;
    case "delivered":
      return <CheckCheck className="text-muted-foreground size-3" />;
    case "read":
      return <CheckCheck className="size-3 text-blue-500" />;
    case "failed":
      return <AlertCircle className="text-destructive size-3" />;
    default:
      return null;
  }
}

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
];

export function MessageBubble({
  message,
  clientName,
}: {
  message: Message;
  clientName?: string;
}) {
  const isOutbound = message.direction === "outbound";
  const isFailed = message.status === "failed";

  return (
    <div
      className={cn(
        "flex gap-2 py-1",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      {/* Inbound avatar */}
      {!isOutbound && clientName && (
        <div
          className={cn(
            "mt-auto flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
            AVATAR_COLORS[
              (clientName.charCodeAt(0) ?? 0) % AVATAR_COLORS.length
            ],
          )}
        >
          {clientName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="max-w-[65%]">
        {/* Sender label for inbound */}
        {!isOutbound && clientName && (
          <p className="mb-0.5 text-[10px] font-medium text-slate-500">
            {clientName}
          </p>
        )}

        <div
          className={cn(
            "space-y-1 rounded-2xl px-4 py-2.5",
            isOutbound
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "rounded-bl-sm bg-white shadow-sm ring-1 ring-slate-100",
            isFailed && "ring-2 ring-red-300",
          )}
        >
          <p className="text-[13px] leading-relaxed">{message.body}</p>

          {/* Failed retry */}
          {isFailed && (
            <p className="flex items-center gap-1 text-[10px] text-red-400">
              <AlertCircle className="size-3" />
              Failed to send ·{" "}
              <button type="button" className="font-medium underline">
                Retry
              </button>
            </p>
          )}
        </div>

        {/* Meta below bubble */}
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1.5 px-1",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-[10px] text-slate-400">
            {formatTime(message.timestamp)}
          </span>
          <ChannelBadge channel={message.type} size="micro" />
          {isOutbound && <DeliveryIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
        <Zap className="size-3 text-amber-500" />
        <span className="text-[11px] text-slate-500">{text}</span>
      </div>
    </div>
  );
}

export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium tracking-wider text-slate-400 uppercase shadow-sm ring-1 ring-slate-100">
        {date}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
