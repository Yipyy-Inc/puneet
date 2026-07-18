import { getIncidentsForBooking } from "@/data/incidents";
import { facilityConfig } from "@/data/facility-config";
import type { InvoiceLineItem } from "@/types/booking";

/**
 * Incident-medication billing (2B.3 rule).
 *
 * A charge line is produced for an incident medication only when BOTH:
 *  - the medication has `chargeFee` on, and
 *  - the facility's "Charge for incident medications" toggle is on (2G.1).
 *
 * Amount:
 *  - `one_time`  → flat `feeAmount` once.
 *  - `per_admin` (default) → `feeAmount × administrations logged` — counted from
 *    the incident's careLogs referencing that medication, so it recomputes as
 *    logs accrue. No line is emitted until at least one administration exists.
 *
 * Returned as InvoiceLineItem[] so they drop straight into the Services panel.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function getIncidentCareCharges(bookingId: number): InvoiceLineItem[] {
  if (
    !facilityConfig.serviceFees.medication.chargeIncidentMedications.enabled
  ) {
    return [];
  }

  const charges: InvoiceLineItem[] = [];

  for (const incident of getIncidentsForBooking(bookingId)) {
    for (const med of incident.incidentMedications) {
      if (!med.chargeFee) continue;
      const feeAmount = med.feeAmount ?? 0;
      if (feeAmount <= 0) continue;

      if (med.feeType === "one_time") {
        charges.push({
          name: `Incident care — ${med.name}`,
          unitPrice: round2(feeAmount),
          quantity: 1,
          price: round2(feeAmount),
          type: "addon",
        });
      } else {
        // per_admin (default): scales with logged administrations.
        const admins = incident.careLogs.filter(
          (log) => log.medicationId === med.id,
        ).length;
        if (admins <= 0) continue;
        charges.push({
          name: `Incident care — ${med.name}`,
          unitPrice: round2(feeAmount),
          quantity: admins,
          price: round2(feeAmount * admins),
          type: "addon",
        });
      }
    }
  }

  return charges;
}

/** Convenience: total of all incident-care charges for a booking. */
export function getIncidentCareTotal(bookingId: number): number {
  return round2(
    getIncidentCareCharges(bookingId).reduce((sum, c) => sum + c.price, 0),
  );
}
