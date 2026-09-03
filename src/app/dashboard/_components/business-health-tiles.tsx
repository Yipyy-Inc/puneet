"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  DollarSign,
  LifeBuoy,
  TimerReset,
} from "lucide-react";

import { platformDashboardQueries } from "@/lib/api/platform-dashboard";
import {
  KpiTile,
  type KpiTone,
} from "@/components/facility/dashboard/kpi-tile";
import { cn } from "@/lib/utils";

function deltaHint(delta: number, unit: "facilities" | "mrr"): string {
  if (delta === 0) return "No change vs last month";
  const arrow = delta > 0 ? "▲" : "▼";
  const magnitude =
    unit === "mrr"
      ? `$${Math.abs(delta).toLocaleString()}`
      : `${Math.abs(delta)}`;
  const verb = unit === "mrr" ? "new this month" : "vs last month";
  return `${arrow} ${magnitude} ${verb}`;
}

function TileSkeleton() {
  return (
    // §5d: "A skeleton mirrors the shape of what is loading." These bars are
    // the tile's own label, value and sub-line at their real sizes, and the
    // block is the real 40px carrier — so nothing moves when the data lands.
    <div className="border-line bg-card shadow-card rounded-2xl border p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="bg-surface-inset-2 h-3 w-24 animate-pulse rounded-sm" />
          <div className="bg-surface-inset-2 mt-3 h-7 w-16 animate-pulse rounded-sm" />
          <div className="bg-surface-inset-2 mt-2 h-3 w-28 animate-pulse rounded-sm" />
        </div>
        <div className="bg-surface-inset-2 size-10 shrink-0 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}

const GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

export function BusinessHealthTiles() {
  const router = useRouter();
  const { data, isLoading } = useQuery(
    platformDashboardQueries.businessHealth(),
  );

  if (isLoading || !data) {
    return (
      <div className={GRID_CLASS}>
        {Array.from({ length: 5 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    );
  }

  const { activeFacilities, mrr, openTickets, trialsExpiring, platformHealth } =
    data;

  const healthTone: KpiTone =
    platformHealth.status === "down"
      ? "rose"
      : platformHealth.status === "degraded"
        ? "amber"
        : "emerald";

  return (
    <div className={cn(GRID_CLASS)}>
      <KpiTile
        label="Active Facilities"
        value={activeFacilities.count}
        hint={deltaHint(activeFacilities.delta, "facilities")}
        icon={Building2}
        tone="indigo"
        onClick={() => router.push("/dashboard/facilities")}
      />

      <KpiTile
        label="Monthly Recurring Revenue"
        value={`$${mrr.amount.toLocaleString()}`}
        hint={deltaHint(mrr.delta, "mrr")}
        icon={DollarSign}
        tone="emerald"
        onClick={() => router.push("/dashboard/subscriptions")}
      />

      <KpiTile
        label="Open Support Tickets"
        value={openTickets.count}
        hint={`${openTickets.inProgress} in progress · ${openTickets.escalated} escalated`}
        icon={LifeBuoy}
        tone={openTickets.slaBreached > 0 ? "rose" : "indigo"}
        alert={
          openTickets.slaBreached > 0
            ? {
                label: `${openTickets.slaBreached} SLA breached`,
                tone: "rose",
              }
            : undefined
        }
        onClick={() => router.push("/dashboard/system-admin/support-ticketing")}
      />

      <KpiTile
        label="Trials Expiring · 7 Days"
        value={trialsExpiring.count}
        hint={
          trialsExpiring.count > 0
            ? trialsExpiring.soonestLabel
              ? `Soonest: ${trialsExpiring.soonestLabel}`
              : "Within the next 7 days"
            : "None expiring soon"
        }
        icon={TimerReset}
        tone={trialsExpiring.count > 0 ? "amber" : "slate"}
        onClick={() => router.push("/dashboard/subscriptions/tracking")}
      />

      <KpiTile
        label="Platform Health"
        value={`${platformHealth.percent}%`}
        hint={`${platformHealth.serversOnline}/${platformHealth.totalServers} servers · ${platformHealth.degradedServices} degraded`}
        icon={Activity}
        tone={healthTone}
        onClick={() =>
          router.push("/dashboard/system-admin/system-config?tab=settings")
        }
        link={{
          label: "View Details",
          onClick: () =>
            router.push("/dashboard/system-admin/system-config?tab=settings"),
        }}
      />
    </div>
  );
}
