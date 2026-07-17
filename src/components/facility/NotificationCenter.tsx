"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  FileText,
  CheckCircle,
  CalendarClock,
  ListChecks,
  Bed,
  PawPrint,
  Scissors,
  GraduationCap,
  Users,
  Puzzle,
  ChevronRight,
  ArrowDownUp,
  Settings,
  Archive,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markFacilityNotificationRead,
  markAllFacilityNotificationsRead,
  useFacilityNotifications,
} from "@/data/facility-notifications";
import type { FacilityNotification } from "@/types/facility";
import { isUrgentNotification } from "@/types/facility";
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
import {
  useNotificationRetention,
  setNotificationRetention,
  isNotificationArchived,
  RETENTION_OPTIONS,
  type RetentionDays,
} from "@/lib/notification-retention-store";
import { NotificationRowMenu } from "@/components/facility/NotificationRowMenu";
import { useCustomServices } from "@/hooks/use-custom-services";

// ========================================
// Category config
// ========================================

interface CategoryTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const STATIC_CATEGORIES: CategoryTab[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "customers", label: "Customers", icon: Users },
  { id: "boarding", label: "Boarding", icon: Bed },
  { id: "daycare", label: "Daycare", icon: PawPrint },
  { id: "grooming", label: "Grooming", icon: Scissors },
  { id: "training", label: "Training", icon: GraduationCap },
  { id: "forms", label: "Forms", icon: FileText },
  { id: "yipyygo", label: "Express Check-In", icon: CheckCircle },
  { id: "schedule", label: "Schedule", icon: CalendarClock },
  { id: "tasks", label: "Tasks", icon: ListChecks },
];

// The card header can show a fuller name than the compact pill (spec Table 42).
const HEADER_LABEL: Record<string, string> = {
  yipyygo: "Yipyy Express Check-In",
};

// ========================================
// Helpers
// ========================================

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

// iOS-style section header for the "All" view grouping (spec Table 40).
function SectionHeader({
  label,
  tone,
}: {
  label: string;
  tone: "urgent" | "today" | "earlier";
}) {
  return (
    <p
      className={cn(
        "px-1 pb-1 text-[11px] font-semibold tracking-wider uppercase",
        tone === "urgent" && "text-red-600 dark:text-red-400",
        tone === "today" && "text-foreground",
        tone === "earlier" && "text-muted-foreground",
      )}
    >
      {label}
    </p>
  );
}

// ========================================
// NotificationItem
// ========================================

function NotificationItem({
  notification,
  canToggleRead,
  onMarkRead,
}: {
  notification: FacilityNotification;
  canToggleRead: boolean;
  onMarkRead: (id: string) => void;
}) {
  // Shift-swap rows resolve in place (spec Table 33) via inline Approve/Decline;
  // task rows via "Mark Complete" (spec Table 34).
  const swapId = swapIdFromNotification(notification);
  const taskId = taskIdFromNotification(notification);
  // Table 36 — a linked row is a navigation target, so make that obvious:
  // pointer cursor, a stronger hover, and a right-chevron that nudges on hover.
  const navigable = !!notification.link;
  const content = (
    <div
      className={cn(
        "group hover:bg-muted/50 flex gap-3 rounded-lg border p-3 transition-colors",
        !notification.read && "border-primary/20 bg-primary/5",
        navigable && "hover:border-primary/30 cursor-pointer",
      )}
    >
      <div className="mt-0.5 shrink-0">
        <div className="bg-muted flex size-8 items-center justify-center rounded-full">
          <NotificationTypeIcon n={notification} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{notification.title}</p>
          <span
            suppressHydrationWarning
            className="text-muted-foreground shrink-0 text-[10px]"
          >
            {formatTime(notification.timestamp)}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {notification.message}
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
        {isExpressCheckinMissing(notification) && (
          <div className="mt-2">
            <ExpressCheckinReminderAction notification={notification} />
          </div>
        )}
      </div>
      {/* Table 36 — "tap to go there" affordance for navigable rows. */}
      {navigable && (
        <ChevronRight className="text-muted-foreground/40 group-hover:text-muted-foreground size-4 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
      )}
      {/* Table 37 — read/unread demoted into a ··· overflow menu. Swap + task
          rows keep their primary inline actions instead. */}
      {!swapId && !taskId && (
        <NotificationRowMenu
          notification={notification}
          canToggleRead={canToggleRead}
          onNavigate={() => {
            if (!notification.read) onMarkRead(notification.id);
          }}
        />
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link
        href={notification.link}
        className="block"
        onClick={() => {
          if (!notification.read) onMarkRead(notification.id);
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

// ========================================
// NotificationCenter (main component)
// ========================================

export function NotificationCenter({
  facilityId = 11,
}: {
  facilityId?: number;
}) {
  const base = useFacilityNotifications();
  const schedule = useScheduleNotifications();
  const tasks = useTaskNotifications();
  const announcements = useAnnouncementNotifications(facilityId);
  const bookingRequests = useBookingRequestNotifications(facilityId);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "priority">("newest");
  const [view, setView] = useState<"active" | "archive">("active");
  const retentionDays = useNotificationRetention();
  const { modules } = useCustomServices();

  const allNotifications = useMemo(() => {
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

  // Retention (Table 43): read notifications older than the window auto-archive.
  // The Archive is just a filtered view over the same store — no separate data.
  const { active, archived } = useMemo(() => {
    const now = new Date().getTime();
    const active: FacilityNotification[] = [];
    const archived: FacilityNotification[] = [];
    for (const n of allNotifications) {
      if (isNotificationArchived(n, retentionDays, now)) archived.push(n);
      else active.push(n);
    }
    return { active, archived };
  }, [allNotifications, retentionDays]);

  const notifications = view === "archive" ? archived : active;

  const markRead = (id: string) => markFacilityNotificationRead(id);
  const markAllRead = () => markAllFacilityNotificationsRead(facilityId);

  // Only store-backed notifications can persist a read/unread flip; derived rows
  // (booking requests, announcements, swaps, tasks) cannot (spec Table 37).
  const storeIds = useMemo(() => new Set(base.map((n) => n.id)), [base]);

  // Build category tabs: static + dynamic from custom modules
  const activeModules = modules.filter((m) => m.status === "active");
  const categories: CategoryTab[] = [
    ...STATIC_CATEGORIES,
    ...activeModules.map((m) => ({
      id: m.slug,
      label: m.name,
      icon: Puzzle,
    })),
  ];

  // Filter notifications by category
  const filtered =
    activeCategory === "all"
      ? notifications
      : notifications.filter((n) => n.category === activeCategory);

  // Sort (Table 38). "newest" keeps the timestamp-desc order `notifications`
  // already has; "priority" floats urgent items to the top regardless of time
  // (morning-triage), newest-first within each group.
  const sorted = useMemo(() => {
    if (sortBy !== "priority") return filtered;
    return [...filtered].sort((a, b) => {
      const rank =
        (isUrgentNotification(b) ? 1 : 0) - (isUrgentNotification(a) ? 1 : 0);
      if (rank !== 0) return rank;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [filtered, sortBy]);

  // "All" view grouping (spec Table 40): Urgent → Today → Earlier. Urgent
  // items float above the time groups; within every group notifications keep
  // their per-category organization (clustered in the pill order, newest-first).
  const grouped = useMemo(() => {
    const now = new Date();
    const catOrder = new Map(STATIC_CATEGORIES.map((c, i) => [c.id, i]));
    const urgent: FacilityNotification[] = [];
    const today: FacilityNotification[] = [];
    const earlier: FacilityNotification[] = [];
    for (const n of filtered) {
      if (isUrgentNotification(n)) urgent.push(n);
      else if (isSameDay(n.timestamp, now)) today.push(n);
      else earlier.push(n);
    }
    const byCategoryThenNewest = (
      a: FacilityNotification,
      b: FacilityNotification,
    ) => {
      const ca = catOrder.get(a.category ?? "") ?? 999;
      const cb = catOrder.get(b.category ?? "") ?? 999;
      if (ca !== cb) return ca - cb;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    };
    urgent.sort(byCategoryThenNewest);
    today.sort(byCategoryThenNewest);
    earlier.sort(byCategoryThenNewest);
    return { urgent, today, earlier };
  }, [filtered]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadByCategory = (cat: string) =>
    cat === "all"
      ? unreadCount
      : notifications.filter((n) => !n.read && n.category === cat).length;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-muted-foreground size-5" />
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as "newest" | "priority")}
          >
            <SelectTrigger size="sm" className="w-[150px]" aria-label="Sort by">
              <ArrowDownUp className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="priority">Priority first</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
          {/* Table 41 — link to the user's notification preferences. */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Notification preferences"
          >
            <Link href="/facility/dashboard/settings?section=notifications">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const count = unreadByCategory(cat.id);
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon className="size-3.5" />
              {cat.label}
              {count > 0 && (
                <Badge
                  variant={activeCategory === cat.id ? "secondary" : "outline"}
                  className="ml-0.5 h-4 px-1 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Notification list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            {view === "archive" && <Archive className="size-4" />}
            {view === "archive"
              ? "Archive"
              : activeCategory === "all"
                ? "All Notifications"
                : (HEADER_LABEL[activeCategory] ??
                  categories.find((c) => c.id === activeCategory)?.label ??
                  activeCategory)}
            <span className="text-muted-foreground text-xs font-normal">
              ({filtered.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="text-muted-foreground mx-auto mb-3 size-12 opacity-50" />
              <p className="font-medium">
                {view === "archive"
                  ? "No archived notifications"
                  : "No notifications"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {view === "archive"
                  ? `Read notifications older than ${retentionDays} days appear here.`
                  : activeCategory === "all"
                    ? "You're all caught up!"
                    : `No notifications in this category.`}
              </p>
            </div>
          ) : view === "active" && activeCategory === "all" ? (
            // Table 40 — the "All" view groups into Urgent → Today → Earlier,
            // iOS-notification-center style. Single-category + archive views stay flat.
            <div className="space-y-4">
              {grouped.urgent.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="Urgent" tone="urgent" />
                  {grouped.urgent.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      canToggleRead={storeIds.has(n.id)}
                      onMarkRead={markRead}
                    />
                  ))}
                </div>
              )}
              {grouped.today.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="Today" tone="today" />
                  {grouped.today.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      canToggleRead={storeIds.has(n.id)}
                      onMarkRead={markRead}
                    />
                  ))}
                </div>
              )}
              {grouped.earlier.length > 0 && (
                <div className="space-y-2">
                  <SectionHeader label="Earlier" tone="earlier" />
                  {grouped.earlier.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      canToggleRead={storeIds.has(n.id)}
                      onMarkRead={markRead}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  canToggleRead={storeIds.has(n.id)}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer — retention config + Archive access (spec Table 43). */}
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center gap-2">
          <span>Keep read notifications for</span>
          <Select
            value={String(retentionDays)}
            onValueChange={(v) =>
              setNotificationRetention(Number(v) as RetentionDays)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-[110px]"
              aria-label="Notification retention"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>before archiving.</span>
        </div>
        {view === "active" ? (
          <button
            type="button"
            onClick={() => setView("archive")}
            className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
          >
            <Archive className="size-3.5" />
            View Archive
            {archived.length > 0 && <span>({archived.length})</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setView("active")}
            className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Back to notifications
          </button>
        )}
      </div>
    </div>
  );
}
