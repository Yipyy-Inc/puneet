import { buildPlatformInvoices } from "@/data/platform-invoices";
import type { PlatformInvoice } from "@/types/platform-invoices";

// Query factory for the platform Invoices module. The live clock is injected
// here so the builder stays pure. Swap the queryFn for a real API later.
export const platformInvoiceQueries = {
  list: () => ({
    queryKey: ["platform", "invoices"] as const,
    queryFn: async (): Promise<PlatformInvoice[]> =>
      buildPlatformInvoices(new Date()),
  }),
};
