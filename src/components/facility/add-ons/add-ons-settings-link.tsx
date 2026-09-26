"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

/**
 * Where a Rates page's Add-ons tab used to be (2026-09-26). Add-ons are one
 * list for every service now, set up in exactly one place — Settings >
 * Services > Add-ons — so each menu page points there instead of carrying its
 * own copy of the editor.
 */
export function AddOnsSettingsLink() {
  const settingsPath = useSettingsHref();
  const t = useSettingsText().section("addons");

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{t("title")}</p>
          <p className="text-muted-foreground text-[13.5px]">
            {t("linkBlurb")}
          </p>
        </div>
        <Link
          href={settingsPath("addons")}
          className="text-primary inline-flex min-h-10 items-center gap-2 text-[14.5px] font-medium max-lg:min-h-12"
        >
          {t("linkAction")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
