import { ReportsHub } from "./_components/reports-hub";
import {
  calculateOccupancyRate,
  calculateAOV,
  calculateRetentionRate,
} from "@/data/reports";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";

export default function ReportsPage() {
  const facilityId = 1;
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const occupancy = calculateOccupancyRate(facilityId, monthStart, todayStr);
  const aov = calculateAOV(facilityId, monthStart, todayStr);
  const retention = calculateRetentionRate(facilityId, 3);

  const monthBookings = bookings.filter(
    (b) =>
      b.facilityId === facilityId &&
      new Date(b.startDate) >= new Date(monthStart) &&
      new Date(b.startDate) <= new Date(todayStr),
  );

  const activeClients = clients.filter((c) =>
    bookings.some((b) => b.facilityId === facilityId && b.clientId === c.id),
  ).length;

  const kpis = {
    totalBookings: monthBookings.length,
    totalRevenue: aov.totalRevenue,
    occupancyRate: occupancy.rate,
    retentionRate: retention.rate,
    activeClients,
    aov: aov.aov,
  };

  return <ReportsHub kpis={kpis} facilityId={facilityId} />;
}
