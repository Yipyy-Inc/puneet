"use client";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { subscriptionTiers } from "@/data/subscription-tiers";
import {
  resolved,
  setTierDefault,
  usePlatformFlags,
} from "@/lib/platform-flags-store";
import { facilityCountOnTier, MODULE_CATALOG, TIER_BADGE } from "./flags-utils";

export function TierDefaultsTab() {
  const overrides = usePlatformFlags();
  const tiers = subscriptionTiers;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Which modules each tier includes by default. Per-facility add-ons are
        managed in the Per-Facility Overrides tab.
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="bg-background sticky left-0 z-10 min-w-50">
                Feature
              </TableHead>
              {tiers.map((t) => (
                <TableHead key={t.id} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium">{t.name}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", TIER_BADGE[t.type])}
                    >
                      {t.type}
                    </Badge>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULE_CATALOG.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="bg-background sticky left-0 z-10">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {m.category}
                  </p>
                </TableCell>
                {tiers.map((t) => {
                  const checked = resolved(
                    overrides.tierDefaults,
                    `${t.id}:${m.id}`,
                    t.availableModules.includes(m.id),
                  );
                  return (
                    <TableCell key={t.id} className="text-center">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c === true;
                          setTierDefault(
                            t.id,
                            m.id,
                            next,
                            `${m.name} · ${t.name}`,
                            facilityCountOnTier(t.id),
                          );
                          toast.success(
                            `${m.name} ${next ? "added to" : "removed from"} ${t.name}`,
                          );
                        }}
                        aria-label={`${m.name} included in ${t.name}`}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
