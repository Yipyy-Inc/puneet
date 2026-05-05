"use client";

import { useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Flag,
  Star,
  StarOff,
  CheckCircle2,
  Circle,
  MapPin,
  UserPlus,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { Thread } from "./ContactList";
import type { MessagingStaff } from "@/data/saved-replies";

const TAG_STYLES: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700 border-amber-200",
  new_lead: "bg-emerald-100 text-emerald-700 border-emerald-200",
  overdue_payment: "bg-red-100 text-red-700 border-red-200",
  boarding_now: "bg-blue-100 text-blue-700 border-blue-200",
  high_priority: "bg-orange-100 text-orange-700 border-orange-200",
  needs_follow_up: "bg-violet-100 text-violet-700 border-violet-200",
  vaccine_expired: "bg-yellow-100 text-yellow-700 border-yellow-200",
  complaint: "bg-rose-100 text-rose-700 border-rose-200",
  upsell_opportunity: "bg-teal-100 text-teal-700 border-teal-200",
};

const TAG_LABELS: Record<string, string> = {
  vip: "VIP",
  new_lead: "New Lead",
  overdue_payment: "Overdue",
  boarding_now: "Boarding",
  high_priority: "High Priority",
  needs_follow_up: "Follow-up",
  vaccine_expired: "Vaccine Exp.",
  complaint: "Complaint",
  upsell_opportunity: "Upsell",
};

const COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-pink-500",
  "bg-teal-500",
];

function avatarColor(name: string) {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ConversationRow({
  thread,
  selected,
  isStarred,
  isPriority,
  isFollowUp,
  isClosed,
  assignee,
  staffOptions,
  locationLabel,
  preferredLanguageLabel,
  onSelect,
  onToggleStar,
  onTogglePriority,
  onToggleFollowUp,
  onToggleClosed,
  onAssign,
}: {
  thread: Thread;
  selected: boolean;
  isStarred: boolean;
  isPriority: boolean;
  isFollowUp: boolean;
  isClosed: boolean;
  assignee?: MessagingStaff;
  staffOptions: MessagingStaff[];
  locationLabel?: string;
  preferredLanguageLabel: string | null;
  onSelect: (threadId: string) => void;
  onToggleStar: (threadId: string) => void;
  onTogglePriority: (threadId: string) => void;
  onToggleFollowUp: (threadId: string) => void;
  onToggleClosed: (threadId: string) => void;
  onAssign: (threadId: string, staffId: string | null) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const failed = !thread.isPlaceholder && thread.lastMessage.status === "failed";
  const visibleTags = (thread.meta?.tags ?? [])
    .filter((t) => t !== "high_priority" && t !== "needs_follow_up")
    .slice(0, 2);
  const status = thread.meta?.status;

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const touch = e.touches[0];
    const x = touch?.clientX ?? 0;
    const y = touch?.clientY ?? 0;
    longPressTimer.current = setTimeout(() => {
      const evt = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      });
      target.dispatchEvent(evt);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(thread.threadId)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(thread.threadId);
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onTouchCancel={cancelLongPress}
          className={cn(
            "relative flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-all select-none",
            selected ? "bg-slate-100" : "hover:bg-slate-50",
            isPriority && "bg-orange-50/40",
          )}
        >
          {/* Priority left rail */}
          {isPriority && (
            <span
              aria-hidden
              className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-orange-500"
            />
          )}

          {/* Avatar */}
          <div className="relative mt-0.5 shrink-0">
            {thread.clientImage ? (
              <img
                src={thread.clientImage}
                alt=""
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-full text-sm font-bold text-white",
                  avatarColor(thread.clientName),
                )}
              >
                {initials(thread.clientName)}
              </div>
            )}
            {thread.unreadCount > 0 && (
              <div className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white bg-emerald-500" />
            )}
            {assignee && (
              <div
                className={cn(
                  "absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white shadow ring-2 ring-white",
                  assignee.color,
                )}
                title={`Assigned to ${assignee.name}`}
              >
                {assignee.initials}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex min-w-0 items-center gap-1.5">
                {isPriority && (
                  <Flag
                    className="size-3 shrink-0 fill-orange-500 text-orange-500"
                    aria-label="Priority"
                  />
                )}
                <span
                  className={cn(
                    "truncate text-sm",
                    thread.unreadCount > 0
                      ? "font-bold text-slate-900"
                      : "font-medium text-slate-700",
                  )}
                >
                  {thread.clientName}
                </span>
                {preferredLanguageLabel && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] leading-none font-semibold text-indigo-700">
                    {preferredLanguageLabel}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isStarred && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(thread.threadId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onToggleStar(thread.threadId);
                      }
                    }}
                    className="cursor-pointer text-amber-400 hover:text-amber-500"
                    title="Unstar"
                  >
                    <Star className="size-3 fill-current" />
                  </div>
                )}
                {!isStarred && selected && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(thread.threadId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onToggleStar(thread.threadId);
                      }
                    }}
                    className="cursor-pointer text-slate-300 hover:text-amber-400"
                    title="Star"
                  >
                    <StarOff className="size-3" />
                  </div>
                )}
                <span
                  className={cn(
                    "text-[10px]",
                    thread.unreadCount > 0
                      ? "font-semibold text-slate-900"
                      : "text-slate-400",
                  )}
                >
                  {thread.isPlaceholder ? "new" : relTime(thread.lastMessage.timestamp)}
                </span>
              </div>
            </div>

            <div className="mt-0.5 flex items-center justify-between gap-2">
              {failed ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="size-3" />
                  Failed
                </span>
              ) : (
                <span
                  className={cn(
                    "truncate text-xs",
                    thread.unreadCount > 0 ? "text-slate-600" : "text-slate-400",
                  )}
                >
                  {thread.lastMessage.direction === "outbound" && "You: "}
                  {thread.isPlaceholder ? "No messages yet" : thread.lastMessage.body}
                </span>
              )}
              {thread.unreadCount > 0 && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  {thread.unreadCount}
                </span>
              )}
            </div>

            {/* Tags row */}
            {(visibleTags.length > 0 ||
              isPriority ||
              isFollowUp ||
              isClosed ||
              locationLabel ||
              status === "pending_client") && (
              <div className="mt-1 flex flex-wrap gap-1">
                {isPriority && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">
                    <Flag className="size-2.5" />
                    Priority
                  </span>
                )}
                {isFollowUp && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">
                    <Clock className="size-2.5" />
                    Follow-up
                  </span>
                )}
                {isClosed && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                    <CheckCircle2 className="size-2.5" />
                    Closed
                  </span>
                )}
                {status === "pending_client" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                    <AlertTriangle className="size-2.5" />
                    Pending
                  </span>
                )}
                {locationLabel && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                    <MapPin className="size-2.5" />
                    {locationLabel}
                  </span>
                )}
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                      TAG_STYLES[tag] ?? "border-slate-200 bg-slate-100 text-slate-600",
                    )}
                  >
                    {TAG_LABELS[tag] ?? tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={() => onTogglePriority(thread.threadId)}>
          <Flag
            className={cn(
              "size-4",
              isPriority ? "fill-orange-500 text-orange-500" : "text-slate-500",
            )}
          />
          {isPriority ? "Remove Priority" : "Mark as Priority"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onToggleFollowUp(thread.threadId)}>
          <Clock
            className={cn(
              "size-4",
              isFollowUp ? "text-violet-600" : "text-slate-500",
            )}
          />
          {isFollowUp ? "Clear Follow-up" : "Mark for Follow-up"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onToggleClosed(thread.threadId)}>
          {isClosed ? (
            <Circle className="size-4 text-emerald-500" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          {isClosed ? "Reopen Conversation" : "Mark as Closed"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel className="flex items-center gap-2 px-2">
          <UserPlus className="size-3.5 text-slate-400" />
          {assignee ? `Assigned: ${assignee.name}` : "Assign to staff"}
        </ContextMenuLabel>
        {staffOptions.map((s) => (
          <ContextMenuItem
            key={s.id}
            onSelect={() => onAssign(thread.threadId, s.id)}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                s.color,
              )}
            >
              {s.initials}
            </span>
            <span className="flex-1 text-xs">{s.name}</span>
            {assignee?.id === s.id && (
              <CheckCircle2 className="size-3 text-emerald-500" />
            )}
          </ContextMenuItem>
        ))}
        {assignee && (
          <ContextMenuItem
            onSelect={() => onAssign(thread.threadId, null)}
            className="text-red-500"
          >
            Unassign
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onToggleStar(thread.threadId)}>
          {isStarred ? (
            <StarOff className="size-4 text-slate-500" />
          ) : (
            <Star className="size-4 text-slate-500" />
          )}
          {isStarred ? "Unstar" : "Star"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
