import type {
  OccupancyReportData,
  NoShowReportData,
  CancellationReportData,
  CustomReportConfig,
} from "@/types/reports";

import {
  generateOccupancyReport,
  generateNoShowReport,
  generateCancellationReport,
  savedCustomReports,
} from "@/data/reports";

export const reportQueries = {
  occupancy: (facilityId: number, startDate: string, endDate: string) => ({
    queryKey: ["reports", "occupancy", facilityId, startDate, endDate] as const,
    queryFn: async (): Promise<OccupancyReportData[]> =>
      generateOccupancyReport(facilityId, startDate, endDate),
  }),

  noShows: (facilityId: number, startDate: string, endDate: string) => ({
    queryKey: ["reports", "noShows", facilityId, startDate, endDate] as const,
    queryFn: async (): Promise<NoShowReportData[]> =>
      generateNoShowReport(facilityId, startDate, endDate),
  }),

  cancellations: (facilityId: number, startDate: string, endDate: string) => ({
    queryKey: [
      "reports",
      "cancellations",
      facilityId,
      startDate,
      endDate,
    ] as const,
    queryFn: async (): Promise<CancellationReportData[]> =>
      generateCancellationReport(facilityId, startDate, endDate),
  }),

  savedCustom: () => ({
    queryKey: ["reports", "custom"] as const,
    queryFn: async (): Promise<CustomReportConfig[]> => savedCustomReports,
  }),
};
