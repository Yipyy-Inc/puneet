"use client";

import { useSettingsText } from "@/lib/settings/use-settings-text";

/**
 * A facility staff role's name, in the viewer's language.
 *
 * Four settings sections name the same thirteen roles — onboarding templates,
 * offboarding templates, roles & permissions, employment types — and each one
 * had its own `humanizeRole()`, a slug-to-Title-Case regex. That produces
 * "Boarding Attendant" in English and, in French, still "Boarding Attendant":
 * a regex over an English identifier cannot translate, only capitalise.
 *
 * The labels live in the shared `staff-roles` catalogue block. A role the
 * catalogue does not know falls back to the humanised slug rather than to a
 * raw key, so a role added to `FacilityStaffRole` first reads as English words
 * instead of `daycare_attendant`.
 */
export function useStaffRoleLabel(): (role: string) => string {
  const t = useSettingsText().section("staff-roles");

  return (role: string) => {
    const label = t(role);
    if (label !== role) return label;
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
}

/**
 * A facility ACCESS LEVEL's name, in the viewer's language.
 *
 * `FacilityRole` is a different, smaller set than `FacilityStaffRole` — six
 * levels rather than thirteen positions — and it uses different words for the
 * slugs they share: `owner` is "Owner / admin" here and "Owner" there. So it
 * takes its own `access.` prefix inside the same shared block rather than
 * overloading one key with two meanings.
 */
export function useFacilityRoleLabel(): (role: string) => string {
  const t = useSettingsText().section("staff-roles");

  return (role: string) => {
    const key = `access.${role}`;
    const label = t(key);
    if (label !== key) return label;
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
}
