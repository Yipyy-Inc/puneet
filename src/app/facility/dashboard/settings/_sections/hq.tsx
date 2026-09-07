"use client";

// settings-write-ok: this section is a set of links into /facility/hq,
// which is a full area with its own routes and its own writes. There is no
// field here to save, and duplicating the editors would be the mistake.

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The seven links were invisible to `check:ui-french` until 2026-09-07.
//
// They sat in an array of `{ href, label }` objects, and the gate matched the
// JSX ATTRIBUTE form `label="…"`, never the property form `label: "…"`. So
// this section reported two English strings and rendered nine — the seven it
// hid being the entire list the page exists to show. The `OBJECT_COPY` rule
// closed that; see the note on it in scripts/check-ui-french.ts.
// ============================================================================

export function HqSection() {
  const t = useSettingsText().section("hq");

  const links: { href: string; key: string }[] = [
    { href: "/facility/hq/overview", key: "overview" },
    { href: "/facility/hq/comparison", key: "comparison" },
    { href: "/facility/hq/services", key: "services" },
    { href: "/facility/hq/training", key: "training" },
    { href: "/facility/hq/staff", key: "staff" },
    { href: "/facility/hq/transfers", key: "transfers" },
    { href: "/facility/hq/settings", key: "hqSettings" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-ink-tertiary text-[13.5px]">{t("intro")}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                // §6 rule 7: a link in a list is a tap target on a phone, and
                // a 20px line of text is not one. `min-h-12` below `lg` costs
                // nothing at a desk and makes this usable standing up.
                className="text-primary flex min-h-10 items-center text-[14.5px] hover:underline max-lg:min-h-12"
              >
                {t(link.key)} →
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
