"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, Bell, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationRow } from "@/components/notifications/notification-row";
import { useNotificationText } from "@/components/notifications/use-notification-text";
import {
  useStaffNotificationMutations,
  useStaffNotifications,
  type FeedView,
} from "@/lib/api/staff-notifications";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/notifications/catalog";
import type { StaffNotification } from "@/lib/notifications/types";
import { formatNumber } from "@/lib/i18n/format";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

// ============================================================================
// The notification centre.
//
// It listed a seeded localStorage array every viewer shared, with a "keep read
// notifications for N days" setting that decided nothing but a filter in one
// browser. It lists the signed-in person's own notifications now, filtered by
// category on the server; archiving is a saved state of the row, and the
// preferences link opens the person's OWN preferences rather than the
// facility's role defaults.
// ============================================================================

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function Group({
  label,
  items,
}: {
  label: string;
  items: StaffNotification[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-ink-tertiary text-xs font-bold tracking-[.06em] uppercase">
        {label}
      </h2>
      {items.map((n) => (
        <NotificationRow key={n.id} notification={n} />
      ))}
    </section>
  );
}

export function NotificationCenter() {
  const text = useNotificationText();
  const settingsPath = useSettingsHref();
  const [view, setView] = useState<FeedView>("active");
  const [category, setCategory] = useState<NotificationCategory | undefined>();
  const { feed, isPending, error } = useStaffNotifications(view, category);
  const { markAllRead } = useStaffNotificationMutations();

  const grouped = useMemo(() => {
    const urgent: StaffNotification[] = [];
    const today: StaffNotification[] = [];
    const earlier: StaffNotification[] = [];
    for (const n of feed.items) {
      if (n.urgent && !n.read) urgent.push(n);
      else if (isToday(n.createdAt)) today.push(n);
      else earlier.push(n);
    }
    return { urgent, today, earlier };
  }, [feed.items]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-heading text-[32px] font-bold">
            {view === "archive" ? text.t("viewArchive") : text.t("title")}
          </h1>
          {view === "active" && feed.unread > 0 && (
            <p className="text-ink-secondary text-sm tabular-nums">
              {text
                .t("unread")
                .replace("{count}", formatNumber(feed.unread, text.locale))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === "active" && feed.unread > 0 && (
            <Button
              variant="outline"
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
          <Button asChild variant="ghost">
            <Link href={settingsPath("my-notifications")}>
              <Settings className="size-4" />
              {text.t("preferences")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group">
        <Button
          size="sm"
          variant={category === undefined ? "default" : "outline"}
          aria-pressed={category === undefined}
          onClick={() => setCategory(undefined)}
        >
          {text.t("all")}
        </Button>
        {NOTIFICATION_CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {text.category(c)}
          </Button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">{text.t("loadFailed")}</p>
      ) : feed.items.length === 0 ? (
        <div className="rounded-3xl border px-6 py-12 text-center">
          <Bell className="text-ink-tertiary mx-auto size-6" aria-hidden />
          <p className="text-foreground mt-3 font-semibold">
            {view === "archive"
              ? text.t("archiveNone")
              : category
                ? text.t("noneInCategory")
                : text.t("none")}
          </p>
          <p className="text-ink-tertiary mt-1 text-sm">
            {view === "archive"
              ? text.t("archiveNoneHelp")
              : text.t("noneHelp")}
          </p>
        </div>
      ) : view === "active" ? (
        <div className="space-y-5">
          <Group label={text.t("needsAttention")} items={grouped.urgent} />
          <Group label={text.t("today")} items={grouped.today} />
          <Group label={text.t("earlier")} items={grouped.earlier} />
        </div>
      ) : (
        <div className="space-y-2">
          {feed.items.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      )}

      <div>
        {view === "active" ? (
          <Button variant="ghost" onClick={() => setView("archive")}>
            <Archive className="size-4" />
            {text.t("viewArchive")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setView("active")}>
            <ArrowLeft className="size-4" />
            {text.t("backToNotifications")}
          </Button>
        )}
      </div>
    </div>
  );
}
