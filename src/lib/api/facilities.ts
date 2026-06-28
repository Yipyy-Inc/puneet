import {
  buildFacilityReport,
  buildOverviewKpis,
} from "@/data/facility-analytics";
import {
  getTenantActivityLogs,
  getTenantAuditLogs,
  getTenantLogStatistics,
  type TenantActivityLog,
  type TenantAuditLog,
  type TenantLogStatistics,
} from "@/data/tenant-logs";
import type { FacilityReport, OverviewKpis } from "@/types/facility-analytics";

export interface FacilityLogs {
  activity: TenantActivityLog[];
  audit: TenantAuditLog[];
  statistics: TenantLogStatistics;
}

// Query factory for facility-profile analytics (Overview KPIs, Reports, Logs).
// The live clock is injected here so the builders stay pure.
export const facilitiesQueries = {
  overviewKpis: (facilityId: number, locationName?: string | null) => ({
    queryKey: [
      "facilities",
      "overview-kpis",
      facilityId,
      locationName ?? "all",
    ] as const,
    queryFn: async (): Promise<OverviewKpis> =>
      buildOverviewKpis(facilityId, new Date(), locationName),
  }),

  report: (facilityId: number, rangeMonths: number) => ({
    queryKey: ["facilities", "report", facilityId, rangeMonths] as const,
    queryFn: async (): Promise<FacilityReport> =>
      buildFacilityReport(facilityId, rangeMonths, new Date()),
  }),

  logs: (facilityId: number) => ({
    queryKey: ["facilities", "logs", facilityId] as const,
    queryFn: async (): Promise<FacilityLogs> => ({
      activity: getTenantActivityLogs(facilityId),
      audit: getTenantAuditLogs(facilityId),
      statistics: getTenantLogStatistics(facilityId),
    }),
  }),
};
