"use client";

import { useEffect, useState } from "react";
import { Bell, Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  loadPersistedAnnouncements,
  markAnnouncementRead,
  targetsFacility,
  useAnnouncementDelivery,
} from "@/lib/announcement-delivery-store";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Facility announcement bell. High-priority announcements add a yellow badge;
 *  the dropdown lists all High + Normal announcements targeting this facility.
 *  (Urgent announcements appear in the full-width banner instead.) */
export function AnnouncementBell({ facilityId }: { facilityId: number }) {
  const { delivered, read } = useAnnouncementDelivery();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadPersistedAnnouncements();
  }, []);

  if (!hydrated) return null;

  const items = delivered.filter(
    (a) =>
      (a.priority === "High" || a.priority === "Normal") &&
      targetsFacility(a, facilityId),
  );
  const unreadHigh = items.filter(
    (a) => a.priority === "High" && !read[a.id],
  ).length;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          for (const a of items) {
            if (a.priority === "High") markAnnouncementRead(a.id);
          }
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Announcements"
          className="relative"
        >
          <Megaphone className="size-5" />
          {unreadHigh > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-semibold text-white">
              {unreadHigh > 9 ? "9+" : unreadHigh}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bell className="size-4" />
          Announcements
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            No announcements right now.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((a) => (
              <div key={a.id} className="hover:bg-muted/50 px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      a.priority === "High" ? "bg-amber-500" : "bg-sky-500",
                    )}
                  />
                  <p className="flex-1 truncate text-sm font-medium">
                    {a.title}
                  </p>
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 pl-4 text-xs">
                  {stripHtml(a.body)}
                </p>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
