"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ListChecks, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { facilityBillingQueries } from "@/lib/api/facility-billing";
import { bookingQueries } from "@/lib/api/booking";
import { ONBOARDING_FACILITY_ID } from "@/data/facility-onboarding";
import {
  loadPersistedOnboarding,
  useFacilityOnboarding,
} from "@/lib/facility-onboarding-store";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  fixTab?: string;
  fixAction?: () => void;
}

/**
 * Live mirror of the facility's self-service onboarding checklist
 * (/facility/onboarding). Reads the same shared store, so progress the facility
 * makes is reflected here — live across tabs (BroadcastChannel) and across
 * reloads (localStorage, same origin).
 */
function OnboardingMirror() {
  const [mounted, setMounted] = useState(false);
  const { steps, completed, total, percent, allComplete } =
    useFacilityOnboarding();

  useEffect(() => {
    loadPersistedOnboarding();
    setMounted(true);
  }, []);

  return (
    <div className="bg-muted/30 mt-4 rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Facility self-service onboarding
        </p>
        <span className="text-muted-foreground text-xs tabular-nums">
          {mounted ? completed : "–"}/{total} · {mounted ? percent : 0}%
        </span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            allComplete ? "bg-emerald-500" : "bg-violet-500",
          )}
          style={{ width: `${mounted ? percent : 0}%` }}
        />
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                s.status === "complete"
                  ? "bg-emerald-500"
                  : s.status === "in_progress"
                    ? "bg-amber-500"
                    : "bg-slate-300",
              )}
            />
            <span
              className={cn(
                "truncate",
                s.status === "complete" && "text-muted-foreground line-through",
              )}
            >
              {s.title}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-2 text-[11px]">
        Mirrors the facility&apos;s self-service onboarding checklist, live.
      </p>
    </div>
  );
}

export function SetupProgressCard({
  facilityId,
  status,
  enabledModules,
  taxConfig,
  staffCount,
  onNavigate,
  onMarkActive,
}: {
  facilityId: number;
  status: string;
  enabledModules: string[];
  taxConfig?: { taxes?: { rate: number; enabled: boolean }[] };
  staffCount: number;
  onNavigate: (tab: string) => void;
  onMarkActive: () => void;
}) {
  const { data: subscription } = useQuery(
    facilityBillingQueries.subscription(facilityId),
  );
  const { data: card } = useQuery(
    facilityBillingQueries.paymentMethod(facilityId),
  );
  const { data: bookings = [] } = useQuery(
    bookingQueries.byFacility(facilityId),
  );

  const taxSet = Boolean(
    taxConfig?.taxes?.some((t) => t.enabled && t.rate > 0),
  );

  const items: ChecklistItem[] = [
    {
      key: "services",
      label: "Services configured",
      done: enabledModules.length > 0,
      fixTab: "modules",
    },
    {
      key: "pricing",
      label: "Pricing set",
      done: Boolean(subscription && subscription.amount > 0),
      fixTab: "billing",
    },
    {
      key: "tax",
      label: "Tax rate set",
      done: taxSet,
      fixTab: "billing",
    },
    {
      key: "staff",
      label: "Staff account created",
      done: staffCount > 0,
      fixTab: "staff",
    },
    {
      key: "payment",
      label: "Payment method connected",
      done: Boolean(card),
      fixTab: "billing",
    },
    {
      key: "booking",
      label: "First booking made",
      done: bookings.length > 0,
      fixTab: "clients",
    },
    {
      key: "active",
      label: "Marked Active by Yipyy admin",
      done: status === "active",
      fixAction: onMarkActive,
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const pct = Math.round((completed / items.length) * 100);
  const allDone = completed === items.length;

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="size-5" />
          Setup Progress
        </CardTitle>
        <span className="text-muted-foreground text-sm font-medium tabular-nums">
          {completed}/{items.length} complete
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              allDone ? "bg-emerald-500" : "bg-violet-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    item.done
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
                  )}
                >
                  {item.done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {!item.done && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() =>
                    item.fixAction
                      ? item.fixAction()
                      : item.fixTab && onNavigate(item.fixTab)
                  }
                >
                  Fix This
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {facilityId === ONBOARDING_FACILITY_ID && <OnboardingMirror />}
      </CardContent>
    </Card>
  );
}
