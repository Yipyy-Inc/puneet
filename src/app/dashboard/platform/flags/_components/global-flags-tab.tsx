"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { platformFeatureFlags } from "@/data/platform-feature-flags";
import type { FeatureFlag } from "@/data/system-administration";
import { setGlobalFlag, usePlatformFlags } from "@/lib/platform-flags-store";
import { affectedFacilityCount, formatDate } from "./flags-utils";

export function GlobalFlagsTab() {
  const overrides = usePlatformFlags();
  const [pendingDisable, setPendingDisable] = useState<FeatureFlag | null>(
    null,
  );

  const effective = (flag: FeatureFlag) =>
    overrides.globalFlags[flag.id] ?? {
      enabled: flag.enabled,
      rollout: flag.rolloutPercentage,
    };

  const onToggle = (flag: FeatureFlag, next: boolean) => {
    const current = effective(flag);
    if (!next) {
      setPendingDisable(flag); // warn before disabling
      return;
    }
    setGlobalFlag(
      flag.id,
      { enabled: true, rollout: current.rollout },
      flag.name,
      affectedFacilityCount(flag),
    );
    toast.success(`${flag.name} enabled`);
  };

  const confirmDisable = () => {
    if (!pendingDisable) return;
    setGlobalFlag(
      pendingDisable.id,
      { enabled: false, rollout: effective(pendingDisable).rollout },
      pendingDisable.name,
      affectedFacilityCount(pendingDisable),
    );
    toast.success(`${pendingDisable.name} disabled`);
    setPendingDisable(null);
  };

  return (
    <div className="space-y-3">
      {platformFeatureFlags.map((flag) => {
        const e = effective(flag);
        const affected = affectedFacilityCount(flag);
        return (
          <Card key={flag.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{flag.name}</h3>
                  <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">
                    {flag.key}
                  </code>
                  {!e.enabled && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Off
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {flag.description}
                </p>
                <div className="mt-3 max-w-xs">
                  <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                    <span>Rollout</span>
                    <span className="tabular-nums">{e.rollout}%</span>
                  </div>
                  <Progress value={e.rollout} className="h-1.5" />
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Last changed {formatDate(flag.lastModified)} by{" "}
                  {flag.createdBy} ·{" "}
                  <span className="tabular-nums">{affected}</span>{" "}
                  {affected === 1 ? "facility" : "facilities"} affected
                </p>
              </div>
              <Switch
                checked={e.enabled}
                onCheckedChange={(v) => onToggle(flag, v)}
                aria-label={`Toggle ${flag.name}`}
              />
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog
        open={!!pendingDisable}
        onOpenChange={(o) => !o && setPendingDisable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {pendingDisable?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will turn off <strong>{pendingDisable?.name}</strong> for{" "}
              <strong>
                {pendingDisable ? affectedFacilityCount(pendingDisable) : 0}
              </strong>{" "}
              {pendingDisable && affectedFacilityCount(pendingDisable) === 1
                ? "facility"
                : "facilities"}{" "}
              currently using it. They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep enabled</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
