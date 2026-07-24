"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
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
import {
  markFacilityNotificationRead,
  markAllFacilityNotificationsRead,
  useFacilityNotifications,
} from "@/data/facility-notifications";
import { isUrgentNotification } from "@/types/facility";
import type { FacilityNotification } from "@/types/facility";
import { NotificationTypeIcon } from "@/lib/notification-icons";
import {
  useScheduleNotifications,
  swapIdFromNotification,
  ShiftSwapNotificationActions,
} from "@/lib/schedule-notifications";
import {
  useTaskNotifications,
  taskIdFromNotification,
  TaskCompleteAction,
} from "@/lib/task-notifications-feed";
import { useAnnouncementNotifications } from "@/lib/announcement-notifications";
import { useBookingRequestNotifications } from "@/lib/booking-request-notifications";
import {
  isExpressCheckinMissing,
  ExpressCheckinReminderAction,
} from "@/lib/express-checkin-reminder";
import { NotificationRowMenu } from "@/components/facility/NotificationRowMenu";
import { cn } from "@/lib/utils";

interface FacilityNotificationsDropdownProps {
  facilityId?: number;
  /** Where "View all notifications →" points. Defaults to the facility center;
   *  the employee portal passes its own in-portal route. */
  viewAllHref?: string;
}

// An unread urgent notification needs action: it floats to the top under the
// "Action Required" sub-header, gets a red left border, and clears only when
// the user acts on it (no quick "Mark read"). Read urgent items are normal.
function isActionRequired(n: FacilityNotification): boolean {
  return !n.read && isUrgentNotification(n);
}

const CATEGORY_LABEL: Record<string, string> = {
  customers: "Customers",
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
  forms: "Forms",
  yipyygo: "Express Check-in",
  schedule: "Schedule",
  tasks: "Tasks",
};

function categoryLabel(c: string): string {
  return CATEGORY_LABEL[c] ?? c.charAt(0).toUpperCase() + c.slice(1);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

function NotificationRow({
  n,
  urgent,
  canToggleRead,
  onMarkRead,
  onClose,
}: {
  n: FacilityNotification;
  urgent: boolean;
  canToggleRead: boolean;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}) {
  // Shift-swap rows resolve in place with Approve/Decline (spec Table 33) and
  // task rows with "Mark Complete" (spec Table 34) instead of a "Mark read" link.
  const swapId = swapIdFromNotification(n);
  const taskId = taskIdFromNotification(n);
  const content = (
    <div
      className={cn(
        "hover:bg-muted/50 flex gap-2.5 px-4 py-2.5 transition-colors",
        urgent
          ? "border-l-2 border-red-500 bg-red-50/50 dark:bg-red-950/20"
          : !n.read && "bg-primary/5",
      )}
    >
      <div className="mt-0.5 shrink-0">
        <NotificationTypeIcon n={n} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{n.title}</p>
        <p className="text-muted-foreground text-xs">{n.message}</p>
        <p className="text-muted-foreground mt-1 text-[10px]">
          {formatTime(n.timestamp)}
        </p>
        {swapId && (
          <div className="mt-2">
            <ShiftSwapNotificationActions swapId={swapId} />
          </div>
        )}
        {taskId && (
          <div className="mt-2">
            <TaskCompleteAction taskId={taskId} />
          </div>
        )}
        {/* Table 39 — one-click "Send Reminder" for a missing express check-in. */}
        {isExpressCheckinMissing(n) && (
          <div className="mt-2">
            <ExpressCheckinReminderAction notification={n} />
          </div>
        )}
      </div>
      {/* Table 37 — read/unread demoted into a ··· overflow menu. Urgent rows
          still clear only on action (no menu); swap + task rows use their inline
          actions above instead. */}
      {!urgent && !swapId && !taskId && (
        <NotificationRowMenu
          notification={n}
          canToggleRead={canToggleRead}
          onNavigate={() => {
            if (!n.read) onMarkRead(n.id);
            onClose();
          }}
        />
      )}
    </div>
  );

  if (n.link) {
    return (
      <Link
        href={n.link}
        className="block"
        onClick={() => {
          if (!n.read) onMarkRead(n.id);
          onClose();
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export function FacilityNotificationsDropdown({
  facilityId = 11,
  viewAllHref = "/facility/notifications",
}: FacilityNotificationsDropdownProps) {
  const base = useFacilityNotifications();
  const schedule = useScheduleNotifications();
  const tasks = useTaskNotifications();
  const announcements = useAnnouncementNotifications(facilityId);
  const bookingRequests = useBookingRequestNotifications(facilityId);
  const [open, setOpen] = useState(false);

  const notifications = useMemo(() => {
    const scoped = [
      ...base,
      ...schedule,
      ...tasks,
      ...announcements,
      ...bookingRequests,
    ].filter((n) => n.facilityId == null || n.facilityId === facilityId);
    return [...scoped].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [base, schedule, tasks, announcements, bookingRequests, facilityId]);
  // Total unread across ALL categories + urgency for the badge color language
  // (spec Table 22 & 23 / Design Principle 3): red if any unread is urgent,
  // amber if unread but none urgent, no badge at all when count is 0.
  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUrgentUnread = notifications.some(
    (n) => !n.read && isUrgentNotification(n),
  );

  const markRead = (id: string) => markFacilityNotificationRead(id);
  const markAllRead = () => markAllFacilityNotificationsRead(facilityId);

  // Only store-backed notifications can persist a read/unread flip (Table 37).
  const storeIds = useMemo(() => new Set(base.map((n) => n.id)), [base]);

  // 8 most recent, but action-required (unread urgent) always first (Table 27).
  const visible = useMemo(() => {
    return [...notifications]
      .sort((a, b) => {
        const rank =
          (isActionRequired(b) ? 1 : 0) - (isActionRequired(a) ? 1 : 0);
        if (rank !== 0) return rank;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      })
      .slice(0, 8);
  }, [notifications]);
  const urgentRows = visible.filter(isActionRequired);
  const normalRows = visible.filter((n) => !isActionRequired(n));

  // Footer summary: top unread categories by count (Table 30).
  const categorySummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notifications) {
      if (n.read || !n.category) continue;
      counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return "";
    const top = entries
      .slice(0, 3)
      .map(([c, count]) => `${categoryLabel(c)} ${count}`);
    const more = entries.length - 3;
    return top.join(" · ") + (more > 0 ? ` · +${more} more` : "");
  }, [notifications]);

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
                aria-label="Notifications"
              >
                <Bell className="text-muted-foreground group-hover:text-foreground size-5 transition-colors" />
                {unreadCount > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white ${
                      hasUrgentUnread ? "bg-red-500" : "bg-amber-500"
                    }`}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Notifications
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden p-0"
        >
          {/* Red accent bar when there are unread urgent notifications (Table 26) */}
          {hasUrgentUnread && <div className="h-0.5 w-full bg-red-500" />}

          {/* Zone 1 — header */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
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

          {/* Zone 2 — list (scrolls) */}
          <div className="max-h-[440px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                No notifications
              </div>
            ) : (
              <div className="py-1">
                {urgentRows.length > 0 && (
                  <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-red-600 uppercase dark:text-red-400">
                    Action Required
                  </p>
                )}
                {urgentRows.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    urgent
                    canToggleRead={storeIds.has(n.id)}
                    onMarkRead={markRead}
                    onClose={() => setOpen(false)}
                  />
                ))}
                {normalRows.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    urgent={false}
                    canToggleRead={storeIds.has(n.id)}
                    onMarkRead={markRead}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Zone 3 — footer (always visible) */}
          <div className="flex items-center justify-between gap-3 border-t px-4 py-2">
            <span className="text-muted-foreground min-w-0 truncate text-[11px]">
              {categorySummary}
            </span>
            <Link
              href={viewAllHref}
              className="text-primary shrink-0 text-xs font-medium hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications →
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
