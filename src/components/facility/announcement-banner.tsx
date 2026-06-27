"use client";

import { useEffect } from "react";
import { Megaphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  dismissAnnouncement,
  loadPersistedAnnouncements,
  targetsFacility,
  useAnnouncementDelivery,
} from "@/lib/announcement-delivery-store";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Full-width red banner for an Urgent announcement, shown on every facility
 *  page until the facility dismisses it (persisted in localStorage). Injected in
 *  the facility layout next to ImpersonationBanner. */
export function AnnouncementBanner({ facilityId }: { facilityId: number }) {
  const { delivered, dismissed } = useAnnouncementDelivery();
  const hydrated = useHydrated();

  useEffect(() => {
    loadPersistedAnnouncements();
  }, []);

  if (!hydrated) return null;

  const urgent = delivered.find(
    (a) =>
      a.priority === "Urgent" &&
      targetsFacility(a, facilityId) &&
      !dismissed[a.id],
  );
  if (!urgent) return null;

  const preview = stripHtml(urgent.body);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-300 bg-rose-100 px-4 py-2 text-rose-900 sm:px-6 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-100">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Megaphone className="size-4 shrink-0" />
        <span className="min-w-0">
          <span className="font-semibold">{urgent.title}</span>
          {preview && (
            <span className="text-rose-800/90 dark:text-rose-200/90">
              {" — "}
              {preview}
            </span>
          )}
        </span>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 border-rose-400 bg-rose-50 text-rose-900 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-100 dark:hover:bg-rose-900"
        onClick={() => dismissAnnouncement(urgent.id)}
      >
        <X className="mr-1.5 size-3.5" />
        Dismiss
      </Button>
    </div>
  );
}
