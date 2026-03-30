"use client";

import { cn } from "@/lib/utils";
import { Check, CheckCheck, Eye, AlertCircle } from "lucide-react";
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
      return <Eye className="text-primary size-3" />;
    case "failed":
      return <AlertCircle className="text-destructive size-3" />;
    default:
      return null;
  }
}

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] space-y-1 rounded-2xl px-4 py-2.5",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
        )}
      >
        <p className="text-[13px] leading-relaxed">{message.body}</p>
        <div
          className={cn(
            "flex items-center gap-1.5",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          <ChannelBadge channel={message.type} size="xs" />
          <span
            className={cn(
              "text-[10px]",
              isOutbound
                ? "text-primary-foreground/60"
                : "text-muted-foreground",
            )}
          >
            {formatTime(message.timestamp)}
          </span>
          {isOutbound && <DeliveryIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export function SystemMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-[10px]">
        {text}
      </span>
    </div>
  );
}

export function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const label =
    days === 0
      ? "Today"
      : days === 1
        ? "Yesterday"
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <div className="bg-border h-px flex-1" />
    </div>
  );
}
