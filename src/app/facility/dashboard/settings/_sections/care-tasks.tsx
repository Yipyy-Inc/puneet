"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CareTaskSettings } from "@/components/facility/CareTaskSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsCardGrid } from "@/components/ui/settings-card-grid";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// Care tasks: the options staff pick from when they log a meal or a dose.
//
// What the booking form's Feeding and Medications steps offer was set up here
// until 2026-10-01; it is the client's own page now, under Services › Feeding
// & medications. A card says so, for whoever looks for it here.
// ============================================================================

export function CareTasksSection() {
  const t = useSettingsText().section("care-tasks");
  const settingsPath = useSettingsHref();
  return (
    <SettingsCardGrid className="items-start">
      <Card>
        <CardHeader>
          <CardTitle>{t("optionsTitle")}</CardTitle>
          <p className="text-meta text-ink-tertiary mt-1">
            {t("optionsMoved")}
          </p>
        </CardHeader>
        <CardContent>
          <Link
            href={settingsPath("feeding-medications")}
            className="text-primary inline-flex items-center gap-2 font-semibold hover:underline"
          >
            {t("optionsMovedLink")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
      <CareTaskSettings />
    </SettingsCardGrid>
  );
}
