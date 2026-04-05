"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Sunrise,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAllTaskNotifications,
  type TaskNotificationPriority,
} from "@/lib/task-notifications";

const priorityStyles: Record<
  TaskNotificationPriority,
  { icon: typeof AlertTriangle; border: string; bg: string; text: string }
> = {
  critical: {
    icon: AlertTriangle,
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
  },
  high: {
    icon: Clock,
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  medium: {
    icon: ClipboardList,
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  low: {
    icon: Sunrise,
    border: "border-slate-200",
    bg: "bg-slate-50",
    text: "text-slate-600",
  },
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TaskNotificationsPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const notifications = useMemo(() => getAllTaskNotifications(), []);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const unreadCount = visible.filter((n) => !n.readAt).length;
  const criticalCount = visible.filter((n) => n.priority === "critical").length;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <ClipboardList className="size-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                criticalCount > 0 ? "animate-pulse bg-red-500" : "bg-primary",
              )}
            >
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Task Notifications</p>
            <p className="text-muted-foreground text-xs">
              {unreadCount} unread
              {criticalCount > 0 && (
                <span className="ml-1 font-medium text-red-600">
                  · {criticalCount} critical
                </span>
              )}
            </p>
          </div>
          {visible.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 text-[11px]"
              onClick={() =>
                setDismissed(new Set(notifications.map((n) => n.id)))
              }
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Notifications */}
        <div className="max-h-[400px] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="text-muted-foreground/20 mx-auto size-8" />
              <p className="text-muted-foreground mt-2 text-sm">
                All caught up
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visible.map((notif) => {
                const style = priorityStyles[notif.priority];
                const Icon = style.icon;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "group hover:bg-muted/30 relative flex cursor-pointer gap-3 px-4 py-3 transition-colors",
                      notif.priority === "critical" && "bg-red-50/50",
                    )}
                    onClick={() => {
                      const url = notif.taskId
                        ? `/facility/dashboard/tasks?taskId=${notif.taskId}`
                        : (notif.actionUrl ?? "/facility/dashboard/tasks");
                      router.push(url);
                      setOpen(false);
                    }}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                        style.bg,
                      )}
                    >
                      <Icon className={cn("size-3.5", style.text)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          notif.priority === "critical" && "text-red-800",
                        )}
                      >
                        {notif.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="text-muted-foreground/60 mt-1 flex items-center gap-2 text-[10px]">
                        <span>{fmtRelative(notif.createdAt)}</span>
                        {notif.assignedTo && <span>· {notif.assignedTo}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notif.id);
                      }}
                      className="text-muted-foreground/40 hover:text-muted-foreground absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <Link
            href="/facility/dashboard/tasks"
            className="text-primary flex items-center justify-center gap-1 text-xs font-medium hover:underline"
            onClick={() => setOpen(false)}
          >
            View Task Management Center
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
