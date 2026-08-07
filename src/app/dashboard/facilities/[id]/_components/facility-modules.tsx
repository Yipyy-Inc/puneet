"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Puzzle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FacilityModulesView } from "@/lib/api/facility-modules";

import { ModuleEntitlementRow } from "./module-entitlement-row";

// ============================================================================
// What this facility has been sold.
//
// The second of the five "nothing stores this yet" tabs to get a real source,
// after Logs. Until today three mock files each held a different module list
// and a client-side store held the toggles, so a change survived until the
// next navigation and then wasn't there.
//
// ── THE PLAN IS THE DEFAULT, NOT A COPY ───────────────────────────────────
//
// Only the DEPARTURES from the plan are stored. That is why "Reset to plan"
// exists and why it is a delete: a facility with no exceptions gets whatever
// its tier includes, today and after the tier is next changed.
//
// ── NOTHING IS ENFORCED BY THIS YET ───────────────────────────────────────
//
// Switching a module off here records that it was withdrawn. It does not lock
// anyone out of a screen. Every live facility is on Puppy — three modules —
// while the demo facility runs grooming, boarding, daycare and training, so
// enforcement would shut working businesses out of what they already use. The
// header of the tab says so rather than letting the toggles imply otherwise.
// ============================================================================

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function FacilityModules({
  facilityId,
  facilityName,
}: {
  facilityId: string;
  facilityName: string;
}) {
  const queryClient = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const key = ["admin", "facility", facilityId, "modules"];

  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<FacilityModulesView> => {
      const response = await fetch(`/api/facilities/${facilityId}/modules`);
      if (!response.ok)
        throw new Error("Could not load this facility's modules.");
      return (await response.json()) as FacilityModulesView;
    },
  });

  // Both writes return the whole list, so the screen renders what the database
  // now says rather than what the click hoped it would say.
  const write = useMutation({
    mutationFn: async (
      body:
        | {
            kind: "set";
            moduleId: string;
            enabled: boolean;
            priceOverrideCents: number | null;
          }
        | { kind: "reset" },
    ): Promise<FacilityModulesView> => {
      const response = await fetch(`/api/facilities/${facilityId}/modules`, {
        method: body.kind === "reset" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body:
          body.kind === "reset"
            ? undefined
            : JSON.stringify({
                moduleId: body.moduleId,
                enabled: body.enabled,
                priceOverrideCents: body.priceOverrideCents,
              }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (FacilityModulesView & { error?: string })
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "That change was not saved.");
      }
      return payload as FacilityModulesView;
    },
    onSuccess: (fresh) => {
      setProblem(null);
      queryClient.setQueryData(key, fresh);
    },
    onError: (error: Error) => setProblem(error.message),
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading modules…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not load this facility&apos;s modules. Try again.
      </p>
    );
  }

  const enabled = data.entitlements.filter((module) => module.enabled).length;

  return (
    <div className="space-y-4">
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Puzzle className="text-muted-foreground size-4" />
              Modules
            </CardTitle>
            <CardDescription>
              {data.planName ? (
                <>
                  On <span className="font-medium">{data.planName}</span>.{" "}
                  {enabled} of {data.entitlements.length} modules on
                  {data.monthlyAddOnCents > 0 && (
                    <>, {money(data.monthlyAddOnCents)}/mo on top of the plan</>
                  )}
                  .{" "}
                  {data.exceptionCount > 0
                    ? `${data.exceptionCount} ${
                        data.exceptionCount === 1
                          ? "module departs"
                          : "modules depart"
                      } from the plan.`
                    : "No departures from the plan."}
                </>
              ) : (
                <>
                  No subscription is recorded for this facility, so no plan
                  includes anything. Only modules switched on here are on.
                </>
              )}
            </CardDescription>
          </div>

          {data.exceptionCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={write.isPending}
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="mr-2 size-4" />
              Reset to plan
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            This records what {facilityName} has been sold. It does not yet gate
            any screen — switching a module off is a commercial record, not a
            lockout.
          </p>

          {problem && (
            <p className="text-destructive text-sm" role="alert">
              {problem}
            </p>
          )}

          {data.entitlements.map((module) => (
            <ModuleEntitlementRow
              // The agreed price is part of the key so the row remounts when
              // the server's answer differs from what was typed — see the note
              // on the price field in module-entitlement-row.
              key={`${module.moduleId}:${module.priceOverrideCents ?? "list"}`}
              module={module}
              busy={write.isPending}
              onChange={(change) =>
                write.mutate({
                  kind: "set",
                  moduleId: module.moduleId,
                  enabled: change.enabled,
                  priceOverrideCents: change.priceOverrideCents,
                })
              }
            />
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Go back to the plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This drops {data.exceptionCount}{" "}
              {data.exceptionCount === 1 ? "exception" : "exceptions"} for{" "}
              {facilityName} — every module sold on top of{" "}
              {data.planName ?? "the plan"}, and every one switched off against
              it. Afterwards the plan decides, and it keeps deciding whenever
              the plan changes. Every change is recorded in the log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => write.mutate({ kind: "reset" })}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Reset to plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
