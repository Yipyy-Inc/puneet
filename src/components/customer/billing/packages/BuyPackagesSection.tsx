"use client";

import { useMemo, useState } from "react";
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
import {
  servicePackages,
  services,
  type ServicePackage,
} from "@/data/services-pricing";
import { purchasePackage } from "@/lib/customer-package-purchases-store";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const serviceName = (serviceId: string) =>
  services.find((s) => s.id === serviceId)?.name ?? "Service";

/** Total number of passes/credits a package grants (sum of quantities). */
const passCount = (pkg: ServicePackage) =>
  pkg.services.reduce((sum, s) => sum + s.quantity, 0);

function rankBadge(rank?: number) {
  if (rank === 1)
    return { label: "Most Popular", className: "bg-amber-500 text-white" };
  if (rank === 2)
    return { label: "Best Value", className: "bg-emerald-600 text-white" };
  return null;
}

/**
 * Customer-facing shop for prepaid pass bundles (e.g. "Daycare 10-Pack").
 * Memberships (recurring) live in their own zones; this is the one-time
 * package purchase surface the portal was missing.
 */
export function BuyPackagesSection() {
  const [selected, setSelected] = useState<ServicePackage | null>(null);

  const available = useMemo(
    () =>
      servicePackages
        .filter((p) => p.status === "active")
        .sort(
          (a, b) =>
            (a.popularityRank ?? 99) - (b.popularityRank ?? 99) ||
            a.packagePrice - b.packagePrice,
        ),
    [],
  );

  const confirmPurchase = () => {
    if (!selected) return;
    // Adds the pack to the customer's owned purchases (module store), so it
    // shows up immediately under "My prepaid packs". No real payment backend
    // yet — this is the prototype's mock checkout, like the membership flow.
    purchasePackage(selected);
    toast.success(`${selected.name} purchased`, {
      description: `${passCount(selected)} passes added to your account. Valid for ${selected.validDays} days.`,
    });
    setSelected(null);
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
            Buy Passes &amp; Bundles
          </h2>
          <p className="text-muted-foreground text-sm">
            Prepaid pass packs — buy in bulk and save. Passes are used
            automatically when you book.
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
                  {badge.label}
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
                        {serviceName(s.serviceId)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Price + savings */}
                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {formatCurrency(pkg.packagePrice)}
                    </span>
                    {pkg.totalValue > pkg.packagePrice && (
                      <span className="text-muted-foreground mb-1 text-sm line-through">
                        {formatCurrency(pkg.totalValue)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {pkg.savings > 0 && (
                      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                        <Tag className="size-3" />
                        Save {formatCurrency(pkg.savings)} ·{" "}
                        {Math.round(pkg.savingsPercentage)}%
                      </Badge>
                    )}
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <CalendarClock className="size-3" />
                      Valid {pkg.validDays} days
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-1 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setSelected(pkg)}
                >
                  Buy Now
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
              Purchase {selected?.name}
            </DialogTitle>
            <DialogDescription>
              Confirm your prepaid pass purchase.
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
                      {serviceName(s.serviceId)}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">
                    Valid for {selected.validDays} days
                  </span>
                  {selected.savings > 0 && (
                    <span className="font-medium text-emerald-700">
                      You save {formatCurrency(selected.savings)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(selected.packagePrice)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={confirmPurchase}
            >
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
