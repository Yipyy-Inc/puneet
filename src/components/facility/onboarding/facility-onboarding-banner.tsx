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
    <div className="px-4 pt-4 sm:px-6">
      <div className="via-background to-background relative flex flex-col gap-3 overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 p-4 sm:flex-row sm:items-center dark:border-violet-900/50 dark:from-violet-950/30">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
          <Rocket className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            Finish setting up your facility
          </p>
          <p className="text-muted-foreground text-xs">
            {completed} of {total} steps complete — you&apos;re {percent}% of
            the way there.
          </p>
          <Progress
            value={percent}
            className="mt-2 h-1.5 max-w-md [&>div]:bg-violet-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            <Link href="/facility/onboarding">
              Continue setup
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
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
    </div>
  );
}
