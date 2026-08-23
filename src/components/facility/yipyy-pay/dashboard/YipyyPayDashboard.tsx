"use client";

import dynamic from "next/dynamic";
import { Settings2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import {
  PoweredByClover,
  YipyyPayHero,
  YipyyPayWordmark,
} from "../YipyyPayBrand";
import { useYipyyPayNav } from "../YipyyPaySection";
import { OverviewTab } from "./OverviewTab";

// The devices tab makes a slow, optional call and the preferences tab carries a
// form. Neither is on screen when Overview is, so neither is in its bundle.
const DevicesTab = dynamic(
  () => import("./DevicesTab").then((m) => m.DevicesTab),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);
const PreferencesTab = dynamic(
  () => import("./PreferencesTab").then((m) => m.PreferencesTab),
  { loading: () => <Skeleton className="h-64 w-full" /> },
);

// ============================================================================
// What a facility sees for the years after the five minutes of setup.
//
// ── THE HEADER IS A STATUS BAR, NOT A HERO ────────────────────────────────
//
// Same gradient surface as the landing page so it is recognisably the same
// product, at a fraction of the height. The landing page was selling; this is
// answering one question — is my money moving — and it should answer it above
// the fold, every time, without scrolling.
//
// ── THE STATUS IS THE CONNECTION'S, NOT THE SETUP'S ───────────────────────
//
// A facility that finished setup and later uninstalled Yipyy from their own
// Clover dashboard has a completed setup and a dead account. The dot reports
// the second, because the second is the one that decides whether the next
// customer can pay.
// ============================================================================

type TabKey = "overview" | "devices" | "preferences";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "devices", label: "Devices" },
  { key: "preferences", label: "Preferences" },
];

export function YipyyPayDashboard({
  overview,
}: {
  overview: YipyyPayOverview;
}) {
  const nav = useYipyyPayNav();
  const requested = nav.requestedTab as TabKey | null;
  const tab: TabKey =
    requested && TABS.some((t) => t.key === requested) ? requested : "overview";

  const { connection } = overview;
  const healthy = connection.connected;
  const sandbox = connection.environment === "sandbox";
  const scope =
    overview.config.locationScope === "all"
      ? overview.locations.length > 1
        ? `All ${overview.locations.length} locations`
        : null
      : `${overview.config.locationIds.length} of ${overview.locations.length} locations`;

  return (
    <div className="space-y-6">
      <YipyyPayHero size="sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <YipyyPayWordmark size="sm" />
            <p className="truncate text-sm text-white/80">
              {overview.facility.name}
              {scope && <> · {scope}</>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                healthy
                  ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-300/40"
                  : "bg-amber-500/20 text-amber-50 ring-1 ring-amber-300/40",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  healthy ? "bg-emerald-300" : "bg-amber-300",
                )}
              />
              {healthy ? "Active" : "Needs attention"}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => nav.go({ tab: "preferences" })}
            >
              <Settings2 className="size-3.5" />
              Update details
            </Button>
          </div>
        </div>
        {/* Three of three. */}
        <div className="mt-4 flex justify-end">
          <PoweredByClover tone="on-brand" />
        </div>
      </YipyyPayHero>

      {!healthy && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1 text-sm/relaxed">
              <p className="font-semibold">
                Card payments are not working right now.
              </p>
              <p>
                {connection.lastError ??
                  "Your payment account is no longer connected. This happens if the app was removed from your merchant account."}{" "}
                Reconnect from Preferences to start taking cards again.
              </p>
            </div>
          </div>
        </Card>
      )}

      {sandbox && healthy && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5 text-sm/relaxed">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>
              <span className="font-semibold">This is a test account.</span>{" "}
              Cards are simulated, no money reaches your bank, and the figures
              below are not real takings.
            </p>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(next) => nav.go({ tab: next })}>
        <TabsList>
          {TABS.map((entry) => (
            <TabsTrigger key={entry.key} value={entry.key}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab overview={overview} />
        </TabsContent>
        <TabsContent value="devices" className="mt-6">
          {/* Mounted only when open: the tab lists hardware and each card can
              make a forty-second call, which should not start behind a tab
              nobody opened. */}
          {tab === "devices" && <DevicesTab overview={overview} />}
        </TabsContent>
        <TabsContent value="preferences" className="mt-6">
          {tab === "preferences" && <PreferencesTab overview={overview} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
