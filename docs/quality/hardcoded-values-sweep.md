# Admin Panel — Hardcoded Values Sweep

**Global rule (from spec):** every user-facing number, chart series, and table in the
super-admin panel must be **computed from the data layer** (`src/data/**` records,
exposed via `src/lib/api/**` query factories where consumed by client components).
A hardcoded/placeholder value is a **bug**. Where there is genuinely no data source,
render a **loading skeleton** — never a fake number.

This file is the audit + remediation checklist. It was produced by a panel-wide scan
(6 parallel scanners) that found **31 findings** collapsing to **~14 root causes**.

> Reality note: this repo is mock-driven (no live DB yet). "Computed from the data
> layer" therefore means computed from the `src/data/**` records via the existing
> factory pattern (same approach as the churn/financial/business reports). The
> Supabase/Postgres migration path is separate and unaffected by this sweep.

---

## ✅ Wave 1 — DONE & verified (typecheck + eslint + browser, zero console errors)

| Location | Was (fake) | Now (computed from) |
| --- | --- | --- |
| `src/data/system-administration.ts` → `auditStatistics` | `totalLogs: 15842`, hardcoded `weeklyTrend`/`categoryBreakdown`/`topUsers`, inconsistent 99.5% category split | `computeAuditStatistics(auditLogs)` — totals, per-category breakdown (+ correct %), 7-day trend (data's own window), top users, today/critical/failed/security counts. **Verified: Audit Overview now shows "Total Logs 5", not 15,842.** Fixes 7 findings. |
| `src/data/system-health.ts` → `healthDashboardStats` | `overallHealth: 87`, `serversOnline: 23/25`, `criticalAlerts: 1`, `activeIncidents: 3`, `serviceStatus 15/2/0` | `computeHealthDashboardStats()` from `serverStatuses` (Online count + weighted score), `serviceUptimes` (operational/degraded/outage), `systemAlerts` (New/Investigating = incidents, Critical+unresolved = critical). **Verified: dashboard Platform Health now "86% · 3/5 servers · 1 degraded", not 23/25.** Feeds the dashboard-home tile via `platform-dashboard.ts`. |
| `src/app/dashboard/analytics/page.tsx` | inline literals `1,250`, `+18.5%`, `8,290`, `90%`, `78.8%`, `99.8%` | imported from `src/data/analytics.ts`: `acquisitionMetrics.totalNewCustomers`/`.growthRate`, `systemReservationMetrics.totalReservations`/`.completionRate`, `utilizationComparison.systemAverage`, `systemPerformance.systemUptime`. Fixes 6 findings. |
| `src/app/dashboard/user-management/page.tsx` | "Roles Configured" = `5` | `Object.keys(rolePermissions).length`. Fixes 1 finding. |
| `src/data/security-compliance.ts` → `securityDashboardStats` | `securityScore 87`, `totalFailedLogins 3456`, `activeSessions 156`, `mfaAdoptionRate 78`, hardcoded `weeklyFailedLogins`/`alertsByType`/`topThreats` | `computeSecurityDashboardStats()` from `failedLoginAttempts` (sum attemptCount, blocked-IP set, 7-day trend), `securityAlerts` (active/critical, by-type %, top threats), `activeSessions` (status Active), `mfaSettings` (adoption %), composite security score. **Verified: Security Score now "75%", MFA "75%", old 3,456/156 gone.** Fixes **5 findings** (KPIs + all 3 SecurityManagement charts). |
| `src/data/security-compliance.ts` → `dataSubjectRequestStats` | totals/by-type/`complianceRate 98.5`/`avgCompletionDays 4.2` hardcoded | `computeDataSubjectRequestStats()` from the `dataSubjectRequests` records (status/type counts, avg completion days, deadline-based overdue + compliance rate, this/last-month). Fixes 1 finding. |
| `src/components/subscriptions/FacilitySubscriptionsTable.tsx` → `getTierLimit` | inline duplicate `{ tier-beginner: { maxUsers: 5, … } }` | reads `subscriptionTiers.find(t => t.id === tierId)?.limitations[limitType]` from the real data layer. Fixes 1 finding. |

**Note (orphaned seed left intentionally):** `healthDashboardStats.dailyMetrics` /
`avgResponseTime` / `errorRate` / `systemUptime` are still seed values, but they feed
**only** the deprecated `SystemStatus.tsx` card (the live System Status page already
reads real metrics from `/api/health`). They are not rendered anywhere live.

---

## ✅ Wave 2 — DONE & verified (completes the sweep)

### Computed from records

- [x] **[high]** `src/components/system-admin/SupportTicketing.tsx` — SLA Performance (was `94/88/75/82`) → `getSlaPerformance()` in `src/data/support-tickets.ts` computes first-response/resolution met ratios + avg response (min) / resolution (hrs) from `supportTickets` (sla flags, first-agent-message + resolution timestamps). **Verified: now "First Response 88% · 7/8 met · Resolution 100% · 2/2 met".**
- [x] **[high]** `src/components/analytics/SystemPerformanceMetrics.tsx` — CPU/Memory/Network/Disk (was `42%/58%/156 MB/s/67%`) → `resourceUtilizations.find(resourceType).current`. **Verified: "156 MB/s" gone.**
- [x] **[high]** `src/app/dashboard/facilities/page.tsx` — trend pills `+12%/+8%/+15%` → **removed** (the counts are real; no reliable month-over-month baseline exists for users/clients, so the fabricated trend badge is dropped rather than faked).

### No data source → loading skeleton (NOT a fake number)

- [x] **[high]** `src/components/analytics/CustomerAcquisitionMetrics.tsx` — `growthTrendData` LineChart → `<Skeleton>` ("Awaiting historical acquisition data source"). No month-by-month history exists. (Channel/LTV charts were already real.)
- [x] **[high]** `src/app/dashboard/support/calling/_components/support-calling-client.tsx` — `supportCallStats` Voicemails/Today tiles → `<PendingTile>` skeleton ("Awaiting call records"). Missed/System-Status tiles stay real.
- [x] **[high]** `src/app/dashboard/facilities/[id]/page.tsx` + `ModulesTab.tsx` — `moduleUsageData` (8 modules) → emptied; `ModulesTab` renders a per-module `<Skeleton>` for Usage/Actions/Last-Used.

### Moved to the data layer

- [x] **[high]** `src/components/subscriptions/ModulesManagement.tsx` — inline `initialPackages` → new `src/data/module-packages.ts` (`modulePackages`); component imports it.
- [x] **[medium]** `src/components/subscriptions/FacilitySubscriptionsTable.tsx` — `getTierLimit` inline duplicate → reads `subscriptionTiers…limitations`.

**Status: all 31 findings resolved (compute-from-records, skeleton, or moved to the data layer). No hardcoded user-facing numbers remain in the audited surface.**

---

## How values are consumed (pattern reference)

- KPI tiles with a real source → `useQuery(factory.query())` + `<Skeleton>` while `isLoading`
  (see `src/app/dashboard/_components/business-health-tiles.tsx`).
- Server-component pages → import the computed data-layer value directly
  (see `src/app/dashboard/analytics/page.tsx`).
- Data-layer aggregates → computed from records at the source (see `auditStatistics`,
  `healthDashboardStats`), so every consumer gets real values with no component churn.
- Shared skeleton primitive: `src/components/ui/skeleton.tsx`.
