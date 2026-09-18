"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationRow } from "@/components/notifications/notification-row";
import { PlatformAnnouncementsSection } from "@/components/notifications/platform-announcements-section";
import { useNotificationText } from "@/components/notifications/use-notification-text";
import {
  useStaffNotificationMutations,
  useStaffNotifications,
} from "@/lib/api/staff-notifications";
import {
  useActiveAnnouncements,
  useMarkAnnouncement,
} from "@/lib/api/platform-announcements";
import { formatNumber } from "@/lib/i18n/format";

// ============================================================================
// The bell.
//
// It read a seeded localStorage array that every member of staff shared, plus
// four feeds derived in the browser, filtered to a hard-coded facility 11. It
// reads the signed-in person's own notifications now (/api/notifications):
// only what their role and their own preferences say they follow, and only
// what their permissions let them see. "Mark all as read" is saved.
//
// It also carries platform announcements (20260918103842) — what a platform
// admin published for this facility, High and Normal; Urgent ones are the
// banner. An unread High one counts toward the badge, and opening the bell
// reads them all.
// ============================================================================

const SHOWN = 8;

export function FacilityNotificationsDropdown({
  viewAllHref = "/facility/notifications",
}: {
  /** Where "View all notifications" points; the employee portal has its own. */
  viewAllHref?: string;
}) {
  const text = useNotificationText();
  const { feed, error } = useStaffNotifications("active");
  const { markAllRead } = useStaffNotificationMutations();
  const [open, setOpen] = useState(false);
  const { data: announcements } = useActiveAnnouncements();
  const markAnnouncement = useMarkAnnouncement();
  const fromYipyy = (announcements ?? []).filter(
    (a) => a.priority !== "Urgent",
  );
  const unreadHigh = fromYipyy.filter(
    (a) => a.priority === "High" && !a.read,
  ).length;
  const unread = feed.unread + unreadHigh;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      for (const a of fromYipyy) {
        if (!a.read) markAnnouncement.mutate({ id: a.id, action: "read" });
      }
    }
  }

  // Urgent and unread first — the incident that needs somebody now — then newest.
  const rows = [...feed.items]
    .sort((a, b) => {
      const rank = Number(!b.read && b.urgent) - Number(!a.read && a.urgent);
      return rank !== 0 ? rank : b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, SHOWN);
  const urgentUnread = feed.items.some((n) => n.urgent && !n.read);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={
            unread > 0
              ? `${text.t("title")}, ${text.t("unread").replace("{count}", formatNumber(unread, text.locale))}`
              : text.t("title")
          }
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span
              className={
                urgentUnread
                  ? "bg-destructive absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white tabular-nums"
                  : "bg-primary absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white tabular-nums"
              }
              aria-hidden
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <span className="text-heading text-[17px] font-bold">
            {text.t("title")}
          </span>
          {feed.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markAllRead.isPending}
              onClick={() =>
                markAllRead.mutate(undefined, {
                  onError: () => toast.error(text.t("markAllFailed")),
                })
              }
            >
              {text.t("markAllRead")}
            </Button>
          )}
        </div>

        <div className="max-h-[440px] divide-y overflow-y-auto">
          <PlatformAnnouncementsSection
            items={fromYipyy}
            heading={text.t("fromYipyy")}
          />
          {error ? (
            <p className="text-destructive px-4 py-8 text-center text-sm">
              {text.t("loadFailed")}
            </p>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-foreground text-sm font-semibold">
                {text.t("none")}
              </p>
              <p className="text-ink-tertiary mt-1 text-[13.5px]">
                {text.t("noneHelp")}
              </p>
            </div>
          ) : (
            rows.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                compact
                onNavigate={() => setOpen(false)}
              />
            ))
          )}
        </div>

        <div className="border-t px-4 py-3">
          <Link
            href={viewAllHref}
            className="text-primary text-sm font-semibold hover:underline"
            onClick={() => setOpen(false)}
          >
            {text.t("viewAll")}
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
