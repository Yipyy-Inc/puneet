import { importHistory } from "@/data/import-history";
import type { ImportHistoryRecord } from "@/types/import";

// Query factory for the platform Data Import module.
export const importQueries = {
  history: () => ({
    queryKey: ["imports", "history"] as const,
    queryFn: async (): Promise<ImportHistoryRecord[]> =>
      [...importHistory].sort((a, b) => b.date.localeCompare(a.date)),
  }),

  historyForFacility: (facilityId: number) => ({
    queryKey: ["imports", "history", facilityId] as const,
    queryFn: async (): Promise<ImportHistoryRecord[]> =>
      importHistory
        .filter((r) => r.facilityId === facilityId)
        .sort((a, b) => b.date.localeCompare(a.date)),
  }),
};
