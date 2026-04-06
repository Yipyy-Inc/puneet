"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Scissors } from "lucide-react";
import { groomingPackages } from "@/data/grooming";
import Link from "next/link";

export default function GroomingRatesPage() {
  const activeCount = groomingPackages.filter((p) => p.isActive).length;
  const avgPrice = Math.round(
    groomingPackages.reduce((s, p) => s + p.basePrice, 0) /
      groomingPackages.length,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Grooming Pricing & Rules
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          View package pricing and configure discounts and fee rules
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Packages
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {activeCount}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {groomingPackages.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50">
                <Scissors className="size-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Avg. Package Price
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  ${avgPrice}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  across all packages
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <DollarSign className="size-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package prices overview (read-only, links to Packages tab for editing) */}
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between border-b bg-slate-50/50 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
              <Scissors className="size-4 text-violet-700" />
            </div>
            <div>
              <p className="text-sm font-semibold">Package Prices</p>
              <p className="text-muted-foreground text-[11px]">
                Edit prices in the{" "}
                <Link
                  href="/facility/dashboard/services/grooming/packages"
                  className="text-primary underline"
                >
                  Packages
                </Link>{" "}
                tab
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y">
          {groomingPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{pkg.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {pkg.duration} min
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pkg.sizePricing && (
                  <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                    <span>S ${pkg.sizePricing.small}</span>
                    <span>·</span>
                    <span>M ${pkg.sizePricing.medium}</span>
                    <span>·</span>
                    <span>L ${pkg.sizePricing.large}</span>
                    <span>·</span>
                    <span>XL ${pkg.sizePricing.giant}</span>
                  </div>
                )}
                <Badge variant="outline" className="text-xs tabular-nums">
                  ${pkg.basePrice}
                </Badge>
                <Badge
                  variant={pkg.isActive ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {pkg.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pricing rules moved to Settings */}
      <div className="flex items-center justify-between rounded-xl border px-5 py-3">
        <p className="text-muted-foreground text-sm">
          Pricing rules are now in Settings → Pricing Rules
        </p>
        <a
          href="/facility/dashboard/settings?section=pricing-rules"
          className="text-primary text-sm font-medium hover:underline"
        >
          Go to Pricing Rules →
        </a>
      </div>
    </div>
  );
}
