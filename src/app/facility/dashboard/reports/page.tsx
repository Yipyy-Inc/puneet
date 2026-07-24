import { ReportsHub } from "./_components/reports-hub";
import {
  revenueByService,
  bookingsByPeriod,
  occupancy,
  clientMetrics,
} from "@/lib/report-data-sources";
import { previousWindow } from "@/components/reports/report-range";
import { computeDelta } from "@/lib/format";

export default function ReportsPage() {
  const facilityId = 11;

  // Trailing window that overlaps the seeded operational data. Every KPI below
  // is derived from the real stores via the report-data-sources selectors, and
  // compared against the equal-length window immediately before it for the
  // period-over-period deltas shown on the tiles.
  const to = new Date().toISOString().split("T")[0];
  const from = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  })();
  const range = { from, to };
  const prev = previousWindow(range);

  const totalRevenue = revenueByService(range).reduce(
    (s, r) => s + r.revenue,
    0,
  );
  const prevRevenue = revenueByService(prev).reduce((s, r) => s + r.revenue, 0);

  const totalBookings = bookingsByPeriod(range, {
    granularity: "month",
  }).reduce((s, b) => s + b.bookings, 0);
  const prevBookings = bookingsByPeriod(prev, { granularity: "month" }).reduce(
    (s, b) => s + b.bookings,
    0,
  );

  const occ = occupancy(range);
  const occupancyRate =
    occ.length > 0
      ? occ.reduce((s, d) => s + d.occupancyRate, 0) / occ.length
      : 0;
  const prevOcc = occupancy(prev);
  const prevOccupancyRate =
    prevOcc.length > 0
      ? prevOcc.reduce((s, d) => s + d.occupancyRate, 0) / prevOcc.length
      : 0;

  const clients = clientMetrics(range);
  const prevClients = clientMetrics(prev);

  const kpis = {
    totalBookings,
    totalRevenue,
    occupancyRate,
    retentionRate: clients.retentionRate,
    activeClients: clients.activeClients,
    aov: totalBookings > 0 ? totalRevenue / totalBookings : 0,
  };

  const deltas = {
    revenue: computeDelta(totalRevenue, prevRevenue),
    bookings: computeDelta(totalBookings, prevBookings),
    occupancy: computeDelta(occupancyRate, prevOccupancyRate),
    activeClients: computeDelta(
      clients.activeClients,
      prevClients.activeClients,
    ),
    aov: computeDelta(
      kpis.aov,
      prevBookings > 0 ? prevRevenue / prevBookings : 0,
    ),
  };

  return <ReportsHub kpis={kpis} deltas={deltas} facilityId={facilityId} />;
}
