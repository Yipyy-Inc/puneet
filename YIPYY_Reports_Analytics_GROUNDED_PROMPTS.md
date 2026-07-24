# YIPYY — Reports & Analytics: Populate Everything With Real Data (Grounded Prompts)

**Client directive:** "All the reports and analytics need proper information. Right now it is all empty."
**Target repo:** `C:\dev\puneet` · Next.js 16 App Router · React 19 · shadcn/ui · Recharts · **bun**
**Audited:** file structure mapped from the live source tree; data model known from the prior module work (`Transaction`, retail report schemas, grooming/booking/HQ/loyalty data).

> ⚠️ **One caveat, stated honestly:** the device bridge dropped mid‑audit, so I mapped every report file and its data layer but couldn't re‑read each report body this turn. That's exactly why **Prompt 0 is a diagnostic** — run it first; it pins the precise "empty" cause per report so the fixes below target the real problem, not a guess. Everything else is grounded in confirmed file paths.

---

## ⭐ Audit finding — the reports are BUILT; they're just not fed data

The reports/analytics subsystem is **extensively built already** — dozens of report pages, chart components, metric cards, a custom‑report builder, and export modals all exist. "All empty" is therefore almost never a missing‑UI problem. In a mock‑driven app like this, empty reports come from one (or a mix) of four causes, and the fix is *data wiring*, not new screens:

1. **Reports read a thin/empty dedicated analytics dataset** (`data/facility-analytics.ts`, `data/reports.ts`) instead of **deriving** from the real operational stores (transactions, bookings, appointments, clients, staff). The dedicated dataset was scaffolded and never filled → charts render with `[]`.
2. **Date‑window mismatch** — the seed operational data is dated in the past (e.g. 2024/2025) while reports default to "last 30 days" of the current date → every window‑filtered report returns nothing even though data exists.
3. **Aggregation functions exist but aren't called / return early** — `lib/report-data-sources.ts` / `lib/retail-reports.ts` / `lib/scheduling-reports.ts` have the shapes but the pages pass empty inputs.
4. **Empty‑state stubs** — a `_components` file renders a permanent "No data yet" placeholder.

**The professional fix (the spine of this pack):** make one **report data‑source layer** that DERIVES every metric from the real operational stores, normalize the date handling so the default window actually contains data, replace empty seeds, and point every report component at that layer. Then each report shows accurate, reconcilable numbers.

### ⛔ Scope note — facility reports vs platform reports
This client is a **facility**, so target the **facility** surfaces:
- `src/app/facility/dashboard/reports/*`, `src/app/facility/dashboard/insights/*` (Smart Insights), `src/app/facility/hq/reports/*` (multi‑location).

Do **not** spend effort on the **platform super‑admin** reports (`src/app/dashboard/reports/*` — agreements/business/churn/facilities/support/usage, `src/app/dashboard/analytics/*`, `src/app/dashboard/financial/*`, `lib/api/{business,facilities,support,usage,agreements}-report.ts`) unless the client asks — those are a different audience. (They may also be empty for the same reasons; fix later with the same pattern.)

---

## Module map (facility reports & analytics)

| Area | Real file(s) |
|---|---|
| Facility Reports UI | `src/components/facility/FacilityReports.tsx`, `src/components/facility/GenerateReportModal.tsx`; routes `src/app/facility/dashboard/reports/*` |
| Analytics metric components | `src/components/analytics/{FacilityPerformanceMetrics,FacilityUtilizationMetrics,ReservationAnalytics,CustomerAcquisitionMetrics,CustomReportsManager}.tsx` |
| Financial/revenue | `src/components/financial/{FinancialReports,RevenueOverview,FacilityRevenueTable}.tsx` |
| Retail/sales reporting | `src/lib/retail-reports.ts` (+ report schemas in `src/types/retail.ts`: `salesByPeriod`, `topProduct`, `profitMarginReport`, `salesByStaff`, `salesByCategory`, `salesLinkedToServices`) |
| Smart Insights | `src/components/smart-insights/*` (`SmartInsightsPage`, `InsightCard`, `MetricChip`, …), `src/data/smart-insights.ts`, `src/lib/api/smart-insights.ts`, `src/lib/smart-insights/*` |
| HQ multi‑location | `src/components/hq/HQAnalyticsPanel.tsx`, `src/components/hq/charts/*` (`RevenueByLocationBar`, `RevenueTrendLineChart`, `ServiceMixChart`, `WeeklyOccupancyChart`, `Sparkline`, `StackedDistribution`, `MetricBar`), `src/components/hq/reports/*`, `src/data/hq-analytics.ts` |
| Scheduling/labor | `src/components/scheduling/ReportsView.tsx`, `src/components/scheduling/charts/{DeptHoursChart,LaborCostChart}.tsx`, `src/lib/scheduling-reports.ts` |
| Calling/messaging analytics | `src/components/calling/{CallAnalyticsDashboard,CallMetricsOverview,StaffPerformanceReport,TagFrequencyChart}.tsx`, `src/lib/calling/call-metrics.ts`; `src/components/messaging/{MessagingAnalyticsView,MessagingAnalyticsCharts}.tsx` |
| Loyalty reports | `src/components/loyalty/{BadgeAchievementReport,PointsLiabilityReport,RevenueReportLoyaltySection}.tsx`, `src/lib/loyalty/*metrics.ts` |
| Custom reports + export | `src/components/reports/{CustomReportBuilder,ExportReportModal}.tsx`, `src/lib/report-export.ts`, `src/lib/saved-reports-store.ts` |
| **Shared data layer (the fix target)** | `src/lib/report-data-sources.ts`, `src/lib/analytics-utils.ts`, `src/data/facility-analytics.ts`, `src/data/reports.ts`, `src/data/analytics.ts`, `src/lib/api/reports.ts`, `src/types/{facility-analytics,reports}.ts` |
| **Operational data SOURCES to derive from** | `src/data/retail.ts` (`getAllTransactions()` → `Transaction`), grooming/booking/daycare/boarding appointment data, clients, staff/shifts, loyalty, gift cards, packages, deposits |
| Reusable KPI/stat UI | `src/components/facility/dashboard/{kpi-row,kpi-tile}.tsx`, `src/components/ui/{StatCard,ClickableStatCard}.tsx` |

---

## How to use this pack
Do **Prompt 0 first** — it diagnoses the real empty‑cause and builds the shared data layer everything else depends on. Then work the report areas in order. Green sequence noted once — after a batch: `bun run typecheck && bun run lint && bun run build`; **bun** only. This is a mock app: derive metrics from the in‑memory/seed stores; no backend. Charts already exist (Recharts) — the work is feeding them correct data. Status: ✅ VERIFY · ⚠️ FIX · ❌ BUILD.

---

# PART 0 — Diagnose the cause + build the shared data layer (do first)

### 0.1 — Diagnose exactly why the reports are empty ✅ VERIFY (run first, change nothing)
```
Do a read-only diagnosis of why the facility Reports & Analytics render empty. Do NOT change code yet — produce a findings table. Inspect:
1. The facility report routes/components: src/app/facility/dashboard/reports/*, src/app/facility/dashboard/insights/*, src/components/facility/FacilityReports.tsx, src/components/analytics/*, src/components/financial/*, src/components/smart-insights/SmartInsightsPage.tsx, src/components/hq/HQAnalyticsPanel.tsx.
2. The data they consume: src/lib/report-data-sources.ts, src/data/facility-analytics.ts, src/data/reports.ts, src/data/analytics.ts, src/lib/api/reports.ts, src/data/smart-insights.ts, src/data/hq-analytics.ts, src/lib/retail-reports.ts, src/lib/scheduling-reports.ts.
For each report/chart, determine which cause applies: (A) reads a dedicated analytics dataset that is empty/near-empty instead of deriving from real stores; (B) DATE-WINDOW mismatch — seed operational data (transactions/bookings/appointments) is dated in the past while the report defaults to a recent window (check the dates in src/data/retail.ts getAllTransactions() + booking/appointment seeds vs the report's default range); (C) aggregation exists but the page passes empty input / returns early; (D) a permanent empty-state stub. Output a table: Report | File | Data source | Cause (A/B/C/D) | What real store it SHOULD derive from. This table drives every fix below.
```

### 0.2 — Build the canonical report data‑source layer (derive from real stores) ❌ BUILD
```
Make src/lib/report-data-sources.ts the single source of truth that DERIVES every report metric from the real operational stores (never from an empty dedicated dataset). Implement/repair these pure selectors, each taking a {from, to} date range + optional location/service filter and returning typed series (types in src/types/facility-analytics.ts / src/types/reports.ts):
- revenueByPeriod(range) — sum Transaction.total from src/data/retail.ts getAllTransactions() bucketed by day/week/month; also subtotal, tax, tips, discounts, refunds.
- revenueByService(range) — group revenue by service type (grooming/boarding/daycare/training/retail) from transactions + bookings.
- salesByCategory / topProducts / profitMargin — reuse the schemas already in src/types/retail.ts (salesByCategorySchema, topProductSchema, profitMarginReportSchema) via src/lib/retail-reports.ts.
- bookingsByPeriod / occupancy / utilization — from booking + appointment seeds (count, no-shows, cancellations, capacity used).
- clientMetrics — new vs returning, acquisition by source, retention/LTV from client + transaction history.
- staffPerformance / laborCost — from shifts + transactions (sales per staff, hours, labor $).
Reuse date/rollup helpers in src/lib/analytics-utils.ts. Everything is derived + memoized; no network. Report components call THESE selectors, not the raw stores.
```

### 0.3 — Fix the date window so default reports contain data ⚠️ FIX
```
Per Prompt 0.1 cause (B): if seed transactions/bookings/appointments are dated in the past relative to "today", the default report range (e.g. last 30 days) shows nothing. Fix the DATA so it spans the current reporting window — either (preferred) shift the seed generators in src/data/retail.ts and the booking/appointment/grooming seeds to generate rolling data relative to today (a helper like daysAgo(n) anchored to the current date, following the app's existing "no raw Date.now() in data" pattern by generating at read time), OR set every report's default range to the window the seed data actually covers. Preferred: rolling seed data anchored to today so revenue/bookings charts always show a populated trailing 30/90/365 days. Verify a fresh load of every report shows non-empty series for the default range.
```

### 0.4 — Professional chart + empty‑state standards ⚠️ FIX
```
Establish consistent, professional presentation across all report charts (they use Recharts + the existing chart components in src/components/hq/charts/* and src/components/scheduling/charts/*). For every report: (a) currency formatted as $X,XXX.XX, counts with thousands separators, percentages to 1 dp; (b) axis labels, legends, and tooltips on every chart; (c) a KPI row (reuse src/components/facility/dashboard/kpi-row.tsx / kpi-tile.tsx or ui/StatCard) above each report with the headline numbers + period-over-period delta (▲/▼ vs previous period); (d) a real empty state ONLY when a range genuinely has zero data ("No transactions in this period" + the active range), never as the default; (e) a visible date-range picker + export button on every report. Keep the Yipyy design language (same card style/spacing as the dashboard).
```

---

# PART 1 — Financial & Revenue reports ⚠️ FIX
```
Populate the financial/revenue reports: src/components/financial/{FinancialReports,RevenueOverview,FacilityRevenueTable}.tsx and the facility reports financial route. Drive them from report-data-sources revenueByPeriod + revenueByService (0.2). Show: total revenue (with prev-period delta), revenue trend line (day/week/month toggle), revenue by service type (bar/donut), gross vs net (after discounts + refunds), tax collected, tips collected, payment-method breakdown (card/cash/gift card/package/store credit — from Transaction.payments), average transaction value, and a revenue table by day. Reconcile: the sum of the table == the KPI total == the sum of getAllTransactions().total for the range (to the cent). Refunds reduce net; deposits/gift-card liability handled per their recognition rules.
```

# PART 2 — Sales / Retail / POS reports ⚠️ FIX
```
Populate retail/POS reporting via src/lib/retail-reports.ts + the schemas already in src/types/retail.ts (topProductSchema, salesByCategorySchema, profitMarginReportSchema, salesByStaffSchema, salesLinkedToServicesSchema). Show: top products by revenue + by units, sales by category, profit margin by product/category (revenue − cost), sales by staff/cashier, retail sales linked to services (add-on attach rate), and inventory-value/low-stock summary. Derive all from getAllTransactions() retail line items + the product catalog (src/data/retail.ts). These schemas exist — the fix is computing + rendering them, not defining them.
```

# PART 3 — Bookings / Reservations / Occupancy reports ⚠️ FIX
```
Populate booking & occupancy analytics: src/components/analytics/{ReservationAnalytics,FacilityUtilizationMetrics}.tsx. From the booking/appointment seeds compute: bookings over time (by service), booking sources (online/staff/walk-in), no-show + cancellation rates, lead time, occupancy/utilization by service and by day-of-week/hour (heatmap), capacity used vs available (boarding kennels, daycare spots, grooming slots, training), and revenue-per-available-slot. Wire to report-data-sources bookingsByPeriod/occupancy/utilization (0.2). Ensure counts match the actual booking seed for the range.
```

# PART 4 — Per‑service performance (Grooming / Boarding / Daycare / Training) ⚠️ FIX
```
Populate each service module's own analytics with real numbers: grooming (appointments, revenue, service mix, groomer productivity, avg ticket, rebook rate), boarding (occupancy, ADR, length of stay, revenue), daycare (attendance, package utilization, capacity), training (enrollments, session completion, progress — reuse src/components/training/*-progress-chart.tsx). Derive from each module's real data via report-data-sources revenueByService + service-specific selectors. Reuse the existing module KPI rows; just feed them derived data instead of zeros.
```

# PART 5 — Clients: acquisition, retention, LTV ⚠️ FIX
```
Populate src/components/analytics/CustomerAcquisitionMetrics.tsx (+ any client analytics on the reports page) from client + transaction history: new vs returning clients over time, acquisition by source, active clients, churn/retention curve, average lifetime value (sum of a client's transactions), top clients by spend, pets-per-client, and reactivation opportunities. Derive via report-data-sources clientMetrics (0.2). These feed Smart Insights (Part 9) too.
```

# PART 6 — Staff, labor & scheduling reports ⚠️ FIX
```
Populate src/components/scheduling/ReportsView.tsx + charts (DeptHoursChart, LaborCostChart) and src/components/calling/StaffPerformanceReport.tsx via src/lib/scheduling-reports.ts + report-data-sources staffPerformance/laborCost (0.2): hours by department, labor cost vs revenue (labor %), sales per staff member, appointments per groomer/trainer, on-time %, overtime, and schedule coverage. Derive from shift seeds + transactions attributed to each staff member.
```

# PART 7 — Loyalty reports ✅ VERIFY / ⚠️ FIX
```
Populate the loyalty analytics: src/components/loyalty/{PointsLiabilityReport,BadgeAchievementReport,RevenueReportLoyaltySection}.tsx via the existing src/lib/loyalty/*metrics.ts (liability-metrics, badge-achievement-metrics, program-metrics, referral-metrics, roi-metrics). Show: outstanding points liability ($ value), points earned vs redeemed, tier distribution, badge achievements, referral conversions, and loyalty program ROI (incremental revenue from members vs non-members). The metrics libs exist — verify they're fed the real loyalty + transaction data and rendered, not stubbed.
```

# PART 8 — Calling & Messaging analytics ⚠️ FIX
```
Populate src/components/calling/{CallAnalyticsDashboard,CallMetricsOverview,TagFrequencyChart}.tsx (via src/lib/calling/call-metrics.ts) and src/components/messaging/{MessagingAnalyticsView,MessagingAnalyticsCharts}.tsx: call volume, answer rate, avg handle time, missed/voicemail, follow-up outcomes, tag frequency, and messaging response time / conversation volume / channel mix. Derive from the call + message seed stores. If these modules aren't part of "reports" in the client's mind, still fix them since they're analytics.
```

# PART 9 — Smart Insights ⚠️ FIX
```
Populate Smart Insights (src/components/smart-insights/SmartInsightsPage.tsx + InsightCard + MetricChip, data in src/data/smart-insights.ts, api in src/lib/api/smart-insights.ts, generators in src/lib/smart-insights/*). Instead of a static/empty insight list, GENERATE insights from the derived metrics (0.2): e.g. "Grooming revenue up 18% vs last month", "Daycare at 92% capacity Fri — consider waitlist", "23 clients haven't rebooked in 60 days", "Retail attach rate dropped to 12%", "Betadine/toothpaste low vs booked add-ons". Each insight = a title, the real metric (MetricChip), a severity, and an action link (the InsightActionDrawer already exists). Make the insight feed reflect the actual current data, with the category/location filters working.
```

# PART 10 — HQ multi‑location analytics ⚠️ FIX
```
Populate src/components/hq/HQAnalyticsPanel.tsx + src/components/hq/reports/* using the existing chart components (src/components/hq/charts/*: RevenueByLocationBar, RevenueTrendLineChart, ServiceMixChart, WeeklyOccupancyChart, Sparkline, StackedDistribution) and src/data/hq-analytics.ts. Show consolidated + per-location: revenue by location, revenue trend, service mix, weekly occupancy, staff performance across locations, client activity, and transfer impact. Derive per-location by filtering the operational stores by locationId; the consolidated view sums locations. Ensure the location filter drives every chart.
```

# PART 11 — Custom Report Builder + Export ✅ VERIFY / ⚠️ FIX
```
Verify the custom report builder (src/components/reports/CustomReportBuilder.tsx + src/components/analytics/CustomReportsManager.tsx + src/lib/saved-reports-store.ts) can assemble a report from the derived metrics (pick metrics + dimensions + date range → renders real data), save it, and reload it. Verify Export (src/components/reports/ExportReportModal.tsx + src/lib/report-export.ts + GenerateReportModal.tsx) produces a real CSV/PDF of the currently-displayed data (not an empty template). Fix whichever step returns empty.
```

---

# Appendix — Verification

### Z.1 — Every report shows real, reconcilable numbers
```
For the default date range on each facility report (Financial, Sales/Retail, Bookings/Occupancy, per-service, Clients, Staff/Labor, Loyalty, Calling/Messaging, Smart Insights, HQ): confirm (1) it renders non-empty series/tiles on first load; (2) the headline KPI equals the sum of its own detail table; (3) revenue totals reconcile to the cent with getAllTransactions() for the range; (4) changing the date range / location filter updates every chart; (5) export outputs the displayed data; (6) an empty state appears ONLY for a range that genuinely has zero data. Produce a report-by-report PASS/FAIL table. Run: bun run typecheck && bun run lint && bun run build.
```

### Z.2 — No fabricated numbers, one source of truth
```
Confirm every report derives from src/lib/report-data-sources.ts (which derives from the real operational stores) — grep for any report still reading an empty dedicated dataset (src/data/facility-analytics.ts / reports.ts / analytics.ts) directly and repoint it, OR fill those datasets by generating from the real stores. There must be ONE derivation path so a booking or sale that happens in the app immediately shows up in the reports. Report any remaining hardcoded/zeroed metric.
```

---

*Grounded against the live `C:\dev\puneet` reports/analytics file structure. "All empty" is a data-wiring problem, not missing UI: the report screens, charts, metric libs, builder, and export already exist — Prompt 0 pins the exact cause (empty dedicated dataset vs. past-dated seed vs. unwired aggregation), then a single derived data-source layer feeds every facility report accurate, reconcilable numbers for the current window. Re-run Prompt 0's diagnostic once the device bridge is back to confirm the per-report cause before applying fixes.*
