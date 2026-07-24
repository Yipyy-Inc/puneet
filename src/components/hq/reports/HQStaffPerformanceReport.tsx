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
import type { Location } from "@/types/location";
import { staffCrossLocationPerformance } from "@/data/hq-analytics";
import { formatCurrency, formatCount, formatPercent } from "@/lib/format";

/**
 * Staff performance across locations. Consolidated ("all") sums each staffer's
 * stats across the locations they work; a selected location scopes to their
 * performance at that branch only.
 */
export function HQStaffPerformanceReport({
  selectedLocation,
}: {
  locations: Location[];
  selectedLocation: string;
}) {
  const rows = staffCrossLocationPerformance
    .map((s) => {
      const locs =
        selectedLocation === "all"
          ? s.locations
          : s.locations.filter((l) => l.locationId === selectedLocation);
      if (locs.length === 0) return null;
      const bookings = locs.reduce((a, l) => a + l.bookings, 0);
      const revenue = locs.reduce((a, l) => a + l.revenueGenerated, 0);
      const hours = locs.reduce((a, l) => a + l.hoursWorked, 0);
      const avgRating = locs.reduce((a, l) => a + l.avgRating, 0) / locs.length;
      const completion =
        locs.reduce((a, l) => a + l.completionRate, 0) / locs.length;
      return {
        staffId: s.staffId,
        name: s.name,
        role: s.role,
        bookings,
        revenue,
        hours,
        avgRating,
        completion,
        locationCount: locs.length,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Staff Performance {selectedLocation === "all" ? "· Network" : ""}
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Bookings, revenue &amp; ratings per staff member
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No staff activity for this location.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.staffId}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {r.role}
                      {selectedLocation === "all" && r.locationCount > 1
                        ? ` · ${r.locationCount} locations`
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCount(r.bookings)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatCurrency(r.revenue)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <Badge
                      variant={r.avgRating >= 4.5 ? "default" : "secondary"}
                    >
                      {r.avgRating.toFixed(1)}★
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatPercent(r.completion, 0)}
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
