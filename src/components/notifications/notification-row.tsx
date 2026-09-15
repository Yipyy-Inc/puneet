"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CalendarClock,
  CalendarDays,
  FileText,
  MailOpen,
  Mail,
  MoreHorizontal,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationText } from "@/components/notifications/use-notification-text";
import { useStaffNotificationMutations } from "@/lib/api/staff-notifications";
import { formatRelative } from "@/lib/i18n/format";
import type { NotificationCategory } from "@/lib/notifications/catalog";
import type { StaffNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

// ============================================================================
// One notification, as the bell and the centre both draw it.
//
// Its actions sit behind a VISIBLE overflow button, never revealed on hover
// (§6 rule 5). Unread is weight and a small dot, not a tinted row (§6 rule 2);
// urgent is the error glyph in its own ink beside the word, not colour alone
// (§3).
// ============================================================================

const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  bookings: CalendarDays,
  forms: FileText,
  schedule: CalendarClock,
  incidents: AlertTriangle,
  estimates: Receipt,
};

export function NotificationRow({
  notification: n,
  compact = false,
  onNavigate,
}: {
  notification: StaffNotification;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const text = useNotificationText();
  const { setState } = useStaffNotificationMutations();
  const Icon = CATEGORY_ICON[n.category];
  const detail = text.detail(n);

  const change = (patch: { read?: boolean; archived?: boolean }) =>
    setState.mutate(
      { id: n.id, ...patch },
      { onError: () => toast.error(text.t("changeFailed")) },
    );

  const open = () => {
    if (!n.read) change({ read: true });
    onNavigate?.();
  };

  const body = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
          n.urgent
            ? "text-destructive border-destructive"
            : "text-ink-secondary",
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {!n.read && (
            <span
              className="bg-primary size-2 shrink-0 rounded-full"
              aria-hidden
            />
          )}
          <span
            className={cn(
              "text-foreground min-w-0 text-sm break-words",
              n.read ? "font-normal" : "font-semibold",
            )}
          >
            {text.title(n)}
          </span>
        </span>
        {detail && (
          <span className="text-ink-secondary mt-0.5 block text-[13.5px] break-words">
            {detail}
          </span>
        )}
        <span
          className="text-ink-tertiary mt-1 block text-xs tabular-nums"
          suppressHydrationWarning
        >
          {text.category(n.category)} ·{" "}
          {formatRelative(n.createdAt, text.locale)}
        </span>
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        compact ? "px-4 py-3" : "rounded-2xl border p-3",
      )}
      data-unread={n.read ? undefined : "true"}
    >
      {n.link ? (
        <Link
          href={n.link}
          onClick={open}
          className="focus-visible:ring-ring flex min-w-0 flex-1 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : (
        body
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            aria-label={text.t("options")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => change({ read: !n.read })}>
            {n.read ? (
              <Mail className="size-4" />
            ) : (
              <MailOpen className="size-4" />
            )}
            {n.read ? text.t("markUnread") : text.t("markRead")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => change({ archived: !n.archived, read: true })}
          >
            {n.archived ? (
              <ArchiveRestore className="size-4" />
            ) : (
              <Archive className="size-4" />
            )}
            {n.archived ? text.t("unarchive") : text.t("archive")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
