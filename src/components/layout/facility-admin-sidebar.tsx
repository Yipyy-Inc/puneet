"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { insightQueries } from "@/lib/api/smart-insights";

import { GenericSidebar, MenuSection } from "@/components/ui/generic-sidebar";
import { facilities } from "@/data/facilities";
import { LocationContextSelector } from "@/components/hq/LocationContextSelector";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import { NAV_SECTIONS, type NavItem } from "@/lib/nav/facility-nav";

export function FacilitySidebar() {
  const isMounted = useHydrated();

  // The acting user's effective permissions (F0.2). Owner/Admin resolve to the
  // full set, so every section passes; lower roles see only what they hold.
  const permissions = useEffectivePermissions();

  // Static facility ID for now (would come from user token in production).
  const facilityId = 11;

  // Spec § 10.7: nav badge updates every 5 minutes via lightweight polling.
  const { data: highPriorityCount = 0 } = useQuery({
    ...insightQueries.highPriorityCount(facilityId),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Render from the single source-of-truth nav model. Gate every item through
  // the resolver — the sidebar makes no independent permission decisions; an
  // item shows only when the acting user holds its `permKey`. Sections left with
  // no visible items are dropped.
  const filteredMenuSections = useMemo((): MenuSection[] => {
    // Runtime badge counts — UI state, not part of the shared nav model, so
    // they're layered on here by route. Smart Insights is polled live; the rest
    // are placeholder counts kept from the original inline sidebar.
    const counts: Record<string, number | undefined> = {
      "/facility/dashboard/clients": 3,
      "/facility/dashboard/bookings": 8,
      "/facility/dashboard/tasks": 2,
      "/facility/dashboard/incidents": 2,
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
    // TODO: Implement logout logic
  };

  const facility = facilities.find((f) => f.id === facilityId);
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
          {facility?.logo ? (
            <Image
              src={facility.logo}
              alt={facility.name}
              width={40}
              height={40}
              className="size-8 rounded-lg object-contain md:size-10"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold md:size-10 md:text-sm">
              {(facility?.name || "F")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold md:text-base">
              {facility?.name || "Facility Dashboard"}
            </h2>
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
