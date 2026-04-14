"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Crown,
  Users,
  DollarSign,
  Wallet,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  membershipPlans,
  memberships,
  prepaidCredits,
} from "@/data/services-pricing";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MembershipsHero() {
  const activePlans = membershipPlans.filter((p) => p.isActive).length;
  const activeSubscribers = memberships.filter(
    (m) => m.status === "active",
  ).length;
  const pausedSubscribers = memberships.filter(
    (m) => m.status === "paused",
  ).length;
  const mrr = memberships
    .filter((m) => m.status === "active")
    .reduce((sum, m) => sum + m.monthlyPrice, 0);
  const outstandingCredits = prepaidCredits.reduce(
    (sum, c) => sum + c.balance,
    0,
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-amber-50/60 via-background to-background p-6 dark:from-amber-950/20 dark:via-background dark:to-background">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="absolute -top-10 -right-10 size-48 rounded-full bg-amber-300 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-purple-300 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-amber-400/90 to-amber-600/80 text-white shadow-sm ring-1 ring-amber-600/20">
              <Crown className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight">
                  Memberships
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300">
                  <Sparkles className="size-3" />
                  Premium
                </span>
              </div>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                Design recurring plans, manage subscribers, and track revenue.
                Members earn perks that apply automatically at checkout.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            icon={<Crown className="size-4" />}
            label="Active plans"
            value={activePlans.toString()}
            hint={`${membershipPlans.length} total`}
            accent="amber"
          />
          <StatCard
            icon={<Users className="size-4" />}
            label="Subscribers"
            value={activeSubscribers.toString()}
            hint={`${pausedSubscribers} paused`}
            accent="blue"
          />
          <StatCard
            icon={<DollarSign className="size-4" />}
            label="MRR"
            value={formatCurrency(mrr)}
            hint="from active memberships"
            accent="emerald"
            trend={<TrendingUp className="size-3" />}
          />
          <StatCard
            icon={<Wallet className="size-4" />}
            label="Prepaid credits"
            value={formatCurrency(outstandingCredits)}
            hint="outstanding balance"
            accent="purple"
          />
        </div>
      </div>
    </div>
  );
}

type Accent = "amber" | "blue" | "emerald" | "purple";
const accentTokens: Record<Accent, string> = {
  amber:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: Accent;
  trend?: React.ReactNode;
}) {
  return (
    <Card className="border-muted/60 relative overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${accentTokens[accent]}`}
          >
            {icon}
            {label}
          </span>
          {trend && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {trend}
            </span>
          )}
        </div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-muted-foreground text-xs">{hint}</div>
      </CardContent>
    </Card>
  );
}
