import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Signatures: record what a person agreed to, as it was when they agreed.
//
// THE AGREEMENT TEXT IS RESOLVED SERVER-SIDE AND COPIED. The request names
// which agreement was signed; it does not supply the words. A client-supplied
// `agreementText` would let the signing party choose what the record says they
// signed, which is the opposite of the property this table exists for.
//
// The hash is computed here over exactly the bytes stored, so a later reader
// can prove the stored text has not been altered since — and because the table
// is append-only to everyone (20260804090000), there is no path that could
// alter it anyway. Two independent guarantees, deliberately: the trigger stops
// the edit, the hash detects one that somehow happened.
//
// NO FOREIGN KEY TO THE AGREEMENT. Editing or deleting the source task must not
// change what an existing signature proves — see the migration header, and
// T6a/b/c in supabase/tests/staff-documents-signatures.sql, which edit and then
// delete the source row and assert the signature is untouched.
// ============================================================================

export const dynamic = "force-dynamic";

interface Body {
  staffId: string;
  /** The employee-task id whose document_sign step this answers. */
  taskKey: string;
  /** The typed name. The person's assertion, not their identity — signed_by is. */
  signatureName: string;
  /** A drawn signature, when the UI collected one. */
  signatureData?: string;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.staffId || !body.taskKey || !body.signatureName?.trim()) {
    return NextResponse.json(
      { error: "A staff member, a task and a signature are required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, facility_id")
    .eq("legacy_id", body.staffId)
    .maybeSingle();

  if (!staff) {
    return NextResponse.json(
      { error: "That staff member does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // The words, from the database. Whatever the request said they were is
  // ignored — see the header.
  const { data: task } = await supabase
    .from("onboarding_employee_tasks")
    .select("id, name, document_name, config")
    .eq("id", body.taskKey)
    .maybeSingle();

  const config = (task?.config ?? {}) as { agreementText?: string };
  const agreementText = config.agreementText?.trim();

  if (!task || !agreementText) {
    // Refused rather than defaulted. A signature against an agreement with no
    // text is a row that looks like proof and is not one, and storing it would
    // be worse than storing nothing.
    return NextResponse.json(
      { error: "That agreement has no text to sign." },
      { status: 422 },
    );
  }

  const agreementHash = createHash("sha256")
    .update(agreementText, "utf8")
    .digest("hex");

  const { data: instance } = await supabase
    .from("onboarding_instances")
    .select("id")
    .eq("staff_id", staff.id)
    .maybeSingle();

  const { data: row, error } = await supabase
    .from("staff_signatures")
    .insert({
      facility_id: staff.facility_id,
      staff_id: staff.id,
      instance_id: instance?.id ?? null,
      task_key: body.taskKey,
      agreement_key: task.document_name ?? task.name,
      agreement_title: task.name,
      agreement_text: agreementText,
      agreement_hash: agreementHash,
      signature_name: body.signatureName.trim(),
      signature_data: body.signatureData ?? null,
      // Evidence, not authentication. `signed_by` is who they were.
      ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      signed_by: user.id,
    } as never)
    .select("id, agreement_title, agreement_hash, signed_at")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to sign on behalf of that staff member.",
      duplicate: "",
    });
  }

  return NextResponse.json(row, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const staffId = new URL(request.url).searchParams.get("staffId");

  let query = supabase
    .from("staff_signatures")
    .select(
      "id, staff_id, task_key, agreement_key, agreement_title, agreement_text, agreement_hash, signature_name, signed_at",
    )
    .order("signed_at", { ascending: false });

  if (staffId) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("legacy_id", staffId)
      .maybeSingle();
    if (!staff) return NextResponse.json([]);
    query = query.eq("staff_id", staff.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
