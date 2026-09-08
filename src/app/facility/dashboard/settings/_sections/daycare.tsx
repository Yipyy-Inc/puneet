"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

import { ServiceColorCard } from "@/components/facility/ServiceColorCard";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { SettingsCardGrid } from "../_components/settings-card-grid";

export function DaycareSection() {
  const t = useSettingsText().section("daycare");
  return (
    <SettingsCardGrid>
      <Card>
        <CardContent>
          <p className="text-ink-tertiary text-[14.5px]">{t("intro")}</p>
          <Link
            href="/facility/dashboard/services/daycare/settings"
            className="text-primary mt-2 inline-flex min-h-10 items-center text-[14.5px] hover:underline max-lg:min-h-12"
          >
            {t("goTo")} →
          </Link>
        </CardContent>
      </Card>
      <ServiceColorCard service="Daycare" />
    </SettingsCardGrid>
  );
}
