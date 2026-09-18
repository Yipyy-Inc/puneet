"use client";

import { usePermission } from "@/hooks/use-facility-rbac";
import { balanceOf } from "@/lib/api/booking-money";
import {
  availableActions,
  type BookingAction,
  type LifecycleBooking,
} from "@/lib/bookings/booking-lifecycle";
import type { PermissionKey } from "@/types/facility-staff";

// The permissions the lifecycle asks about, read once per render — a hook
// per key because usePermission is one, and the set is fixed so the order is
// too. Anything else the lifecycle asks about is not held.
type AskedKey =
  | "edit_bookings"
  | "cancel_bookings"
  | "take_payment"
  | "process_refund"
  | "log_incidents"
  | "daycare_check_in_out"
  | "check_in_out";

function usePermissions(): (key: PermissionKey) => boolean {
  const granted = {
    edit_bookings: usePermission("edit_bookings"),
    cancel_bookings: usePermission("cancel_bookings"),
    take_payment: usePermission("take_payment"),
    process_refund: usePermission("process_refund"),
    log_incidents: usePermission("log_incidents"),
    daycare_check_in_out: usePermission("daycare_check_in_out"),
    check_in_out: usePermission("check_in_out"),
  } satisfies Record<AskedKey, boolean>;
  return (key) => (key in granted ? granted[key as AskedKey] : false);
}

/** The facility-local calendar day. */
function localDay(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export interface BookingActionsInput extends LifecycleBooking {
  totalCost: number;
  amountDue?: number;
  amountPaid?: number;
}

/**
 * What this viewer may do with this booking now — the lifecycle's answer
 * (src/lib/bookings/booking-lifecycle.ts) with this viewer's permissions and
 * this booking's money filled in.
 */
export function useBookingActions(
  booking: BookingActionsInput | undefined,
  options: { depositRuleApplies: boolean; multiLocation: boolean },
): BookingAction[] {
  const can = usePermissions();
  if (!booking) return [];
  const paid = booking.amountPaid ?? 0;
  return availableActions(booking, {
    can,
    owed: balanceOf(booking),
    paid,
    today: localDay(),
    depositDue: options.depositRuleApplies && paid === 0,
    multiLocation: options.multiLocation,
  });
}
