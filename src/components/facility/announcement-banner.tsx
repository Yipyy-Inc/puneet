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
    // It is SOLID, which §3 sanctions in its own words: "where one must
    // dominate, fill it solid with the ink at full strength". A scheduled
    // outage is the case that clause exists for — it interrupts everyone and
    // is worth interrupting for. It went white-with-a-hairline, then a wash,
    // and neither carried enough weight for the message.
    //
    // THE RED MATTERS AND THERE ARE TWO OF THEM. This is --bad #B23B3B, the
    // TEXT-weight error ink: white on it is 5.86:1. The dot-weight --error-dot
    // #D24545 is 4.49:1, and §6 rule 13 bans exactly this pairing — "never
    // white on a dot-weight colour". They look almost identical side by side,
    // which is why the token is named rather than the value picked.
    //
    // The preview text dropped its /90 alpha. Rule 4 bans opacity as a
    // de-emphasis tool for text; the weight step from semibold to regular is
    // what separates the title from the sentence, which is rule 1's own
    // sanctioned alternative — and on a solid fill an alpha would have eaten
    // the 5.86:1 outright.
    // ── INSET AND ROUNDED, AND THE ANIMATION IS THE ENTRANCE ─────────────
    //
    // It was full-bleed, so there were no corners to round. The wrapper's
    // padding is what creates them, and it is deliberately the SAME
    // `px-4 pt-3 sm:px-6` the onboarding banner below uses — the two stack,
    // and two bars inset by different amounts reads as a mistake.
    //
    // `rounded-xl` is --r, 16px, §1's "medium containers and tiles". Not
    // --r-lg 24px, which is the card and modal radius: this is a bar, not a
    // panel, and the onboarding banner beside it is already 16px.
    //
    // `yy-rise` is the animation, and it is the only one available. §4 has
    // four ambient patterns and none of them fits a banner: `yy-float` is the
    // mascot on empty states, `yy-breathe` is reserved for the orange
    // presence dot — "the one thing allowed to pulse is the mark saying an
    // animal is here" — and the fourth is a sticky header's shadow. A red bar
    // that pulsed would also be ambient motion CARRYING INFORMATION, which §4
    // bans outright.
    //
    // `yy-rise` runs once and stops, which is what makes it legal on a
    // surface already showing data, and it is the right idea anyway: the
    // banner should arrive, not throb.
    <div className="px-4 pt-3 sm:px-6">
      <div className="bg-destructive yy-rise flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-white sm:px-5">
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
          // On a solid status fill §3 inverts the mark: white outline, white
          // label, transparent field — so the button reads as sitting ON the
          // bar rather than as a second colour introduced onto it.
          className="h-7 shrink-0 border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white"
          onClick={() => dismissAnnouncement(urgent.id)}
        >
          <X className="mr-1.5 size-3.5" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
