"use client";

import type { PayrollPayload } from "@/app/api/payroll/route";

// ============================================================================
// Payroll.
//
// Its own file rather than another section of scheduling.ts: payroll is read by
// somebody who is not looking at a rota, and the permission that gates it
// (`view_payroll`) is not a scheduling key.
// ============================================================================

export const payrollKeys = {
  /** `""` is "whatever the server decides" — the first load names no period. */
  summary: (from?: string, to?: string) =>
    ["payroll", "summary", from ?? "", to ?? ""] as const,
};

export const payrollQueries = {
  summary: (from?: string, to?: string) => ({
    queryKey: payrollKeys.summary(from, to),
    queryFn: async (): Promise<PayrollPayload> => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();

      const response = await fetch(`/api/payroll${query ? `?${query}` : ""}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not read payroll.");
      }
      return (await response.json()) as PayrollPayload;
    },
    // A closed pay period does not change. An open one changes as people clock
    // out, which is what the screen's own warning is about.
    staleTime: 60_000,
  }),
};

/** `485` → `8h 05m`. Payroll is read in hours, not in a decimal. */
export function hoursLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}
