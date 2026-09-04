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

          All four are --primary now, and the field is the primary wash fading
          to card: the same mark treatment the maintenance banner uses, in the
          tone that means "the software is asking you to do something" rather
          than "something is wrong". */}
      <div className="border-primary/20 from-wash-primary via-card to-card relative flex items-center gap-3 overflow-hidden rounded-xl border bg-linear-to-r p-2.5 sm:p-3">
        <span className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm">
          <Rocket className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            Finish setting up your facility
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Progress
              value={percent}
              className="[&>div]:bg-primary h-1 flex-1"
            />
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {completed}/{total} · {percent}%
            </span>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          // No colour override: Button's default variant IS --primary, with
          // §4's CTA lift. Overriding it was what made this the odd one out.
          className="shrink-0 gap-1"
        >
          <Link href="/facility/onboarding" aria-label="Continue setup">
            <span className="hidden sm:inline">Continue setup</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
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
