"use client";

import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatMoney } from "@/lib/i18n/format";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle } from "lucide-react";
import { memberships, membershipPlans } from "@/data/services-pricing";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/**
 * Booking-summary panel shown to a customer whose active membership covers the
 * selected service. Renders the credit-applied confirmation (Table 30), or the
 * out-of-credits prompt with "Book anyway" / "Wait for renewal" (Table 31).
 * Returns null when no membership applies to this service.
 */
export function MembershipCreditPanel({
  clientId,
  service,
  onClose,
}: {
  clientId: number;
  service: string;
  onClose: () => void;
}) {
  // Above the two early returns below: hooks run in the same order every
  // render or they run wrong.
  const t = useShellText("booking");
  const locale = useShellLocale();
  const [dismissed, setDismissed] = useState(false);

  const membership = memberships.find(
    (m) => m.customerId === String(clientId) && m.status === "active",
  );
  if (!membership) return null;

  const plan = membershipPlans.find((p) => p.id === membership.planId);
  if (!plan || !plan.applicableServices.some((s) => s === service)) return null;

  const total = membership.creditsPerCycle ?? membership.creditsTotal;
  const unlimited = total === -1;
  const used =
    membership.creditsUsedThisCycle ??
    Math.max(0, total - membership.creditsRemaining);
  const remaining = unlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, total - used);

  // Credits available (or unlimited) → applied at no cost.
  if (unlimited || remaining > 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-emerald-900 dark:text-emerald-200">
          {t("membershipYour")} {plan.name} {t("membershipApplied")}{" "}
          <span className="font-semibold">
            {t("costToYou").replace("{amount}", formatMoney(0, locale))}
          </span>
          {!unlimited &&
            " " +
              t("creditsUsedThisCycle")
                .replace("{used}", String(used))
                .replace("{total}", String(total))}
          .
        </p>
      </div>
    );
  }

  // Out of credits this cycle.
  if (dismissed) return null;
  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-amber-900 dark:text-amber-200">
          {t("usedAllCredits")} {total} {t("creditsRefreshOn")}{" "}
          <span className="font-semibold">
            {formatDate(membership.nextBillingDate)}
          </span>
          . {t("bookNowOrWait")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setDismissed(true)}>
          {t("bookAnyway")}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          {t("waitForRenewal")}
        </Button>
      </div>
    </div>
  );
}
