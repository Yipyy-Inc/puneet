"use client";

import * as React from "react";
import { Inbox, Bell, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TopBarCounts {
  unreadMessages: number;
  unreadAlerts: number;
}

export interface TopBarIconsProps {
  /** Router-agnostic navigation (React Router's navigate or Next router.push). */
  navigate?: (to: string) => void;

  inboxHref?: string;
  notificationsHref?: string;

  /** Optional quick-create icon. */
  onQuickCreate?: () => void;
  /** Optional: click an existing quick-create trigger button by id (frontend-only). */
  quickCreateClickTargetId?: string;

  /** Polling (real-time-ish) */
  pollIntervalMs?: number; // 30–60s recommended

  /**
   * Frontend-only data source. If omitted, reads from localStorage:
   * - unread_messages_count
   * - unread_alerts_count
   */
  getCounts?: () => Promise<TopBarCounts>;

  className?: string;
}

function clampCount(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function formatBadge(count: number) {
  const c = clampCount(count);
  if (c <= 0) return "";
  return c > 99 ? "99+" : String(c);
}

async function defaultGetCounts(): Promise<TopBarCounts> {
  if (typeof window === "undefined") return { unreadMessages: 0, unreadAlerts: 0 };
  const msg = clampCount(Number(localStorage.getItem("unread_messages_count") ?? 0));
  const al = clampCount(Number(localStorage.getItem("unread_alerts_count") ?? 0));
  return { unreadMessages: msg, unreadAlerts: al };
}

function usePollingCounts(getCounts: () => Promise<TopBarCounts>, pollIntervalMs: number) {
  const [counts, setCounts] = React.useState<TopBarCounts>({
    unreadMessages: 0,
    unreadAlerts: 0,
  });

  const refresh = React.useCallback(async () => {
    try {
      const next = await getCounts();
      setCounts({
        unreadMessages: clampCount(next.unreadMessages),
        unreadAlerts: clampCount(next.unreadAlerts),
      });
    } catch {
      // ignore (frontend-only)
    }
  }, [getCounts]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [pollIntervalMs, refresh]);

  // Instant updates if localStorage is changed (useful for testing)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "unread_messages_count" || e.key === "unread_alerts_count") {
        void refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return counts;
}

function IconButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  const showBadge = Boolean(badge);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className="relative h-10 w-10 rounded-xl"
          data-has-badge={showBadge ? "true" : "false"}
        >
          {children}
          {showBadge && (
            <span
              data-slot="topbar-badge"
              className="absolute -right-1 -top-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] leading-5 text-center font-medium"
            >
              {badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function TopBarIcons({
  navigate,
  inboxHref = "/facility/dashboard/communications",
  notificationsHref = "/facility/dashboard/notifications",
  onQuickCreate,
  quickCreateClickTargetId,
  pollIntervalMs = 45_000,
  getCounts,
  className,
}: TopBarIconsProps) {
  const nav = React.useCallback(
    (to: string) => {
      if (navigate) return navigate(to);
      window.location.assign(to);
    },
    [navigate],
  );

  const counts = usePollingCounts(getCounts ?? defaultGetCounts, pollIntervalMs);
  const msgBadge = formatBadge(counts.unreadMessages);
  const alertBadge = formatBadge(counts.unreadAlerts);

  const handleQuickCreate = React.useCallback(() => {
    if (onQuickCreate) return onQuickCreate();
    if (!quickCreateClickTargetId) return;
    const el = document.getElementById(quickCreateClickTargetId);
    (el as HTMLElement | null)?.click();
  }, [onQuickCreate, quickCreateClickTargetId]);

  const showQuickCreate = Boolean(onQuickCreate || quickCreateClickTargetId);

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("flex items-center gap-1", className)}>
        <IconButton
          label="Inbox"
          badge={msgBadge}
          onClick={() => nav(inboxHref)}
        >
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </IconButton>

        <IconButton
          label="Notifications"
          badge={alertBadge}
          onClick={() => nav(notificationsHref)}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </IconButton>

        {showQuickCreate && (
          <IconButton label="Create" onClick={handleQuickCreate}>
            <Plus className="h-5 w-5 text-muted-foreground" />
          </IconButton>
        )}
      </div>
    </TooltipProvider>
  );
}

