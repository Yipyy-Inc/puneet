"use client";

import { useState } from "react";
import Link from "next/link";
import { AlarmClock, CalendarOff, ArrowLeftRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  enhancedTimeOffRequests,
  enhancedShiftSwaps,
  broadcastMessages,
} from "@/data/scheduling";

type ScheduleNotif = {
  id: string;
  title: string;
  message: string;
  type: "timeoff" | "swap" | "broadcast";
  timestamp: string;
  link: string;
};

function buildNotifications(): ScheduleNotif[] {
  const notifs: ScheduleNotif[] = [];

  for (const req of enhancedTimeOffRequests.filter((r) => r.status === "pending")) {
    notifs.push({
      id: req.id,
      title: "Time-off request",
      message: `${req.employeeName} — ${req.type.replace(/_/g, " ")} starting ${req.startDate}`,
      type: "timeoff",
      timestamp: req.requestedAt + "T12:00:00Z",
      link: "/facility/dashboard/services/scheduling/time-off",
    });
  }

  for (const swap of enhancedShiftSwaps.filter((s) => s.status === "pending")) {
    notifs.push({
      id: swap.id,
      title: "Shift swap request",
      message: `${swap.requestingEmployeeName} ↔ ${swap.targetEmployeeName} on ${swap.requestingShiftDate}`,
      type: "swap",
      timestamp: swap.requestedAt + "T12:00:00Z",
      link: "/facility/dashboard/services/scheduling/shift-swaps",
    });
  }

  for (const msg of broadcastMessages.slice(0, 2)) {
    notifs.push({
      id: msg.id,
      title: msg.subject,
      message: `Sent to ${msg.recipientCount} staff by ${msg.sentByName}`,
      type: "broadcast",
      timestamp: msg.sentAt,
      link: "/facility/dashboard/services/scheduling/notifications",
    });
  }

  return notifs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

const INITIAL_NOTIFS = buildNotifications();

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return d.toLocaleDateString();
}

function NotifIcon({ type }: { type: ScheduleNotif["type"] }) {
  if (type === "timeoff")
    return <CalendarOff className="size-4 text-amber-500" />;
  if (type === "swap")
    return <ArrowLeftRight className="size-4 text-blue-500" />;
  return <Send className="size-4 text-indigo-500" />;
}

export function ScheduleNotificationsDropdown() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const unreadCount = INITIAL_NOTIFS.filter((n) => !readIds.has(n.id)).length;
  const hasUnread = unreadCount > 0;

  const markRead = (id: string) =>
    setReadIds((prev) => new Set([...prev, id]));

  const markAllRead = () =>
    setReadIds(new Set(INITIAL_NOTIFS.map((n) => n.id)));

  return (
    <TooltipProvider delayDuration={150}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="group relative size-10 rounded-xl"
                aria-label="Schedule alerts"
              >
                <AlarmClock className="text-muted-foreground size-5 transition-colors group-hover:text-foreground" />
                {hasUnread && (
                  <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Schedule alerts
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="end"
          className="flex w-[calc(100vw-2rem)] flex-col sm:w-80"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Schedule alerts</span>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-auto p-0 text-xs"
                onClick={markAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {INITIAL_NOTIFS.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No schedule alerts
              </div>
            ) : (
              <div className="py-1">
                {INITIAL_NOTIFS.map((n) => {
                  const isRead = readIds.has(n.id);
                  return (
                    <Link
                      key={n.id}
                      href={n.link}
                      className="block"
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      <div
                        className={cn(
                          "hover:bg-muted/50 flex gap-2 px-3 py-2",
                          !isRead && "bg-primary/5",
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          <NotifIcon type={n.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {n.message}
                          </p>
                          <p className="text-muted-foreground mt-1 text-[10px]">
                            {formatTime(n.timestamp)}
                          </p>
                        </div>
                        {!isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 shrink-0 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead(n.id);
                            }}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t px-3 py-2">
            <Link
              href="/facility/dashboard/services/scheduling/notifications"
              className="text-primary text-xs hover:underline"
              onClick={() => setOpen(false)}
            >
              View schedule notifications
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
