"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddOnsManager } from "@/components/facility/add-ons/AddOnsManager";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import { addOnsForService } from "@/lib/settings/addons";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useDaycareServices } from "@/lib/api/daycare-catalogue";

import { DaycareServiceList } from "./_components/daycare-service-list";

// ============================================================================
// Settings → Services → Daycare: the menu a facility sells.
//
// ── WHAT THIS REPLACED, AND WHY ───────────────────────────────────────────
//
// One 1,012-line file holding a rate-card editor whose rates NOBODY WAS EVER
// OFFERED: `daycareRateForHours` picked the cheapest active rate that covered
// the stay's hours, so the facility authored a menu the till ignored. Three of
// the editor's fields did nothing at all — the four size prices were read by
// no pricing code, and `allowedSectionIds` and `includedAddOnIds` were matched
// through a legacy `type` field the editor had stopped writing.
//
// The menu is `daycare_services` now (20260924120000), and the booking picks
// from it. The sections below are MoéGo's, in MoéGo's order, because that is
// what was asked for.
//
// ── THE PRICING RULES ARE NOT HERE, DELIBERATELY ──────────────────────────
//
// Multi-pet and multi-night discounts, custom fees and late pick-up are
// facility-wide and apply across services — MoéGo's own guide puts them in a
// separate step for the same reason. The card at the bottom is the way over.
// ============================================================================

export default function DaycareRatesPage() {
  const { t } = useStaffText("daycareServices");
  const settingsPath = useSettingsHref();
  const { data: services } = useDaycareServices();
  const { addOns: allAddOns } = useServiceAddOns();
  const daycareAddOns = addOnsForService(allAddOns, "daycare");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">
            {t("servicesTab")} ({services?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="addons">
            {t("addOnsTab")} ({daycareAddOns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-0">
          <DaycareServiceList />
        </TabsContent>

        <TabsContent value="addons" className="mt-0">
          <AddOnsManager serviceFilter="daycare" />
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{t("pricingRules")}</p>
            <p className="text-muted-foreground text-[13.5px]">
              {t("pricingRulesBlurb")}
            </p>
          </div>
          <Link
            href={settingsPath("pricing-rules")}
            className="text-primary inline-flex min-h-10 items-center gap-2 text-[14.5px] font-medium max-lg:min-h-12"
          >
            {t("openPricingRules")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
