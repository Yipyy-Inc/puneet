"use client";

import { cn } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Smartphone,
  Phone,
  StickyNote,
} from "lucide-react";

const CHANNEL_CONFIG: Record<
  string,
  { icon: typeof Mail; label: string; class: string; dot: string }
> = {
  email: {
    icon: Mail,
    label: "Email",
    class: "text-blue-600",
    dot: "bg-blue-500",
  },
  sms: {
    icon: Smartphone,
    label: "SMS",
    class: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  "in-app": {
    icon: MessageSquare,
    label: "Chat",
    class: "text-violet-600",
    dot: "bg-violet-500",
  },
  call: {
    icon: Phone,
    label: "Call",
    class: "text-amber-600",
    dot: "bg-amber-500",
  },
  note: {
    icon: StickyNote,
    label: "Note",
    class: "text-slate-500",
    dot: "bg-slate-400",
  },
};

export function ChannelBadge({
  channel,
  size = "sm",
}: {
  channel: string;
  size?: "xs" | "sm" | "micro";
}) {
  const config = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG["in-app"];
  const Icon = config.icon;

  if (size === "micro") {
    return <Icon className={cn("size-3", config.class)} />;
  }

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
