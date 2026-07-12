"use client";

import { useCallback } from "react";
import {
  useEffectivePermissions,
  useFacilityRbac,
} from "@/hooks/use-facility-rbac";
import { useReceptionistCanSeeAmounts } from "@/lib/staff/financial-visibility";
import type {
  EffectivePermissions,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// Field-level data masking (spec Section 9 / Table 21)
//
// Staff below the required permission must not see sensitive fields — they are
// rendered as a placeholder, never the real value. This is DISPLAY masking only.
// TODO: also strip these fields server-side when a real backend/JWT exists — the
// client should never receive values the viewer isn't allowed to see.
// ============================================================================

/** Placeholder for a hidden contact field (phone / email / address). */
export const HIDDEN = "Hidden";
/** Placeholder for a hidden monetary amount. */
export const DASH = "—";

/** A maskable field group, each mapped to its minimum permission (Table 21). */
export type MaskableField =
  | "client_contact" // phone, email (Receptionist+)
  | "client_address" // home address (Admin/Owner/Manager only)
  | "client_financial" // lifetime value / total spent
  | "booking_financials" // per-booking dollar amount
  | "financial_amounts"; // invoice totals / outstanding balances

const FIELD_PERMISSION: Record<MaskableField, PermissionKey> = {
  client_contact: "view_client_contact_info",
  client_address: "view_client_address",
  client_financial: "view_client_financial",
  booking_financials: "view_booking_financials",
  financial_amounts: "financial_view_amounts",
};

/** Pure check: may a viewer with `permissions` see `field`? */
export function canSeeField(
  field: MaskableField,
  permissions: EffectivePermissions,
): boolean {
  return permissions[FIELD_PERMISSION[field]] !== false;
}

/** Pure: return `value` when allowed, otherwise the "Hidden" placeholder. */
export function maskContact(value: string, allowed: boolean): string {
  return allowed && value ? value : HIDDEN;
}

/**
 * Pure: return the (already-formatted) amount when allowed, otherwise "—".
 * Pass the display string you'd otherwise render (e.g. "$1,240.00").
 */
export function maskAmount(value: string, allowed: boolean): string {
  return allowed ? value : DASH;
}

export interface FieldMask {
  /** Whether the acting viewer may see a given field group. */
  canSee: (field: MaskableField) => boolean;
  /** Mask a contact string (phone/email/address) → value or "Hidden". */
  maskContact: (value: string | null | undefined) => string;
  /**
   * Mask a monetary amount → value or "—". `field` defaults to
   * `financial_amounts`; pass `booking_financials` or `client_financial` for
   * those surfaces.
   */
  maskAmount: (
    value: string | null | undefined,
    field?: MaskableField,
  ) => string;
}

/**
 * Hook: field masking bound to the acting facility viewer's effective
 * permissions (F0.2). Use in facility/staff-facing views only — customer-portal
 * views show the owner their own data and must not be masked.
 */
export function useFieldMask(): FieldMask {
  const permissions = useEffectivePermissions();
  const { viewer } = useFacilityRbac();
  const receptionAmounts = useReceptionistCanSeeAmounts();
  const isReception = viewer.primaryRole === "reception";

  const canSee = useCallback(
    (field: MaskableField) => {
      // Facility toggle: a receptionist only sees financial amounts when the
      // "receptionist can see amounts" setting is on (Table 21).
      if (field === "financial_amounts" && isReception && !receptionAmounts) {
        return false;
      }
      return canSeeField(field, permissions);
    },
    [permissions, isReception, receptionAmounts],
  );

  const maskContactFn = useCallback(
    (value: string | null | undefined) =>
      maskContact(value ?? "", canSee("client_contact")),
    [canSee],
  );

  const maskAmountFn = useCallback(
    (
      value: string | null | undefined,
      field: MaskableField = "financial_amounts",
    ) => maskAmount(value ?? "", canSee(field)),
    [canSee],
  );

  return { canSee, maskContact: maskContactFn, maskAmount: maskAmountFn };
}
