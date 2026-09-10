"use client";

import { useMemo, useState } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, Check, Sparkles, Tag, Ticket } from "lucide-react";
import { toast } from "sonner";
import { services, type ServicePackage } from "@/data/services-pricing";
import {
  useServicePackages,
  usePurchasePackage,
} from "@/lib/api/customer-packages";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatMoney, formatPercent } from "@/lib/i18n/format";

// The signed-in customer. Same placeholder the rest of the portal uses; it is
// the id the purchase is recorded against, so it stops being a constant when

const serviceName = (serviceId: string, fallback: string) =>
  services.find((s) => s.id === serviceId)?.name ?? fallback;

/** Total number of passes/credits a package grants (sum of quantities). */
const passCount = (pkg: ServicePackage) =>
  pkg.services.reduce((sum, s) => sum + s.quantity, 0);

// A rank badge's words, by CATALOGUE KEY.
function rankBadge(rank?: number) {
  if (rank === 1)
    return { labelKey: "mostPopular", className: "bg-amber-500 text-white" };
  if (rank === 2)
    return { labelKey: "bestValue", className: "bg-emerald-600 text-white" };
  return null;
}

/**
 * Customer-facing shop for prepaid pass bundles (e.g. "Daycare 10-Pack").
 * Memberships (recurring) live in their own zones; this is the one-time
 * package purchase surface the portal was missing.
 */
export function BuyPackagesSection() {
  const { t, fill, locale } = useCustomerText("packages");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const [selected, setSelected] = useState<ServicePackage | null>(null);
  const { data: catalogue = [] } = useServicePackages();
  const { mutate: buy, isPending } = usePurchasePackage();

  const available = useMemo(
    () =>
      catalogue
        .filter((p) => p.status === "active")
        .sort(
          (a, b) =>
            (a.popularityRank ?? 99) - (b.popularityRank ?? 99) ||
            a.packagePrice - b.packagePrice,
        ),
    [catalogue],
  );

  const confirmPurchase = () => {
    if (!selected || customerId == null) return;
    // The sale is one transaction server-side: the purchase and its pass pools
    // land together or not at all. The price is NOT sent — the database reads
    // it off the catalogue row, because a price that arrives from a browser is
    // a price the browser chose.
    const pkg = selected;
    buy(
      { clientId: customerId, packageId: pkg.id },
      {
        onSuccess: () => {
          toast.success(fill("packagePurchased", { package: pkg.name }), {
            description: fill("passesAddedValidFor", {
              n: passCount(pkg),
              days: pkg.validDays,
            }),
          });
          setSelected(null);
        },
        onError: (error: Error) => {
          // The old flow could not fail, so it never said anything. This one
          // can: the pack may have been retired between the page loading and
          // the button being pressed.
          toast.error(t("thatPurchaseDidNotGo"), {
            description: error.message,
          });
        },
      },
    );
  };

  if (available.length === 0) return null;

  return (
    <section className="bg-muted/40 rounded-2xl border p-6 md:p-8">
      <div className="mb-5 flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Ticket className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("buyPassesBundles")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("prepaidPassPacksHint")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((pkg) => {
          const badge = rankBadge(pkg.popularityRank);
          return (
            <Card
              key={pkg.id}
              className="relative flex flex-col overflow-hidden"
            >
              {badge && (
                <span
                  className={`absolute top-0 right-0 rounded-bl-lg px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                >
                  {t(badge.labelKey)}
                </span>
              )}
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="min-w-0 pr-16">
                  <h3 className="font-semibold">{pkg.name}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {pkg.description}
                  </p>
                </div>

                {/* What's included */}
                <ul className="space-y-1.5">
                  {pkg.services.map((s) => (
                    <li
                      key={s.serviceId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="size-4 shrink-0 text-emerald-600" />
                      <span>
                        <span className="font-semibold tabular-nums">
                          {s.quantity}×
                        </span>{" "}
                        {serviceName(s.serviceId, t("service"))}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Price + savings */}
                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {formatMoney(pkg.packagePrice, locale, { whole: true })}
                    </span>
                    {pkg.totalValue > pkg.packagePrice && (
                      <span className="text-muted-foreground mb-1 text-sm line-through">
                        {formatMoney(pkg.totalValue, locale, { whole: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pkg.savings > 0 && (
                      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                        <Tag className="size-3" />
                        {fill("saveAmountPercent", {
                          amount: formatMoney(pkg.savings, locale, {
                            whole: true,
                          }),
                          percent: formatPercent(
                            Math.round(pkg.savingsPercentage),
                            locale,
                          ),
                        })}
                      </Badge>
                    )}
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <CalendarClock className="size-3" />
                      {fill("validDays", { n: pkg.validDays })}
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-1 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setSelected(pkg)}
                >
                  {t("buyNow")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-primary size-5" />
              {fill("purchasePlanNamed", { plan: selected?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>
              {t("confirmYourPrepaidPassPurchase")}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3">
              <div className="bg-muted/40 space-y-2 rounded-lg border p-4">
                <ul className="space-y-1.5">
                  {selected.services.map((s) => (
                    <li
                      key={s.serviceId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="size-4 shrink-0 text-emerald-600" />
                      <span className="font-semibold tabular-nums">
                        {s.quantity}×
                      </span>{" "}
                      {serviceName(s.serviceId, t("service"))}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">
                    {fill("validForDays", { n: selected.validDays })}
                  </span>
                  {selected.savings > 0 && (
                    <span className="font-medium text-emerald-700">
                      {fill("youSave", {
                        amount: formatMoney(selected.savings, locale, {
                          whole: true,
                        }),
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>{t("total")}</span>
                <span>
                  {formatMoney(selected.packagePrice, locale, { whole: true })}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={confirmPurchase}
              disabled={isPending}
            >
              {isPending ? t("purchasing") : t("confirmPurchase")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
