"use client";

import { cn } from "@/lib/utils";
import { Check, CheckCheck, AlertCircle } from "lucide-react";
import type { Message } from "@/types/communications";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusIcon({ status }: { status: Message["status"] }) {
  if (status === "sent") return <Check className="size-3 text-white/50" />;
  if (status === "delivered")
    return <CheckCheck className="size-3 text-white/50" />;
  if (status === "read") return <CheckCheck className="size-3 text-sky-200" />;
  if (status === "failed")
    return <AlertCircle className="size-3 text-red-300" />;
  return null;
}

const COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
];

export function MessageBubble({
  message,
  clientName,
}: {
  message: Message;
  clientName?: string;
}) {
  const out = message.direction === "outbound";
  const failed = message.status === "failed";

  return (
    <div className={cn("flex py-0.5", out ? "justify-end" : "justify-start")}>
      {/* Inbound avatar */}
      {!out && clientName && (
        <div
          className={cn(
            "mt-auto mr-2 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
            COLORS[(clientName.charCodeAt(0) ?? 0) % COLORS.length],
          )}
        >
          {clientName.charAt(0)}
        </div>
      )}

      <div className={cn("max-w-[55%]", out ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative px-4 py-2.5",
            out
              ? "rounded-2xl rounded-br-[4px] bg-blue-500 text-white"
              : "rounded-2xl rounded-bl-[4px] bg-white text-slate-800 shadow-sm",
            failed && "ring-2 ring-red-400/50",
          )}
        >
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
            {message.body}
          </p>
          <div
            className={cn(
              "mt-1 flex items-center gap-1",
              out ? "justify-end" : "justify-start",
            )}
          >
            <span
              className={cn(
                "text-[10px]",
                out ? "text-white/60" : "text-slate-400",
              )}
            >
              {formatTime(message.timestamp)}
            </span>
            {out && <StatusIcon status={message.status} />}
          </div>
        </div>

        {failed && (
          <p className="mt-0.5 px-1 text-[10px] text-red-500">
            Not sent ·{" "}
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
    <div className="flex justify-center py-3">
      <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[10px] font-semibold text-slate-500">
        {date}
      </span>
    </div>
  );
}

export function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-400">
        {text}
      </span>
    </div>
  );
}
