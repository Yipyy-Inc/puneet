"use client";

import { useSignOutEverywhere } from "@/lib/auth/sign-out-client";
import { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { insightQueries } from "@/lib/api/smart-insights";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationContextSelector } from "@/components/hq/LocationContextSelector";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import { NAV_SECTIONS, type NavItem } from "@/lib/nav/facility-nav";

/**
 * Up to two initials for a facility with no logo.
 *
 * Filters empty segments before taking first letters — a name with a double
 * space or a trailing one yields `undefined` from `w[0]`, and the old inline
 * version would have put that in the badge.
 */
function initials(name: string): string {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return letters.toUpperCase() || "F";
}

export function FacilitySidebar() {
  const signOutEverywhere = useSignOutEverywhere();
  const isMounted = useHydrated();

  // The acting user's effective permissions (F0.2). Owner/Admin resolve to the
  // full set, so every section passes; lower roles see only what they hold.
  const permissions = useEffectivePermissions();

  // The facility whose name is on this sidebar comes from the SESSION, via
  // /api/facility/profile → getFacilityContext() → the viewer's membership.
  //
  // It used to be `facilities.find((f) => f.id === 11)` out of the fixtures, so
  // every facility that ever signed in was greeted, on every page, by a
  // business called "Example Pet Care Facility" with somebody else's logo.
  const { profile, isPending: profilePending } = useFacilityProfile();

  // Still the fixture ref, and only for the Smart Insights badge below —
  // insights are derived from mock data (resolveAll) and are their own
  // conversion. Kept explicit rather than threaded through the profile so it is
  // obvious this number scopes nothing real.
  const insightsFacilityRef = 11;

  // Spec § 10.7: nav badge updates every 5 minutes via lightweight polling.
  const { data: highPriorityCount = 0 } = useQuery({
    ...insightQueries.highPriorityCount(insightsFacilityRef),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Render from the single source-of-truth nav model. Gate every item through
  // the resolver — the sidebar makes no independent permission decisions; an
  // item shows only when the acting user holds its `permKey`. Sections left with
  // no visible items are dropped.
  const filteredMenuSections = useMemo((): MenuSection[] => {
    // Runtime badge counts, layered on by route.
    //
    // Clients (3), Bookings (8), Tasks (2) and Incidents (2) used to be here as
    // literals — the same four numbers on every page for every facility,
    // including one that opened yesterday and has no clients at all. A badge
    // that never changes is not a count, and it is read as one.
    //
    // They are removed rather than derived: four extra queries firing on every
    // page load, in the sidebar, to decorate a nav item is the wrong trade. They
    // come back if and when the pages they point at are worth counting live.
    const counts: Record<string, number | undefined> = {
      "/facility/dashboard/insights":
        highPriorityCount > 0 ? highPriorityCount : undefined,
    };

    const isAllowed = (item: NavItem) => permissions[item.permKey] !== false;

    return NAV_SECTIONS.map((section) => ({
      label: section.label,
      items: section.items.filter(isAllowed).map((item) => ({
        title: item.title,
        url: item.url,
        icon: item.icon,
        disabled: false,
        count: counts[item.url],
      })),
    })).filter((section) => section.items.length > 0);
  }, [highPriorityCount, permissions]);

  const handleLogout = () => {
    void signOutEverywhere();
  };

  const dateLabel = isMounted
    ? new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <GenericSidebar
      header={
        <div className="flex items-center gap-3">
          {profile.logo ? (
            <Image
              src={profile.logo}
              alt={profile.businessName}
              width={40}
              height={40}
              className="size-8 rounded-lg object-contain md:size-10"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold md:size-10 md:text-sm">
              {initials(profile.businessName)}
            </div>
          )}
          <div className="min-w-0">
            {/* A skeleton, not a placeholder name. The profile arrives blank
                before the query resolves, and any word rendered in its place —
                "Facility Dashboard", the old fixture name — is a statement
                about whose business this is, made before we know. */}
            {profilePending ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <h2 className="truncate text-sm font-semibold md:text-base">
                {profile.businessName || "Your facility"}
              </h2>
            )}
            <p className="text-muted-foreground text-xs">{dateLabel}</p>
          </div>
        </div>
      }
      locationSelector={<LocationContextSelector />}
      menuSections={filteredMenuSections}
      onLogout={handleLogout}
    />
  );
}
