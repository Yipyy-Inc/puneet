import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  AccessScope,
  FacilityStaffRole,
  PermissionKey,
  PermissionSetting,
  RolePresetOverrides,
} from "@/types/facility-staff";

// ============================================================================
// The role editor's write path.
//
// Until now every edit made here went to localStorage: private to one browser,
// editable from devtools, and — since the database started answering
// `my_permissions()` — discarded on the next load. The editor was drawing a
// control that did nothing.
//
// Two layers of the cascade are writable here:
//
//   facility-role  →  facility_role_permissions   "what Groomer means HERE"
//   staff          →  staff_permissions           "except for this person"
//
// Authorisation is the `manage_roles` permission, enforced by RLS on both
// tables, not by this file. What this file owns is the translation between the
// client's vocabulary and the database's:
//
//   "revoked" / { granted: false }   ->  scope 'none'   (an explicit denial)
//   null                             ->  DELETE the row (inherit again)
//
// The distinction matters: a stored 'none' outranks every role the person
// holds, while an absent row means the roles decide. Writing 'none' where the
// UI meant "reset" would silently deny instead of inherit.
// ============================================================================

export const dynamic = "force-dynamic";

export type RoleOverrides = {
  /** Per-role overrides for the caller's facility. */
  facilityRoles: RolePresetOverrides;
  /** Per-person overrides, keyed by the staff legacy id ("fs-groom-01"). */
  staff: Record<string, Partial<Record<PermissionKey, PermissionSetting>>>;
};

export type RoleOverrideWrite =
  | {
      kind: "facility-role";
      role: FacilityStaffRole;
      key: PermissionKey;
      /** `null` clears the override; "revoked" denies it outright. */
      scope: AccessScope | "revoked" | null;
    }
  | {
      kind: "staff";
      /** The staff legacy id, e.g. "fs-groom-01". */
      staffId: string;
      key: PermissionKey;
      /** `null` clears the override. */
      setting: PermissionSetting | null;
    };

const unauthorised = () =>
  NextResponse.json({ error: "Not signed in." }, { status: 401 });

const denied = () =>
  NextResponse.json(
    { error: "You do not have permission to edit roles here." },
    { status: 403 },
  );

const ok = () => NextResponse.json({ ok: true });

/**
 * An RLS refusal on INSERT raises 42501 rather than returning no rows, so an
 * upsert fails loudly. 23503 is a foreign-key violation — an unknown
 * permission key, which is the client's fault, not ours.
 */
function failure(error: PostgrestError): NextResponse {
  if (error.code === "42501") return denied();
  return NextResponse.json(
    { error: error.message },
    { status: error.code === "23503" ? 400 : 500 },
  );
}

/** A stored 'none' is a denial; anything else is a grant at that scope. */
function toSetting(scope: AccessScope): PermissionSetting {
  return scope === "none"
    ? { granted: false, scope: "none" }
    : { granted: true, scope };
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return unauthorised();

  const supabase = await createServerClient();

  // RLS scopes both selects to the caller's facility; no filter is needed for
  // correctness, and adding one would not be what keeps other tenants out.
  const [roleRows, staffRows] = await Promise.all([
    supabase
      .from("facility_role_permissions")
      .select("role, permission_key, scope"),
    supabase
      .from("staff_permissions")
      .select("permission_key, scope, staff:staff_id (legacy_id)"),
  ]);

  if (roleRows.error ?? staffRows.error) {
    return NextResponse.json(
      { error: (roleRows.error ?? staffRows.error)?.message },
      { status: 500 },
    );
  }

  const facilityRoles: RolePresetOverrides = {};
  for (const row of roleRows.data ?? []) {
    const role = row.role as FacilityStaffRole;
    // "revoked" is the client's spelling of a denial. Translated back here so
    // no component has to know the database stores it as a scope.
    (facilityRoles[role] ??= {})[row.permission_key as PermissionKey] =
      row.scope === "none" ? "revoked" : row.scope;
  }

  const staff: RoleOverrides["staff"] = {};
  for (const row of staffRows.data ?? []) {
    const legacyId = row.staff?.legacy_id;
    if (!legacyId) continue;
    (staff[legacyId] ??= {})[row.permission_key as PermissionKey] = toSetting(
      row.scope,
    );
  }

  return NextResponse.json({ facilityRoles, staff } satisfies RoleOverrides);
}

// ── Write ───────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return unauthorised();

  const body = (await request.json()) as RoleOverrideWrite;
  const supabase = await createServerClient();

  if (body.kind === "facility-role") {
    // The caller's facility comes from their own membership, never from a
    // request field — otherwise this route would let anyone name a tenant.
    const { data: membership } = await supabase
      .from("facility_memberships")
      .select("facility_id")
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "You do not belong to a facility." },
        { status: 403 },
      );
    }

    const match = {
      facility_id: membership.facility_id,
      role: body.role,
      permission_key: body.key,
    };

    if (body.scope === null) {
      const { error } = await supabase
        .from("facility_role_permissions")
        .delete()
        .match(match);
      if (error) return failure(error);

      const { data: survivor } = await supabase
        .from("facility_role_permissions")
        .select("permission_key")
        .match(match)
        .maybeSingle();
      return survivor ? denied() : ok();
    }

    const { error } = await supabase.from("facility_role_permissions").upsert({
      ...match,
      scope: body.scope === "revoked" ? "none" : body.scope,
    });
    return error ? failure(error) : ok();
  }

  if (body.kind === "staff") {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("legacy_id", body.staffId)
      .maybeSingle();

    if (!staffRow) {
      return NextResponse.json(
        { error: `No staff record for "${body.staffId}".` },
        { status: 404 },
      );
    }

    const match = { staff_id: staffRow.id, permission_key: body.key };

    if (body.setting === null) {
      const { error } = await supabase
        .from("staff_permissions")
        .delete()
        .match(match);
      if (error) return failure(error);

      // A DELETE the policy refuses matches zero rows rather than failing, so
      // "denied" and "there was nothing there" look identical from the result.
      // Reading the row back is what tells them apart.
      const { data: survivor } = await supabase
        .from("staff_permissions")
        .select("permission_key")
        .match(match)
        .maybeSingle();
      return survivor ? denied() : ok();
    }

    const { error } = await supabase.from("staff_permissions").upsert({
      ...match,
      scope: body.setting.granted ? body.setting.scope : "none",
    });
    return error ? failure(error) : ok();
  }

  return NextResponse.json(
    { error: "Unknown override kind." },
    { status: 400 },
  );
}
