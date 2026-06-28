"use client";

import { useEffect } from "react";

import { Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setPresenceStatus,
  setRealtimeIdentity,
  useRealtimeConnection,
  useRealtimePresence,
  useRealtimeSelf,
  type ConnectionState,
  type PresenceStatus,
  type RealtimeRole,
} from "@/lib/realtime/use-realtime";
import { cn } from "@/lib/utils";

const CONN: Record<ConnectionState, { label: string; dot: string }> = {
  connected: { label: "Connected", dot: "bg-emerald-500" },
  connecting: { label: "Connecting…", dot: "bg-amber-500" },
  reconnecting: { label: "Reconnecting…", dot: "bg-amber-500" },
  disconnected: { label: "Offline", dot: "bg-rose-500" },
};

const PRESENCE: Record<PresenceStatus, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-emerald-500" },
  away: { label: "Away", dot: "bg-amber-500" },
  offline: { label: "Offline", dot: "bg-slate-400" },
};

/**
 * Live connection + presence indicator for the shared real-time connection.
 * `variant="self"` (agents) lets the user toggle Online/Away; `variant="team"`
 * (facility) is a read-only "Support is online" indicator.
 */
export function ConnectionStatus({
  name,
  role,
  variant = "self",
}: {
  name: string;
  role: RealtimeRole;
  variant?: "self" | "team";
}) {
  useEffect(() => {
    setRealtimeIdentity({ name, role });
  }, [name, role]);

  const conn = useRealtimeConnection();
  const self = useRealtimeSelf();
  const members = useRealtimePresence();
  const connMeta = CONN[conn];

  if (variant === "team") {
    const agentsOnline = members.filter(
      (m) => m.role === "agent" && m.status === "online",
    ).length;
    const live = conn === "connected";
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span
          className={cn(
            "size-2 rounded-full",
            agentsOnline > 0
              ? "bg-emerald-500"
              : live
                ? "bg-amber-500"
                : connMeta.dot,
          )}
        />
        <span className="font-medium">
          {agentsOnline > 0
            ? "Support is online"
            : live
              ? "We typically reply in minutes"
              : connMeta.label}
        </span>
      </div>
    );
  }

  const presence = PRESENCE[self.status];
  const onlineCount = members.filter((m) => m.status === "online").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Connection and presence"
          className="hover:bg-muted flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
        >
          <span className="relative flex size-2">
            {self.status === "online" && conn === "connected" && (
              <span
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                  presence.dot,
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                presence.dot,
              )}
            />
          </span>
          <span className="font-medium">{presence.label}</span>
          <span className="text-muted-foreground hidden sm:inline">
            · {connMeta.label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          Your status
        </DropdownMenuLabel>
        {(["online", "away"] as PresenceStatus[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => setPresenceStatus(s)}
            className="flex items-center gap-2"
          >
            <span className={cn("size-2 rounded-full", PRESENCE[s].dot)} />
            {PRESENCE[s].label}
            {self.status === s && (
              <Check className="text-primary ml-auto size-3.5" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="text-muted-foreground space-y-1 px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", connMeta.dot)} />
            {connMeta.label}
          </div>
          <div>{onlineCount} online now</div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
