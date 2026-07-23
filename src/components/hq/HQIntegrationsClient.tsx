"use client";

import Link from "next/link";
import { Building2, ChevronRight, Layers } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { QuickBooksLocationCards } from "@/components/integrations/quickbooks/QuickBooksLocationCards";
import { useQuickBooksConnection } from "@/lib/quickbooks/connection-store";
import { facilityLocations } from "@/lib/quickbooks/location-classes";
import type { MultiLocationMode } from "@/lib/quickbooks/location-scopes";
import {
  patchQuickBooksSettings,
  useQuickBooksSettings,
} from "@/lib/quickbooks/settings-store";

// ============================================================================
// The HQ accounting surface (Section 6B).
//
// One decision drives everything under it: does this facility keep ONE
// QuickBooks company for the whole business, or one per branch? They aren't
// preferences so much as descriptions of how the business is actually
// incorporated, which is why the choice is stated in those terms rather than as
// a feature toggle.
// ============================================================================

const MODES: {
  value: MultiLocationMode;
  title: string;
  detail: string;
  icon: typeof Layers;
}[] = [
  {
    value: "single_company",
    title: "One company for the whole business",
    detail:
      "Every location posts into the same QuickBooks company. Turn on “Track by location” in sync settings to split the reporting by Class.",
    icon: Layers,
  },
  {
    value: "company_per_location",
    title: "A separate company per location",
    detail:
      "Each branch connects to its own QuickBooks company, with its own accounts and its own mappings. Usually because the branches are separate legal entities.",
    icon: Building2,
  },
];

export function HQIntegrationsClient({ facilityId }: { facilityId: string }) {
  const settings = useQuickBooksSettings({ facilityId });
  const facilityConnection = useQuickBooksConnection({ facilityId });
  const mode: MultiLocationMode =
    settings.multiLocationMode ?? "single_company";
  const locations = facilityLocations(facilityId);

  // Switching shape after a company is already connected would strand its
  // mappings against a scope nothing reads any more. Say so rather than letting
  // it happen quietly.
  const facilityConnected = facilityConnection.status !== "disconnected";

  return (
    <div className="max-w-4xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((option) => {
          const active = mode === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              data-active={active}
              onClick={() =>
                patchQuickBooksSettings(
                  { facilityId },
                  { multiLocationMode: option.value },
                )
              }
              className="hover:border-foreground/20 rounded-lg border p-4 text-left transition-colors data-[active=true]:border-emerald-500/50 data-[active=true]:bg-emerald-500/5"
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="text-muted-foreground size-4 shrink-0" />
                {option.title}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {option.detail}
              </p>
            </button>
          );
        })}
      </div>

      {mode === "company_per_location" ? (
        <>
          {facilityConnected && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              A business-wide QuickBooks company is still connected. Its
              mappings stay saved but nothing new posts to it while you are in
              per-location mode — connect each branch below instead.
            </p>
          )}
          <QuickBooksLocationCards facilityId={facilityId} />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {locations.length} locations post into one company
              </p>
              <p className="text-muted-foreground text-xs">
                Connect it, and split the reporting per branch, from the
                facility integration settings.
              </p>
            </div>
            <Link
              href="/facility/dashboard/settings/integrations/quickbooks"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-sky-700 underline underline-offset-4 dark:text-sky-400"
            >
              Open QuickBooks settings
              <ChevronRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
