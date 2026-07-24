"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeftRight,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import type { Location } from "@/types/location";
import { bookingTransfers } from "@/data/location-transfers";
import { formatCurrency, formatCount } from "@/lib/format";

/**
 * Transfer impact between locations. Consolidated shows all booking transfers
 * and their net price delta; a selected location scopes to transfers into or
 * out of that branch (inbound = destination, outbound = origin).
 */
export function HQTransferImpactReport({
  locations,
  selectedLocation,
}: {
  locations: Location[];
  selectedLocation: string;
}) {
  const nameOf = (id: string) =>
    locations.find((l) => l.id === id)?.shortCode ??
    locations.find((l) => l.id === id)?.name ??
    id;

  const scoped =
    selectedLocation === "all"
      ? bookingTransfers
      : bookingTransfers.filter(
          (t) =>
            t.fromLocationId === selectedLocation ||
            t.toLocationId === selectedLocation,
        );

  const completed = scoped.filter((t) => t.status === "completed").length;
  const netDelta = scoped.reduce((s, t) => s + (t.priceDelta ?? 0), 0);
  const inbound =
    selectedLocation === "all"
      ? scoped.length
      : scoped.filter((t) => t.toLocationId === selectedLocation).length;
  const outbound =
    selectedLocation === "all"
      ? 0
      : scoped.filter((t) => t.fromLocationId === selectedLocation).length;

  const kpis = [
    {
      label: "Transfers",
      value: formatCount(scoped.length),
      icon: ArrowLeftRight,
    },
    { label: "Completed", value: formatCount(completed), icon: CheckCircle2 },
    selectedLocation === "all"
      ? {
          label: "Net price impact",
          value: formatCurrency(netDelta),
          icon: DollarSign,
        }
      : {
          label: "In / Out",
          value: `${inbound} / ${outbound}`,
          icon: ArrowLeftRight,
        },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Transfer Impact {selectedLocation === "all" ? "· Network" : ""}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Bookings moved between locations to balance capacity
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <k.icon className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground text-xs">{k.label}</span>
              </div>
              <p className="mt-1 text-xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>

        {scoped.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No transfers involving this location.
          </p>
        ) : (
          <div className="space-y-2">
            {scoped.slice(0, 8).map((t) => (
              <div
                key={t.id}
                className="bg-muted/30 flex items-center justify-between gap-3 rounded-lg p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {nameOf(t.fromLocationId)}
                    <ArrowRight className="text-muted-foreground size-3.5" />
                    {nameOf(t.toLocationId)}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {t.reason}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.priceDelta ? (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {t.priceDelta > 0 ? "+" : ""}
                      {formatCurrency(t.priceDelta)}
                    </span>
                  ) : null}
                  <Badge
                    variant={t.status === "completed" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
