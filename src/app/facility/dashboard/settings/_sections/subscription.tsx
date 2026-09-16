"use client";

import Link from "next/link";

import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useAppLocale } from "@/hooks/use-app-locale";
import { useFacilitySubscription } from "@/lib/api/facility-subscription";

export function SubscriptionSection() {
  const t = useSettingsText().section("subscription");
  const locale = useAppLocale();
  // The FACILITY's own plan, from `facility_subscriptions`. This card read one
  // invented plan from `src/data/settings`, so every facility saw the same
  // name, price and renewal date — and none of them saw their own.
  const { subscription, pending } = useFacilitySubscription();
  const fill = (key: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
  const { addons, updateAddons } = useSettings();
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>{t("current")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending ? (
            <div className="text-ink-tertiary text-[14.5px]">
              {t("loading")}
            </div>
          ) : !subscription ? (
            /* Not an error: a facility nobody has put on a plan yet. Saying so
               beats showing a plan it is not on. */
            <div className="text-ink-tertiary text-[14.5px]">
              {t("noSubscription")}
            </div>
          ) : (
            <div className="flex items-start justify-between rounded-lg bg-linear-to-br from-blue-50 to-purple-50 p-6">
              <div>
                <div className="text-2xl font-bold">
                  {subscription.tierName}
                </div>
                <div className="text-ink-tertiary mt-1">
                  {t(
                    subscription.billingCycle === "monthly"
                      ? "billedMonthly"
                      : "billedYearly",
                  )}
                </div>
                <div className="mt-4">
                  {/* The stored status is an enum — `active`, `past_due` — so
                      it reads through the catalogue rather than being printed
                      raw: a French admin was shown the English word, and
                      `capitalize` would have made "Paiement en retard" into
                      "Paiement En Retard". An unknown value shows itself
                      rather than a missing key. */}
                  <Badge
                    variant={
                      subscription.status === "active" ? "default" : "secondary"
                    }
                  >
                    {t(`status_${subscription.status}`) ===
                    `status_${subscription.status}`
                      ? subscription.status
                      : t(`status_${subscription.status}`)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: subscription.currency,
                    maximumFractionDigits: 0,
                  }).format(subscription.amountCents / 100)}
                </div>
                <div className="text-ink-tertiary text-[14.5px]">
                  {t(
                    subscription.billingCycle === "monthly"
                      ? "perMonth"
                      : "perYear",
                  )}
                </div>
                {/* §6 rule 8: `toLocaleDateString()` with no options renders
                    a numeric MM/DD/YYYY, which Canada reads three ways — and
                    with no locale it followed the browser rather than the
                    viewer's choice. Long form, in their language. */}
                {subscription.periodEnd && (
                  <div className="text-ink-tertiary mt-2 text-[13.5px]">
                    {fill("nextBilling", {
                      date: new Intl.DateTimeFormat(locale, {
                        dateStyle: "long",
                      }).format(new Date(subscription.periodEnd)),
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Both of these were alert() describing a screen that already
              exists. /facility/account/subscription and .../change-plan are
              real routes over the real subscription — this card was the only
              place in the product that did not know. */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/facility/account/subscription/change-plan">
                {t("changePlan")}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/facility/account/subscription">
                {t("billingHistory")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>{t("moduleAddOns")}</CardTitle>
          <p className="text-ink-tertiary mt-1 text-[14.5px]">
            {t("moduleAddOnsHelp")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {addons.map((addon) => (
            <div key={addon.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{addon.name}</span>
                    {addon.isIncludedInPlan && (
                      <Badge variant="default">{t("includedInPlan")}</Badge>
                    )}
                    {addon.isEnabled && !addon.isIncludedInPlan && (
                      <Badge variant="secondary">{t("activeAddOn")}</Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 text-sm">
                    {addon.description}
                  </div>
                  {!addon.isIncludedInPlan && (
                    <div className="mt-2 text-[14.5px] font-medium">
                      {/* The amount itself still comes from `formatCurrency`'s
                          en-US / USD pair, which is on the hardcoded-locale
                          ratchet and is not this change's to move. Only the
                          sentence around it is translated. */}
                      {fill("pricePerMonth", {
                        amount: `$${addon.monthlyPrice}`,
                      })}
                    </div>
                  )}
                </div>
                <Switch
                  checked={addon.isEnabled}
                  disabled={addon.isIncludedInPlan}
                  onCheckedChange={(checked) =>
                    updateAddons(
                      addons.map((a) =>
                        a.id === addon.id ? { ...a, isEnabled: checked } : a,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
