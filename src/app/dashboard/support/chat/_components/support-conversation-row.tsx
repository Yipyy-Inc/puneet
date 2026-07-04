"use client";

import { useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Mail,
  MessageSquare,
  Smartphone,
  Star,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import {
  agentName,
  assignConversation,
  lastMessage,
  setConversationFollowUp,
  setConversationPriority,
  setConversationStarred,
  setConversationStatus,
  supportAgents,
} from "@/hooks/use-support-inbox";
import type { SupportChannel, SupportConversation } from "@/types/support-chat";
import { FacilityAvatar } from "./facility-avatar";
import { formatTime } from "./support-chat-utils";

const CHANNEL_META: Record<
  SupportChannel,
  { label: string; icon: typeof Mail; className: string }
> = {
  chat: {
    label: "Chat",
    icon: MessageSquare,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  email: {
    label: "Email",
    icon: Mail,
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-300",
  },
  sms: {
    label: "SMS",
    icon: Smartphone,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
  },
};

const AGENT_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SupportConversationRow({
  conversation: c,
  selected,
  onSelect,
}: {
  conversation: SupportConversation;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const m = lastMessage(c);
  const unread = c.unreadCount > 0;
  const isClosed = c.status === "closed" || c.status === "resolved";
  const channel = CHANNEL_META[c.channel] ?? CHANNEL_META.chat;
  const ChannelIcon = channel.icon;
  const assignedName = agentName(c.assignedAgentId);

  // Long-press opens the same context menu on touch devices (swipe/hold).
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const t = e.touches[0];
    const x = t?.clientX ?? 0;
    const y = t?.clientY ?? 0;
    longPress.current = setTimeout(() => {
      target.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        }),
      );
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPress.current) {
      clearTimeout(longPress.current);
      longPress.current = null;
    }
  };

  const togglePriority = () => {
    setConversationPriority(c.id, !c.priority);
    if (c.priority) toast("Priority removed");
    else toast.success("Marked as Priority");
  };
  const toggleFollowUp = () => {
    setConversationFollowUp(c.id, !c.followUp);
    if (c.followUp) toast("Follow-up cleared");
    else toast.success("Marked for Follow-up");
  };
  const toggleClosed = () => {
    if (isClosed) {
      setConversationStatus(c.id, "open");
      toast("Conversation reopened");
    } else {
      setConversationStatus(c.id, "closed");
      toast.success("Conversation closed");
    }
  };
  const toggleStar = () => {
    setConversationStarred(c.id, !c.starred);
    if (c.starred) toast("Removed star");
    else toast.success("Conversation starred");
  };
  const assignTo = (agentId: number | null, name: string) => {
    assignConversation(c.id, agentId);
    if (agentId === null) toast("Unassigned");
    else toast.success(`Assigned to ${name}`);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(c.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(c.id);
            }
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onTouchCancel={cancelLongPress}
          className={cn(
            "relative flex w-full cursor-pointer items-start gap-3 border-b p-3 text-left transition-colors select-none",
            selected ? "bg-muted" : "hover:bg-muted/50",
            c.priority && "bg-rose-500/4",
          )}
        >
          {c.priority && (
            <span
              aria-hidden
              className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-rose-500"
            />
          )}

          <FacilityAvatar name={c.facilityName} id={c.facilityId} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "truncate text-sm",
                    unread ? "font-semibold" : "font-medium",
                  )}
                >
                  {c.facilityName}
                </span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-semibold",
                    channel.className,
                  )}
                  title={`Channel: ${channel.label}`}
                >
                  <ChannelIcon className="size-2.5" />
                  {channel.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {c.starred && (
                  <Star
                    className="size-3 fill-amber-400 text-amber-400"
                    aria-label="Starred"
                  />
                )}
                <span className="text-muted-foreground text-[10px]">
                  {m ? formatTime(m.at) : ""}
                </span>
              </div>
            </div>

            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {m
                  ? m.isInternalNote
                    ? "Internal note"
                    : m.body
                  : "No messages yet"}
              </p>
              {unread && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
                  {c.unreadCount}
                </span>
              )}
            </div>

            {(c.priority || c.followUp || isClosed || assignedName) && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {c.priority && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                    <Flag className="size-2.5" />
                    Priority
                  </span>
                )}
                {c.followUp && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                    <Clock className="size-2.5" />
                    Follow-up
                  </span>
                )}
                {isClosed && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    <CheckCircle2 className="size-2.5" />
                    Closed
                  </span>
                )}
                {assignedName && (
                  <span className="text-muted-foreground inline-flex items-center gap-0.5 text-[9px] font-medium">
                    <UserPlus className="size-2.5" />
                    {assignedName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={togglePriority}>
          <Flag
            className={cn(
              "size-4",
              c.priority
                ? "fill-rose-500 text-rose-500"
                : "text-muted-foreground",
            )}
          />
          {c.priority ? "Remove Priority" : "Mark as Priority"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={toggleFollowUp}>
          <Clock
            className={cn(
              "size-4",
              c.followUp ? "text-violet-600" : "text-muted-foreground",
            )}
          />
          {c.followUp ? "Clear Follow-up" : "Mark for Follow-up"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={toggleClosed}>
          {isClosed ? (
            <Circle className="size-4 text-emerald-500" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          {isClosed ? "Reopen Conversation" : "Mark as Closed"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel className="flex items-center gap-2 px-2">
          <UserPlus className="text-muted-foreground size-3.5" />
          {assignedName ? `Assigned: ${assignedName}` : "Assign to agent"}
        </ContextMenuLabel>
        {supportAgents.map((agent, i) => (
          <ContextMenuItem
            key={agent.id}
            onSelect={() => assignTo(agent.id, agent.name)}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                AGENT_COLORS[i % AGENT_COLORS.length],
              )}
            >
              {initials(agent.name)}
            </span>
            <span className="flex-1 text-xs">{agent.name}</span>
            {c.assignedAgentId === agent.id && (
              <CheckCircle2 className="size-3 text-emerald-500" />
            )}
          </ContextMenuItem>
        ))}
        {c.assignedAgentId !== null && (
          <ContextMenuItem
            onSelect={() => assignTo(null, "")}
            className="text-red-500"
          >
            Unassign
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={toggleStar}>
          <Star
            className={cn(
              "size-4",
              c.starred
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
          {c.starred ? "Unstar" : "Star conversation"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
