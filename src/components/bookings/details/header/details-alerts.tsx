"use client";

import { Chip } from "@/components/ui/chip";
import type { DetailAlert } from "@/lib/bookings/details/service-view";
import { formatTimeOfDay } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// The chips under the stepper: what could hurt the pet in red, what is late
// in amber, what today holds in grey — the mock's three, in its words. Chips
// without glyphs, as the client's mocks draw them (CLAUDE.md § "Client mocks
// decide the look"); the word carries the meaning.
// ============================================================================

const TONE = {
  red: "bd-danger",
  amber: "warning",
  neutral: "neutral",
} as const;

export function DetailsAlerts({
  alerts,
  t,
  fill,
  locale,
}: {
  alerts: DetailAlert[];
  t: (key: string) => string;
  fill: (key: string, values: Record<string, string | number>) => string;
  locale: AppLocale;
}) {
  if (alerts.length === 0) return null;
  const text = (alert: DetailAlert) => {
    switch (alert.kind) {
      case "allergy":
        return fill("alertAllergy", { allergy: alert.text });
      case "careOverdue":
        return fill(
          alert.count === 1 ? "alertCareOverdueOne" : "alertCareOverdueMany",
          { n: alert.count },
        );
      case "checkoutToday":
        return alert.time
          ? fill("alertCheckoutAt", {
              time: formatTimeOfDay(alert.time, locale),
            })
          : t("alertCheckoutToday");
      case "vaccines":
        return alert.text;
      default:
        return alert.text;
    }
  };
  return (
    <ul className="flex flex-wrap gap-2">
      {alerts.map((alert, i) => (
        <li key={`${alert.kind}-${i}`}>
          <Chip tone={TONE[alert.tone]} size="bd-alert">
            {text(alert)}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
