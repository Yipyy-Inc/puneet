"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DollarSign, GraduationCap, Plus } from "lucide-react";
import { PricingRulesPanel } from "@/components/facility/PricingRulesPanel";

const TRAINING_RATES = [
  {
    id: "basic-obedience",
    name: "Basic Obedience",
    price: 250,
    sessions: 6,
    isActive: true,
  },
  {
    id: "advanced-obedience",
    name: "Advanced Obedience",
    price: 350,
    sessions: 8,
    isActive: true,
  },
  {
    id: "private-session",
    name: "Private Session",
    price: 85,
    sessions: 1,
    isActive: true,
  },
  {
    id: "puppy-training",
    name: "Puppy Training",
    price: 200,
    sessions: 4,
    isActive: true,
  },
  {
    id: "behavior-mod",
    name: "Behavior Modification",
    price: 150,
    sessions: 1,
    isActive: true,
  },
  {
    id: "agility",
    name: "Agility Training",
    price: 300,
    sessions: 6,
    isActive: false,
  },
];

export default function TrainingRatesPage() {
  const [rates, setRates] = useState(TRAINING_RATES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Training Rates & Pricing
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Configure course rates, discounts, and fee rules for training programs
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
                  {rates.filter((r) => r.isActive).length}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  of {rates.length} total
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
                  $
                  {Math.round(
                    rates.reduce((s, r) => s + r.price, 0) / rates.length,
                  )}
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

      {/* Training Programs */}
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
              <GraduationCap className="size-4 text-blue-700" />
            </div>
            Training Programs
          </CardTitle>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            Add Program
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
              >
                <div>
                  <p className="text-sm font-medium">{rate.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {rate.sessions}{" "}
                    {rate.sessions === 1 ? "session" : "sessions"}
                  </p>
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

      {/* Pricing Rules — multi-pet, custom fees (no time fees or 24h for training) */}
      <PricingRulesPanel
        serviceType="training"
        showSections={["stacking", "multi_pet", "custom_fees"]}
      />
    </div>
  );
}
