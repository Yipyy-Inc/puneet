// Express Check-In price pre-approvals → appointment priceAdjustments
// (Spec Table 103). When a client pre-approves a potential surcharge on the
// login-free check-in form, the groomer can add the fee with one click instead
// of calling. Mock: mutates the shared appointment object in place, mirroring
// src/lib/grooming/check-in-actions.ts. Mutation lives in this plain .ts helper
// (not a component) so the React Compiler's immutability rule stays happy.

import type {
  GroomingAppointment,
  PriceAdjustment,
  SurchargeApproval,
} from "@/types/grooming";

/** Deterministic id for the adjustment a given approval produces — lets us
 *  detect (and prevent) double-adds. */
export function preApprovedAdjustmentId(approvalId: string): string {
  return `adj-preapproved-${approvalId}`;
}

/** True when this approval has already been added to the appointment. */
export function hasPreApprovedSurcharge(
  apt: GroomingAppointment,
  approval: SurchargeApproval,
): boolean {
  const id = preApprovedAdjustmentId(approval.id);
  return apt.priceAdjustments.some((a) => a.id === id);
}

/**
 * Append a client-pre-approved surcharge to the appointment as a
 * {@link PriceAdjustment} and bump the total. Idempotent — returns null if the
 * fee was already added. `customerNotified` is true because the client already
 * approved it, so there's no surprise at checkout.
 */
export function applyPreApprovedSurcharge(
  apt: GroomingAppointment,
  approval: SurchargeApproval,
): PriceAdjustment | null {
  if (approval.decision !== "approved") return null;
  if (hasPreApprovedSurcharge(apt, approval)) return null;

  const adjustment: PriceAdjustment = {
    id: preApprovedAdjustmentId(approval.id),
    amount: approval.amount,
    reason: approval.reason,
    description: `${approval.label} — client pre-approved ${new Date(
      approval.decidedAt,
    ).toLocaleString("en-CA")}`,
    addedBy: "Groomer",
    addedAt: new Date().toISOString(),
    customerNotified: true,
    notifiedAt: approval.decidedAt,
  };

  apt.priceAdjustments = [...apt.priceAdjustments, adjustment];
  apt.totalPrice = apt.totalPrice + approval.amount;
  return adjustment;
}
