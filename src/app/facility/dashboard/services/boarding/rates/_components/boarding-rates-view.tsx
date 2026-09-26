"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { AddOnsSettingsLink } from "@/components/facility/add-ons/add-ons-settings-link";
import { useStaffText } from "@/lib/staff/use-staff-text";

import { BoardingServiceList } from "./boarding-service-list";

// ============================================================================
// Services → Boarding → Rates: what a facility sells, as distinct from where
// the animal sleeps. Was the Menu tab until 2026-09-26 (see ../page.tsx).
//
// ── WHY THIS PAGE EXISTS AT ALL ───────────────────────────────────────────
//
// Phase 5 created `boarding_services` and Phase 6 made the booking wizard pick
// from it, but NOTHING RENDERED THE ROUTES: the API was typed, scoped and
// tested, and a facility still had no way to add an eleventh service. The menu
// was whatever the migration had carried over — ten rows nobody could edit.
// An editor nothing links to is dead code with a plausible name; an API no
// screen calls is the same thing one layer down.
//
// ── ONE TAB, STILL TWO OBJECTS ────────────────────────────────────────────
//
// What merged is the two TABS, not the two objects. A rate here is a
// `boarding_services` row and names the room types it books into; a room type
// and its kennels are still `room_categories` and `facility_rooms`, edited on
// Rooms. The room type's own nightly price stays there too: it prices every
// boarding booking made before the cutover, and `boardingPricing` falls back
// to it when a booking names no rate. Folding the OBJECTS back together is
// what made the kennel class the rate in the first place.
// ============================================================================

export function BoardingRatesView() {
  const { t } = useStaffText("boardingServices");

  // Add-ons are one list for every service now, set up in Settings (see
  // AddOnsSettingsLink) — this page carried its own copy as a second tab.
  return (
    <div className="space-y-6">
      <BoardingServiceList />

      <AddOnsSettingsLink />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{t("lodgingTypesCard")}</p>
            <p className="text-muted-foreground text-[13.5px]">
              {t("lodgingTypesCardBlurb")}
            </p>
          </div>
          <Link
            href="/facility/dashboard/services/boarding/rooms"
            className="text-primary inline-flex min-h-10 items-center gap-2 text-[14.5px] font-medium max-lg:min-h-12"
          >
            {t("openLodgingTypes")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
