"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Settings2 } from "lucide-react";

import { cloverPlatformQueries } from "@/lib/api/clover-platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Featured "Payments" integration — the same treatment Twilio has for calling.
// Full configuration lives in System Configuration → Payment Processing; this
// card surfaces status and links there so there is a single source of truth.
//
// "Connected" used to mean somebody had typed three values into a form that
// wrote them to localStorage. It now means the deployment's app credentials
// actually resolve, which the server answers without disclosing them.
export function CloverIntegrationCard() {
  const { data, isPending } = useQuery(cloverPlatformQueries.status());

  const active = data?.estates.find(
    (e) => e.environment === data.defaultEnvironment,
  );
  const configured = active?.configured ?? false;
  const connected = data?.estates.reduce(
    (total, e) => total + e.connectedFacilities,
    0,
  );

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-success flex size-11 shrink-0 items-center justify-center rounded-xl text-white">
            <CreditCard className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Clover Fiserv
              </h2>
              <Badge variant="secondary">Payments · Primary</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Each facility connects their own Clover merchant account and
              charges their customers through it.
            </p>
          </div>
          {isPending ? (
            <Skeleton className="ml-auto h-6 w-28" />
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "ml-auto gap-1",
                configured
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "border-muted bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  configured ? "bg-emerald-500" : "bg-muted-foreground",
                )}
              />
              {configured ? "Credentials set" : "Not configured"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCell label="New connections go to">
            {isPending ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="capitalize">
                {data?.defaultEnvironment ?? "—"}
              </span>
            )}
          </SummaryCell>
          <SummaryCell label="Facilities connected">
            {isPending ? <Skeleton className="h-5 w-10" /> : (connected ?? "—")}
          </SummaryCell>
          <SummaryCell label="Payment methods">
            {isPending ? (
              <Skeleton className="h-5 w-32" />
            ) : active?.terminalsEnabled ? (
              "Card online + terminal"
            ) : (
              "Card online"
            )}
          </SummaryCell>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button asChild className="gap-2">
            <Link href="/dashboard/system-admin/system-config?tab=payment-processing">
              <Settings2 className="size-4" />
              Configure Payment Processing
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="mt-0.5 text-sm font-semibold">{children}</div>
    </div>
  );
}
