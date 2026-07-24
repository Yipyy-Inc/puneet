import {
  revenueByService,
  capacityUtilization,
  clientBase,
} from "@/lib/report-data-sources";
import { getInventorySummary } from "@/lib/retail-reports";
import { formatCurrencyWhole } from "@/lib/format";
import type { Insight } from "@/types/smart-insights";

// ============================================================
// Derived Smart Insights — generated live from the real metric
// selectors (report-data-sources + retail-reports), so the feed
// reflects the ACTUAL current data rather than authored templates.
// Each generator emits only when its real condition holds, so no
// false alerts (e.g. a "near capacity" insight won't appear when
// the facility isn't busy).
// ============================================================

const LOC = { id: "loc-dv-main", name: "Yipyy – Plateau" };

const iso = (d: Date) => d.toISOString().split("T")[0];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Calendar month `offset` months back: {from, to} as ISO dates. */
function monthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
  return { from: iso(from), to: iso(to) };
}

export function generateDerivedInsights(facilityId: number): Insight[] {
  const insights: Insight[] = [];
  const base = {
    facilityId,
    locationId: LOC.id,
    locationName: LOC.name,
    generatedAt: new Date().toISOString(),
    cadence: "nightly" as const,
    status: "active" as const,
  };

  // ── 1) Revenue trend by service — this month vs last month ──
  const thisMonth = revenueByService(monthRange(0));
  const lastMonth = revenueByService(monthRange(1));
  const lastByName = new Map(lastMonth.map((r) => [r.service, r.revenue]));
  for (const r of thisMonth) {
    if (r.revenue < 50) continue; // ignore noise-level services
    const prev = lastByName.get(r.service) ?? 0;
    const delta =
      prev > 0 ? ((r.revenue - prev) / prev) * 100 : r.revenue > 0 ? 100 : 0;
    if (Math.abs(delta) < 15) continue;
    const up = delta >= 0;
    const pct = Math.abs(Math.round(delta));
    const svc = r.service.charAt(0).toUpperCase() + r.service.slice(1);
    insights.push({
      ...base,
      insightId: `ins-derived-rev-${slug(r.service)}`,
      category: "revenue",
      priority: up ? "low" : "medium",
      trend: up ? "up" : "down",
      actionType: "revenue_report",
      title: `${svc} revenue ${up ? "up" : "down"} ${pct}% vs last month`,
      description: `${svc} brought in ${formatCurrencyWhole(
        r.revenue,
      )} this month versus ${formatCurrencyWhole(prev)} last month — a ${pct}% ${
        up ? "increase" : "decrease"
      }.`,
      impactText: up
        ? "A sustained lift is a signal to protect capacity and staffing for this service."
        : "A month-over-month decline in a core service is worth catching early before it compounds.",
      recommendationText: up
        ? `Open the revenue report to see what's driving ${svc} growth and whether it can scale.`
        : `Review ${svc} pricing, availability and recent cancellations in the revenue report.`,
      metrics: [
        { label: "This month", value: formatCurrencyWhole(r.revenue) },
        { label: "Last month", value: formatCurrencyWhole(prev) },
        { label: "Change", value: `${up ? "+" : "−"}${pct}%` },
        { label: "Bookings", value: r.bookings },
      ],
    });
  }

  // ── 2) Capacity — busiest service near its limit (waitlist trigger) ──
  const cap = [...capacityUtilization(monthRange(0))].sort(
    (a, b) => b.peakUtilizationRate - a.peakUtilizationRate,
  );
  const busiest = cap[0];
  if (busiest && busiest.peakUtilizationRate >= 70) {
    insights.push({
      ...base,
      insightId: "ins-derived-capacity",
      category: "operations",
      priority: busiest.peakUtilizationRate >= 90 ? "high" : "medium",
      trend: "up",
      actionType: "service_utilization",
      title: `${busiest.service} at ${Math.round(
        busiest.peakUtilizationRate,
      )}% capacity — consider a waitlist`,
      description: `${busiest.service} peaked at ${busiest.peakUsed} of ${busiest.capacity} slots this month (${Math.round(
        busiest.peakUtilizationRate,
      )}%).`,
      impactText:
        "Turning away bookings at peak means lost revenue and clients who may book elsewhere.",
      recommendationText: `Enable a waitlist for ${busiest.service} at peak times, or add capacity/staff to the busiest slots.`,
      metrics: [
        {
          label: "Peak used",
          value: `${busiest.peakUsed}/${busiest.capacity}`,
        },
        {
          label: "Peak utilization",
          value: `${Math.round(busiest.peakUtilizationRate)}%`,
        },
        { label: "Bookings", value: busiest.bookings },
      ],
    });
  }

  // ── 3) Reactivation — clients who haven't rebooked in 60+ days ──
  const cb = clientBase();
  if (cb.reactivation.length >= 1) {
    const n = cb.reactivation.length;
    const names = cb.reactivation
      .slice(0, 3)
      .map((c) => c.name)
      .join(", ");
    insights.push({
      ...base,
      insightId: "ins-derived-reactivation",
      category: "customers",
      priority: n >= 10 ? "high" : "medium",
      trend: "down",
      actionType: "churn_winback_campaign",
      title: `${n} client${n === 1 ? " hasn't" : "s haven't"} rebooked in 60+ days`,
      description: `${names}${n > 3 ? ` and ${n - 3} more` : ""} ${
        n === 1 ? "has" : "have"
      } lapsed — the longest is ${cb.reactivation[0].daysSince} days since their last visit.`,
      impactText:
        "Lapsed clients are your cheapest source of new revenue — a timely nudge is far cheaper than acquiring a new client.",
      recommendationText:
        "Launch a win-back campaign with a small incentive to bring these clients back before they churn for good.",
      metrics: [
        { label: "Lapsed clients", value: n },
        { label: "Longest gap", value: `${cb.reactivation[0].daysSince}d` },
        { label: "Active base", value: cb.activeClients },
      ],
    });
  }

  // ── 4) Inventory — retail products at/below reorder point ──
  const inv = getInventorySummary();
  if (inv.lowStock.length >= 1) {
    const n = inv.lowStock.length;
    const names = inv.lowStock
      .slice(0, 3)
      .map((i) => i.name)
      .join(", ");
    insights.push({
      ...base,
      insightId: "ins-derived-lowstock",
      category: "operations",
      priority: inv.outOfStockCount > 0 ? "high" : "medium",
      trend: "down",
      actionType: "reorder",
      title: `${n} retail product${n === 1 ? "" : "s"} at or below reorder point`,
      description: `${names}${n > 3 ? ` and ${n - 3} more` : ""} ${
        n === 1 ? "is" : "are"
      } low${inv.outOfStockCount > 0 ? ` (${inv.outOfStockCount} already out of stock)` : ""}.`,
      impactText:
        "Out-of-stock retail items are missed add-on sales at checkout and during service upsells.",
      recommendationText:
        "Reorder the flagged items now so they're back in stock before the next booking rush.",
      metrics: [
        { label: "Low stock", value: n },
        { label: "Out of stock", value: inv.outOfStockCount },
        {
          label: "Inventory at cost",
          value: formatCurrencyWhole(inv.costValue),
        },
      ],
    });
  }

  return insights;
}
