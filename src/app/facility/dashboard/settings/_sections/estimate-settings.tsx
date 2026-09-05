"use client";

import Link from "next/link";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

import { EstimateFollowUpSettings } from "@/components/estimates/EstimateFollowUpSettings";
import { EstimateDefaultsSettings } from "@/components/estimates/EstimateDefaultsSettings";

export function EstimateSettingsSection() {
  const settingsPath = useSettingsHref();
  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Estimate emails use your Invoice Template branding.{" "}
          <Link
            href={settingsPath("invoice-template")}
            className="text-primary font-medium hover:underline"
          >
            Configure branding in Invoice Settings →
          </Link>
        </p>
      </div>
      <EstimateDefaultsSettings />
      <EstimateFollowUpSettings />
    </div>
  );
}
