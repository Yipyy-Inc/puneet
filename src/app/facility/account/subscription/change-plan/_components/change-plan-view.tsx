"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Info } from "lucide-react";

import { facilityBillingQueries } from "@/lib/api/facility-billing";
import { submitPlanChangeRequest } from "@/lib/plan-change-requests-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BillingCycle } from "@/types/facility-billing";
import type { SubscriptionTier } from "@/data/subscription-tiers";

const FACILITY_ID = 11;

const CYCLE_NOUN: Record<BillingCycle, string> = {
  monthly: "mo",
  quarterly: "quarter",
  yearly: "yr",
};

export function ChangePlanView() {
  const router = useRouter();
  const subQ = useQuery(facilityBillingQueries.subscription(FACILITY_ID));
  const tiersQ = useQuery(facilityBillingQueries.tiers());

  const sub = subQ.data ?? null;
  const tiers = (tiersQ.data ?? []).filter((t) => t.isPublic !== false);
  const cycle: BillingCycle = sub?.billingCycle ?? "monthly";

  const requestPlan = (tier: SubscriptionTier) => {
    if (!sub) return;
    submitPlanChangeRequest({
      id: crypto.randomUUID(),
      facilityId: FACILITY_ID,
      facilityName: sub.facilityName,
      fromTierId: sub.tierId,
      fromPlanName: sub.planName,
      toTierId: tier.id,
      toPlanName: tier.name,
      billingCycle: cycle,
      amount: tier.pricing[cycle],
      requestedAt: new Date().toISOString(),
    });
    toast.success(
      `Requested ${tier.name}. Submitted to Yipyy for review — your plan won't change until it's approved.`,
    );
    router.push("/facility/account/subscription");
  };

  if (subQ.isLoading || !sub) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href="/facility/account/subscription">
            <ArrowLeft className="size-4" />
            Back to My Subscription
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Change Plan</h1>
        <p className="text-muted-foreground text-sm">
          Compare plans and request a change. You&apos;re currently on{" "}
          <strong>{sub.planName}</strong>, billed {sub.billingCycle}.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-500/30 dark:bg-sky-950/30">
        <Info className="mt-0.5 size-5 shrink-0 text-sky-600" />
        <p className="text-muted-foreground">
          Plan changes are <strong>reviewed by Yipyy</strong> before they take
          effect — requesting a plan submits it for approval and does not change
          your billing immediately.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = tier.id === sub.tierId;
          return (
            <Card
              key={tier.id}
              className={cn(
                isCurrent && "border-primary ring-primary/20 ring-2",
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  {tier.name}
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[10px]">
                      Current
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {tier.description}
                </p>
                <div className="pt-1">
                  <span className="text-2xl font-bold">
                    ${tier.pricing[cycle].toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    / {CYCLE_NOUN[cycle]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => requestPlan(tier)}
                >
                  {isCurrent ? "Current plan" : "Request this plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
