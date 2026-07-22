"use client";

import { useMemo } from "react";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import { useFacilityNotifications } from "@/data/facility-notifications";
import type { FacilityNotification } from "@/types/facility";
import type {
  EffectivePermissions,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// Section 4D — notification scoping.
//
// An employee only receives the notification TYPES their permissions justify.
// A Groomer gets their appointment + client-message + task + shift traffic, but
// not payment failures, other modules' bookings, or staff-management alerts.
//
// The mapping is expressed as "which permission key(s) justify this
// notification" — delivered when the viewer holds ANY of them. Types with no
// entry are universal (they ride on always-on keys: your own tasks, your own
// schedule, announcements addressed to all staff).
//
// Gated with the SAME keys that gate the corresponding screens, so a viewer is
// never notified about something they'd be blocked from opening.
// ============================================================================

/** Per notification TYPE (wins over the category rule below). */
const TYPE_KEYS: Record<string, PermissionKey[]> = {
  // Client messaging — needs the inbox, not merely client visibility.
  customer_message: ["messages_view_inbox"],
  customer_registered: ["view_client_list"],
  vaccination_uploaded: ["view_pet_medical"],
  // Intake / forms.
  form_submission_new: ["settings_manage_forms"],
  form_submission_red_flag: ["settings_manage_forms"],
  form_submission_has_files: ["settings_manage_forms"],
  yipyygo_submitted: ["check_in_out"],
  yipyygo_missing: ["check_in_out"],
  // Incidents.
  incident: ["ops_incidents_view"],
  // Staff-management traffic — explicitly NOT for line staff.
  staff_announcement: [],
  daycare_capacity: ["daycare_view_dashboard"],
};

/** Per notification CATEGORY, applied when the type has no explicit rule. */
const CATEGORY_KEYS: Record<string, PermissionKey[]> = {
  customers: ["view_client_list", "view_clients"],
  boarding: ["boarding_view_dashboard"],
  daycare: ["daycare_view_dashboard"],
  grooming: ["view_grooming_queue", "grooming_view_own_calendar"],
  training: ["view_training_queue", "training_view_own_calendar"],
  forms: ["settings_manage_forms"],
  yipyygo: ["check_in_out"],
  // Reputation/marketing traffic (e.g. "Negative review — action required",
  // pushed at runtime by the reputation engine) is manager-facing.
  reputation: ["marketing_manage_reviews", "marketing_view"],
  marketing: ["marketing_view"],
  // Financial traffic — never line staff.
  billing: ["financial_view_amounts"],
  financial: ["financial_view_amounts"],
  // Staff-management traffic — never line staff.
  staff: ["view_staff"],
  // schedule + tasks ride on always-on personal keys → universal.
  schedule: [],
  tasks: [],
};

/**
 * Fallback for a category we haven't classified. Deliberately CONSERVATIVE:
 * unknown traffic goes to staff with ops-reporting access rather than
 * defaulting to "everyone", so a new notification category can't silently leak
 * to line staff before it's mapped above.
 */
const UNCLASSIFIED_KEYS: PermissionKey[] = ["ops_view_reports"];

/**
 * The permission keys that justify delivering `n`. An empty array means the
 * notification is universal (always-on personal traffic).
 */
export function notificationPermissionKeys(
  n: FacilityNotification,
): PermissionKey[] {
  const byType = TYPE_KEYS[n.type as string];
  if (byType) return byType;
  const byCategory = CATEGORY_KEYS[n.category as string];
  return byCategory ?? UNCLASSIFIED_KEYS;
}

/** Would a viewer with `permissions` receive `n`? (4D) */
export function canReceiveNotification(
  n: FacilityNotification,
  permissions: EffectivePermissions,
): boolean {
  const keys = notificationPermissionKeys(n);
  if (keys.length === 0) return true; // universal / always-on
  return keys.some((k) => permissions[k] !== false);
}

/** Filter a notification feed to what this viewer should receive (4D). */
export function scopeNotificationsToViewer(
  list: FacilityNotification[],
  permissions: EffectivePermissions,
): FacilityNotification[] {
  return list.filter((n) => canReceiveNotification(n, permissions));
}

/** Hook form — the acting viewer's permission-scoped notification feed. */
export function useScopedNotifications(): FacilityNotification[] {
  const all = useFacilityNotifications();
  const permissions = useEffectivePermissions();
  return useMemo(
    () => scopeNotificationsToViewer(all, permissions),
    [all, permissions],
  );
}
