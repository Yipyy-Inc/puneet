import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/viewer";
import {
  isEditable,
  lastFour,
  secretInputSchema,
  type ApplicationStatus,
} from "@/lib/merchant-application/application";

// ============================================================================
// The one route a national id number passes through.
//
// ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
//
// It does not log. It does not echo the value back. It does not put it in a
// draft, a query cache or an error message. The response is `{ last4 }` and
// nothing else, and the failure responses are deliberately generic about the
// value — "that is too short to be valid" rather than anything quoting it.
//
// This is the only file in the codebase that should ever hold one of these in a
// variable, and it holds it for the length of one function call.
//
// ── WHY IT USES THE ADMIN CLIENT ──────────────────────────────────────────
//
// `store_boarding_secret` is SECURITY DEFINER — `vault` is unreachable
// otherwise — and EXECUTE is granted to `service_role` alone. So the GRANT is
// the boundary, and this route is what stands in front of it: the caller is
// authorised HERE, against the session, before the admin client is touched.
//
// The order matters and is the point. Resolve the facility from the session,
// find that facility's own live application, confirm it is still editable, and
// only then hand anything to a privileged client. A route that called the RPC
// first and checked afterwards would have already written.
//
// ── AND THE APPLICATION IS FOUND, NOT NAMED ───────────────────────────────
//
// The caller sends a kind and a value. They do NOT send an application id: it
// is looked up from the facility the session resolves to. A caller who could
// name the application could write their own social security number onto
// somebody else's — which would be a strange attack, and a trivial one.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const active = await activeAdminFacility();
  if (active.kind !== "resolved") {
    return NextResponse.json(
      {
        error:
          active.kind === "ambiguous"
            ? "You administer more than one facility. Open the one you mean at its own address."
            : "Only an owner or administrator can edit this application.",
      },
      { status: active.kind === "ambiguous" ? 409 : 403 },
    );
  }

  const parsed = secretInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    // Never quotes the value.
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That is not valid." },
      { status: 422 },
    );
  }
  const { kind, principalId, value } = parsed.data;

  if (kind === "principal" && !principalId) {
    return NextResponse.json(
      { error: "Which person is this for?" },
      { status: 422 },
    );
  }

  // ── Authorise against the session, before anything privileged ───────────
  const supabase = await createServerClient();
  const { data: application } = await supabase
    .from("merchant_applications")
    .select("id, status")
    .eq("facility_id", active.facility.id)
    .not("status", "in", '("withdrawn","rejected")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { error: "There is no application to add this to." },
      { status: 404 },
    );
  }

  if (!isEditable(application.status as ApplicationStatus)) {
    return NextResponse.json(
      { error: "This application has been submitted and cannot be changed." },
      { status: 409 },
    );
  }

  // The principal has to belong to THIS application. Read through the ordinary
  // client so RLS answers — the caller must be able to see the person they
  // claim to be describing.
  if (kind === "principal") {
    const { data: principal } = await supabase
      .from("merchant_application_principals")
      .select("id")
      .eq("id", principalId!)
      .eq("application_id", application.id)
      .maybeSingle();

    if (!principal) {
      return NextResponse.json({ error: "No such person." }, { status: 404 });
    }
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "Secure storage is not configured on this deployment. Contact Yipyy support.",
      },
      { status: 503 },
    );
  }

  const last4 = lastFour(value);

  const { error } = await createAdminClient().rpc("store_boarding_secret", {
    p_application_id: application.id,
    p_kind: kind,
    p_principal_id: principalId ?? null,
    p_value: value,
    p_last4: last4,
  });

  if (error) {
    // The message is the function's own, which is written for a person, but it
    // is checked for anything resembling the value before being passed on.
    const safe =
      error.message && !error.message.includes(value)
        ? error.message
        : "That could not be saved.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }

  // The last four, and nothing else. This is what every screen renders.
  return NextResponse.json({ last4 });
}
