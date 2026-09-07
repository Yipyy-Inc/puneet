"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

import { ServiceColorCard } from "@/components/facility/ServiceColorCard";
import { useSettingsText } from "@/lib/settings/use-settings-text";

export function GroomingSection() {
  const t = useSettingsText().section("grooming");
  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <p className="text-ink-tertiary text-[14.5px]">{t("intro")}</p>
          <Link
            href="/facility/dashboard/services/grooming/settings"
            className="text-primary mt-2 inline-flex min-h-10 items-center text-[14.5px] hover:underline max-lg:min-h-12"
          >
            {t("goTo")} →
          </Link>
        </CardContent>
      </Card>
      <ServiceColorCard service="Grooming" />
    </div>
  );
}
