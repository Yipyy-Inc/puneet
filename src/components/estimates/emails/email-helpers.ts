import type { Estimate } from "@/types/booking";

// Shared helpers for the estimate email preview templates + subjects.

export function fmtEmailDate(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function firstNameOf(estimate: Estimate) {
  return (estimate.guestName || estimate.clientName || "there")
    .trim()
    .split(/\s+/)[0];
}

export function petOf(estimate: Estimate) {
  return estimate.petNames[0] ?? estimate.guestPetInfo?.name ?? "your pet";
}

export function serviceOf(estimate: Estimate) {
  return estimate.service.charAt(0).toUpperCase() + estimate.service.slice(1);
}

export function dateRangeOf(estimate: Estimate) {
  const start = fmtEmailDate(estimate.startDate);
  return estimate.endDate && estimate.endDate !== estimate.startDate
    ? `${start} – ${fmtEmailDate(estimate.endDate)}`
    : start;
}

/** Subject line for the standard estimate email (spec 6.1). */
export function estimateEmailSubject(
  estimate: Estimate,
  facilityName: string,
): string {
  return `${facilityName} — Your estimate for ${petOf(estimate)}'s ${serviceOf(estimate)}, ${dateRangeOf(estimate)}`;
}

/** Deep link to the estimate view (email link). */
export function estimateViewUrl(estimate: Estimate) {
  return `/customer/estimates/${estimate.estimateToken ?? estimate.id}`;
}

export function estimateSetupUrl(estimate: Estimate) {
  return `${estimateViewUrl(estimate)}/setup`;
}
