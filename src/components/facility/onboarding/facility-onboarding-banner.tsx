"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Rocket, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_DISMISS_THRESHOLD } from "@/data/facility-onboarding";
import {
  dismissOnboardingBanner,
  loadPersistedOnboarding,
  useFacilityOnboarding,
} from "@/lib/facility-onboarding-store";

export function FacilityOnboardingBanner() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { completed, total, percent, allComplete, canDismiss, dismissed } =
    useFacilityOnboarding();

  useEffect(() => {
    loadPersistedOnboarding();
    setMounted(true);
  }, []);

  // Render nothing until the persisted state has loaded on the client — avoids
  // both a hydration mismatch and a flash of stale (pre-dismissal) state.
  if (!mounted) return null;
  if (allComplete || dismissed) return null;
  if (pathname === "/facility/onboarding") return null;

  return (
    <div className="px-4 pt-3 sm:px-6">
      {/* Compact single row on all sizes: the old card stacked icon/title/
          subtitle/progress/buttons and ate ~150px of vertical space on phones.
          Now it's one ~56px strip — title with an inline step/% caption and a
          thin progress bar; the CTA collapses to an arrow on phones. */}
      {/* ── VIOLET WAS A SECOND ACTION COLOUR, AND §1 ALLOWS NONE ─────────

          The rail, the rocket chip, the progress fill and the CTA were all
          violet-to-indigo, which put #4C3BB8 — a STATUS ink, and the darkest
          one — on the most prominent button on the facility dashboard. §1:
          "Every button, link, focus ring, active nav item... There is no
          second action colour."

          It is a SOLID --primary field now, matching the maintenance bar above
          it: same shape, same inset, same radius, same entrance, different
          tone. White on #1668E3 is 5.09:1.

          ── EVERYTHING ON A SOLID FIELD HAS TO INVERT ────────────────────

          This is the part that is easy to get wrong. Each of the four marks
          inside was --primary, which was correct on white and invisible on
          blue. §3 gives the pattern for a mark on a solid status fill — "the
          status chip inverts to white with the ink as its label" — so the
          chip and the CTA are white carrying primary, and the progress track
          is white at low alpha with a solid white fill.

          Alpha on the TRACK and the hover, never on a word: rule 4 bans
          opacity as a de-emphasis tool for text, and every piece of text here
          is plain white at full strength. */}
      <div className="bg-primary yy-rise relative flex items-center gap-3 overflow-hidden rounded-xl p-2.5 text-white sm:p-3">
        <span className="text-primary flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
          <Rocket className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            Finish setting up your facility
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Progress
              value={percent}
              className="h-1 flex-1 bg-white/25 [&>div]:bg-white"
            />
            <span className="shrink-0 text-[11px] tabular-nums">
              {completed}/{total} · {percent}%
            </span>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          // Inverted for the solid field: white pill, primary label. The
          // default variant is --primary, which on --primary is a button you
          // cannot see. `yy-cta`'s blue lift is dropped for the same reason —
          // a blue glow under a white button on a blue bar is invisible.
          className="text-primary hover:text-primary shrink-0 gap-1 bg-white shadow-none hover:bg-white/90"
        >
          <Link href="/facility/onboarding" aria-label="Continue setup">
            <span className="hidden sm:inline">Continue setup</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          // ── THE DISABLED STATE HAD TO MOVE ONTO THE SOLID FIELD TOO ────
          //
          // This button is disabled until ONBOARDING_DISMISS_THRESHOLD steps
          // are done, and Button expresses that as `bg-surface-inset` with
          // `text-ink-disabled` — values chosen for a white page. Measured on
          // the blue bar they came out #F6F4F1 on #8C99A3: a pale lozenge
          // with grey in it, which read as a rendering fault rather than as a
          // control that is not available yet.
          //
          // Overridden through the SAME `[&:disabled:not([data-loading])]`
          // selector, because that specificity beats a plain `disabled:`.
          //
          // Alpha here is legal and worth being explicit about: rule 4 bans
          // opacity as a de-emphasis tool for TEXT. This is a 14px X glyph and
          // a surface, and §1 already allows --ink-disabled on "chevrons and
          // placeholder glyphs, non-text only" — white at reduced alpha is
          // simply that value's equivalent on a solid field, where
          // --ink-disabled itself measures about 2:1 and disappears.
          className="shrink-0 text-white hover:bg-white/15 hover:text-white [&:disabled:not([data-loading])]:bg-white/10 [&:disabled:not([data-loading])]:text-white/55"
          aria-label="Dismiss onboarding banner"
          title={
            canDismiss
              ? "Dismiss"
              : `Complete at least ${ONBOARDING_DISMISS_THRESHOLD} steps to dismiss`
          }
          disabled={!canDismiss}
          onClick={dismissOnboardingBanner}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
