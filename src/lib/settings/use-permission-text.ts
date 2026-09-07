"use client";

import {
  ACCESS_SCOPE_META,
  PERMISSION_GROUPS,
  type AccessScope,
  type PermissionKey,
} from "@/types/facility-staff";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useNavText } from "@/lib/nav/use-nav-text";

// ============================================================================
// The permission catalogue in the viewer's language.
//
// `PERMISSION_GROUPS` and `ACCESS_SCOPE_META` are module constants in
// src/types/facility-staff.ts — 168 permissions across 19 groups, plus the
// four access scopes — and ELEVEN files read them: the roles studio, the staff
// Access tab, the role matrix, the quick-create dialog, the staff permission
// editor, the calling settings panel. A constant cannot know a locale, so the
// lookup lives here once instead of eleven times.
//
// ── THE KEY IS THE PERMISSION ─────────────────────────────────────────────
//
// `manage_roles` is written onto a role, checked by the server and compared
// against the database. It never changes. Only the LABEL moves, which is why
// nothing here rewrites the constants — it reads them for the fallback and
// answers from the catalogue.
//
// A permission added to the constant and not to the catalogue falls back to
// its English label rather than showing `perm_some_new_key` on screen. The
// catalogue script fails if that ever happens, so the fallback is a safety
// net rather than a plan.
// ============================================================================

export interface PermissionText {
  /** A permission's label — "View home address". */
  permission: (key: PermissionKey) => string;
  /** A permission's hint, or undefined where it has none. */
  hint: (key: PermissionKey) => string | undefined;
  /**
   * A group's heading — "Customer data".
   *
   * Takes the GROUP, not its id, so the fallback is always its own English
   * label. Passing an id meant a group this catalogue does not know rendered
   * its raw id: the roles studio draws `POSITION_EDITOR_GROUPS`, which is
   * PERMISSION_GROUPS plus fourteen `nav-*` groups derived from the nav, and
   * all fourteen printed "nav-dashboard" on screen.
   */
  group: (group: { id: string; label: string }) => string;
  /** A group's one-line description. */
  groupHelp: (group: { id: string; description: string }) => string;
  /** An access scope's label — "Operating hours". */
  scope: (value: AccessScope) => string;
  /** An access scope's description. */
  scopeHelp: (value: AccessScope) => string;
}

const FALLBACK_PERMISSION = new Map<string, { label: string; hint?: string }>();
const FALLBACK_GROUP = new Map<
  string,
  { label: string; description: string }
>();
for (const group of PERMISSION_GROUPS) {
  FALLBACK_GROUP.set(group.id, {
    label: group.label,
    description: group.description,
  });
  for (const permission of group.permissions)
    FALLBACK_PERMISSION.set(permission.key, {
      label: permission.label,
      hint: permission.hint,
    });
}

export function usePermissionText(): PermissionText {
  const t = useSettingsText().section("permissions");
  // The fourteen `nav-*` groups are derived from NAV_SECTIONS, whose labels
  // the nav catalogue already translates by section id. Their permissions need
  // nothing extra: every nav permKey is a PermissionKey, so `perm_<key>`
  // covers them.
  const nav = useNavText();

  const lookup = (key: string, fallback: string | undefined) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  return {
    permission: (key) =>
      lookup(`perm_${key}`, FALLBACK_PERMISSION.get(key)?.label) ?? key,
    hint: (key) => lookup(`hint_${key}`, FALLBACK_PERMISSION.get(key)?.hint),
    group: ({ id, label }) => {
      // The catalogue first, then the nav. Five nav sections have no heading
      // in the sidebar — dashboard, services, customer, scheduling, settings —
      // so the nav catalogue has no entry for them and `nav.section()` handed
      // back its English fallback. Those five carry a `group_nav-*` key here.
      const own = lookup(`group_${id}`, undefined);
      if (own !== undefined) return own;
      if (id.startsWith("nav-")) return nav.section(id.slice(4), label);
      return FALLBACK_GROUP.get(id)?.label ?? label;
    },
    groupHelp: ({ id, description }) => {
      if (id.startsWith("nav-"))
        return lookup("groupHelp_nav", description) ?? description;
      return (
        lookup(
          `groupHelp_${id}`,
          FALLBACK_GROUP.get(id)?.description ?? description,
        ) ?? description
      );
    },
    scope: (value) =>
      lookup(`scope_${value}`, ACCESS_SCOPE_META[value]?.label) ?? value,
    scopeHelp: (value) =>
      lookup(`scopeHelp_${value}`, ACCESS_SCOPE_META[value]?.description) ?? "",
  };
}
