"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { lastMessage, useSupportInbox } from "@/hooks/use-support-inbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Agent notification bell for incoming support messages. Derives from the
 * shared support store, so a new facility message (relayed live over the
 * BroadcastChannel) increments the badge and lists the conversation here.
 */
export function SupportNotificationBell() {
  const conversations = useSupportInbox();
  const unread = conversations
    .filter((c) => c.unreadCount > 0)
    .sort((a, b) =>
      (lastMessage(b)?.at ?? "").localeCompare(lastMessage(a)?.at ?? ""),
    );
  const total = unread.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Support notifications"
          className="relative size-10 rounded-xl"
        >
          <Bell className="text-muted-foreground size-5" />
          {total > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
              {total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Support messages
          {total > 0 && (
            <span className="text-muted-foreground text-xs">
              {total} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unread.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            No new messages
          </p>
        ) : (
          unread.map((c) => {
            const m = lastMessage(c);
            return (
              <DropdownMenuItem key={c.id} asChild>
                <Link
                  href="/dashboard/support/chat"
                  className="flex flex-col items-start gap-0.5"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {c.facilityName}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {m ? timeAgo(m.at) : ""}
                    </span>
                  </div>
                  <span className="text-muted-foreground line-clamp-1 text-xs">
                    {m?.body ?? ""}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
