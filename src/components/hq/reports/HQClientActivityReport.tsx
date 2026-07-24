"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeftRight, DollarSign } from "lucide-react";
import type { Location } from "@/types/location";
import { crossLocationClients } from "@/data/hq-analytics";
import { formatCurrency, formatCount } from "@/lib/format";

/**
 * Client activity across locations. Consolidated shows every client's total
 * visits/spend; a selected location scopes to activity at that branch. Also
 * surfaces cross-location clients (those who visit more than one branch).
 */
export function HQClientActivityReport({
  selectedLocation,
}: {
  locations: Location[];
  selectedLocation: string;
}) {
  const rows = crossLocationClients
    .map((c) => {
      const visited =
        selectedLocation === "all"
          ? c.locationsVisited
          : c.locationsVisited.filter((v) => v.locationId === selectedLocation);
      if (visited.length === 0) return null;
      return {
        clientId: c.clientId,
        clientName: c.clientName,
        petNames: c.petNames,
        visits: visited.reduce((a, v) => a + v.visits, 0),
        spend: visited.reduce((a, v) => a + v.spend, 0),
        loyaltyTier: c.loyaltyTier,
        crossLocation: c.locationsVisited.length > 1,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.spend - a.spend);

  const crossLocationCount = rows.filter((r) => r.crossLocation).length;
  const totalSpend = rows.reduce((a, r) => a + r.spend, 0);

  const kpis = [
    { label: "Active clients", value: formatCount(rows.length), icon: Users },
    {
      label: "Cross-location",
      value: formatCount(crossLocationCount),
      icon: ArrowLeftRight,
    },
    {
      label: "Total spend",
      value: formatCurrency(totalSpend),
      icon: DollarSign,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Client Activity {selectedLocation === "all" ? "· Network" : ""}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Top clients by spend, and who visits more than one location
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

        {rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No client activity for this location.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 10).map((r) => (
                <TableRow key={r.clientId}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {r.clientName}
                      {r.crossLocation && (
                        <ArrowLeftRight className="text-muted-foreground size-3" />
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {r.petNames.join(", ")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCount(r.visits)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCurrency(r.spend)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="capitalize">
                      {r.loyaltyTier}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
