"use client";

import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Smartphone } from "lucide-react";

const CHANNEL_CONFIG: Record<
  string,
  { icon: typeof Mail; label: string; class: string }
> = {
  email: { icon: Mail, label: "Email", class: "text-blue-600" },
  sms: { icon: Smartphone, label: "SMS", class: "text-green-600" },
  "in-app": { icon: MessageSquare, label: "Chat", class: "text-violet-600" },
  call: { icon: Smartphone, label: "Call", class: "text-amber-600" },
  note: { icon: MessageSquare, label: "Note", class: "text-zinc-500" },
};

export function ChannelBadge({
  channel,
  size = "sm",
}: {
  channel: string;
  size?: "xs" | "sm";
}) {
  const config = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG["in-app"];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "border-border/60 inline-flex items-center gap-1 rounded-full border bg-transparent font-medium",
        size === "xs" ? "px-1.5 py-0 text-[9px]" : "px-2 py-0.5 text-[10px]",
      )}
    >
      <Icon className={cn("size-2.5", config.class)} />
      {config.label}
    </span>
  );
}
