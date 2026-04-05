"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Scissors, Plus } from "lucide-react";
import { PricingRulesPanel } from "@/components/facility/PricingRulesPanel";

const GROOMING_RATES = [
  {
    id: "bath-brush",
    name: "Bath & Brush",
    price: 40,
    duration: 45,
    isActive: true,
  },
  {
    id: "full-groom",
    name: "Full Groom",
    price: 65,
    duration: 90,
    isActive: true,
  },
  {
    id: "puppy-groom",
    name: "Puppy Groom",
    price: 35,
    duration: 30,
    isActive: true,
  },
  {
    id: "hand-stripping",
    name: "Hand Stripping",
    price: 95,
    duration: 120,
    isActive: true,
  },
  {
    id: "deshedding",
    name: "De-shedding Treatment",
    price: 55,
    duration: 60,
    isActive: true,
  },
];

export default function GroomingRatesPage() {
  const [rates, setRates] = useState(GROOMING_RATES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Grooming Rates & Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Configure package rates, discounts, and fee rules for grooming
          services
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
                  {rates.filter((r) => r.isActive).length}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {rates.length} total
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
                  $
                  {Math.round(
                    rates.reduce((s, r) => s + r.price, 0) / rates.length,
                  )}
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

      {/* Package Rates */}
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100">
              <Scissors className="size-4 text-violet-700" />
            </div>
            Package Rates
          </CardTitle>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{rate.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {rate.duration} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-xs tabular-nums">
                    ${rate.price}
                  </Badge>
                  <Switch
                    checked={rate.isActive}
                    onCheckedChange={(c) =>
                      setRates((prev) =>
                        prev.map((r) =>
                          r.id === rate.id ? { ...r, isActive: c } : r,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Rules — multi-pet, peak dates, custom fees (no time fees or 24h for grooming) */}
      <PricingRulesPanel
        serviceType="grooming"
        showSections={["stacking", "multi_pet", "custom_fees"]}
      />
    </div>
  );
}
