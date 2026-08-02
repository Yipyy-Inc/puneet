import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type {
  AccessScope,
  CustomFacilityRole,
  CustomRolesById,
  PermissionKey,
} from "@/types/facility-staff";

// ============================================================================
// Custom roles — the facility's own roles, and who holds them.
//
// The last part of the role editor that was browser-local. A facility could
// invent "Senior Groomer", give it permissions and assign it to three people,
// and none of it left localStorage.
//
// The shape here follows what the client already believes: a role is
// identified by its client-minted id ("custom-mabc123-xy9z"), carried as
// `legacy_id`, and carries a flat permission map. Assignment is a separate
// verb because it is a different question — "what does this role mean" versus
// "who is in it" — and the two are edited on different screens.
//
// Authorisation is `manage_roles`, enforced by RLS on all three tables.
// ============================================================================

export const dynamic = "force-dynamic";

export type CustomRoleWrite =
  | { kind: "upsert"; role: CustomFacilityRole }
  | { kind: "delete"; id: string }
  | {
      kind: "permission";
      id: string;
      key: PermissionKey;
      /** `null` removes the grant — a custom role's map holds only grants. */
      scope: AccessScope | null;
    }
  | {
      kind: "assignments";
      /** Staff legacy id, e.g. "fs-groom-01". */
      staffId: string;
      /** The complete set the person should hold; replaces what is stored. */
      roleIds: string[];
    };

const unauthorised = () =>
  NextResponse.json({ error: "Not signed in." }, { status: 401 });

const denied = () =>
  NextResponse.json(
    { error: "You do not have permission to edit roles here." },
    { status: 403 },
  );

const ok = () => NextResponse.json({ ok: true });

function failure(error: PostgrestError): NextResponse {
  if (error.code === "42501") return denied();
  return NextResponse.json(
    { error: error.message },
    { status: error.code === "23503" ? 400 : 500 },
  );
}

// ── Read ────────────────────────────────────────────────────────────────────

export type CustomRolesResponse = {
  roles: CustomRolesById;
  /**
   * Staff legacy id -> the custom role ids they hold.
   *
   * `null` means "not known" — the signed-out fallback, where staff rows are
   * unreadable. That is NOT the same as an empty map, which means "known, and
   * nobody holds one"; conflating them would blank every assignment the mock
   * profiles carry the moment a browser had no session.
   */
  assignments: Record<string, string[]> | null;
};

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return unauthorised();

  const supabase = await createServerClient();

  const [roleRows, permRows, assignRows] = await Promise.all([
    supabase
      .from("facility_custom_roles")
      .select(
        "id, legacy_id, label, description, accent, ring, icon, created_at",
      )
      .order("created_at"),
    supabase
      .from("facility_custom_role_permissions")
      .select("custom_role_id, permission_key, scope"),
    supabase
      .from("staff_custom_roles")
      .select("staff:staff_id (legacy_id), role:custom_role_id (legacy_id)"),
  ]);

  const error = roleRows.error ?? permRows.error ?? assignRows.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // uuid -> legacy id, so permissions can be hung off the id the client uses.
  const legacyById = new Map<string, string>();
  const roles: CustomRolesById = {};
  for (const row of roleRows.data ?? []) {
    if (!row.legacy_id) continue;
    legacyById.set(row.id, row.legacy_id);
    roles[row.legacy_id] = {
      id: row.legacy_id,
      label: row.label,
      description: row.description,
      accent: row.accent,
      ring: row.ring,
      icon: row.icon,
      permissions: {},
      createdAt: row.created_at,
    };
  }

  for (const row of permRows.data ?? []) {
    const legacyId = legacyById.get(row.custom_role_id);
    if (!legacyId) continue;
    roles[legacyId]!.permissions[row.permission_key as PermissionKey] =
      row.scope;
  }

  const assignments: Record<string, string[]> = {};
  for (const row of assignRows.data ?? []) {
    const staffId = row.staff?.legacy_id;
    const roleId = row.role?.legacy_id;
    if (!staffId || !roleId) continue;
    (assignments[staffId] ??= []).push(roleId);
  }

  return NextResponse.json({
    roles,
    assignments,
  } satisfies CustomRolesResponse);
}

// ── Write ───────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return unauthorised();

  const body = (await request.json()) as CustomRoleWrite;
  const supabase = await createServerClient();

  /** The uuid behind a client-minted role id. */
  async function roleUuid(legacyId: string): Promise<string | null> {
    const { data } = await supabase
      .from("facility_custom_roles")
      .select("id")
      .eq("legacy_id", legacyId)
      .maybeSingle();
    return data?.id ?? null;
  }

  if (body.kind === "upsert") {
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

    const { role } = body;
    const { error } = await supabase.from("facility_custom_roles").upsert(
      {
        facility_id: membership.facility_id,
        legacy_id: role.id,
        label: role.label,
        description: role.description,
        accent: role.accent,
        ring: role.ring,
        icon: role.icon,
      },
      { onConflict: "legacy_id" },
    );
    if (error) return failure(error);

    // A newly created role usually arrives with its permission map already
    // populated (the studio's Duplicate button copies a preset wholesale), so
    // write those too rather than making the client replay them one by one.
    const entries = Object.entries(role.permissions);
    if (entries.length > 0) {
      const id = await roleUuid(role.id);
      if (id) {
        const { error: permError } = await supabase
          .from("facility_custom_role_permissions")
          .upsert(
            entries.map(([key, scope]) => ({
              custom_role_id: id,
              permission_key: key,
              scope: scope as AccessScope,
            })),
          );
        if (permError) return failure(permError);
      }
    }
    return ok();
  }

  if (body.kind === "delete") {
    const { error } = await supabase
      .from("facility_custom_roles")
      .delete()
      .eq("legacy_id", body.id);
    if (error) return failure(error);

    // A refused DELETE matches zero rows rather than failing, so the only way
    // to tell "denied" from "already gone" is to look for the row again.
    const { data: survivor } = await supabase
      .from("facility_custom_roles")
      .select("id")
      .eq("legacy_id", body.id)
      .maybeSingle();
    return survivor ? denied() : ok();
  }

  if (body.kind === "permission") {
    const id = await roleUuid(body.id);
    if (!id) {
      return NextResponse.json({ error: "No such role." }, { status: 404 });
    }

    if (body.scope === null) {
      const match = { custom_role_id: id, permission_key: body.key };
      const { error } = await supabase
        .from("facility_custom_role_permissions")
        .delete()
        .match(match);
      if (error) return failure(error);

      const { data: survivor } = await supabase
        .from("facility_custom_role_permissions")
        .select("permission_key")
        .match(match)
        .maybeSingle();
      return survivor ? denied() : ok();
    }

    const { error } = await supabase
      .from("facility_custom_role_permissions")
      .upsert({
        custom_role_id: id,
        permission_key: body.key,
        scope: body.scope,
      });
    return error ? failure(error) : ok();
  }

  if (body.kind === "assignments") {
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

    const { data: roleRows } = await supabase
      .from("facility_custom_roles")
      .select("id, legacy_id")
      .in("legacy_id", body.roleIds.length > 0 ? body.roleIds : ["__none__"]);

    const wanted = new Set((roleRows ?? []).map((r) => r.id));

    // Replace the set: remove what is no longer held, add what is new. Doing
    // it as a diff rather than delete-all-then-insert keeps the table stable
    // when nothing changed, and means a refused write cannot leave the person
    // holding nothing.
    const { data: current } = await supabase
      .from("staff_custom_roles")
      .select("custom_role_id")
      .eq("staff_id", staffRow.id);

    const held = new Set((current ?? []).map((r) => r.custom_role_id));
    const toAdd = [...wanted].filter((id) => !held.has(id));
    const toRemove = [...held].filter((id) => !wanted.has(id));

    if (toAdd.length > 0) {
      const { error } = await supabase.from("staff_custom_roles").insert(
        toAdd.map((custom_role_id) => ({
          staff_id: staffRow.id,
          custom_role_id,
        })),
      );
      if (error) return failure(error);
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("staff_custom_roles")
        .delete()
        .eq("staff_id", staffRow.id)
        .in("custom_role_id", toRemove);
      if (error) return failure(error);

      const { data: survivors } = await supabase
        .from("staff_custom_roles")
        .select("custom_role_id")
        .eq("staff_id", staffRow.id)
        .in("custom_role_id", toRemove);
      if (survivors && survivors.length > 0) return denied();
    }

    return ok();
  }

  return NextResponse.json({ error: "Unknown write kind." }, { status: 400 });
}
