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
    // ── A BANNER IS A STATUS MARK THE WIDTH OF THE PAGE ──────────────────
    //
    // It was white with a 1px error-ink box — correct under §3, and austere:
    // an outlined rectangle rather than something that reads as red.
    //
    // It takes the same treatment as a status chip now: the ink's own wash as
    // the field, the saturated ink on top, a soft edge in that ink. §6 rule 2
    // allows a tinted MARK and not a tinted surface, and this is a mark — it
    // announces one status and nothing is laid out inside it. #B23B3B on
    // #FDEFF3 measures 5.25:1.
    //
    // The preview text dropped its /90 alpha. Rule 4 bans opacity as a
    // de-emphasis tool for text; the weight step from semibold to regular is
    // what separates the title from the sentence, which is rule 1's own
    // sanctioned alternative.
    <div className="border-destructive/30 bg-wash-error text-destructive flex flex-wrap items-center justify-between gap-2 border px-4 py-2 sm:px-6">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <Megaphone className="size-4 shrink-0" />
        <span className="min-w-0">
          <span className="font-semibold">{urgent.title}</span>
          {preview && (
            <span>
              {" — "}
              {preview}
            </span>
          )}
        </span>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-wash-error h-7 shrink-0 bg-transparent"
        onClick={() => dismissAnnouncement(urgent.id)}
      >
        <X className="mr-1.5 size-3.5" />
        Dismiss
      </Button>
    </div>
  );
}
