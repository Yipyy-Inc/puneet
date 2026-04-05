"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, GraduationCap } from "lucide-react";
import { trainingPackages } from "@/data/training";
import { PricingRulesPanel } from "@/components/facility/PricingRulesPanel";
import Link from "next/link";

export default function TrainingRatesPage() {
  const activeCount = trainingPackages.filter((p) => p.isActive).length;
  const avgPrice = Math.round(
    trainingPackages.reduce((s, p) => s + p.price, 0) / trainingPackages.length,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Training Pricing & Rules
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          View program pricing and configure discounts and fee rules
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Active Programs
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  {activeCount}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {trainingPackages.length} total
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50">
                <GraduationCap className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                  Avg. Program Price
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums">
                  ${avgPrice}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  across all programs
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                <DollarSign className="size-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program prices overview (read-only, links to Course Catalog for editing) */}
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between border-b bg-slate-50/50 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
              <GraduationCap className="size-4 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-semibold">Program Prices</p>
              <p className="text-muted-foreground text-[11px]">
                Edit prices in the{" "}
                <Link
                  href="/facility/dashboard/services/training/courses"
                  className="text-primary underline"
                >
                  Course Catalog
                </Link>{" "}
                tab
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y">
          {trainingPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50/50"
            >
              <div>
                <p className="text-sm font-medium">{pkg.name}</p>
                <p className="text-muted-foreground text-xs">
                  {pkg.sessions} {pkg.sessions === 1 ? "session" : "sessions"} ·{" "}
                  {pkg.classType} · {pkg.skillLevel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs tabular-nums">
                  ${pkg.price}
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

      {/* Pricing Rules */}
      <PricingRulesPanel
        serviceType="training"
        showSections={["stacking", "multi_pet", "custom_fees"]}
      />
    </div>
  );
}
