import { NextResponse, type NextRequest } from "next/server";

import { activeAdminFacility } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  deniedIfExpectedRowsSurvived,
  deniedIfUntouched,
} from "@/lib/api/rls-write";
import { getViewer } from "@/lib/auth/viewer";
import {
  isEditable,
  principalSchema,
  type ApplicationStatus,
} from "@/lib/merchant-application/application";

// ============================================================================
// The people who own the business.
//
// Separate from the application route because these are rows rather than
// columns — a business has one legal name and any number of owners — and
// because they are readable by a narrower audience. The application and its
// status are visible to anyone with `settings_billing`, which includes the
// facility's accountant; a proprietor's date of birth and home address are
// visible only to whoever submitted the application and to a platform admin.
//
// That split is enforced by RLS, asserted by M6 in
// supabase/tests/merchant-applications.sql, and the reason this file exists on
// its own rather than as three more fields on the application.
//
// The national id number is NOT here. It has its own route, it goes straight to
// Vault, and what comes back is a last-four.
// ============================================================================

export const dynamic = "force-dynamic";

/** The live application for the caller's facility, or a reason there is none. */
async function liveApplication() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const active = await activeAdminFacility();
  if (active.kind !== "resolved") {
    return {
      error: NextResponse.json(
        {
          error:
            active.kind === "ambiguous"
              ? "You administer more than one facility. Open the one you mean at its own address."
              : "Only an owner or administrator can edit this application.",
        },
        { status: active.kind === "ambiguous" ? 409 : 403 },
      ),
    };
  }

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("merchant_applications")
    .select("id, status, facility_id")
    .eq("facility_id", active.facility.id)
    .not("status", "in", '("withdrawn","rejected")')
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      error: NextResponse.json(
        { error: "There is no application to edit." },
        { status: 404 },
      ),
    };
  }

  if (!isEditable(data.status as ApplicationStatus)) {
    return {
      error: NextResponse.json(
        {
          error:
            "This application has been submitted and can no longer be changed.",
        },
        { status: 409 },
      ),
    };
  }

  return { application: data, supabase };
}

/** The columns a principal writes. Shared so insert and update cannot drift. */
function principalColumns(
  values: ReturnType<typeof principalSchema.parse>,
): Record<string, unknown> {
  return {
    full_name: values.fullName,
    title: values.title,
    ownership_percent: values.ownershipPercent,
    date_of_birth: values.dateOfBirth,
    email: values.email,
    phone: values.phone,
    address_line1: values.addressLine1,
    address_line2: values.addressLine2 || null,
    city: values.city,
    region: values.region,
    postal_code: values.postalCode,
    country: values.country,
    is_control_person: values.isControlPerson,
  };
}

export async function POST(request: NextRequest) {
  const resolved = await liveApplication();
  if ("error" in resolved) return resolved.error;

  const parsed = principalSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details." },
      { status: 422 },
    );
  }

  const { data, error } = await resolved.supabase
    .from("merchant_application_principals")
    .insert({
      application_id: resolved.application.id,
      facility_id: resolved.application.facility_id,
      ...principalColumns(parsed.data),
    } as never)
    .select("id")
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That person is already listed.",
      denied: "You do not have permission to edit this application.",
    });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const resolved = await liveApplication();
  if ("error" in resolved) return resolved.error;

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Which person?" }, { status: 422 });
  }

  const parsed = principalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details." },
      { status: 422 },
    );
  }

  const { data: written, error } = await resolved.supabase
    .from("merchant_application_principals")
    .update(principalColumns(parsed.data) as never)
    .eq("id", id)
    .eq("application_id", resolved.application.id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "",
      denied: "You do not have permission to edit this application.",
    });
  }

  // Zero rows means RLS refused, or the id belongs to another application —
  // and PostgREST answers success for both. Without this the screen would
  // report a save that never happened.
  const denied = deniedIfUntouched(
    written,
    "You do not have permission to edit this person.",
  );
  if (denied) return denied;

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const resolved = await liveApplication();
  if ("error" in resolved) return resolved.error;

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Which person?" }, { status: 422 });
  }

  // ── COUNTED BEFORE, COMPARED AFTER ──────────────────────────────────────
  //
  // `authenticated` DOES hold DELETE on this table — deliberately, so a
  // co-owner typed in twice can be removed — and a policy is what narrows it to
  // the submitter's own editable application. Which means a refused DELETE
  // removes zero rows and PostgREST answers SUCCESS, indistinguishable from
  // "there was nothing there".
  //
  // An earlier version of this comment claimed the opposite and carried an
  // `rls-write-ok` exemption on the strength of it. It was true when written
  // and false ten minutes later, when the grant came back. That is the whole
  // argument for `deniedIfExpectedRowsSurvived` over a comment: the helper
  // re-checks on every request, and a comment only re-checks when somebody
  // reads it.
  const { count } = await resolved.supabase
    .from("merchant_application_principals")
    .select("id", { count: "exact", head: true })
    .eq("id", id)
    .eq("application_id", resolved.application.id);

  if (!count) {
    return NextResponse.json({ error: "No such person." }, { status: 404 });
  }

  const { data: removed, error } = await resolved.supabase
    .from("merchant_application_principals")
    .delete()
    .eq("id", id)
    .eq("application_id", resolved.application.id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "",
      denied: "You do not have permission to remove this person.",
    });
  }

  const denied = deniedIfExpectedRowsSurvived(
    count,
    removed,
    "You do not have permission to remove this person.",
  );
  if (denied) return denied;

  return NextResponse.json({ ok: true });
}
