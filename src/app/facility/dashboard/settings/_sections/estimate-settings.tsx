"use client";

import Link from "next/link";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

import { EstimateFollowUpSettings } from "@/components/estimates/EstimateFollowUpSettings";
import { EstimateDefaultsSettings } from "@/components/estimates/EstimateDefaultsSettings";

export function EstimateSettingsSection() {
  const settingsPath = useSettingsHref();
  const t = useSettingsText().section("estimate-settings");
  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {t("brandingNote")}{" "}
          <Link
            href={settingsPath("invoice-template")}
            className="text-primary font-medium hover:underline"
          >
            {t("brandingLink")}
          </Link>
        </p>
      </div>
      <EstimateDefaultsSettings />
      <EstimateFollowUpSettings />
    </div>
  );
}
